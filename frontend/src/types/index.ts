// API Types for Orion Stats

// ---------- Column & Dataset Types ----------

export interface ColumnMeta {
    name: string;
    col_key: string;
    dtype: string;
    var_type: 'categorical' | 'discrete' | 'continuous';
    unique_count: number;
    missing_count: number;
}

export interface DatasetMeta {
    id: number;
    name: string;
    original_filename: string;
    row_count: number;
    col_count: number;
    columns: ColumnMeta[];
    created_at: string;
}

export interface DatasetList {
    datasets: DatasetMeta[];
}

// ---------- Filter Types ----------

export interface FilterCondition {
    col_key: string;
    values: (string | number)[];
}

// ---------- Data Query Types ----------

export interface DataQueryRequest {
    dataset_id: number;
    filters: FilterCondition[];
    limit: number;
    offset: number;
}

export interface DataQueryResponse {
    data: Record<string, unknown>[];
    total_count: number;
    filtered_count: number;
}

export interface UniqueValuesResponse {
    col_key: string;
    values: (string | number)[];
}

// ---------- Statistics Types ----------

export interface StatsRequest {
    dataset_id: number;
    filters: FilterCondition[];
    variables: string[];
    group_by: string[];
    treat_missing_as_zero: boolean;
}

export interface ColumnStats {
    col_key: string;
    name: string;
    count: number;
    missing_count: number;
    mean?: number;
    median?: number;
    mode?: number;
    std?: number;
    variance?: number;
    min?: number;
    max?: number;
    q1?: number;
    q3?: number;
    iqr?: number;
}

export interface StatsResponse {
    sample_size: number;
    statistics: ColumnStats[];
    grouped_statistics?: Record<string, ColumnStats[]>;
}

// ---------- Correlation Types ----------

export interface CorrelationRequest {
    dataset_id: number;
    filters: FilterCondition[];
    variables: string[];
    treat_missing_as_zero: boolean;
}

export interface CorrelationResponse {
    sample_size: number;
    variables: string[];
    matrix: number[][];
}

// ---------- ML Types ----------

export interface MLTrainRequest {
    dataset_id: number;
    filters: FilterCondition[];
    target: string;
    features: string[];
    treat_missing_as_zero: boolean;
    selection_metric: 'r2' | 'rmse' | 'mae';
}

export interface ModelMetrics {
    label: string;
    r2: number;
    rmse: number;
    mae: number;
    mape?: number;
    is_best: boolean;
}

export interface LinearCoefficient {
    feature: string;
    coefficient: number;
    std_error?: number;
    t_value?: number;
    p_value?: number;
}

export interface LinearRegressionResult {
    equation: string;
    r2: number;
    rmse: number;
    intercept: number;
    coefficients: LinearCoefficient[];
}

export interface MLTrainResponse {
    model_id: string;
    models: ModelMetrics[];
    best_model_label: string;
    linear_regression: LinearRegressionResult;
    feature_names: string[];
    categorical_features: Record<string, string[]>;
}

export interface MLPredictRequest {
    model_id: string;
    model_label?: string;
    input_values: Record<string, unknown>;
}

export interface MLPredictResponse {
    predicted_value: number;
    model_used: string;
    expected_error: number;
}

// ---------- Scenario Types ----------

export interface ScenarioPayload {
    filters: FilterCondition[];
    stats_variables: string[];
    stats_group_by: string[];
    correlation_variables: string[];
    target?: string;
    features: string[];
    selection_metric: string;
    treat_missing_as_zero: boolean;
    best_model_label?: string;
    model_id?: string;
}

export interface ScenarioCreate {
    name: string;
    description?: string;
    dataset_id: number;
    payload: ScenarioPayload;
}

export interface Scenario {
    id: number;
    name: string;
    description?: string;
    dataset_id: number;
    payload: ScenarioPayload;
    created_at: string;
    updated_at: string;
}

export interface ScenarioList {
    scenarios: Scenario[];
}

// ---------- App State Types ----------

export interface AppState {
    currentDataset: DatasetMeta | null;
    filters: FilterCondition[];
    treatMissingAsZero: boolean;
}
