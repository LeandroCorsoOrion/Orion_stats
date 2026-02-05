"""
Orion Stats - Correlation API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Dataset
from app.schemas.schemas import CorrelationRequest, CorrelationResponse
from app.services.data_service import get_cached_dataframe
from app.services.stats_service import calculate_correlation_matrix

router = APIRouter(prefix="/stats", tags=["Correlation"])


@router.post("/correlation", response_model=CorrelationResponse)
def get_correlation_matrix(request: CorrelationRequest, db: Session = Depends(get_db)):
    """
    Calculate Pearson correlation matrix for selected variables.
    
    Returns NxN matrix with correlation values rounded to 2 decimal places.
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if not request.variables or len(request.variables) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 variables for correlation")
    
    # Load data
    df = get_cached_dataframe(dataset.id, dataset.parquet_path)
    
    # Create column mapping
    columns_meta = {col['col_key']: col['name'] for col in dataset.columns_meta}
    
    # Calculate correlation
    try:
        sample_size, var_names, matrix = calculate_correlation_matrix(
            df=df,
            variables=request.variables,
            columns_meta=columns_meta,
            filters=request.filters,
            treat_missing_as_zero=request.treat_missing_as_zero
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating correlation: {str(e)}")

    return CorrelationResponse(
        sample_size=sample_size,
        variables=var_names,
        matrix=matrix
    )
