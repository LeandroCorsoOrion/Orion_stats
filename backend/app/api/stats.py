"""
Orion Stats - Statistics API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Dataset
from app.schemas.schemas import StatsRequest, StatsResponse
from app.services.data_service import get_cached_dataframe
from app.services.stats_service import calculate_descriptive_stats

router = APIRouter(prefix="/stats", tags=["Statistics"])


@router.post("/descriptive", response_model=StatsResponse)
def get_descriptive_stats(request: StatsRequest, db: Session = Depends(get_db)):
    """
    Calculate descriptive statistics for selected variables.
    
    Returns: mean, median, mode, std, variance, min, max, Q1, Q3, IQR,
             count, missing count per variable.
    
    Optionally groups by discrete variables.
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if not request.variables:
        raise HTTPException(status_code=400, detail="No variables selected")
    
    # Load data
    df = get_cached_dataframe(dataset.id, dataset.parquet_path)
    
    # Create column mapping
    columns_meta = {col['col_key']: col['name'] for col in dataset.columns_meta}
    
    # Calculate statistics
    try:
        sample_size, statistics, grouped_stats = calculate_descriptive_stats(
            df=df,
            variables=request.variables,
            columns_meta=columns_meta,
            filters=request.filters,
            group_by=request.group_by if request.group_by else None,
            treat_missing_as_zero=request.treat_missing_as_zero
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating statistics: {str(e)}")
    
    return StatsResponse(
        sample_size=sample_size,
        statistics=statistics,
        grouped_statistics=grouped_stats
    )
