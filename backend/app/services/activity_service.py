"""
Orion Stats - Activity Logging Service
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.db.models import ActivityLog


def log_activity(
    db: Session,
    action: str,
    dataset_id: Optional[int] = None,
    dataset_name: Optional[str] = None,
    filename: Optional[str] = None,
    user: Optional[str] = "anonymous",
    ip_address: Optional[str] = None,
    details: Optional[str] = None
) -> ActivityLog:
    """
    Log an activity to the database.
    
    Args:
        db: Database session
        action: Type of action ('upload', 'access', 'delete', 'update', 'view')
        dataset_id: ID of the dataset (if applicable)
        dataset_name: Name of the dataset (stored separately for when dataset is deleted)
        filename: Original filename (if applicable)
        user: Username who performed the action
        ip_address: Client IP address
        details: Additional details about the action
    
    Returns:
        The created ActivityLog record
    """
    log = ActivityLog(
        action=action,
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        filename=filename,
        user=user,
        ip_address=ip_address,
        details=details,
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_activity_logs(
    db: Session,
    limit: int = 100,
    offset: int = 0,
    dataset_id: Optional[int] = None,
    action: Optional[str] = None
) -> tuple[list[ActivityLog], int]:
    """
    Get activity logs with optional filtering.
    
    Args:
        db: Database session
        limit: Maximum number of records to return
        offset: Number of records to skip
        dataset_id: Filter by dataset ID
        action: Filter by action type
    
    Returns:
        Tuple of (list of logs, total count)
    """
    query = db.query(ActivityLog)
    
    if dataset_id is not None:
        query = query.filter(ActivityLog.dataset_id == dataset_id)
    if action is not None:
        query = query.filter(ActivityLog.action == action)
    
    total = query.count()
    logs = query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(limit).all()
    
    return logs, total


def get_dataset_access_history(db: Session, dataset_id: int, limit: int = 50) -> list[ActivityLog]:
    """
    Get access history for a specific dataset.
    
    Args:
        db: Database session
        dataset_id: ID of the dataset
        limit: Maximum number of records to return
    
    Returns:
        List of activity logs for the dataset
    """
    return (
        db.query(ActivityLog)
        .filter(ActivityLog.dataset_id == dataset_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
