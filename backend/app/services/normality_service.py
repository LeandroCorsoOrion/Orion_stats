"""
Orion Stats - Normality Service
Tests normality of distributions using Shapiro-Wilk, Kolmogorov-Smirnov, and D'Agostino.
"""
import pandas as pd
import numpy as np
from scipy import stats as scipy_stats
from typing import Optional

from app.schemas.schemas import (
    FilterCondition, NormalityTestDetail, NormalityResult, NormalityResponse
)
from app.services.data_service import apply_filters


def test_normality(
    df: pd.DataFrame,
    variables: list[str],
    columns_meta: dict[str, str],
    filters: Optional[list[FilterCondition]] = None,
    alpha: float = 0.05,
    treat_missing_as_zero: bool = True,
) -> NormalityResponse:
    """Run normality tests for selected variables."""
    if filters:
        df = apply_filters(df, filters)

    sample_size = len(df)
    results = []
    normal_vars = []
    non_normal_vars = []

    for var in variables:
        if var not in df.columns:
            continue

        var_name = columns_meta.get(var, var)
        series = pd.to_numeric(df[var], errors='coerce')

        if treat_missing_as_zero:
            series = series.fillna(0)
        else:
            series = series.dropna()

        n = len(series)
        if n < 3:
            results.append(NormalityResult(
                variable=var, variable_name=var_name, n=n,
                tests=[], overall_normal=False, skewness=0, kurtosis=0,
                interpretation=f"Amostra muito pequena (n={n}) para testes de normalidade.",
            ))
            non_normal_vars.append(var_name)
            continue

        skew_val = float(series.skew())
        kurt_val = float(series.kurtosis())
        tests = []
        normal_count = 0

        # Shapiro-Wilk (n < 5000)
        if n < 5000:
            try:
                stat, p = scipy_stats.shapiro(series.values)
                is_normal = p > alpha
                if is_normal:
                    normal_count += 1
                tests.append(NormalityTestDetail(
                    test_name="Shapiro-Wilk",
                    statistic=round(float(stat), 4),
                    p_value=round(float(p), 6),
                    is_normal=is_normal,
                ))
            except Exception:
                pass

        # Kolmogorov-Smirnov
        try:
            stat, p = scipy_stats.kstest(series.values, 'norm',
                                          args=(series.mean(), series.std()))
            is_normal = p > alpha
            if is_normal:
                normal_count += 1
            tests.append(NormalityTestDetail(
                test_name="Kolmogorov-Smirnov",
                statistic=round(float(stat), 4),
                p_value=round(float(p), 6),
                is_normal=is_normal,
            ))
        except Exception:
            pass

        # D'Agostino-Pearson (n >= 20)
        if n >= 20:
            try:
                stat, p = scipy_stats.normaltest(series.values)
                is_normal = p > alpha
                if is_normal:
                    normal_count += 1
                tests.append(NormalityTestDetail(
                    test_name="D'Agostino-Pearson",
                    statistic=round(float(stat), 4),
                    p_value=round(float(p), 6),
                    is_normal=is_normal,
                ))
            except Exception:
                pass

        overall = normal_count > len(tests) / 2 if tests else False

        if overall:
            normal_vars.append(var_name)
        else:
            non_normal_vars.append(var_name)

        # Build interpretation
        if not tests:
            interp = "Nao foi possivel executar testes de normalidade."
        elif overall:
            best = tests[0]
            interp = (
                f"A distribuicao de {var_name} aparenta ser normal "
                f"({best.test_name}, p = {best.p_value:.4f}). "
                f"Assimetria = {skew_val:.2f}, Curtose = {kurt_val:.2f}."
            )
        else:
            best = tests[0]
            interp = (
                f"A distribuicao de {var_name} nao e normal "
                f"({best.test_name}, p = {best.p_value:.4f}). "
                f"Assimetria = {skew_val:.2f}, Curtose = {kurt_val:.2f}."
            )

        results.append(NormalityResult(
            variable=var,
            variable_name=var_name,
            n=n,
            tests=tests,
            overall_normal=overall,
            skewness=round(skew_val, 4),
            kurtosis=round(kurt_val, 4),
            interpretation=interp,
        ))

    # Recommendation
    if normal_vars and non_normal_vars:
        rec = (
            f"Use testes parametricos para: {', '.join(normal_vars)}. "
            f"Use testes nao-parametricos para: {', '.join(non_normal_vars)}."
        )
    elif normal_vars:
        rec = "Todas as variaveis apresentam distribuicao normal. Testes parametricos sao adequados."
    elif non_normal_vars:
        rec = "Nenhuma variavel apresenta distribuicao normal. Prefira testes nao-parametricos."
    else:
        rec = "Nenhuma variavel analisada."

    return NormalityResponse(sample_size=sample_size, results=results, recommendation=rec)
