// API Types for Orion Analytics

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
    selected_stats?: string[];
    run_comparison_tests?: boolean;
    confidence_level?: number;
    sort_groups_by?: string;
    max_groups?: number;
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
    sem?: number;
    cv?: number;
    range?: number;
    p5?: number;
    p10?: number;
    p90?: number;
    p95?: number;
    skewness?: number;
    kurtosis?: number;
    ci_lower?: number;
    ci_upper?: number;
    sum?: number;
    missing_pct?: number;
    group_pct?: number;
}

export interface GroupSummary {
    group_key: string;
    group_labels: Record<string, string>;
    sample_size: number;
    pct_of_total: number;
}

export interface GroupComparisonTest {
    variable: string;
    variable_name: string;
    test_name: string;
    test_name_display: string;
    statistic: number;
    p_value: number;
    significant: boolean;
    alpha: number;
    effect_size?: number;
    effect_size_name?: string;
    effect_size_interpretation?: string;
    interpretation: string;
    practical_explanation?: string;
    assumptions_met: Record<string, boolean>;
}

export interface StatsResponse {
    sample_size: number;
    statistics: ColumnStats[];
    grouped_statistics?: Record<string, ColumnStats[]>;
    group_summaries?: GroupSummary[];
    group_comparison_tests?: GroupComparisonTest[];
    group_by_columns?: string[];
    total_groups?: number;
}

// ---------- Frequency Types ----------

export interface FrequencyRow {
    value: string;
    count: number;
    percentage: number;
    cumulative_count: number;
    cumulative_pct: number;
}

export interface FrequencyRequest {
    dataset_id: number;
    filters: FilterCondition[];
    variables: string[];
    max_categories?: number;
    treat_missing_as_zero?: boolean;
}

export interface FrequencyResponse {
    sample_size: number;
    tables: Record<string, FrequencyRow[]>;
}

// ---------- Crosstab Types ----------

export interface CrosstabRequest {
    dataset_id: number;
    filters: FilterCondition[];
    row_variable: string;
    col_variable: string;
    max_rows?: number;
    max_cols?: number;
    treat_missing_as_zero?: boolean;
}

export interface CrosstabResponse {
    sample_size: number;
    row_variable_name: string;
    col_variable_name: string;
    row_labels: string[];
    col_labels: string[];
    counts: number[][];
    percentages: number[][];
    row_totals: number[];
    col_totals: number[];
    grand_total: number;
    chi_square?: number;
    chi_square_p_value?: number;
    cramers_v?: number;
    degrees_of_freedom?: number;
    interpretation?: string;
}

// ---------- Normality Types ----------

export interface NormalityTestDetail {
    test_name: string;
    statistic: number;
    p_value: number;
    is_normal: boolean;
}

export interface NormalityResult {
    variable: string;
    variable_name: string;
    n: number;
    tests: NormalityTestDetail[];
    overall_normal: boolean;
    skewness: number;
    kurtosis: number;
    interpretation: string;
}

export interface NormalityRequest {
    dataset_id: number;
    filters: FilterCondition[];
    variables: string[];
    alpha?: number;
    treat_missing_as_zero?: boolean;
}

export interface NormalityResponse {
    sample_size: number;
    results: NormalityResult[];
    recommendation: string;
}

// ---------- Hypothesis Test Types ----------

export interface HypothesisTestRequest {
    dataset_id: number;
    filters: FilterCondition[];
    test_type: string;
    variable: string;
    group_variable?: string;
    paired_variable?: string;
    test_value?: number;
    alternative?: string;
    alpha?: number;
    treat_missing_as_zero?: boolean;
}

export interface HypothesisTestResponse {
    test_name: string;
    test_type: string;
    statistic: number;
    p_value: number;
    significant: boolean;
    effect_size?: number;
    effect_size_name?: string;
    effect_size_interpretation?: string;
    ci_lower?: number;
    ci_upper?: number;
    decision: string;
    interpretation: string;
    groups_summary?: Record<string, unknown>[];
}

// ---------- Chart Data Types ----------

export interface ChartDataRequest {
    dataset_id: number;
    filters: FilterCondition[];
    variable: string;
    group_by: string;
    treat_missing_as_zero?: boolean;
    max_groups?: number;
}

export interface ChartDataResponse {
    variable_name: string;
    group_variable_name: string;
    groups: Record<string, number[]>;
    group_stats: Record<string, Record<string, number>>;
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

// ---------- Composite Report Types ----------

export type ReportSectionType = 'descriptive' | 'crosstab' | 'ml';

export interface ReportSection {
    id: string;
    section_type: ReportSectionType;
    title: string;
    created_at: string;
    payload: Record<string, unknown>;
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
    report_sections?: ReportSection[];
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

// ---------- Project (Operationalization) Types ----------

export type ProjectStatus = 'draft' | 'active' | 'archived';

export interface ProjectTrainConfig {
    filters: FilterCondition[];
    selection_metric: string;
    treat_missing_as_zero: boolean;
}

export interface ProjectInputField {
    col_key: string;
    name: string;
    var_type: 'categorical' | 'discrete' | 'continuous' | string;
    input_type: 'number' | 'select' | string;
    required?: boolean;
    default_value?: unknown;
    allowed_values?: (string | number)[];
    description?: string;
}

export interface ProjectCreate {
    name: string;
    description?: string;
    dataset_id: number;
    model_id: string;
    model_label?: string;
    target: string;
    features: string[];
    train_config: ProjectTrainConfig;
    status?: ProjectStatus;
}

export interface ProjectUpdate {
    name?: string;
    description?: string;
    status?: ProjectStatus;
}

export interface ProjectSummary {
    id: number;
    name: string;
    dataset_id: number;
    dataset_name?: string;
    model_label: string;
    target: string;
    status: ProjectStatus;
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: number;
    name: string;
    description?: string;
    dataset_id: number;
    dataset_name?: string;
    model_id: string;
    model_label: string;
    target: string;
    features: string[];
    input_schema: ProjectInputField[];
    train_config: ProjectTrainConfig;
    model_metrics: Record<string, unknown>;
    status: ProjectStatus;
    created_at: string;
    updated_at: string;
}

export interface ProjectList {
    projects: ProjectSummary[];
    total: number;
}

export interface ProjectPredictRequest {
    input_values: Record<string, unknown>;
}

export interface ProjectPredictResponse {
    predicted_value: number;
    model_used: string;
    expected_error: number;
}

export interface ProjectRun {
    id: number;
    project_id: number;
    input_values: Record<string, unknown>;
    predicted_value: number;
    model_used: string;
    expected_error: number;
    created_at: string;
}

export interface ProjectRunList {
    runs: ProjectRun[];
    total: number;
}

// ---------- App State Types ----------

export interface AppState {
    currentDataset: DatasetMeta | null;
    filters: FilterCondition[];
    treatMissingAsZero: boolean;
}

// ---------- Activity Log Types ----------

export interface ActivityLog {
    id: number;
    action: 'upload' | 'access' | 'delete' | 'update' | 'view';
    dataset_id?: number;
    dataset_name?: string;
    filename?: string;
    user?: string;
    ip_address?: string;
    details?: string;
    created_at: string;
}

export interface ActivityLogList {
    logs: ActivityLog[];
    total: number;
}
