"""
Orion Stats - Scenarios API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Scenario
from app.schemas.schemas import (
    ScenarioCreate, ScenarioUpdate, ScenarioResponse, 
    ScenarioList, ScenarioPayload
)
from app.services.scenario_service import (
    create_scenario, get_scenario, get_scenarios_by_dataset,
    get_all_scenarios, update_scenario, delete_scenario,
    duplicate_scenario
)

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


@router.post("/", response_model=ScenarioResponse)
def create_new_scenario(scenario: ScenarioCreate, db: Session = Depends(get_db)):
    """Create a new scenario."""
    try:
        db_scenario = create_scenario(db, scenario)
        return ScenarioResponse(
            id=db_scenario.id,
            name=db_scenario.name,
            description=db_scenario.description,
            dataset_id=db_scenario.dataset_id,
            payload=ScenarioPayload(**db_scenario.payload),
            created_at=db_scenario.created_at,
            updated_at=db_scenario.updated_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating scenario: {str(e)}")


@router.get("/", response_model=ScenarioList)
def list_all_scenarios(db: Session = Depends(get_db)):
    """List all scenarios."""
    scenarios = get_all_scenarios(db)
    result = []
    for s in scenarios:
        result.append(ScenarioResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            dataset_id=s.dataset_id,
            payload=ScenarioPayload(**s.payload),
            created_at=s.created_at,
            updated_at=s.updated_at
        ))
    return ScenarioList(scenarios=result)


@router.get("/dataset/{dataset_id}", response_model=ScenarioList)
def list_dataset_scenarios(dataset_id: int, db: Session = Depends(get_db)):
    """List scenarios for a specific dataset."""
    scenarios = get_scenarios_by_dataset(db, dataset_id)
    result = []
    for s in scenarios:
        result.append(ScenarioResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            dataset_id=s.dataset_id,
            payload=ScenarioPayload(**s.payload),
            created_at=s.created_at,
            updated_at=s.updated_at
        ))
    return ScenarioList(scenarios=result)


@router.get("/{scenario_id}", response_model=ScenarioResponse)
def get_scenario_by_id(scenario_id: int, db: Session = Depends(get_db)):
    """Get a scenario by ID."""
    scenario = get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    return ScenarioResponse(
        id=scenario.id,
        name=scenario.name,
        description=scenario.description,
        dataset_id=scenario.dataset_id,
        payload=ScenarioPayload(**scenario.payload),
        created_at=scenario.created_at,
        updated_at=scenario.updated_at
    )


@router.put("/{scenario_id}", response_model=ScenarioResponse)
def update_existing_scenario(
    scenario_id: int, 
    update: ScenarioUpdate, 
    db: Session = Depends(get_db)
):
    """Update a scenario."""
    scenario = update_scenario(db, scenario_id, update)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    return ScenarioResponse(
        id=scenario.id,
        name=scenario.name,
        description=scenario.description,
        dataset_id=scenario.dataset_id,
        payload=ScenarioPayload(**scenario.payload),
        created_at=scenario.created_at,
        updated_at=scenario.updated_at
    )


@router.delete("/{scenario_id}")
def delete_scenario_by_id(scenario_id: int, db: Session = Depends(get_db)):
    """Delete a scenario."""
    success = delete_scenario(db, scenario_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"message": "Scenario deleted", "id": scenario_id}


@router.post("/{scenario_id}/duplicate", response_model=ScenarioResponse)
def duplicate_existing_scenario(
    scenario_id: int,
    new_name: str,
    db: Session = Depends(get_db)
):
    """Duplicate a scenario with a new name."""
    scenario = duplicate_scenario(db, scenario_id, new_name)
    if not scenario:
        raise HTTPException(status_code=404, detail="Original scenario not found")
    
    return ScenarioResponse(
        id=scenario.id,
        name=scenario.name,
        description=scenario.description,
        dataset_id=scenario.dataset_id,
        payload=ScenarioPayload(**scenario.payload),
        created_at=scenario.created_at,
        updated_at=scenario.updated_at
    )


@router.get("/{scenario_id}/export")
def export_scenario(scenario_id: int, db: Session = Depends(get_db)):
    """Export scenario as JSON."""
    scenario = get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    export_data = {
        "name": scenario.name,
        "description": scenario.description,
        "dataset_id": scenario.dataset_id,
        "payload": scenario.payload,
        "created_at": scenario.created_at.isoformat(),
        "updated_at": scenario.updated_at.isoformat()
    }
    
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f'attachment; filename="scenario_{scenario.id}.json"'
        }
    )


@router.post("/import", response_model=ScenarioResponse)
def import_scenario(data: dict, db: Session = Depends(get_db)):
    """Import scenario from JSON."""
    try:
        scenario_create = ScenarioCreate(
            name=data.get("name", "Imported Scenario"),
            description=data.get("description"),
            dataset_id=data["dataset_id"],
            payload=ScenarioPayload(**data["payload"])
        )
        db_scenario = create_scenario(db, scenario_create)
        
        return ScenarioResponse(
            id=db_scenario.id,
            name=db_scenario.name,
            description=db_scenario.description,
            dataset_id=db_scenario.dataset_id,
            payload=ScenarioPayload(**db_scenario.payload),
            created_at=db_scenario.created_at,
            updated_at=db_scenario.updated_at
        )
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing required field: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")
