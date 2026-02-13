"""
Orion Stats - Data Service
Handles dataset upload, storage, and querying.
"""
import re
import unicodedata
from pathlib import Path
from typing import Any
import pandas as pd
import numpy as np

from app.core.config import settings
from app.schemas.schemas import ColumnMeta, FilterCondition


def sanitize_column_name(name: str) -> str:
    """
    Sanitize column name to create a safe key.
    Removes accents, special chars, and replaces spaces with underscores.
    """
    # Normalize unicode and remove accents
    normalized = unicodedata.normalize('NFKD', str(name))
    ascii_name = normalized.encode('ASCII', 'ignore').decode('ASCII')
    
    # Replace spaces and special chars with underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', ascii_name)
    
    # Remove consecutive underscores and trim
    sanitized = re.sub(r'_+', '_', sanitized).strip('_')
    
    # Ensure it doesn't start with a number
    if sanitized and sanitized[0].isdigit():
        sanitized = f"col_{sanitized}"
    
    return sanitized.lower() or "unnamed"


def detect_variable_type(series: pd.Series) -> str:
    """
    Detect if a variable is categorical, discrete, or continuous.
    
    Rules:
    - object/string dtype -> categorical
    - numeric with unique_count <= 30 or unique_ratio <= 0.02 -> discrete
    - otherwise -> continuous
    """
    if series.dtype == 'object' or series.dtype.name == 'category':
        return 'categorical'
    
    if pd.api.types.is_numeric_dtype(series):
        non_null = series.dropna()
        if len(non_null) == 0:
            return 'continuous'
        
        unique_count = non_null.nunique()
        unique_ratio = unique_count / len(non_null) if len(non_null) > 0 else 0
        
        if unique_count <= settings.DISCRETE_THRESHOLD or unique_ratio <= settings.DISCRETE_RATIO:
            return 'discrete'
        return 'continuous'
    
    return 'categorical'


def analyze_columns(df: pd.DataFrame) -> list[ColumnMeta]:
    """Analyze all columns and return metadata."""
    columns_meta = []
    
    for col in df.columns:
        col_key = sanitize_column_name(col)
        series = df[col]
        
        meta = ColumnMeta(
            name=str(col),
            col_key=col_key,
            dtype=str(series.dtype),
            var_type=detect_variable_type(series),
            unique_count=int(series.nunique()),
            missing_count=int(series.isna().sum())
        )
        columns_meta.append(meta)
    
    return columns_meta


def load_xlsx(file_path: Path, sheet_name: int | str = 0) -> pd.DataFrame:
    """Load XLSX file into DataFrame."""
    return pd.read_excel(file_path, sheet_name=sheet_name, engine='openpyxl')


def save_parquet(df: pd.DataFrame, dataset_id: int) -> Path:
    """Save DataFrame as parquet file."""
    parquet_path = settings.DATA_DIR / f"dataset_{dataset_id}.parquet"
    df.to_parquet(parquet_path, index=False, engine='pyarrow')
    return parquet_path


def load_parquet(parquet_path: str | Path) -> pd.DataFrame:
    """Load DataFrame from parquet file."""
    raw_path = str(parquet_path)
    normalized_path = raw_path.replace("\\", "/")
    path = Path(normalized_path)

    if not path.is_absolute():
        # Backward compatibility for older DB rows that stored relative paths.
        candidates = [
            Path.cwd() / path,
            settings.DATA_DIR.parent / Path(raw_path),
            settings.DATA_DIR.parent / path,
            settings.DATA_DIR / path.name,
        ]
        for candidate in candidates:
            if candidate.exists():
                path = candidate
                break

    return pd.read_parquet(path, engine='pyarrow')


def create_column_mapping(columns_meta: list[ColumnMeta]) -> dict[str, str]:
    """Create mapping from col_key to original name."""
    return {col.col_key: col.name for col in columns_meta}


def rename_columns_to_keys(df: pd.DataFrame, columns_meta: list[ColumnMeta]) -> pd.DataFrame:
    """Rename DataFrame columns to sanitized keys."""
    rename_map = {col.name: col.col_key for col in columns_meta}
    return df.rename(columns=rename_map)


def apply_filters(df: pd.DataFrame, filters: list[FilterCondition]) -> pd.DataFrame:
    """Apply filter conditions to DataFrame."""
    filtered_df = df.copy()
    
    for filter_cond in filters:
        if filter_cond.col_key in filtered_df.columns and filter_cond.values:
            filtered_df = filtered_df[filtered_df[filter_cond.col_key].isin(filter_cond.values)]
    
    return filtered_df


def get_unique_values(df: pd.DataFrame, col_key: str) -> list[Any]:
    """Get unique values for a column."""
    if col_key not in df.columns:
        return []
    
    values = df[col_key].dropna().unique().tolist()
    
    # Convert numpy types to Python types
    result = []
    for v in values:
        if isinstance(v, (np.integer, np.floating)):
            result.append(float(v) if isinstance(v, np.floating) else int(v))
        else:
            result.append(v)
    
    return sorted(result, key=lambda x: (isinstance(x, str), x))


def prepare_data_for_json(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Convert DataFrame to JSON-serializable list of dicts."""
    # Replace NaN with None
    df_clean = df.replace({np.nan: None, pd.NA: None})
    
    records = []
    for _, row in df_clean.iterrows():
        record = {}
        for col, val in row.items():
            if isinstance(val, (np.integer,)):
                record[col] = int(val)
            elif isinstance(val, (np.floating,)):
                record[col] = float(val) if not pd.isna(val) else None
            elif pd.isna(val):
                record[col] = None
            else:
                record[col] = val
        records.append(record)
    
    return records


# Simple LRU cache for loaded DataFrames
_df_cache: dict[int, pd.DataFrame] = {}
_cache_order: list[int] = []
_max_cache_size = 5


def get_cached_dataframe(dataset_id: int, parquet_path: str) -> pd.DataFrame:
    """Get DataFrame from cache or load from parquet."""
    global _df_cache, _cache_order
    
    if dataset_id in _df_cache:
        # Move to end of order (most recently used)
        _cache_order.remove(dataset_id)
        _cache_order.append(dataset_id)
        return _df_cache[dataset_id]
    
    # Load from disk
    df = load_parquet(parquet_path)
    
    # Add to cache
    _df_cache[dataset_id] = df
    _cache_order.append(dataset_id)
    
    # Evict oldest if cache is full
    while len(_cache_order) > _max_cache_size:
        oldest_id = _cache_order.pop(0)
        del _df_cache[oldest_id]
    
    return df


def clear_cache(dataset_id: int | None = None):
    """Clear cache for a specific dataset or all."""
    global _df_cache, _cache_order
    
    if dataset_id is None:
        _df_cache.clear()
        _cache_order.clear()
    elif dataset_id in _df_cache:
        del _df_cache[dataset_id]
        _cache_order.remove(dataset_id)
