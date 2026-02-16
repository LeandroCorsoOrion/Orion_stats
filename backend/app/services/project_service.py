"""
Orion Analytics - Project Service
Creates and manages operational projects (MLOps-ready artifacts).
"""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models import Dataset, Project, ProjectRun
from app.schemas.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectInputField,
)
from app.services.ml_service import load_model_metadata


def _build_input_schema(
    dataset: Dataset,
    model_metadata: dict[str, Any],
    features: list[str],
) -> list[dict[str, Any]]:
    columns_meta_list = dataset.columns_meta or []
    columns_meta = {c.get("col_key"): c for c in columns_meta_list if isinstance(c, dict)}

    categorical_values = model_metadata.get("categorical_features", {}) or {}

    schema: list[dict[str, Any]] = []
    for col_key in features:
        meta = columns_meta.get(col_key, {}) or {}
        var_type = meta.get("var_type", "continuous")
        input_type = "select" if var_type == "categorical" else "number"

        allowed_values = None
        default_value: Optional[Any] = None
        if input_type == "select":
            allowed_values = categorical_values.get(col_key)
            # Keep default empty so the UI encourages a deliberate selection.
            default_value = None
        else:
            default_value = 0

        schema.append(ProjectInputField(
            col_key=col_key,
            name=meta.get("name", col_key),
            var_type=var_type,
            input_type=input_type,
            required=False,
            default_value=default_value,
            allowed_values=allowed_values,
            description=None,
        ).model_dump())

    return schema


def create_project(db: Session, project: ProjectCreate) -> Project:
    dataset = db.query(Dataset).filter(Dataset.id == project.dataset_id).first()
    if not dataset:
        raise ValueError("Dataset not found")

    metadata = load_model_metadata(project.model_id)

    # Basic consistency checks to prevent "project points to wrong artifact" bugs.
    if metadata.get("dataset_id") and int(metadata["dataset_id"]) != int(project.dataset_id):
        raise ValueError("Model artifact was trained on a different dataset_id")
    if metadata.get("target") and str(metadata["target"]) != str(project.target):
        raise ValueError("Model artifact was trained with a different target")
    if metadata.get("features") and list(metadata["features"]) != list(project.features):
        raise ValueError("Model artifact was trained with a different features set")

    model_label = project.model_label or metadata.get("best_label")
    if not model_label:
        raise ValueError("Model label not found (missing model_label and metadata.best_label)")

    input_schema = _build_input_schema(dataset, metadata, project.features)

    # Persist reproducibility config and metrics.
    train_config = project.train_config.model_dump() if project.train_config else {}
    model_metrics = metadata.get("model_metrics", {}) or {}

    db_project = Project(
        name=project.name,
        description=project.description,
        dataset_id=project.dataset_id,
        model_id=project.model_id,
        model_label=model_label,
        target=project.target,
        features=project.features,
        input_schema=input_schema,
        train_config=train_config,
        model_metrics=model_metrics,
        status=project.status.value if hasattr(project.status, "value") else str(project.status),
    )

    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def get_project(db: Session, project_id: int) -> Optional[Project]:
    return db.query(Project).filter(Project.id == project_id).first()


def list_projects(db: Session, limit: int = 200, offset: int = 0) -> tuple[list[Project], int]:
    q = db.query(Project)
    total = q.count()
    projects = (
        q.order_by(Project.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return projects, total


def update_project(db: Session, project_id: int, update: ProjectUpdate) -> Optional[Project]:
    project = get_project(db, project_id)
    if not project:
        return None

    if update.name is not None:
        project.name = update.name
    if update.description is not None:
        project.description = update.description
    if update.status is not None:
        project.status = update.status.value if hasattr(update.status, "value") else str(update.status)

    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project_id: int) -> bool:
    project = get_project(db, project_id)
    if not project:
        return False
    db.delete(project)
    db.commit()
    return True


def log_project_run(
    db: Session,
    project_id: int,
    input_values: dict[str, Any],
    predicted_value: float,
    model_used: str,
    expected_error: float,
) -> ProjectRun:
    run = ProjectRun(
        project_id=project_id,
        input_values=input_values,
        predicted_value=float(predicted_value),
        model_used=str(model_used),
        expected_error=float(expected_error),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def list_project_runs(
    db: Session,
    project_id: int,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ProjectRun], int]:
    q = db.query(ProjectRun).filter(ProjectRun.project_id == project_id)
    total = q.count()
    runs = (
        q.order_by(ProjectRun.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return runs, total
