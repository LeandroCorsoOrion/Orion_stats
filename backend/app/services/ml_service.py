"""
Orion Stats - Machine Learning Service
Trains ML models and provides predictions.

MODEL REGISTRY (CONFIDENTIAL - Not exposed in API):
- "Machine Learning - Pro"   -> RandomForestRegressor
- "Machine Learning - Alpha" -> GradientBoostingRegressor
- "Machine Learning - Sigma" -> HistGradientBoostingRegressor
- "Machine Learning - Delta" -> ElasticNet
- "Machine Learning - Nova"  -> SVR (RBF kernel)
"""
import uuid
import json
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

# ML Models
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, HistGradientBoostingRegressor
from sklearn.linear_model import ElasticNet
from sklearn.svm import SVR

# Linear Regression with statsmodels for coefficients
import statsmodels.api as sm

from app.core.config import settings
from app.schemas.schemas import (
    FilterCondition, ModelMetrics, LinearCoefficient, 
    LinearRegressionResult, MLTrainResponse
)
from app.services.data_service import apply_filters


# ============================================================================
# MODEL REGISTRY - CONFIDENTIAL MAPPING
# These labels are shown in the frontend; actual algorithm names are NEVER exposed.
# ============================================================================
MODEL_REGISTRY = {
    "Machine Learning - Pro": RandomForestRegressor(
        n_estimators=100, 
        max_depth=10, 
        random_state=42,
        n_jobs=-1
    ),
    "Machine Learning - Alpha": GradientBoostingRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    ),
    "Machine Learning - Sigma": HistGradientBoostingRegressor(
        max_iter=100,
        max_depth=10,
        learning_rate=0.1,
        random_state=42
    ),
    "Machine Learning - Delta": ElasticNet(
        alpha=1.0,
        l1_ratio=0.5,
        random_state=42,
        max_iter=1000
    ),
    "Machine Learning - Nova": SVR(
        kernel='rbf',
        C=1.0,
        epsilon=0.1
    )
}


def _calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> Optional[float]:
    """Calculate Mean Absolute Percentage Error, handling zeros."""
    mask = y_true != 0
    if mask.sum() == 0:
        return None
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def prepare_features(
    df: pd.DataFrame,
    feature_cols: list[str],
    columns_meta: dict[str, dict],  # {col_key: {var_type, ...}}
    treat_missing_as_zero: bool = True
) -> tuple[pd.DataFrame, list[str], list[str], dict[str, list[str]]]:
    """
    Prepare features for ML training.
    
    Returns:
        (X_df, numeric_cols, categorical_cols, categorical_values)
    """
    X = df[feature_cols].copy()
    
    # Separate numeric and categorical columns based on metadata
    numeric_cols = []
    categorical_cols = []
    categorical_values = {}
    
    for col in feature_cols:
        meta = columns_meta.get(col, {})
        var_type = meta.get('var_type', 'continuous')
        
        if var_type == 'categorical':
            categorical_cols.append(col)
            # Store unique values for simulation form
            categorical_values[col] = X[col].dropna().unique().tolist()
        else:
            # Treat discrete and continuous as numeric
            numeric_cols.append(col)
            X[col] = pd.to_numeric(X[col], errors='coerce')
    
    # Handle missing values
    if treat_missing_as_zero:
        for col in numeric_cols:
            X[col] = X[col].fillna(0)
        for col in categorical_cols:
            X[col] = X[col].fillna('MISSING')
    
    return X, numeric_cols, categorical_cols, categorical_values


def build_preprocessor(
    numeric_cols: list[str],
    categorical_cols: list[str],
    treat_missing_as_zero: bool = True
) -> ColumnTransformer:
    """Build preprocessing pipeline for features."""
    transformers = []
    
    if numeric_cols:
        numeric_transformer = Pipeline([
            ('imputer', SimpleImputer(strategy='constant', fill_value=0 if treat_missing_as_zero else 0)),
            ('scaler', StandardScaler())
        ])
        transformers.append(('num', numeric_transformer, numeric_cols))
    
    if categorical_cols:
        categorical_transformer = Pipeline([
            ('imputer', SimpleImputer(strategy='constant', fill_value='MISSING')),
            ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])
        transformers.append(('cat', categorical_transformer, categorical_cols))
    
    return ColumnTransformer(transformers=transformers)


def train_linear_regression(
    X: pd.DataFrame,
    y: pd.Series,
    feature_names: list[str],
    columns_meta: dict[str, dict]
) -> LinearRegressionResult:
    """
    Train OLS linear regression and extract coefficients using statsmodels.
    """
    try:
        # Prepare data - one-hot encode categorical
        X_prepared = X.copy()
        encoded_features = []
        
        for col in list(X_prepared.columns):
            meta = columns_meta.get(col, {})
            var_type = meta.get('var_type', 'continuous')
            
            if var_type == 'categorical':
                # One-hot encode
                dummies = pd.get_dummies(X_prepared[col], prefix=col, drop_first=True)
                X_prepared = X_prepared.drop(columns=[col])
                for dcol in dummies.columns:
                    X_prepared[dcol] = dummies[dcol].astype(float)
                    encoded_features.append(dcol)
            else:
                # Convert to numeric
                X_prepared[col] = pd.to_numeric(X_prepared[col], errors='coerce')
                encoded_features.append(col)
        
        # Fill NaN values with 0
        X_prepared = X_prepared.fillna(0)
        
        # CRITICAL: Ensure all columns are float64 to avoid numpy casting errors
        for col in X_prepared.columns:
            X_prepared[col] = X_prepared[col].astype(np.float64)
        
        # Clean target variable
        y_clean = pd.to_numeric(y, errors='coerce').fillna(0).astype(np.float64)
        
        # Remove rows with any remaining invalid values
        valid_mask = ~(X_prepared.isnull().any(axis=1) | np.isinf(X_prepared).any(axis=1))
        valid_mask = valid_mask & ~(y_clean.isnull() | np.isinf(y_clean))
        
        X_prepared = X_prepared[valid_mask]
        y_clean = y_clean[valid_mask]
        
        if len(X_prepared) < 5:
            raise ValueError("Not enough valid samples for linear regression")
        
        # Add constant for intercept
        X_with_const = sm.add_constant(X_prepared, has_constant='add')
        
        # Ensure const column is also float64
        if 'const' in X_with_const.columns:
            X_with_const['const'] = X_with_const['const'].astype(np.float64)
        
        # Fit OLS model
        model = sm.OLS(y_clean, X_with_const).fit()
        
        # Extract coefficients
        coefficients = []
        for name in X_with_const.columns:
            if name == 'const':
                continue
            
            coef = model.params.get(name, 0)
            std_err = model.bse.get(name, None)
            t_val = model.tvalues.get(name, None)
            p_val = model.pvalues.get(name, None)
            
            # Handle potential infinite or NaN values
            if not np.isfinite(coef):
                coef = 0.0
            if std_err is not None and not np.isfinite(std_err):
                std_err = None
            if t_val is not None and not np.isfinite(t_val):
                t_val = None
            if p_val is not None and not np.isfinite(p_val):
                p_val = None
            
            coefficients.append(LinearCoefficient(
                feature=name,
                coefficient=round(float(coef), 6),
                std_error=round(float(std_err), 6) if std_err is not None else None,
                t_value=round(float(t_val), 4) if t_val is not None else None,
                p_value=round(float(p_val), 6) if p_val is not None else None
            ))
        
        # Build equation string
        intercept_val = model.params.get('const', 0)
        if not np.isfinite(intercept_val):
            intercept_val = 0.0
        intercept = round(float(intercept_val), 4)
        
        equation_parts = [f"{intercept}"]
        for coef in coefficients[:5]:  # Limit to first 5 for readability
            sign = "+" if coef.coefficient >= 0 else ""
            equation_parts.append(f"{sign} {coef.coefficient}×{coef.feature}")
        
        if len(coefficients) > 5:
            equation_parts.append("+ ...")
        
        equation = f"y = {' '.join(equation_parts)}"
        
        # Calculate metrics
        y_pred = model.predict(X_with_const)
        r2 = round(float(model.rsquared), 4) if np.isfinite(model.rsquared) else 0.0
        rmse = round(float(np.sqrt(mean_squared_error(y_clean, y_pred))), 4)
        
        return LinearRegressionResult(
            equation=equation,
            r2=r2,
            rmse=rmse,
            intercept=intercept,
            coefficients=coefficients
        )
        
    except Exception as e:
        # Return empty result on error with full error message for debugging
        error_msg = str(e)[:100]
        print(f"Linear regression error: {error_msg}")
        return LinearRegressionResult(
            equation=f"Erro na regressão: {error_msg}",
            r2=0.0,
            rmse=0.0,
            intercept=0.0,
            coefficients=[]
        )


def train_models(
    df: pd.DataFrame,
    target_col: str,
    feature_cols: list[str],
    columns_meta: dict[str, dict],
    filters: list[FilterCondition] = None,
    treat_missing_as_zero: bool = True,
    selection_metric: str = "rmse"
) -> tuple[str, list[ModelMetrics], str, LinearRegressionResult, list[str], dict[str, list[str]], dict]:
    """
    Train all ML models and return results.
    
    Returns:
        (model_id, model_metrics, best_label, linear_result, feature_names, categorical_values, trained_pipelines)
    """
    # Apply filters
    if filters:
        df = apply_filters(df, filters)
    
    # Prepare features
    X, numeric_cols, categorical_cols, categorical_values = prepare_features(
        df, feature_cols, columns_meta, treat_missing_as_zero
    )
    
    # Prepare target
    y = df[target_col].copy()
    if treat_missing_as_zero:
        y = y.fillna(0)
    else:
        # Remove rows with missing target
        mask = y.notna()
        X = X[mask]
        y = y[mask]
    
    y = pd.to_numeric(y, errors='coerce').fillna(0)
    
    if len(X) < 10:
        raise ValueError("Not enough samples for training (need at least 10)")
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Build preprocessor
    preprocessor = build_preprocessor(numeric_cols, categorical_cols, treat_missing_as_zero)
    
    # Train linear regression first
    linear_result = train_linear_regression(X_train, y_train, feature_cols, columns_meta)
    
    # Train all ML models
    model_results = []
    trained_pipelines = {}
    
    for label, base_model in MODEL_REGISTRY.items():
        # Create fresh instance of model
        import copy
        model = copy.deepcopy(base_model)
        
        # Create pipeline
        pipeline = Pipeline([
            ('preprocessor', preprocessor),
            ('model', model)
        ])
        
        try:
            # Fit model
            pipeline.fit(X_train, y_train)
            
            # Predict on test set
            y_pred = pipeline.predict(X_test)
            
            # Calculate metrics
            r2 = round(float(r2_score(y_test, y_pred)), 4)
            rmse = round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4)
            mae = round(float(mean_absolute_error(y_test, y_pred)), 4)
            mape = _calculate_mape(np.array(y_test), y_pred)
            if mape is not None:
                mape = round(mape, 2)
            
            model_results.append({
                'label': label,
                'r2': r2,
                'rmse': rmse,
                'mae': mae,
                'mape': mape,
                'pipeline': pipeline
            })
            
            trained_pipelines[label] = pipeline
            
        except Exception as e:
            # Model failed, skip
            print(f"Model {label} failed: {e}")
            continue
    
    if not model_results:
        raise ValueError("All models failed to train")
    
    # Select best model
    if selection_metric == "r2":
        best = max(model_results, key=lambda x: x['r2'])
    elif selection_metric == "mae":
        best = min(model_results, key=lambda x: x['mae'])
    else:  # rmse
        best = min(model_results, key=lambda x: x['rmse'])
    
    best_label = best['label']
    
    # Create metrics response
    model_metrics = []
    for result in model_results:
        model_metrics.append(ModelMetrics(
            label=result['label'],
            r2=result['r2'],
            rmse=result['rmse'],
            mae=result['mae'],
            mape=result['mape'],
            is_best=(result['label'] == best_label)
        ))
    
    # Generate model ID
    model_id = str(uuid.uuid4())
    
    # Get encoded feature names from preprocessor
    feature_names = list(X.columns)
    
    return (
        model_id,
        model_metrics,
        best_label,
        linear_result,
        feature_names,
        categorical_values,
        trained_pipelines
    )


def save_trained_models(
    model_id: str,
    trained_pipelines: dict,
    metadata: dict
) -> Path:
    """Save trained models to disk."""
    model_dir = settings.MODELS_DIR / model_id
    model_dir.mkdir(parents=True, exist_ok=True)
    
    # Save each pipeline
    for label, pipeline in trained_pipelines.items():
        safe_label = label.replace(" ", "_").replace("-", "_")
        joblib.dump(pipeline, model_dir / f"{safe_label}.joblib")
    
    # Save metadata
    with open(model_dir / "metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    return model_dir


def load_trained_model(model_id: str, model_label: str) -> Pipeline:
    """Load a trained model from disk."""
    model_dir = settings.MODELS_DIR / model_id
    safe_label = model_label.replace(" ", "_").replace("-", "_")
    model_path = model_dir / f"{safe_label}.joblib"
    
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_label}")
    
    return joblib.load(model_path)


def load_model_metadata(model_id: str) -> dict:
    """Load model metadata."""
    model_dir = settings.MODELS_DIR / model_id
    metadata_path = model_dir / "metadata.json"
    
    if not metadata_path.exists():
        raise FileNotFoundError(f"Model metadata not found: {model_id}")
    
    with open(metadata_path, 'r') as f:
        return json.load(f)


def predict(
    model_id: str,
    model_label: Optional[str],
    input_values: dict[str, Any]
) -> tuple[float, str, float]:
    """
    Make prediction using a trained model.
    
    Returns:
        (predicted_value, model_used, expected_error)
    """
    # Load metadata
    metadata = load_model_metadata(model_id)
    
    # Determine which model to use
    if model_label is None:
        model_label = metadata['best_label']
    
    # Get model RMSE for error estimate
    model_metrics = metadata.get('model_metrics', {})
    rmse = model_metrics.get(model_label, {}).get('rmse', 0.0)
    
    # Load model
    pipeline = load_trained_model(model_id, model_label)
    
    # Prepare input DataFrame
    feature_names = metadata['feature_names']
    input_df = pd.DataFrame([{col: input_values.get(col) for col in feature_names}])
    
    # Convert numeric columns
    for col in input_df.columns:
        if col not in metadata.get('categorical_features', {}):
            input_df[col] = pd.to_numeric(input_df[col], errors='coerce').fillna(0)
    
    # Make prediction
    prediction = pipeline.predict(input_df)[0]
    
    return float(prediction), model_label, float(rmse)
