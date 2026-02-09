"""
Orion Stats - Statistics Service
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

    def r4(v):
        return round(v, 4) if v is not None else None

    return ColumnStats(
        col_key=col_key,
        name=col_name,
        count=total_count,
        missing_count=missing_count,
        mean=r4(mean_val),
        median=r4(median_val),
        mode=r4(mode_val),
        std=r4(std_val),
        variance=r4(var_val),
        min=r4(min_val),
        max=r4(max_val),
        q1=r4(q1_val),
        q3=r4(q3_val),
        iqr=r4(iqr_val),
        sem=r4(sem_val),
        cv=r4(cv_val),
        range=r4(range_val),
        p5=r4(p5_val),
        p10=r4(p10_val),
        p90=r4(p90_val),
        p95=r4(p95_val),
        skewness=r4(skewness_val),
        kurtosis=r4(kurtosis_val),
        ci_lower=r4(ci_lower_val),
        ci_upper=r4(ci_upper_val),
        sum=r4(sum_val),
        missing_pct=missing_pct,
        group_pct=group_pct,
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

    groups = df.groupby(group_by_col)
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
            for key in group_keys:
                g = groups.get_group(key)[var].copy()
                if treat_missing_as_zero:
                    g = g.fillna(0)
                else:
                    g = g.dropna()
                g = pd.to_numeric(g, errors='coerce').dropna()
                if len(g) >= 2:
                    group_data.append(g.values)

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
                effect_name = "eta²"
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

            results.append(GroupComparisonTest(
                variable=var,
                variable_name=var_name,
                test_name=test_name,
                test_name_display=test_display,
                statistic=round(float(stat_val), 4),
                p_value=round(float(p_val), 6),
                significant=significant,
                alpha=alpha,
                effect_size=effect_val,
                effect_size_name=effect_name,
                effect_size_interpretation=effect_interp,
                interpretation=interpretation,
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
    max_groups: int = 50,
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

            groups = list(df.groupby(valid_group_by))
            total_groups = len(groups)

            # Sort groups
            if sort_groups_by == "count":
                groups.sort(key=lambda x: len(x[1]), reverse=True)
            elif sort_groups_by == "mean_asc" and variables:
                groups.sort(key=lambda x: x[1][variables[0]].mean() if variables[0] in x[1].columns else 0)
            elif sort_groups_by == "mean_desc" and variables:
                groups.sort(key=lambda x: x[1][variables[0]].mean() if variables[0] in x[1].columns else 0, reverse=True)
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
                    df, variables, valid_group_by[0],
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
