"""
Orion Analytics - Frequency Service
Calculates frequency tables for categorical/discrete variables.
"""
import pandas as pd
from typing import Optional

from app.schemas.schemas import FilterCondition, FrequencyRow, FrequencyResponse
from app.services.data_service import apply_filters


def calculate_frequencies(
    df: pd.DataFrame,
    variables: list[str],
    columns_meta: dict[str, str],
    filters: Optional[list[FilterCondition]] = None,
    max_categories: int = 200,
    treat_missing_as_zero: bool = True,
) -> FrequencyResponse:
    """Calculate frequency tables for selected variables."""
    if filters:
        df = apply_filters(df, filters)

    sample_size = len(df)
    tables = {}

    for var in variables:
        if var not in df.columns:
            continue

        series = df[var].copy()
        if treat_missing_as_zero:
            series = series.fillna("(ausente)")
        else:
            series = series.dropna()

        counts = series.value_counts().head(max_categories)
        total = counts.sum()

        rows = []
        cumulative = 0
        for value, count in counts.items():
            cumulative += count
            pct = round(count / total * 100, 2) if total > 0 else 0
            cum_pct = round(cumulative / total * 100, 2) if total > 0 else 0
            rows.append(FrequencyRow(
                value=str(value),
                count=int(count),
                percentage=pct,
                cumulative_count=int(cumulative),
                cumulative_pct=cum_pct,
            ))

        col_name = columns_meta.get(var, var)
        tables[col_name] = rows

    return FrequencyResponse(sample_size=sample_size, tables=tables)
