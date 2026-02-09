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
    selected_stats: Optional[list[str]] = None  # None = all stats
    run_comparison_tests: bool = False
    confidence_level: float = 0.95
    sort_groups_by: Optional[str] = None  # 'name', 'count', 'mean_asc', 'mean_desc'
    max_groups: int = 50


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
    sem: Optional[float] = None
    cv: Optional[float] = None
    range: Optional[float] = None
    p5: Optional[float] = None
    p10: Optional[float] = None
    p90: Optional[float] = None
    p95: Optional[float] = None
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None
    sum: Optional[float] = None
    missing_pct: Optional[float] = None
    group_pct: Optional[float] = None


class GroupSummary(BaseModel):
    """Summary for a single group."""
    group_key: str
    group_labels: dict[str, str]
    sample_size: int
    pct_of_total: float


class GroupComparisonTest(BaseModel):
    """Result of statistical test comparing groups."""
    variable: str
    variable_name: str
    test_name: str
    test_name_display: str
    statistic: float
    p_value: float
    significant: bool
    alpha: float
    effect_size: Optional[float] = None
    effect_size_name: Optional[str] = None
    effect_size_interpretation: Optional[str] = None
    interpretation: str
    assumptions_met: dict[str, bool] = {}


class StatsResponse(BaseModel):
    """Response with statistics."""
    sample_size: int
    statistics: list[ColumnStats]
    grouped_statistics: Optional[dict[str, list[ColumnStats]]] = None
    group_summaries: Optional[list[GroupSummary]] = None
    group_comparison_tests: Optional[list[GroupComparisonTest]] = None
    group_by_columns: Optional[list[str]] = None
    total_groups: Optional[int] = None


# ---------- Frequency Schemas ----------

class FrequencyRow(BaseModel):
    """Single row in a frequency table."""
    value: str
    count: int
    percentage: float
    cumulative_count: int
    cumulative_pct: float


class FrequencyRequest(BaseModel):
    """Request for frequency tables."""
    dataset_id: int
    filters: list[FilterCondition] = []
    variables: list[str]
    max_categories: int = 200
    treat_missing_as_zero: bool = True


class FrequencyResponse(BaseModel):
    """Response with frequency tables."""
    sample_size: int
    tables: dict[str, list[FrequencyRow]]


# ---------- Crosstab Schemas ----------

class CrosstabRequest(BaseModel):
    """Request for cross-tabulation."""
    dataset_id: int
    filters: list[FilterCondition] = []
    row_variable: str
    col_variable: str
    max_rows: int = 30
    max_cols: int = 30
    treat_missing_as_zero: bool = True


class CrosstabResponse(BaseModel):
    """Response with cross-tabulation."""
    sample_size: int
    row_variable_name: str
    col_variable_name: str
    row_labels: list[str]
    col_labels: list[str]
    counts: list[list[int]]
    percentages: list[list[float]]
    row_totals: list[int]
    col_totals: list[int]
    grand_total: int
    chi_square: Optional[float] = None
    chi_square_p_value: Optional[float] = None
    cramers_v: Optional[float] = None
    degrees_of_freedom: Optional[int] = None
    interpretation: Optional[str] = None


# ---------- Normality Schemas ----------

class NormalityTestDetail(BaseModel):
    """Result of a single normality test."""
    test_name: str
    statistic: float
    p_value: float
    is_normal: bool


class NormalityResult(BaseModel):
    """Normality test results for a single variable."""
    variable: str
    variable_name: str
    n: int
    tests: list[NormalityTestDetail]
    overall_normal: bool
    skewness: float
    kurtosis: float
    interpretation: str


class NormalityRequest(BaseModel):
    """Request for normality tests."""
    dataset_id: int
    filters: list[FilterCondition] = []
    variables: list[str]
    alpha: float = 0.05
    treat_missing_as_zero: bool = True


class NormalityResponse(BaseModel):
    """Response with normality test results."""
    sample_size: int
    results: list[NormalityResult]
    recommendation: str


# ---------- Hypothesis Test Schemas ----------

class HypothesisTestRequest(BaseModel):
    """Request for hypothesis test."""
    dataset_id: int
    filters: list[FilterCondition] = []
    test_type: str  # 'one_sample_t', 'independent_t', 'paired_t', 'one_way_anova', 'kruskal_wallis', 'mann_whitney', 'wilcoxon'
    variable: str
    group_variable: Optional[str] = None
    paired_variable: Optional[str] = None
    test_value: Optional[float] = None
    alternative: str = "two-sided"
    alpha: float = 0.05
    treat_missing_as_zero: bool = True


class HypothesisTestResponse(BaseModel):
    """Response with hypothesis test result."""
    test_name: str
    test_type: str
    statistic: float
    p_value: float
    significant: bool
    effect_size: Optional[float] = None
    effect_size_name: Optional[str] = None
    effect_size_interpretation: Optional[str] = None
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None
    decision: str
    interpretation: str
    groups_summary: Optional[list[dict[str, Any]]] = None


# ---------- Chart Data Schemas ----------

class ChartDataRequest(BaseModel):
    """Request for chart data by group."""
    dataset_id: int
    filters: list[FilterCondition] = []
    variable: str
    group_by: str
    treat_missing_as_zero: bool = True
    max_groups: int = 20


class ChartDataResponse(BaseModel):
    """Response with grouped data for charts."""
    variable_name: str
    group_variable_name: str
    groups: dict[str, list[float]]
    group_stats: dict[str, dict[str, float]]  # {group: {mean, median, std, ci_lower, ci_upper}}


# ---------- Export Schemas ----------

class ExportRequest(BaseModel):
    """Request for Excel export."""
    dataset_id: int
    filters: list[FilterCondition] = []
    variables: list[str]
    group_by: list[str] = []
    treat_missing_as_zero: bool = True
    selected_stats: Optional[list[str]] = None
    include_sheets: list[str] = ["descriptive"]


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


# ---------- Activity Log Schemas ----------

class ActivityLogResponse(BaseModel):
    """Activity log response."""
    id: int
    action: str
    dataset_id: Optional[int]
    dataset_name: Optional[str]
    filename: Optional[str]
    user: Optional[str]
    ip_address: Optional[str]
    details: Optional[str]
    created_at: datetime


class ActivityLogList(BaseModel):
    """List of activity logs."""
    logs: list[ActivityLogResponse]
    total: int

