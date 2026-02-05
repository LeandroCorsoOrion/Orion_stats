"""
Orion Stats - Scenario Service
Manages saved scenarios.
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.db.models import Scenario
from app.schemas.schemas import ScenarioCreate, ScenarioUpdate, ScenarioPayload


def create_scenario(db: Session, scenario: ScenarioCreate) -> Scenario:
    """Create a new scenario."""
    db_scenario = Scenario(
        name=scenario.name,
        description=scenario.description,
        dataset_id=scenario.dataset_id,
        payload=scenario.payload.model_dump()
    )
    db.add(db_scenario)
    db.commit()
    db.refresh(db_scenario)
    return db_scenario


def get_scenario(db: Session, scenario_id: int) -> Optional[Scenario]:
    """Get a scenario by ID."""
    return db.query(Scenario).filter(Scenario.id == scenario_id).first()


def get_scenarios_by_dataset(db: Session, dataset_id: int) -> list[Scenario]:
    """Get all scenarios for a dataset."""
    return db.query(Scenario).filter(Scenario.dataset_id == dataset_id).all()


def get_all_scenarios(db: Session) -> list[Scenario]:
    """Get all scenarios."""
    return db.query(Scenario).order_by(Scenario.updated_at.desc()).all()


def update_scenario(
    db: Session, 
    scenario_id: int, 
    update: ScenarioUpdate
) -> Optional[Scenario]:
    """Update a scenario."""
    scenario = get_scenario(db, scenario_id)
    if not scenario:
        return None
    
    if update.name is not None:
        scenario.name = update.name
    if update.description is not None:
        scenario.description = update.description
    if update.payload is not None:
        scenario.payload = update.payload.model_dump()
    
    db.commit()
    db.refresh(scenario)
    return scenario


def delete_scenario(db: Session, scenario_id: int) -> bool:
    """Delete a scenario."""
    scenario = get_scenario(db, scenario_id)
    if not scenario:
        return False
    
    db.delete(scenario)
    db.commit()
    return True


def duplicate_scenario(db: Session, scenario_id: int, new_name: str) -> Optional[Scenario]:
    """Duplicate a scenario with a new name."""
    original = get_scenario(db, scenario_id)
    if not original:
        return None
    
    new_scenario = Scenario(
        name=new_name,
        description=f"Copy of: {original.description}" if original.description else None,
        dataset_id=original.dataset_id,
        payload=original.payload
    )
    db.add(new_scenario)
    db.commit()
    db.refresh(new_scenario)
    return new_scenario
