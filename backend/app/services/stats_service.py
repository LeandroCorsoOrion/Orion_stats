"""
Orion Analytics - Statistics Service
Calculates descriptive statistics, correlation, and group comparisons.
"""
import math
import pandas as pd
import numpy as np
from scipy import stats as scipy_stats
from typing import Optional

from app.schemas.schemas import (
    ColumnStats, FilterCondition, GroupSummary, GroupComparisonTest
)
from app.services.data_service import apply_filters


def _safe_round(value, decimals: int = 4):
    """Round numeric values and drop non-finite results to keep JSON-safe payloads."""
    if value is None:
        return None
    try:
        numeric_value = float(value)
    except (TypeError, ValueError):
        return None
    if not np.isfinite(numeric_value):
        return None
    return round(numeric_value, decimals)


def _normalize_group_value(value):
    """
    Normalize categorical labels used for grouping.
    Keeps numeric/date values unchanged and trims noisy whitespace in strings.
    """
    if pd.isna(value):
        return value
    if isinstance(value, str):
        cleaned = " ".join(value.split())
        return cleaned if cleaned else np.nan
    return value


def normalize_group_columns(df: pd.DataFrame, group_cols: list[str]) -> pd.DataFrame:
    """
    Return a copy of dataframe with normalized textual group columns.
    This avoids splitting the same category into different groups due to whitespace.
    """
    if not group_cols:
        return df

    normalized = df.copy()
    for col in group_cols:
        if col not in normalized.columns:
            continue
        series = normalized[col]
        if (
            pd.api.types.is_object_dtype(series)
            or pd.api.types.is_string_dtype(series)
            or pd.api.types.is_categorical_dtype(series)
        ):
            normalized[col] = series.map(_normalize_group_value)
    return normalized


def _safe_group_mean_for_sort(group_df: pd.DataFrame, variable: str) -> float:
    """Numeric-safe group mean used only for sorting groups."""
    if variable not in group_df.columns:
        return float("-inf")
    numeric = pd.to_numeric(group_df[variable], errors="coerce")
    if numeric.notna().sum() == 0:
        return float("-inf")
    return float(numeric.mean())


def _build_group_practical_explanation(
    variable_name: str,
    significant: bool,
    effect_interp: Optional[str],
    is_normal: bool,
    group_labels: list[str],
    group_data: list[np.ndarray],
) -> str:
    """
    Build a plain-language explanation focused on practical action.
    """
    if len(group_data) < 2 or len(group_labels) < 2:
        return (
            f"Na pratica, ainda nao ha grupos suficientes para explicar o impacto de {variable_name} "
            "com seguranca."
        )

    center_label = "media" if is_normal else "mediana"
    centers = [
        float(np.mean(values)) if is_normal else float(np.median(values))
        for values in group_data
    ]

    top_idx = int(np.argmax(centers))
    bottom_idx = int(np.argmin(centers))
    top_group = str(group_labels[top_idx])
    bottom_group = str(group_labels[bottom_idx])
    top_center = centers[top_idx]
    bottom_center = centers[bottom_idx]
    delta = top_center - bottom_center

    def _fmt_num(value: float) -> str:
        rounded = _safe_round(value, 2)
        return f"{rounded:.2f}" if rounded is not None else "-"

    top_text = _fmt_num(top_center)
    bottom_text = _fmt_num(bottom_center)
    delta_text = _fmt_num(delta)

    if significant:
        if effect_interp in {"grande", "medio"}:
            intro = (
                f"Na pratica, os grupos realmente se comportam de forma diferente em {variable_name}. "
                f"O impacto foi classificado como {effect_interp}."
            )
            action = (
                f" Priorize investigar por que o grupo '{top_group}' esta melhor que '{bottom_group}' "
                "e teste replicar essa pratica."
            )
        elif effect_interp == "pequeno":
            intro = (
                f"Na pratica, existe diferenca em {variable_name}, mas o impacto tende a ser pequeno."
            )
            action = (
                " Use esse resultado como apoio e valide com custo, processo e metas antes de mudar operacao."
            )
        else:
            intro = (
                f"Na pratica, a diferenca em {variable_name} foi detectada, mas e muito pequena."
            )
            action = (
                " Evite decidir apenas com este teste; combine com indicadores de negocio."
            )
    else:
        intro = (
            f"Na pratica, com os dados atuais, os grupos estao parecidos em {variable_name}."
        )
        action = (
            " Nao ha sinal forte para tratar grupos de forma diferente agora; continue monitorando."
        )

    if top_group == bottom_group or abs(delta) < 1e-12:
        group_context = f" As {center_label}s dos grupos ficaram muito proximas."
    else:
        group_context = (
            f" Referencia rapida: maior {center_label} no grupo '{top_group}' ({top_text}) e "
            f"menor no grupo '{bottom_group}' ({bottom_text}), diferenca aproximada de {delta_text}."
        )

    normality_note = ""
    if not is_normal:
        normality_note = (
            " Como os dados nao atenderam normalidade, a comparacao foi feita por ranking "
            "(mais robusta para outliers)."
        )

    sample_sizes = [len(values) for values in group_data]
    sample_note = ""
    if sample_sizes and min(sample_sizes) < 10:
        sample_note = (
            " Pelo menos um grupo tem poucos registros; confirme com mais dados antes de uma decisao definitiva."
        )

    return f"{intro}{group_context}{action}{normality_note}{sample_note}"


def calculate_column_stats(
    series: pd.Series,
    col_key: str,
    col_name: str,
    treat_missing_as_zero: bool = True,
    confidence_level: float = 0.95,
    total_count_for_group_pct: int = None,
) -> ColumnStats:
    """Calculate descriptive statistics for a single column."""
    missing_count = int(series.isna().sum())
    total_count = len(series)

    if treat_missing_as_zero:
        series = series.fillna(0)
    else:
        series = series.dropna()

    n = len(series)
    missing_pct = round(missing_count / total_count * 100, 2) if total_count > 0 else 0.0
    group_pct = round(total_count / total_count_for_group_pct * 100, 2) if total_count_for_group_pct and total_count_for_group_pct > 0 else None

    if n == 0:
        return ColumnStats(
            col_key=col_key, name=col_name,
            count=total_count, missing_count=missing_count,
            missing_pct=missing_pct, group_pct=group_pct,
        )

    try:
        mean_val = float(series.mean())
        median_val = float(series.median())
        std_val = float(series.std())
        var_val = float(series.var())
        min_val = float(series.min())
        max_val = float(series.max())
        q1_val = float(series.quantile(0.25))
        q3_val = float(series.quantile(0.75))
        iqr_val = q3_val - q1_val
        sum_val = float(series.sum())
        range_val = max_val - min_val

        # Mode
        mode_result = scipy_stats.mode(series, keepdims=True)
        mode_val = float(mode_result.mode[0]) if len(mode_result.mode) > 0 else None

        # SEM
        sem_val = std_val / math.sqrt(n) if n > 0 and std_val is not None else None

        # CV
        cv_val = round(std_val / mean_val * 100, 4) if mean_val != 0 else None

        # Additional percentiles
        p5_val = float(series.quantile(0.05))
        p10_val = float(series.quantile(0.10))
        p90_val = float(series.quantile(0.90))
        p95_val = float(series.quantile(0.95))

        # Skewness & Kurtosis
        skewness_val = float(series.skew()) if n >= 3 else None
        kurtosis_val = float(series.kurtosis()) if n >= 4 else None

        # Confidence Interval
        ci_lower_val = None
        ci_upper_val = None
        if n > 1 and sem_val and sem_val > 0:
            t_crit = scipy_stats.t.ppf((1 + confidence_level) / 2, df=n - 1)
            ci_lower_val = mean_val - t_crit * sem_val
            ci_upper_val = mean_val + t_crit * sem_val

    except Exception:
        return ColumnStats(
            col_key=col_key, name=col_name,
            count=total_count, missing_count=missing_count,
            missing_pct=missing_pct, group_pct=group_pct,
        )

    return ColumnStats(
        col_key=col_key,
        name=col_name,
        count=total_count,
        missing_count=missing_count,
        mean=_safe_round(mean_val),
        median=_safe_round(median_val),
        mode=_safe_round(mode_val),
        std=_safe_round(std_val),
        variance=_safe_round(var_val),
        min=_safe_round(min_val),
        max=_safe_round(max_val),
        q1=_safe_round(q1_val),
        q3=_safe_round(q3_val),
        iqr=_safe_round(iqr_val),
        sem=_safe_round(sem_val),
        cv=_safe_round(cv_val),
        range=_safe_round(range_val),
        p5=_safe_round(p5_val),
        p10=_safe_round(p10_val),
        p90=_safe_round(p90_val),
        p95=_safe_round(p95_val),
        skewness=_safe_round(skewness_val),
        kurtosis=_safe_round(kurtosis_val),
        ci_lower=_safe_round(ci_lower_val),
        ci_upper=_safe_round(ci_upper_val),
        sum=_safe_round(sum_val),
        missing_pct=_safe_round(missing_pct, 2),
        group_pct=_safe_round(group_pct, 2),
    )


def compare_groups(
    df: pd.DataFrame,
    variables: list[str],
    group_by_col: str,
    columns_meta: dict[str, str],
    alpha: float = 0.05,
    treat_missing_as_zero: bool = True,
) -> list[GroupComparisonTest]:
    """
    Compare groups statistically for each variable.
    Automatic test selection:
    - 2 groups: t-test or Mann-Whitney
    - 3+ groups: ANOVA or Kruskal-Wallis
    """
    results = []

    if group_by_col not in df.columns:
        return results

    normalized_df = normalize_group_columns(df, [group_by_col])
    groups = normalized_df.groupby(group_by_col)
    group_keys = list(groups.groups.keys())

    if len(group_keys) < 2:
        return results

    for var in variables:
        if var not in df.columns:
            continue

        var_name = columns_meta.get(var, var)

        try:
            # Collect group data
            group_data = []
            valid_group_keys = []
            for key in group_keys:
                g = groups.get_group(key)[var].copy()
                if treat_missing_as_zero:
                    g = g.fillna(0)
                else:
                    g = g.dropna()
                g = pd.to_numeric(g, errors='coerce').dropna()
                if len(g) >= 2:
                    group_data.append(g.values)
                    valid_group_keys.append(str(key))

            if len(group_data) < 2:
                continue

            n_groups = len(group_data)

            # Check normality per group
            normal_count = 0
            for gd in group_data:
                if len(gd) >= 8 and len(gd) < 5000:
                    try:
                        _, p_norm = scipy_stats.shapiro(gd)
                        if p_norm > alpha:
                            normal_count += 1
                    except Exception:
                        pass
                elif len(gd) >= 20:
                    try:
                        _, p_norm = scipy_stats.normaltest(gd)
                        if p_norm > alpha:
                            normal_count += 1
                    except Exception:
                        pass

            is_normal = normal_count >= len(group_data) * 0.5

            # Check homogeneity of variance
            is_homogeneous = False
            try:
                _, p_lev = scipy_stats.levene(*group_data)
                is_homogeneous = p_lev > alpha
            except Exception:
                pass

            assumptions = {
                "normalidade": is_normal,
                "homocedasticidade": is_homogeneous,
            }

            # Select and run test
            if n_groups == 2:
                if is_normal:
                    stat_val, p_val = scipy_stats.ttest_ind(
                        group_data[0], group_data[1],
                        equal_var=is_homogeneous
                    )
                    test_name = "Welch's t-test" if not is_homogeneous else "t-test independente"
                    test_display = "Teste t" if is_homogeneous else "Teste t de Welch"
                else:
                    stat_val, p_val = scipy_stats.mannwhitneyu(
                        group_data[0], group_data[1], alternative='two-sided'
                    )
                    test_name = "Mann-Whitney U"
                    test_display = "Mann-Whitney U"

                # Effect size: Cohen's d
                pooled_std = math.sqrt(
                    (np.var(group_data[0], ddof=1) + np.var(group_data[1], ddof=1)) / 2
                )
                cohens_d = abs(np.mean(group_data[0]) - np.mean(group_data[1])) / pooled_std if pooled_std > 0 else 0
                effect_val = round(cohens_d, 4)
                effect_name = "d de Cohen"
                if cohens_d < 0.2:
                    effect_interp = "negligivel"
                elif cohens_d < 0.5:
                    effect_interp = "pequeno"
                elif cohens_d < 0.8:
                    effect_interp = "medio"
                else:
                    effect_interp = "grande"

            else:
                # 3+ groups
                if is_normal and is_homogeneous:
                    stat_val, p_val = scipy_stats.f_oneway(*group_data)
                    test_name = "ANOVA one-way"
                    test_display = "ANOVA"
                elif is_normal:
                    # Welch's ANOVA via scipy
                    stat_val, p_val = scipy_stats.f_oneway(*group_data)
                    test_name = "Welch's ANOVA"
                    test_display = "ANOVA de Welch"
                else:
                    stat_val, p_val = scipy_stats.kruskal(*group_data)
                    test_name = "Kruskal-Wallis"
                    test_display = "Kruskal-Wallis"

                # Effect size: eta-squared
                all_data = np.concatenate(group_data)
                grand_mean = np.mean(all_data)
                ss_between = sum(len(gd) * (np.mean(gd) - grand_mean) ** 2 for gd in group_data)
                ss_total = np.sum((all_data - grand_mean) ** 2)
                eta_sq = ss_between / ss_total if ss_total > 0 else 0
                effect_val = round(eta_sq, 4)
                effect_name = "eta2"
                if eta_sq < 0.01:
                    effect_interp = "negligivel"
                elif eta_sq < 0.06:
                    effect_interp = "pequeno"
                elif eta_sq < 0.14:
                    effect_interp = "medio"
                else:
                    effect_interp = "grande"

            significant = p_val < alpha
            p_str = f"p < 0.001" if p_val < 0.001 else f"p = {p_val:.4f}"

            if significant:
                interpretation = (
                    f"Existe diferenca estatisticamente significativa de {var_name} entre os grupos "
                    f"({test_display}, estatistica = {stat_val:.2f}, {p_str}). "
                    f"Tamanho de efeito ({effect_name} = {effect_val:.3f}): {effect_interp}."
                )
            else:
                interpretation = (
                    f"Nao ha diferenca significativa de {var_name} entre os grupos "
                    f"({test_display}, estatistica = {stat_val:.2f}, {p_str})."
                )

            if not is_normal:
                interpretation += " Teste nao-parametrico utilizado (normalidade nao atendida)."

            practical_explanation = _build_group_practical_explanation(
                variable_name=var_name,
                significant=significant,
                effect_interp=effect_interp,
                is_normal=is_normal,
                group_labels=valid_group_keys,
                group_data=group_data,
            )

            statistic_value = _safe_round(stat_val, 4)
            p_value = _safe_round(p_val, 6)
            effect_size_value = _safe_round(effect_val, 4) if effect_val is not None else None
            if statistic_value is None or p_value is None:
                continue

            results.append(GroupComparisonTest(
                variable=var,
                variable_name=var_name,
                test_name=test_name,
                test_name_display=test_display,
                statistic=statistic_value,
                p_value=p_value,
                significant=significant,
                alpha=alpha,
                effect_size=effect_size_value,
                effect_size_name=effect_name,
                effect_size_interpretation=effect_interp,
                interpretation=interpretation,
                practical_explanation=practical_explanation,
                assumptions_met=assumptions,
            ))

        except Exception:
            continue

    return results


def calculate_descriptive_stats(
    df: pd.DataFrame,
    variables: list[str],
    columns_meta: dict[str, str],
    filters: list[FilterCondition] = None,
    group_by: list[str] = None,
    treat_missing_as_zero: bool = True,
    confidence_level: float = 0.95,
    run_comparison_tests: bool = False,
    sort_groups_by: str = None,
    max_groups: int = 200,
) -> tuple[int, list[ColumnStats], Optional[dict[str, list[ColumnStats]]], Optional[list[GroupSummary]], Optional[list[GroupComparisonTest]], Optional[int]]:
    """
    Calculate descriptive statistics for selected variables.

    Returns:
        (sample_size, statistics_list, grouped_statistics, group_summaries, comparison_tests, total_groups)
    """
    if filters:
        df = apply_filters(df, filters)

    sample_size = len(df)

    # Overall statistics
    overall_stats = []
    for col_key in variables:
        if col_key in df.columns:
            col_name = columns_meta.get(col_key, col_key)
            col_stats = calculate_column_stats(
                df[col_key].copy(), col_key, col_name,
                treat_missing_as_zero, confidence_level,
            )
            overall_stats.append(col_stats)

    # Grouped statistics
    grouped_stats = None
    group_summaries = None
    comparison_tests = None
    total_groups = None

    if group_by and len(group_by) > 0:
        valid_group_by = [g for g in group_by if g in df.columns]

        if valid_group_by:
            grouped_stats = {}
            group_summaries = []
            grouped_df = normalize_group_columns(df, valid_group_by)
            groups = list(grouped_df.groupby(valid_group_by))
            total_groups = len(groups)

            # Sort groups
            if sort_groups_by == "count":
                groups.sort(key=lambda x: len(x[1]), reverse=True)
            elif sort_groups_by == "mean_asc" and variables:
                groups.sort(key=lambda x: _safe_group_mean_for_sort(x[1], variables[0]))
            elif sort_groups_by == "mean_desc" and variables:
                groups.sort(key=lambda x: _safe_group_mean_for_sort(x[1], variables[0]), reverse=True)
            # default: sorted by name (groupby already does this)

            # Limit groups
            groups = groups[:max_groups]

            for group_vals, group_df in groups:
                if isinstance(group_vals, tuple):
                    group_key = " | ".join(str(v) for v in group_vals)
                    group_labels = {col: str(val) for col, val in zip(valid_group_by, group_vals)}
                else:
                    group_key = str(group_vals)
                    group_labels = {valid_group_by[0]: str(group_vals)}

                group_stats_list = []
                for col_key in variables:
                    if col_key in group_df.columns:
                        col_name = columns_meta.get(col_key, col_key)
                        col_stats = calculate_column_stats(
                            group_df[col_key].copy(), col_key, col_name,
                            treat_missing_as_zero, confidence_level,
                            total_count_for_group_pct=sample_size,
                        )
                        group_stats_list.append(col_stats)

                grouped_stats[group_key] = group_stats_list

                group_summaries.append(GroupSummary(
                    group_key=group_key,
                    group_labels=group_labels,
                    sample_size=len(group_df),
                    pct_of_total=round(len(group_df) / sample_size * 100, 2) if sample_size > 0 else 0,
                ))

            # Comparison tests
            if run_comparison_tests and len(valid_group_by) == 1 and total_groups >= 2:
                comparison_tests = compare_groups(
                    grouped_df, variables, valid_group_by[0],
                    columns_meta, alpha=0.05,
                    treat_missing_as_zero=treat_missing_as_zero,
                )

    return sample_size, overall_stats, grouped_stats, group_summaries, comparison_tests, total_groups


def calculate_correlation_matrix(
    df: pd.DataFrame,
    variables: list[str],
    columns_meta: dict[str, str],
    filters: list[FilterCondition] = None,
    treat_missing_as_zero: bool = True
) -> tuple[int, list[str], list[list[float]]]:
    """Calculate Pearson correlation matrix for selected variables."""
    if filters:
        df = apply_filters(df, filters)

    sample_size = len(df)
    valid_cols = [col for col in variables if col in df.columns]

    if len(valid_cols) < 2:
        return sample_size, [], []

    subset = df[valid_cols].copy()
    numeric_subset = pd.DataFrame()
    for col in subset.columns:
        numeric_subset[col] = pd.to_numeric(subset[col], errors='coerce')

    if treat_missing_as_zero:
        numeric_subset = numeric_subset.fillna(0)
    else:
        numeric_subset = numeric_subset.dropna()

    cols_to_keep = []
    for col in numeric_subset.columns:
        if numeric_subset[col].notna().any() and numeric_subset[col].std() > 0:
            cols_to_keep.append(col)

    if len(cols_to_keep) < 2:
        return sample_size, [], []

    numeric_subset = numeric_subset[cols_to_keep]
    corr_matrix = numeric_subset.corr(method='pearson')
    var_names = [columns_meta.get(col, col) for col in cols_to_keep]

    matrix = []
    for row_col in cols_to_keep:
        row = []
        for col in cols_to_keep:
            val = corr_matrix.loc[row_col, col]
            row.append(round(float(val), 2) if not pd.isna(val) else 0.0)
        matrix.append(row)

    return sample_size, var_names, matrix
