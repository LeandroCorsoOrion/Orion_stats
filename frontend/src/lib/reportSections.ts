import type {
    FilterCondition,
    ReportSection,
    CrosstabResponse,
    MLTrainResponse,
} from '@/types';

function sectionId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDescriptiveSection(params: {
    title?: string;
    filters: FilterCondition[];
    variables: string[];
    group_by: string[];
    selected_stats?: string[];
    run_comparison_tests: boolean;
    treat_missing_as_zero: boolean;
    max_groups?: number;
    confidence_level?: number;
}) : ReportSection {
    return {
        id: sectionId('desc'),
        section_type: 'descriptive',
        title: params.title || 'Analise Descritiva',
        created_at: new Date().toISOString(),
        payload: {
            filters: params.filters,
            variables: params.variables,
            group_by: params.group_by,
            selected_stats: params.selected_stats || [],
            run_comparison_tests: params.run_comparison_tests,
            treat_missing_as_zero: params.treat_missing_as_zero,
            max_groups: params.max_groups ?? 200,
            confidence_level: params.confidence_level ?? 0.95,
        },
    };
}

export function buildCrosstabSection(params: {
    title?: string;
    filters: FilterCondition[];
    row_variable: string;
    col_variable: string;
    row_variable_name: string;
    col_variable_name: string;
    treat_missing_as_zero: boolean;
    max_rows?: number;
    max_cols?: number;
    result?: CrosstabResponse | null;
}) : ReportSection {
    return {
        id: sectionId('cross'),
        section_type: 'crosstab',
        title: params.title || `Crosstab: ${params.row_variable_name} x ${params.col_variable_name}`,
        created_at: new Date().toISOString(),
        payload: {
            filters: params.filters,
            row_variable: params.row_variable,
            col_variable: params.col_variable,
            row_variable_name: params.row_variable_name,
            col_variable_name: params.col_variable_name,
            treat_missing_as_zero: params.treat_missing_as_zero,
            max_rows: params.max_rows ?? 30,
            max_cols: params.max_cols ?? 30,
            summary: params.result
                ? {
                    sample_size: params.result.sample_size,
                    grand_total: params.result.grand_total,
                    chi_square: params.result.chi_square ?? null,
                    chi_square_p_value: params.result.chi_square_p_value ?? null,
                    cramers_v: params.result.cramers_v ?? null,
                }
                : null,
        },
    };
}

export function buildMLSection(params: {
    title?: string;
    filters: FilterCondition[];
    target: string;
    target_name: string;
    features: string[];
    feature_names: string[];
    selection_metric: 'r2' | 'rmse' | 'mae';
    treat_missing_as_zero: boolean;
    selected_model?: string | null;
    ml_result: MLTrainResponse;
}) : ReportSection {
    return {
        id: sectionId('ml'),
        section_type: 'ml',
        title: params.title || `Modelagem ML: ${params.target_name}`,
        created_at: new Date().toISOString(),
        payload: {
            filters: params.filters,
            target: params.target,
            target_name: params.target_name,
            features: params.features,
            feature_names: params.feature_names,
            selection_metric: params.selection_metric,
            treat_missing_as_zero: params.treat_missing_as_zero,
            selected_model: params.selected_model || params.ml_result.best_model_label,
            result_snapshot: {
                model_id: params.ml_result.model_id,
                best_model_label: params.ml_result.best_model_label,
                models: params.ml_result.models,
                linear_regression: params.ml_result.linear_regression,
            },
        },
    };
}
