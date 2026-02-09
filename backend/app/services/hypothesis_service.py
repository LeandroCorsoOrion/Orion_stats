"""
Orion Stats - Hypothesis Test Service
Runs parametric and non-parametric hypothesis tests.
"""
import math
import pandas as pd
import numpy as np
from scipy import stats as scipy_stats
from typing import Optional, Any

from app.schemas.schemas import FilterCondition, HypothesisTestResponse
from app.services.data_service import apply_filters


def run_hypothesis_test(
    df: pd.DataFrame,
    test_type: str,
    variable: str,
    columns_meta: dict[str, str],
    filters: Optional[list[FilterCondition]] = None,
    group_variable: Optional[str] = None,
    paired_variable: Optional[str] = None,
    test_value: Optional[float] = None,
    alternative: str = "two-sided",
    alpha: float = 0.05,
    treat_missing_as_zero: bool = True,
) -> HypothesisTestResponse:
    """Run a hypothesis test based on test_type."""
    if filters:
        df = apply_filters(df, filters)

    var_name = columns_meta.get(variable, variable)

    # Prepare main variable
    series = pd.to_numeric(df[variable], errors='coerce')
    if treat_missing_as_zero:
        series = series.fillna(0)
    else:
        series = series.dropna()

    n = len(series)
    alt_map = {"two-sided": "two-sided", "greater": "greater", "less": "less"}
    alt = alt_map.get(alternative, "two-sided")

    if test_type == "one_sample_t":
        if test_value is None:
            raise ValueError("test_value is required for one-sample t-test")

        stat, p = scipy_stats.ttest_1samp(series.values, test_value)
        effect = abs(series.mean() - test_value) / series.std() if series.std() > 0 else 0
        effect_name = "d de Cohen"
        effect_interp = _effect_size_label(effect, "d")

        decision = "Rejeitar H0" if p < alpha else "Nao rejeitar H0"
        p_str = "p < 0.001" if p < 0.001 else f"p = {p:.4f}"
        interp = (
            f"Teste t para uma amostra: a media de {var_name} ({series.mean():.2f}) "
            f"{'difere' if p < alpha else 'nao difere'} significativamente de {test_value} "
            f"(t = {stat:.2f}, {p_str})."
        )

        sem = series.std() / math.sqrt(n)
        t_crit = scipy_stats.t.ppf(0.975, df=n - 1)

        return HypothesisTestResponse(
            test_name="Teste t para uma amostra",
            test_type=test_type,
            statistic=round(float(stat), 4),
            p_value=round(float(p), 6),
            significant=p < alpha,
            effect_size=round(effect, 4),
            effect_size_name=effect_name,
            effect_size_interpretation=effect_interp,
            ci_lower=round(series.mean() - t_crit * sem, 4),
            ci_upper=round(series.mean() + t_crit * sem, 4),
            decision=decision,
            interpretation=interp,
        )

    elif test_type in ("independent_t", "mann_whitney"):
        if not group_variable or group_variable not in df.columns:
            raise ValueError("group_variable is required")

        groups = df.groupby(group_variable)
        group_keys = list(groups.groups.keys())
        if len(group_keys) < 2:
            raise ValueError("Need at least 2 groups")

        g1 = pd.to_numeric(groups.get_group(group_keys[0])[variable], errors='coerce')
        g2 = pd.to_numeric(groups.get_group(group_keys[1])[variable], errors='coerce')
        if treat_missing_as_zero:
            g1, g2 = g1.fillna(0), g2.fillna(0)
        else:
            g1, g2 = g1.dropna(), g2.dropna()

        summary = [
            {"grupo": str(group_keys[0]), "n": len(g1), "media": round(float(g1.mean()), 4), "dp": round(float(g1.std()), 4)},
            {"grupo": str(group_keys[1]), "n": len(g2), "media": round(float(g2.mean()), 4), "dp": round(float(g2.std()), 4)},
        ]

        if test_type == "independent_t":
            stat, p = scipy_stats.ttest_ind(g1.values, g2.values, equal_var=False)
            test_name = "Teste t independente (Welch)"
        else:
            stat, p = scipy_stats.mannwhitneyu(g1.values, g2.values, alternative=alt)
            test_name = "Mann-Whitney U"

        pooled_std = math.sqrt((g1.var() + g2.var()) / 2)
        effect = abs(g1.mean() - g2.mean()) / pooled_std if pooled_std > 0 else 0

        decision = "Rejeitar H0" if p < alpha else "Nao rejeitar H0"
        p_str = "p < 0.001" if p < 0.001 else f"p = {p:.4f}"
        interp = (
            f"{test_name}: {'ha' if p < alpha else 'nao ha'} diferenca significativa "
            f"de {var_name} entre {group_keys[0]} e {group_keys[1]} "
            f"(estatistica = {stat:.2f}, {p_str})."
        )

        return HypothesisTestResponse(
            test_name=test_name, test_type=test_type,
            statistic=round(float(stat), 4), p_value=round(float(p), 6),
            significant=p < alpha,
            effect_size=round(effect, 4), effect_size_name="d de Cohen",
            effect_size_interpretation=_effect_size_label(effect, "d"),
            decision=decision, interpretation=interp, groups_summary=summary,
        )

    elif test_type == "paired_t":
        if not paired_variable or paired_variable not in df.columns:
            raise ValueError("paired_variable is required")

        s1 = pd.to_numeric(df[variable], errors='coerce')
        s2 = pd.to_numeric(df[paired_variable], errors='coerce')
        mask = s1.notna() & s2.notna()
        s1, s2 = s1[mask], s2[mask]

        stat, p = scipy_stats.ttest_rel(s1.values, s2.values)
        diff = s1 - s2
        effect = abs(diff.mean()) / diff.std() if diff.std() > 0 else 0

        decision = "Rejeitar H0" if p < alpha else "Nao rejeitar H0"
        p_str = "p < 0.001" if p < 0.001 else f"p = {p:.4f}"
        paired_name = columns_meta.get(paired_variable, paired_variable)
        interp = (
            f"Teste t pareado: {'ha' if p < alpha else 'nao ha'} diferenca significativa "
            f"entre {var_name} e {paired_name} (t = {stat:.2f}, {p_str})."
        )

        return HypothesisTestResponse(
            test_name="Teste t pareado", test_type=test_type,
            statistic=round(float(stat), 4), p_value=round(float(p), 6),
            significant=p < alpha,
            effect_size=round(effect, 4), effect_size_name="d de Cohen",
            effect_size_interpretation=_effect_size_label(effect, "d"),
            decision=decision, interpretation=interp,
        )

    elif test_type in ("one_way_anova", "kruskal_wallis"):
        if not group_variable or group_variable not in df.columns:
            raise ValueError("group_variable is required")

        groups = df.groupby(group_variable)
        group_data = []
        summary = []
        for key, gdf in groups:
            g = pd.to_numeric(gdf[variable], errors='coerce')
            if treat_missing_as_zero:
                g = g.fillna(0)
            else:
                g = g.dropna()
            if len(g) >= 2:
                group_data.append(g.values)
                summary.append({"grupo": str(key), "n": len(g), "media": round(float(g.mean()), 4), "dp": round(float(g.std()), 4)})

        if len(group_data) < 2:
            raise ValueError("Need at least 2 groups with data")

        if test_type == "one_way_anova":
            stat, p = scipy_stats.f_oneway(*group_data)
            test_name = "ANOVA one-way"
            all_data = np.concatenate(group_data)
            gm = np.mean(all_data)
            ss_b = sum(len(gd) * (np.mean(gd) - gm) ** 2 for gd in group_data)
            ss_t = np.sum((all_data - gm) ** 2)
            effect = ss_b / ss_t if ss_t > 0 else 0
            effect_name = "eta²"
            effect_interp = _effect_size_label(effect, "eta")
        else:
            stat, p = scipy_stats.kruskal(*group_data)
            test_name = "Kruskal-Wallis"
            N = sum(len(gd) for gd in group_data)
            effect = (stat - len(group_data) + 1) / (N - len(group_data)) if N > len(group_data) else 0
            effect_name = "epsilon²"
            effect_interp = _effect_size_label(effect, "eta")

        decision = "Rejeitar H0" if p < alpha else "Nao rejeitar H0"
        p_str = "p < 0.001" if p < 0.001 else f"p = {p:.4f}"
        interp = (
            f"{test_name}: {'existe' if p < alpha else 'nao existe'} diferenca significativa "
            f"de {var_name} entre os {len(group_data)} grupos (estatistica = {stat:.2f}, {p_str})."
        )

        return HypothesisTestResponse(
            test_name=test_name, test_type=test_type,
            statistic=round(float(stat), 4), p_value=round(float(p), 6),
            significant=p < alpha,
            effect_size=round(effect, 4), effect_size_name=effect_name,
            effect_size_interpretation=effect_interp,
            decision=decision, interpretation=interp, groups_summary=summary,
        )

    elif test_type == "wilcoxon":
        if not paired_variable or paired_variable not in df.columns:
            raise ValueError("paired_variable is required")

        s1 = pd.to_numeric(df[variable], errors='coerce')
        s2 = pd.to_numeric(df[paired_variable], errors='coerce')
        mask = s1.notna() & s2.notna()
        s1, s2 = s1[mask], s2[mask]

        stat, p = scipy_stats.wilcoxon(s1.values, s2.values, alternative=alt)

        decision = "Rejeitar H0" if p < alpha else "Nao rejeitar H0"
        p_str = "p < 0.001" if p < 0.001 else f"p = {p:.4f}"
        paired_name = columns_meta.get(paired_variable, paired_variable)
        interp = (
            f"Wilcoxon signed-rank: {'ha' if p < alpha else 'nao ha'} diferenca significativa "
            f"entre {var_name} e {paired_name} (W = {stat:.2f}, {p_str})."
        )

        return HypothesisTestResponse(
            test_name="Wilcoxon signed-rank", test_type=test_type,
            statistic=round(float(stat), 4), p_value=round(float(p), 6),
            significant=p < alpha,
            decision=decision, interpretation=interp,
        )

    else:
        raise ValueError(f"Unknown test type: {test_type}")


def _effect_size_label(value: float, kind: str) -> str:
    """Return Portuguese interpretation of effect size."""
    if kind == "d":
        if value < 0.2:
            return "negligivel"
        elif value < 0.5:
            return "pequeno"
        elif value < 0.8:
            return "medio"
        else:
            return "grande"
    else:  # eta², epsilon²
        if value < 0.01:
            return "negligivel"
        elif value < 0.06:
            return "pequeno"
        elif value < 0.14:
            return "medio"
        else:
            return "grande"
