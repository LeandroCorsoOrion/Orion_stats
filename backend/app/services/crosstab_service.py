"""
Orion Analytics - Crosstab Service
Calculates cross-tabulation with chi-square test.
"""
import math
import pandas as pd
import numpy as np
from scipy import stats as scipy_stats
from typing import Optional

from app.schemas.schemas import FilterCondition, CrosstabResponse
from app.services.data_service import apply_filters


def calculate_crosstab(
    df: pd.DataFrame,
    row_variable: str,
    col_variable: str,
    columns_meta: dict[str, str],
    filters: Optional[list[FilterCondition]] = None,
    max_rows: int = 30,
    max_cols: int = 30,
    treat_missing_as_zero: bool = True,
) -> CrosstabResponse:
    """Calculate cross-tabulation with chi-square test."""
    if filters:
        df = apply_filters(df, filters)

    sample_size = len(df)

    if row_variable not in df.columns or col_variable not in df.columns:
        raise ValueError(f"Variables not found in dataset")

    row_series = df[row_variable].copy()
    col_series = df[col_variable].copy()

    if treat_missing_as_zero:
        row_series = row_series.fillna("(ausente)")
        col_series = col_series.fillna("(ausente)")
    else:
        mask = row_series.notna() & col_series.notna()
        row_series = row_series[mask]
        col_series = col_series[mask]

    ct = pd.crosstab(row_series, col_series)

    # Limit dimensions
    if len(ct.index) > max_rows:
        top_rows = ct.sum(axis=1).nlargest(max_rows).index
        ct = ct.loc[top_rows]
    if len(ct.columns) > max_cols:
        top_cols = ct.sum(axis=0).nlargest(max_cols).index
        ct = ct[top_cols]

    row_labels = [str(v) for v in ct.index.tolist()]
    col_labels = [str(v) for v in ct.columns.tolist()]
    counts = ct.values.tolist()
    grand_total = int(ct.values.sum())

    # Percentages (of total)
    percentages = []
    for row in counts:
        pct_row = [round(v / grand_total * 100, 2) if grand_total > 0 else 0 for v in row]
        percentages.append(pct_row)

    row_totals = [int(x) for x in ct.sum(axis=1).tolist()]
    col_totals = [int(x) for x in ct.sum(axis=0).tolist()]

    # Chi-square test
    chi2 = None
    chi2_p = None
    cramers = None
    df_val = None
    interpretation = None

    try:
        if ct.shape[0] >= 2 and ct.shape[1] >= 2:
            chi2_stat, p_val, dof, _ = scipy_stats.chi2_contingency(ct.values)
            chi2 = round(float(chi2_stat), 4)
            chi2_p = round(float(p_val), 6)
            df_val = int(dof)

            # Cramer's V
            n = ct.values.sum()
            k = min(ct.shape[0], ct.shape[1])
            cramers = round(math.sqrt(chi2_stat / (n * (k - 1))), 4) if n > 0 and k > 1 else None

            # Interpretation
            p_str = "p < 0.001" if p_val < 0.001 else f"p = {p_val:.4f}"
            if p_val < 0.05:
                strength = "fraca" if cramers and cramers < 0.1 else "moderada" if cramers and cramers < 0.3 else "forte"
                interpretation = (
                    f"Existe associacao estatisticamente significativa entre "
                    f"{columns_meta.get(row_variable, row_variable)} e "
                    f"{columns_meta.get(col_variable, col_variable)} "
                    f"(X² = {chi2_stat:.2f}, {p_str}, V de Cramer = {cramers:.3f} — associacao {strength})."
                )
            else:
                interpretation = (
                    f"Nao ha associacao significativa entre "
                    f"{columns_meta.get(row_variable, row_variable)} e "
                    f"{columns_meta.get(col_variable, col_variable)} "
                    f"(X² = {chi2_stat:.2f}, {p_str})."
                )
    except Exception:
        pass

    return CrosstabResponse(
        sample_size=sample_size,
        row_variable_name=columns_meta.get(row_variable, row_variable),
        col_variable_name=columns_meta.get(col_variable, col_variable),
        row_labels=row_labels,
        col_labels=col_labels,
        counts=counts,
        percentages=percentages,
        row_totals=row_totals,
        col_totals=col_totals,
        grand_total=grand_total,
        chi_square=chi2,
        chi_square_p_value=chi2_p,
        cramers_v=cramers,
        degrees_of_freedom=df_val,
        interpretation=interpretation,
    )
