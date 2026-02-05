"""
Orion Stats - Data Query API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Dataset
from app.schemas.schemas import (
    DataQueryRequest, DataQueryResponse,
    UniqueValuesRequest, UniqueValuesResponse
)
from app.services.data_service import (
    get_cached_dataframe, apply_filters, 
    get_unique_values, prepare_data_for_json
)

router = APIRouter(prefix="/data", tags=["Data"])


@router.post("/query", response_model=DataQueryResponse)
def query_data(request: DataQueryRequest, db: Session = Depends(get_db)):
    """
    Query filtered data with pagination.
    
    - Applies filters on discrete variables
    - Returns paginated results
    - Returns total and filtered counts
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Load data
    df = get_cached_dataframe(dataset.id, dataset.parquet_path)
    total_count = len(df)
    
    # Apply filters
    if request.filters:
        df = apply_filters(df, request.filters)
    filtered_count = len(df)
    
    # Apply pagination
    start = request.offset
    end = start + request.limit
    paginated_df = df.iloc[start:end]
    
    # Convert to JSON-safe format
    data = prepare_data_for_json(paginated_df)
    
    return DataQueryResponse(
        data=data,
        total_count=total_count,
        filtered_count=filtered_count
    )


@router.post("/unique-values", response_model=UniqueValuesResponse)
def get_column_unique_values(
    request: UniqueValuesRequest, 
    db: Session = Depends(get_db)
):
    """Get unique values for a column (for filter dropdowns)."""
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Load data
    df = get_cached_dataframe(dataset.id, dataset.parquet_path)
    
    # Get unique values
    values = get_unique_values(df, request.col_key)
    
    return UniqueValuesResponse(
        col_key=request.col_key,
        values=values
    )
