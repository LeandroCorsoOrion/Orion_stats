"""
Orion Stats - Pydantic Schemas
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Any


# ---------- Dataset Schemas ----------

class ColumnMeta(BaseModel):
    """Column metadata."""
    name: str  # Original column name
    col_key: str  # Sanitized key
    dtype: str  # pandas dtype
    var_type: str  # 'categorical', 'discrete', 'continuous'
    unique_count: int
    missing_count: int


class DatasetCreate(BaseModel):
    """Dataset creation response."""
    id: int
    name: str
    original_filename: str
    row_count: int
    col_count: int
    columns: list[ColumnMeta]
    created_at: datetime


class DatasetMeta(BaseModel):
    """Dataset metadata response."""
    id: int
    name: str
    original_filename: str
    row_count: int
    col_count: int
    columns: list[ColumnMeta]
    created_at: datetime


class DatasetList(BaseModel):
    """List of datasets."""
    datasets: list[DatasetMeta]


class ColumnTypeUpdate(BaseModel):
    """Update column variable type."""
    col_key: str
    var_type: str  # 'categorical', 'discrete', 'continuous'


# ---------- Data Query Schemas ----------

class FilterCondition(BaseModel):
    """Single filter condition."""
    col_key: str
    values: list[Any]  # Selected values for filtering


class DataQueryRequest(BaseModel):
    """Request for filtered data."""
    dataset_id: int
    filters: list[FilterCondition] = []
    limit: int = 50
    offset: int = 0


class DataQueryResponse(BaseModel):
    """Response with filtered data."""
    data: list[dict[str, Any]]
    total_count: int
    filtered_count: int


class UniqueValuesRequest(BaseModel):
    """Request unique values for a column."""
    dataset_id: int
    col_key: str


class UniqueValuesResponse(BaseModel):
    """Unique values for a column."""
    col_key: str
    values: list[Any]


# ---------- Statistics Schemas ----------

class StatsRequest(BaseModel):
    """Request for descriptive statistics."""
    dataset_id: int
    filters: list[FilterCondition] = []
    variables: list[str]  # col_keys for analysis
    group_by: list[str] = []  # col_keys for grouping
    treat_missing_as_zero: bool = True


class ColumnStats(BaseModel):
    """Statistics for a single column."""
    col_key: str
    name: str
    count: int
    missing_count: int
    mean: Optional[float] = None
    median: Optional[float] = None
    mode: Optional[float] = None
    std: Optional[float] = None
    variance: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    q1: Optional[float] = None
    q3: Optional[float] = None
    iqr: Optional[float] = None


class StatsResponse(BaseModel):
    """Response with statistics."""
    sample_size: int
    statistics: list[ColumnStats]
    grouped_statistics: Optional[dict[str, list[ColumnStats]]] = None


# ---------- Correlation Schemas ----------

class CorrelationRequest(BaseModel):
    """Request for correlation matrix."""
    dataset_id: int
    filters: list[FilterCondition] = []
    variables: list[str]  # col_keys
    treat_missing_as_zero: bool = True


class CorrelationResponse(BaseModel):
    """Response with correlation matrix."""
    sample_size: int  # Number of rows after filtering
    variables: list[str]  # Column names
    matrix: list[list[float]]  # NxN matrix


# ---------- ML Schemas ----------

class MLTrainRequest(BaseModel):
    """Request for model training."""
    dataset_id: int
    filters: list[FilterCondition] = []
    target: str  # col_key for Y
    features: list[str]  # col_keys for X
    treat_missing_as_zero: bool = True
    selection_metric: str = "rmse"  # 'r2', 'rmse', 'mae'


class ModelMetrics(BaseModel):
    """Metrics for a trained model."""
    label: str  # e.g., "Machine Learning - Pro"
    r2: float
    rmse: float
    mae: float
    mape: Optional[float] = None
    is_best: bool = False


class LinearCoefficient(BaseModel):
    """Linear regression coefficient."""
    feature: str
    coefficient: float
    std_error: Optional[float] = None
    t_value: Optional[float] = None
    p_value: Optional[float] = None


class LinearRegressionResult(BaseModel):
    """Linear regression result."""
    equation: str
    r2: float
    rmse: float
    intercept: float
    coefficients: list[LinearCoefficient]


class MLTrainResponse(BaseModel):
    """Response from model training."""
    model_id: str
    models: list[ModelMetrics]
    best_model_label: str
    linear_regression: LinearRegressionResult
    feature_names: list[str]  # Encoded feature names
    categorical_features: dict[str, list[str]]  # {col_key: [categories]}


class MLPredictRequest(BaseModel):
    """Request for prediction."""
    model_id: str
    model_label: Optional[str] = None  # If None, use best model
    input_values: dict[str, Any]  # {col_key: value}


class MLPredictResponse(BaseModel):
    """Prediction result."""
    predicted_value: float
    model_used: str
    expected_error: float  # RMSE of the model


# ---------- Scenario Schemas ----------

class ScenarioPayload(BaseModel):
    """Full scenario state."""
    filters: list[FilterCondition] = []
    stats_variables: list[str] = []
    stats_group_by: list[str] = []
    correlation_variables: list[str] = []
    target: Optional[str] = None
    features: list[str] = []
    selection_metric: str = "rmse"
    treat_missing_as_zero: bool = True
    best_model_label: Optional[str] = None
    model_id: Optional[str] = None


class ScenarioCreate(BaseModel):
    """Create scenario request."""
    name: str
    description: Optional[str] = None
    dataset_id: int
    payload: ScenarioPayload


class ScenarioUpdate(BaseModel):
    """Update scenario request."""
    name: Optional[str] = None
    description: Optional[str] = None
    payload: Optional[ScenarioPayload] = None


class ScenarioResponse(BaseModel):
    """Scenario response."""
    id: int
    name: str
    description: Optional[str]
    dataset_id: int
    payload: ScenarioPayload
    created_at: datetime
    updated_at: datetime


class ScenarioList(BaseModel):
    """List of scenarios."""
    scenarios: list[ScenarioResponse]
