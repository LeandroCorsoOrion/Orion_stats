"""
Orion Stats - Machine Learning API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Dataset
from app.schemas.schemas import (
    MLTrainRequest, MLTrainResponse,
    MLPredictRequest, MLPredictResponse
)
from app.services.data_service import get_cached_dataframe
from app.services.ml_service import (
    train_models, save_trained_models, predict,
    load_model_metadata
)

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


@router.post("/train", response_model=MLTrainResponse)
def train_ml_models(request: MLTrainRequest, db: Session = Depends(get_db)):
    """
    Train 5 ML models on the dataset.
    
    Models trained (labels only - algorithm names are confidential):
    - Machine Learning - Pro
    - Machine Learning - Alpha
    - Machine Learning - Sigma
    - Machine Learning - Delta
    - Machine Learning - Nova
    
    Also trains Linear Regression (statsmodels OLS) with coefficient details.
    """
    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if not request.target:
        raise HTTPException(status_code=400, detail="No target variable selected")
    
    if not request.features:
        raise HTTPException(status_code=400, detail="No features selected")
    
    # Load data
    df = get_cached_dataframe(dataset.id, dataset.parquet_path)
    
    # Create columns meta dict
    columns_meta = {col['col_key']: col for col in dataset.columns_meta}
    
    # Validate target and features exist
    available_cols = set(df.columns)
    if request.target not in available_cols:
        raise HTTPException(status_code=400, detail=f"Target column '{request.target}' not found")
    
    missing_features = [f for f in request.features if f not in available_cols]
    if missing_features:
        raise HTTPException(
            status_code=400, 
            detail=f"Feature columns not found: {missing_features}"
        )
    
    try:
        # Train models
        (
            model_id,
            model_metrics,
            best_label,
            linear_result,
            feature_names,
            categorical_values,
            trained_pipelines
        ) = train_models(
            df=df,
            target_col=request.target,
            feature_cols=request.features,
            columns_meta=columns_meta,
            filters=request.filters,
            treat_missing_as_zero=request.treat_missing_as_zero,
            selection_metric=request.selection_metric
        )
        
        # Prepare metadata for saving
        metadata = {
            'dataset_id': request.dataset_id,
            'target': request.target,
            'features': request.features,
            'feature_names': feature_names,
            'categorical_features': categorical_values,
            'best_label': best_label,
            'selection_metric': request.selection_metric,
            'model_metrics': {m.label: {'r2': m.r2, 'rmse': m.rmse, 'mae': m.mae, 'mape': m.mape} for m in model_metrics}
        }
        
        # Save models to disk
        save_trained_models(model_id, trained_pipelines, metadata)
        
        return MLTrainResponse(
            model_id=model_id,
            models=model_metrics,
            best_model_label=best_label,
            linear_regression=linear_result,
            feature_names=feature_names,
            categorical_features=categorical_values
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")


@router.post("/predict", response_model=MLPredictResponse)
def predict_value(request: MLPredictRequest):
    """
    Make prediction using a trained model.
    
    - If model_label is not specified, uses the best model
    - Returns predicted value and expected error (RMSE)
    """
    try:
        predicted_value, model_used, expected_error = predict(
            model_id=request.model_id,
            model_label=request.model_label,
            input_values=request.input_values
        )
        
        return MLPredictResponse(
            predicted_value=round(predicted_value, 4),
            model_used=model_used,
            expected_error=round(expected_error, 4)
        )
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.get("/models/{model_id}")
def get_model_info(model_id: str):
    """Get information about a trained model."""
    try:
        metadata = load_model_metadata(model_id)
        return metadata
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Model not found")
