"""
Orion Stats - Statistics Service
Calculates descriptive statistics and correlation.
"""
import pandas as pd
import numpy as np
from scipy import stats
from typing import Optional

from app.schemas.schemas import ColumnStats, FilterCondition
from app.services.data_service import apply_filters


def calculate_column_stats(
    series: pd.Series,
    col_key: str,
    col_name: str,
    treat_missing_as_zero: bool = True
) -> ColumnStats:
    """Calculate descriptive statistics for a single column."""
    # Count original missing
    missing_count = int(series.isna().sum())
    total_count = len(series)
    
    # Apply missing treatment
    if treat_missing_as_zero:
        series = series.fillna(0)
    else:
        series = series.dropna()
    
    if len(series) == 0:
        return ColumnStats(
            col_key=col_key,
            name=col_name,
            count=total_count,
            missing_count=missing_count
        )
    
    # Calculate statistics
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
        
        # Mode - can return multiple, take first
        mode_result = stats.mode(series, keepdims=True)
        mode_val = float(mode_result.mode[0]) if len(mode_result.mode) > 0 else None
        
    except Exception:
        return ColumnStats(
            col_key=col_key,
            name=col_name,
            count=total_count,
            missing_count=missing_count
        )
    
    return ColumnStats(
        col_key=col_key,
        name=col_name,
        count=total_count,
        missing_count=missing_count,
        mean=round(mean_val, 4),
        median=round(median_val, 4),
        mode=round(mode_val, 4) if mode_val is not None else None,
        std=round(std_val, 4),
        variance=round(var_val, 4),
        min=round(min_val, 4),
        max=round(max_val, 4),
        q1=round(q1_val, 4),
        q3=round(q3_val, 4),
        iqr=round(iqr_val, 4)
    )


def calculate_descriptive_stats(
    df: pd.DataFrame,
    variables: list[str],
    columns_meta: dict[str, str],  # col_key -> name
    filters: list[FilterCondition] = None,
    group_by: list[str] = None,
    treat_missing_as_zero: bool = True
) -> tuple[int, list[ColumnStats], Optional[dict[str, list[ColumnStats]]]]:
    """
    Calculate descriptive statistics for selected variables.
    
    Returns:
        (sample_size, statistics_list, grouped_statistics or None)
    """
    # Apply filters
    if filters:
        df = apply_filters(df, filters)
    
    sample_size = len(df)
    
    # Calculate overall statistics
    overall_stats = []
    for col_key in variables:
        if col_key in df.columns:
            col_name = columns_meta.get(col_key, col_key)
            col_stats = calculate_column_stats(
                df[col_key].copy(),
                col_key,
                col_name,
                treat_missing_as_zero
            )
            overall_stats.append(col_stats)
    
    # Calculate grouped statistics if requested
    grouped_stats = None
    if group_by and len(group_by) > 0:
        grouped_stats = {}
        valid_group_by = [g for g in group_by if g in df.columns]
        
        if valid_group_by:
            for group_vals, group_df in df.groupby(valid_group_by):
                # Create group key string
                if isinstance(group_vals, tuple):
                    group_key = " | ".join(str(v) for v in group_vals)
                else:
                    group_key = str(group_vals)
                
                group_stats_list = []
                for col_key in variables:
                    if col_key in group_df.columns:
                        col_name = columns_meta.get(col_key, col_key)
                        col_stats = calculate_column_stats(
                            group_df[col_key].copy(),
                            col_key,
                            col_name,
                            treat_missing_as_zero
                        )
                        group_stats_list.append(col_stats)
                
                grouped_stats[group_key] = group_stats_list
    
    return sample_size, overall_stats, grouped_stats


def calculate_correlation_matrix(
    df: pd.DataFrame,
    variables: list[str],
    columns_meta: dict[str, str],  # col_key -> name
    filters: list[FilterCondition] = None,
    treat_missing_as_zero: bool = True
) -> tuple[int, list[str], list[list[float]]]:
    """
    Calculate Pearson correlation matrix for selected variables.

    Returns:
        (sample_size, variable_names, correlation_matrix)
    """
    # Apply filters
    if filters:
        df = apply_filters(df, filters)

    sample_size = len(df)

    # Select only valid columns that exist
    valid_cols = [col for col in variables if col in df.columns]

    if len(valid_cols) < 2:
        return sample_size, [], []
    
    subset = df[valid_cols].copy()
    
    # Convert all columns to numeric, forcing non-numeric to NaN
    numeric_subset = pd.DataFrame()
    for col in subset.columns:
        numeric_subset[col] = pd.to_numeric(subset[col], errors='coerce')
    
    # Handle missing values
    if treat_missing_as_zero:
        numeric_subset = numeric_subset.fillna(0)
    else:
        numeric_subset = numeric_subset.dropna()
    
    # Remove columns that are all NaN or have no variance
    cols_to_keep = []
    for col in numeric_subset.columns:
        if numeric_subset[col].notna().any() and numeric_subset[col].std() > 0:
            cols_to_keep.append(col)
    
    if len(cols_to_keep) < 2:
        return sample_size, [], []

    numeric_subset = numeric_subset[cols_to_keep]

    # Calculate correlation
    corr_matrix = numeric_subset.corr(method='pearson')

    # Get display names
    var_names = [columns_meta.get(col, col) for col in cols_to_keep]

    # Convert to list of lists with rounding
    matrix = []
    for row_col in cols_to_keep:
        row = []
        for col in cols_to_keep:
            val = corr_matrix.loc[row_col, col]
            row.append(round(float(val), 2) if not pd.isna(val) else 0.0)
        matrix.append(row)

    return sample_size, var_names, matrix

