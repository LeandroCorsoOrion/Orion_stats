"""
Orion Stats - Statistics API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Dataset
from app.schemas.schemas import (
    StatsRequest, StatsResponse,
    FrequencyRequest, FrequencyResponse,
    CrosstabRequest, CrosstabResponse,
    NormalityRequest, NormalityResponse,
    HypothesisTestRequest, HypothesisTestResponse,
    ChartDataRequest, ChartDataResponse,
    ExportRequest,
)
from app.services.data_service import get_cached_dataframe
from app.services.stats_service import calculate_descriptive_stats, normalize_group_columns

router = APIRouter(prefix="/stats", tags=["Statistics"])


def _load_dataset(db: Session, dataset_id: int):
    """Load dataset and dataframe."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    try:
        df = get_cached_dataframe(dataset.id, dataset.parquet_path)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Dataset file not found: {dataset.parquet_path}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading dataset file: {str(e)}",
        ) from e
    columns_meta = {col['col_key']: col['name'] for col in dataset.columns_meta}
    return dataset, df, columns_meta


@router.post("/descriptive", response_model=StatsResponse)
def get_descriptive_stats(request: StatsRequest, db: Session = Depends(get_db)):
    """Calculate descriptive statistics with optional grouping and comparison tests."""
    dataset, df, columns_meta = _load_dataset(db, request.dataset_id)

    if not request.variables:
        raise HTTPException(status_code=400, detail="No variables selected")

    try:
        sample_size, statistics, grouped_stats, group_summaries, comparison_tests, total_groups = calculate_descriptive_stats(
            df=df,
            variables=request.variables,
            columns_meta=columns_meta,
            filters=request.filters if request.filters else None,
            group_by=request.group_by if request.group_by else None,
            treat_missing_as_zero=request.treat_missing_as_zero,
            confidence_level=request.confidence_level,
            run_comparison_tests=request.run_comparison_tests,
            sort_groups_by=request.sort_groups_by,
            max_groups=request.max_groups,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating statistics: {str(e)}")

    return StatsResponse(
        sample_size=sample_size,
        statistics=statistics,
        grouped_statistics=grouped_stats,
        group_summaries=group_summaries,
        group_comparison_tests=comparison_tests,
        group_by_columns=request.group_by if request.group_by else None,
        total_groups=total_groups,
    )


@router.post("/frequencies", response_model=FrequencyResponse)
def get_frequencies(request: FrequencyRequest, db: Session = Depends(get_db)):
    """Calculate frequency tables for selected variables."""
    from app.services.frequency_service import calculate_frequencies

    dataset, df, columns_meta = _load_dataset(db, request.dataset_id)

    if not request.variables:
        raise HTTPException(status_code=400, detail="No variables selected")

    try:
        result = calculate_frequencies(
            df=df,
            variables=request.variables,
            columns_meta=columns_meta,
            filters=request.filters if request.filters else None,
            max_categories=request.max_categories,
            treat_missing_as_zero=request.treat_missing_as_zero,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating frequencies: {str(e)}")

    return result


@router.post("/crosstabs", response_model=CrosstabResponse)
def get_crosstabs(request: CrosstabRequest, db: Session = Depends(get_db)):
    """Calculate cross-tabulation with chi-square test."""
    from app.services.crosstab_service import calculate_crosstab

    dataset, df, columns_meta = _load_dataset(db, request.dataset_id)

    try:
        result = calculate_crosstab(
            df=df,
            row_variable=request.row_variable,
            col_variable=request.col_variable,
            columns_meta=columns_meta,
            filters=request.filters if request.filters else None,
            max_rows=request.max_rows,
            max_cols=request.max_cols,
            treat_missing_as_zero=request.treat_missing_as_zero,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating crosstab: {str(e)}")

    return result


@router.post("/normality", response_model=NormalityResponse)
def get_normality(request: NormalityRequest, db: Session = Depends(get_db)):
    """Run normality tests for selected variables."""
    from app.services.normality_service import test_normality

    dataset, df, columns_meta = _load_dataset(db, request.dataset_id)

    if not request.variables:
        raise HTTPException(status_code=400, detail="No variables selected")

    try:
        result = test_normality(
            df=df,
            variables=request.variables,
            columns_meta=columns_meta,
            filters=request.filters if request.filters else None,
            alpha=request.alpha,
            treat_missing_as_zero=request.treat_missing_as_zero,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing normality: {str(e)}")

    return result


@router.post("/hypothesis-test", response_model=HypothesisTestResponse)
def run_hypothesis_test(request: HypothesisTestRequest, db: Session = Depends(get_db)):
    """Run a hypothesis test."""
    from app.services.hypothesis_service import run_hypothesis_test as _run_test

    dataset, df, columns_meta = _load_dataset(db, request.dataset_id)

    try:
        result = _run_test(
            df=df,
            test_type=request.test_type,
            variable=request.variable,
            columns_meta=columns_meta,
            filters=request.filters if request.filters else None,
            group_variable=request.group_variable,
            paired_variable=request.paired_variable,
            test_value=request.test_value,
            alternative=request.alternative,
            alpha=request.alpha,
            treat_missing_as_zero=request.treat_missing_as_zero,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running hypothesis test: {str(e)}")

    return result


@router.post("/chart-data", response_model=ChartDataResponse)
def get_chart_data(request: ChartDataRequest, db: Session = Depends(get_db)):
    """Get raw grouped data for charting."""
    from app.services.data_service import apply_filters
    import pandas as pd
    import numpy as np
    from scipy import stats as scipy_stats

    dataset, df, columns_meta = _load_dataset(db, request.dataset_id)

    if request.filters:
        df = apply_filters(df, request.filters)

    if request.variable not in df.columns or request.group_by not in df.columns:
        raise HTTPException(status_code=400, detail="Variable or group column not found")

    groups_dict = {}
    group_stats_dict = {}

    grouped_df = normalize_group_columns(df, [request.group_by])
    grouped = grouped_df.groupby(request.group_by)
    count = 0
    for name, group_df in grouped:
        if count >= request.max_groups:
            break
        key = str(name)
        series = pd.to_numeric(group_df[request.variable], errors='coerce')
        if request.treat_missing_as_zero:
            series = series.fillna(0)
        else:
            series = series.dropna()

        values = series.tolist()
        groups_dict[key] = values

        if len(values) > 0:
            n = len(values)
            arr = np.array(values, dtype=float)
            m = float(np.mean(arr))
            med = float(np.median(arr))
            s = float(np.std(arr, ddof=1)) if n > 1 else 0.0
            var = float(np.var(arr, ddof=1)) if n > 1 else 0.0
            min_v = float(np.min(arr))
            max_v = float(np.max(arr))
            range_v = max_v - min_v
            q1 = float(np.percentile(arr, 25))
            q3 = float(np.percentile(arr, 75))
            iqr = q3 - q1
            p5 = float(np.percentile(arr, 5))
            p10 = float(np.percentile(arr, 10))
            p90 = float(np.percentile(arr, 90))
            p95 = float(np.percentile(arr, 95))
            sem = s / np.sqrt(n) if n > 0 else 0.0
            t_crit = scipy_stats.t.ppf(0.975, df=n - 1) if n > 1 else 0.0
            cv = (s / m * 100) if m != 0 else None
            group_stats_dict[key] = {
                "mean": round(m, 4),
                "median": round(med, 4),
                "std": round(s, 4),
                "variance": round(var, 4),
                "sem": round(sem, 4),
                "cv": round(cv, 4) if cv is not None else None,
                "min": round(min_v, 4),
                "max": round(max_v, 4),
                "range": round(range_v, 4),
                "q1": round(q1, 4),
                "q3": round(q3, 4),
                "iqr": round(iqr, 4),
                "p5": round(p5, 4),
                "p10": round(p10, 4),
                "p90": round(p90, 4),
                "p95": round(p95, 4),
                "ci_lower": round(m - t_crit * sem, 4),
                "ci_upper": round(m + t_crit * sem, 4),
                "count": n,
            }
        count += 1

    return ChartDataResponse(
        variable_name=columns_meta.get(request.variable, request.variable),
        group_variable_name=columns_meta.get(request.group_by, request.group_by),
        groups=groups_dict,
        group_stats=group_stats_dict,
    )


@router.post("/export-excel")
def export_excel(request: ExportRequest, db: Session = Depends(get_db)):
    """Export statistics to Excel file."""
    from app.services.export_service import create_excel_export

    dataset, df, columns_meta = _load_dataset(db, request.dataset_id)

    if not request.variables:
        raise HTTPException(status_code=400, detail="No variables selected")

    try:
        buffer = create_excel_export(
            df=df,
            variables=request.variables,
            columns_meta=columns_meta,
            filters=request.filters if request.filters else None,
            group_by=request.group_by if request.group_by else None,
            treat_missing_as_zero=request.treat_missing_as_zero,
            include_sheets=request.include_sheets,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating export: {str(e)}")

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=estatisticas_{dataset.name}.xlsx"},
    )


@router.post("/export-word")
def export_word(request: ExportRequest, db: Session = Depends(get_db)):
    """Export statistics to Word file."""
    from app.services.word_export_service import create_word_export

    dataset, df, columns_meta = _load_dataset(db, request.dataset_id)

    if not request.variables:
        raise HTTPException(status_code=400, detail="No variables selected")

    try:
        buffer = create_word_export(
            df=df,
            variables=request.variables,
            columns_meta=columns_meta,
            filters=request.filters if request.filters else None,
            group_by=request.group_by if request.group_by else None,
            treat_missing_as_zero=request.treat_missing_as_zero,
            report_sections=request.report_sections if request.report_sections else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating word export: {str(e)}")

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=relatorio_estatistico_{dataset.name}.docx"},
    )
