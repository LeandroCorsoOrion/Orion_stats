"""
Orion Analytics - Projects API Endpoints
Operationalize trained ML artifacts into reusable "Projects".
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Dataset
from app.schemas.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectSummary,
    ProjectList,
    ProjectPredictRequest,
    ProjectPredictResponse,
    ProjectRunResponse,
    ProjectRunList,
    ProjectTrainConfig,
    ProjectStatus,
    ProjectInputField,
)
from app.services.project_service import (
    create_project,
    get_project,
    list_projects,
    list_project_runs,
    update_project,
    delete_project,
    log_project_run,
)
from app.services.ml_service import predict as ml_predict


router = APIRouter(prefix="/projects", tags=["Projects"])


def _dataset_name(db: Session, dataset_id: int) -> str | None:
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    return ds.name if ds else None


@router.post("/", response_model=ProjectResponse)
def create_new_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project from an existing trained model artifact (model_id)."""
    try:
        db_project = create_project(db, project)
        return ProjectResponse(
            id=db_project.id,
            name=db_project.name,
            description=db_project.description,
            dataset_id=db_project.dataset_id,
            dataset_name=_dataset_name(db, db_project.dataset_id),
            model_id=db_project.model_id,
            model_label=db_project.model_label,
            target=db_project.target,
            features=db_project.features,
            input_schema=[ProjectInputField(**f) for f in (db_project.input_schema or [])],
            train_config=ProjectTrainConfig(**(db_project.train_config or {})),
            model_metrics=db_project.model_metrics or {},
            status=ProjectStatus(db_project.status),
            created_at=db_project.created_at,
            updated_at=db_project.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating project: {str(e)}")


@router.get("/", response_model=ProjectList)
def list_all_projects(limit: int = 200, offset: int = 0, db: Session = Depends(get_db)):
    """List projects (most recently updated first)."""
    projects, total = list_projects(db, limit=limit, offset=offset)
    summaries: list[ProjectSummary] = []
    for p in projects:
        summaries.append(ProjectSummary(
            id=p.id,
            name=p.name,
            dataset_id=p.dataset_id,
            dataset_name=_dataset_name(db, p.dataset_id),
            model_label=p.model_label,
            target=p.target,
            status=ProjectStatus(p.status),
            created_at=p.created_at,
            updated_at=p.updated_at,
        ))
    return ProjectList(projects=summaries, total=total)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_by_id(project_id: int, db: Session = Depends(get_db)):
    """Get a project by ID."""
    p = get_project(db, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse(
        id=p.id,
        name=p.name,
        description=p.description,
        dataset_id=p.dataset_id,
        dataset_name=_dataset_name(db, p.dataset_id),
        model_id=p.model_id,
        model_label=p.model_label,
        target=p.target,
        features=p.features,
        input_schema=[ProjectInputField(**f) for f in (p.input_schema or [])],
        train_config=ProjectTrainConfig(**(p.train_config or {})),
        model_metrics=p.model_metrics or {},
        status=ProjectStatus(p.status),
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.put("/{project_id}", response_model=ProjectResponse)
def update_existing_project(project_id: int, update: ProjectUpdate, db: Session = Depends(get_db)):
    """Update a project (name/description/status)."""
    p = update_project(db, project_id, update)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse(
        id=p.id,
        name=p.name,
        description=p.description,
        dataset_id=p.dataset_id,
        dataset_name=_dataset_name(db, p.dataset_id),
        model_id=p.model_id,
        model_label=p.model_label,
        target=p.target,
        features=p.features,
        input_schema=[ProjectInputField(**f) for f in (p.input_schema or [])],
        train_config=ProjectTrainConfig(**(p.train_config or {})),
        model_metrics=p.model_metrics or {},
        status=ProjectStatus(p.status),
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.delete("/{project_id}")
def delete_project_by_id(project_id: int, db: Session = Depends(get_db)):
    """Delete a project (does not delete dataset or model artifacts on disk)."""
    ok = delete_project(db, project_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted", "id": project_id}


@router.post("/{project_id}/predict", response_model=ProjectPredictResponse)
def predict_from_project(project_id: int, request: ProjectPredictRequest, db: Session = Depends(get_db)):
    """Run prediction using a project's locked model (model_id + model_label)."""
    p = get_project(db, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    if p.status == ProjectStatus.archived.value:
        raise HTTPException(status_code=400, detail="Project is archived")

    # Ensure inputs contain all required features; fill missing using safe defaults.
    input_values = dict(request.input_values or {})

    # Use project input_schema to decide missing defaults for categorical fields.
    schema = p.input_schema or []
    for field in schema:
        col_key = field.get("col_key")
        if not col_key:
            continue

        if col_key in input_values and input_values[col_key] is not None and input_values[col_key] != "":
            continue

        # Default behavior matches training pipeline handling.
        input_type = field.get("input_type")
        if input_type == "select":
            input_values[col_key] = "MISSING"
        else:
            input_values[col_key] = 0

    try:
        predicted_value, model_used, expected_error = ml_predict(
            model_id=p.model_id,
            model_label=p.model_label,
            input_values=input_values,
        )

        # Store history/audit run.
        try:
            log_project_run(
                db=db,
                project_id=p.id,
                input_values=input_values,
                predicted_value=predicted_value,
                model_used=model_used,
                expected_error=expected_error,
            )
        except Exception:
            # History should never break predictions.
            pass

        return ProjectPredictResponse(
            predicted_value=round(predicted_value, 4),
            model_used=model_used,
            expected_error=round(expected_error, 4),
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.get("/{project_id}/runs", response_model=ProjectRunList)
def list_runs(project_id: int, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """List recent prediction runs for a project."""
    p = get_project(db, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    runs, total = list_project_runs(db, project_id=project_id, limit=limit, offset=offset)
    return ProjectRunList(
        runs=[
            ProjectRunResponse(
                id=r.id,
                project_id=r.project_id,
                input_values=r.input_values,
                predicted_value=r.predicted_value,
                model_used=r.model_used,
                expected_error=r.expected_error,
                created_at=r.created_at,
            )
            for r in runs
        ],
        total=total,
    )
