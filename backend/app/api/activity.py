"""
Orion Stats - Activity Log API Endpoints
"""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schemas import ActivityLogResponse, ActivityLogList
from app.services.activity_service import get_activity_logs, get_dataset_access_history

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("/", response_model=ActivityLogList)
def list_activity_logs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    dataset_id: int = Query(None),
    action: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get activity logs with optional filtering.
    
    - **limit**: Maximum number of records (1-500)
    - **offset**: Number of records to skip
    - **dataset_id**: Filter by dataset ID
    - **action**: Filter by action type (upload, access, delete, update, view)
    """
    logs, total = get_activity_logs(
        db=db,
        limit=limit,
        offset=offset,
        dataset_id=dataset_id,
        action=action
    )
    
    return ActivityLogList(
        logs=[
            ActivityLogResponse(
                id=log.id,
                action=log.action,
                dataset_id=log.dataset_id,
                dataset_name=log.dataset_name,
                filename=log.filename,
                user=log.user,
                ip_address=log.ip_address,
                details=log.details,
                created_at=log.created_at
            )
            for log in logs
        ],
        total=total
    )


@router.get("/dataset/{dataset_id}", response_model=ActivityLogList)
def get_dataset_history(
    dataset_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Get access history for a specific dataset.
    
    - **dataset_id**: ID of the dataset
    - **limit**: Maximum number of records (1-200)
    """
    logs = get_dataset_access_history(db, dataset_id, limit)
    
    return ActivityLogList(
        logs=[
            ActivityLogResponse(
                id=log.id,
                action=log.action,
                dataset_id=log.dataset_id,
                dataset_name=log.dataset_name,
                filename=log.filename,
                user=log.user,
                ip_address=log.ip_address,
                details=log.details,
                created_at=log.created_at
            )
            for log in logs
        ],
        total=len(logs)
    )
