"""
Orion Stats - Export Service
Generates Excel exports with multiple sheets.
"""
import io
import pandas as pd
from pathlib import Path
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import Optional, Any

from app.schemas.schemas import FilterCondition
from app.services.stats_service import calculate_descriptive_stats


# Styling
HEADER_FILL = PatternFill(start_color="1B2A4A", end_color="1B2A4A", fill_type="solid")
HEADER_FONT = Font(name="Calibri", bold=True, color="A0D0FF", size=11)
CELL_FONT = Font(name="Calibri", color="E8F0F9", size=10)
TOTAL_FILL = PatternFill(start_color="0D1421", end_color="0D1421", fill_type="solid")
TOTAL_FONT = Font(name="Calibri", bold=True, color="4ADE80", size=10)
BORDER = Border(
    bottom=Side(style="thin", color="2A3F5F"),
)
BANNER_FILL = PatternFill(start_color="0D1421", end_color="0D1421", fill_type="solid")


def _style_header(ws, row, max_col):
    """Apply header styling to a row."""
    for col in range(1, max_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center")
        cell.border = BORDER


def _resolve_logo_path() -> Optional[Path]:
    """Resolve ORION wordmark path for export branding."""
    here = Path(__file__).resolve()
    candidates = [
        here.parents[1] / "assets" / "orion-wordmark-only.png",  # backend/app/assets
        here.parents[3] / "frontend" / "public" / "orion-wordmark-only.png",
        here.parents[3] / "Logo Orion Insights sem fundo.png",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _paint_banner(ws, start_row=1, end_row=6, end_col=16):
    """Paint a dark brand banner area in the worksheet."""
    for row in range(start_row, end_row + 1):
        ws.row_dimensions[row].height = 24
        for col in range(1, end_col + 1):
            ws.cell(row=row, column=col).fill = BANNER_FILL


def _insert_logo(ws, anchor_cell="A1", max_width=260):
    """Insert ORION wordmark if available."""
    logo_path = _resolve_logo_path()
    if not logo_path:
        return
    try:
        img = XLImage(str(logo_path))
        if img.width > max_width:
            ratio = max_width / float(img.width)
            img.width = int(img.width * ratio)
            img.height = int(img.height * ratio)
        ws.add_image(img, anchor_cell)
    except Exception:
        # Keep export resilient if image loading fails.
        return


def _auto_width(ws, max_width=28):
    """Auto-size worksheet columns with a max width cap."""
    for col in ws.columns:
        max_length = 0
        for cell in col:
            if cell.value is not None:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[col[0].column_letter].width = min(max_length + 2, max_width)


def _write_simple_table(ws, headers: list[str], rows: list[list[Any]], start_row=1):
    """Write a generic table with default dark theme styling."""
    for col_idx, header in enumerate(headers, 1):
        ws.cell(row=start_row, column=col_idx, value=header)
    _style_header(ws, start_row, len(headers))

    for row_idx, row_values in enumerate(rows, start_row + 1):
        for col_idx, value in enumerate(row_values, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.font = CELL_FONT
            cell.border = BORDER

    _auto_width(ws)
    return start_row + len(rows) + 1


def _write_stats_table(ws, stats_list, start_row=1):
    """Write statistics to a worksheet."""
    headers = [
        "Variavel", "N", "Ausentes", "% Ausentes", "Media", "Mediana", "Moda",
        "D. Padrao", "Variancia", "CV%", "SEM", "Min", "Max", "Amplitude",
        "Q1", "Q3", "IQR", "P5", "P10", "P90", "P95",
        "Assimetria", "Curtose", "IC Inf", "IC Sup", "Soma"
    ]

    for col_idx, header in enumerate(headers, 1):
        ws.cell(row=start_row, column=col_idx, value=header)
    _style_header(ws, start_row, len(headers))

    for row_idx, stat in enumerate(stats_list, start_row + 1):
        values = [
            stat.name, stat.count, stat.missing_count, stat.missing_pct,
            stat.mean, stat.median, stat.mode, stat.std, stat.variance,
            stat.cv, stat.sem, stat.min, stat.max, stat.range,
            stat.q1, stat.q3, stat.iqr, stat.p5, stat.p10, stat.p90, stat.p95,
            stat.skewness, stat.kurtosis, stat.ci_lower, stat.ci_upper, stat.sum,
        ]
        for col_idx, value in enumerate(values, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.font = CELL_FONT
            cell.border = BORDER

    _auto_width(ws, max_width=20)

    return start_row + len(stats_list) + 1


def _group_summary_maps(group_summaries):
    sample_size_map = {}
    pct_total_map = {}
    if not group_summaries:
        return sample_size_map, pct_total_map
    for gs in group_summaries:
        sample_size_map[gs.group_key] = gs.sample_size
        pct_total_map[gs.group_key] = gs.pct_of_total
    return sample_size_map, pct_total_map


def _build_group_report_rows(grouped, group_summaries):
    """One row per (group, variable) with comprehensive stats."""
    rows = []
    group_n_map, group_pct_map = _group_summary_maps(group_summaries)

    for group_key, group_stats in grouped.items():
        group_n = group_n_map.get(group_key)
        group_pct = group_pct_map.get(group_key)
        for stat in group_stats:
            rows.append([
                group_key,
                group_n,
                group_pct,
                stat.name,
                stat.count,
                stat.missing_count,
                stat.missing_pct,
                stat.mean,
                stat.median,
                stat.mode,
                stat.std,
                stat.variance,
                stat.cv,
                stat.sem,
                stat.min,
                stat.max,
                stat.range,
                stat.q1,
                stat.q3,
                stat.iqr,
                stat.p5,
                stat.p10,
                stat.p90,
                stat.p95,
                stat.skewness,
                stat.kurtosis,
                stat.ci_lower,
                stat.ci_upper,
                stat.sum,
            ])
    return rows


def _build_group_matrix_table(grouped, variables, columns_meta, group_summaries):
    """
    Matrix-style table:
    - rows: groups
    - columns: selected variables x key metrics
    """
    metric_defs = [
        ("mean", "Media"),
        ("std", "DP"),
        ("cv", "CV%"),
        ("median", "Mediana"),
        ("q1", "Q1"),
        ("q3", "Q3"),
        ("min", "Min"),
        ("max", "Max"),
        ("count", "N"),
    ]

    headers = ["Grupo", "N Grupo", "% Total"]
    for var in variables:
        var_name = columns_meta.get(var, var)
        for _, metric_label in metric_defs:
            headers.append(f"{var_name} | {metric_label}")

    group_n_map, group_pct_map = _group_summary_maps(group_summaries)
    rows = []
    for group_key, group_stats in grouped.items():
        stats_by_var = {s.col_key: s for s in group_stats}
        row = [group_key, group_n_map.get(group_key), group_pct_map.get(group_key)]
        for var in variables:
            stat = stats_by_var.get(var)
            for metric_key, _ in metric_defs:
                row.append(getattr(stat, metric_key, None) if stat else None)
        rows.append(row)

    return headers, rows


def _build_group_ranking_rows(grouped, variables, columns_meta):
    """
    Ranking table sorted by mean (desc) for each selected variable.
    """
    rows = []
    for var in variables:
        var_name = columns_meta.get(var, var)
        variable_entries = []
        for group_key, group_stats in grouped.items():
            stat = next((s for s in group_stats if s.col_key == var), None)
            if not stat or stat.mean is None:
                continue
            variable_entries.append((group_key, stat))

        variable_entries.sort(key=lambda x: x[1].mean if x[1].mean is not None else float("-inf"), reverse=True)

        for idx, (group_key, stat) in enumerate(variable_entries, 1):
            rows.append([
                var_name,
                idx,
                group_key,
                stat.mean,
                stat.std,
                stat.cv,
                stat.median,
                stat.min,
                stat.max,
                stat.range,
                stat.count,
                stat.ci_lower,
                stat.ci_upper,
            ])
    return rows


def _safe_val(value, default=-1e12):
    return value if value is not None else default


def _build_executive_variable_rows(grouped, variables, columns_meta):
    """Executive summary rows with best/worst/variability leaders per variable."""
    rows = []
    if not grouped:
        return rows

    for var in variables:
        var_name = columns_meta.get(var, var)
        entries = []
        for group_key, group_stats in grouped.items():
            stat = next((s for s in group_stats if s.col_key == var), None)
            if not stat or stat.mean is None:
                continue
            entries.append((group_key, stat))

        if not entries:
            continue

        best = max(entries, key=lambda x: _safe_val(x[1].mean))
        worst = min(entries, key=lambda x: _safe_val(x[1].mean))
        highest_std = max(entries, key=lambda x: _safe_val(x[1].std))
        highest_cv = max(entries, key=lambda x: _safe_val(x[1].cv))
        largest_n = max(entries, key=lambda x: _safe_val(x[1].count, default=0))
        spread = (best[1].mean - worst[1].mean) if best[1].mean is not None and worst[1].mean is not None else None

        rows.append([
            var_name,
            best[0], best[1].mean,
            worst[0], worst[1].mean,
            spread,
            highest_std[0], highest_std[1].std,
            highest_cv[0], highest_cv[1].cv,
            largest_n[0], largest_n[1].count,
            len(entries),
        ])

    return rows


def _write_executive_sheet(
    ws,
    sample_size: int,
    total_groups: Optional[int],
    variables: list[str],
    columns_meta: dict[str, str],
    grouped,
):
    """Create executive cover sheet with brand and automatic highlights."""
    _paint_banner(ws, start_row=1, end_row=6, end_col=18)
    _insert_logo(ws, anchor_cell="A1", max_width=320)

    ws.cell(row=7, column=1, value="Relatorio Executivo - Estatisticas por Grupo").font = Font(
        name="Calibri", bold=True, size=16, color="A0D0FF"
    )
    ws.cell(row=8, column=1, value=f"Gerado em: {pd.Timestamp.now().strftime('%d/%m/%Y %H:%M:%S')}").font = Font(
        name="Calibri", size=10, color="8BA3C0"
    )

    summary_headers = ["Indicador", "Valor"]
    summary_rows = [
        ["Amostra total", sample_size],
        ["Total de grupos", total_groups if total_groups is not None else "-"],
        ["Variaveis analisadas", ", ".join(columns_meta.get(v, v) for v in variables)],
        ["Tipo de relatorio", "Executivo Automatizado por Grupo"],
    ]
    _write_simple_table(ws, summary_headers, summary_rows, start_row=10)

    if grouped:
        exec_headers = [
            "Variavel",
            "Melhor Grupo", "Media Melhor",
            "Pior Grupo", "Media Pior",
            "Amplitude Medias",
            "Maior DP (Grupo)", "DP",
            "Maior CV% (Grupo)", "CV%",
            "Maior N (Grupo)", "N",
            "Grupos com dado",
        ]
        exec_rows = _build_executive_variable_rows(grouped, variables, columns_meta)
        if exec_rows:
            _write_simple_table(ws, exec_headers, exec_rows, start_row=16)

    _auto_width(ws, max_width=36)


def create_excel_export(
    df: pd.DataFrame,
    variables: list[str],
    columns_meta: dict[str, str],
    filters: Optional[list[FilterCondition]] = None,
    group_by: Optional[list[str]] = None,
    treat_missing_as_zero: bool = True,
    include_sheets: list[str] = None,
) -> io.BytesIO:
    """Create Excel workbook with statistics."""
    if include_sheets is None:
        include_sheets = ["descriptive"]

    sample_size, stats, grouped, summaries, tests, total_groups = calculate_descriptive_stats(
        df=df, variables=variables, columns_meta=columns_meta,
        filters=filters, group_by=group_by,
        treat_missing_as_zero=treat_missing_as_zero,
        run_comparison_tests=True if group_by else False,
    )

    wb = Workbook()
    active_taken = False

    def _sheet(title: str):
        nonlocal active_taken
        if not active_taken:
            ws_local = wb.active
            ws_local.title = title
            active_taken = True
            return ws_local
        return wb.create_sheet(title)

    # Sheet 1: Executive report
    if "executive" in include_sheets:
        ws = _sheet("Relatorio Executivo")
        _write_executive_sheet(
            ws=ws,
            sample_size=sample_size,
            total_groups=total_groups,
            variables=variables,
            columns_meta=columns_meta,
            grouped=grouped,
        )

    # Sheet 2: Descriptive stats
    if "descriptive" in include_sheets:
        ws = _sheet("Estatisticas Gerais")
        _paint_banner(ws, start_row=1, end_row=5, end_col=16)
        _insert_logo(ws, anchor_cell="A1", max_width=260)
        ws.cell(row=6, column=1, value=f"Amostra: {sample_size} registros").font = Font(
            bold=True, size=12, color="A0D0FF"
        )
        _write_stats_table(ws, stats, start_row=8)

    # Sheet 3: Grouped stats
    if "grouped" in include_sheets and grouped:
        ws = _sheet("Por Grupo")
        current_row = 1
        for group_key, group_stats in grouped.items():
            ws.cell(row=current_row, column=1, value=f"Grupo: {group_key}").font = Font(bold=True, size=11, color="22D3EE")
            current_row = _write_stats_table(ws, group_stats, start_row=current_row + 1)
            current_row += 1

    # Sheet 4: Group report (one row per group x variable)
    if "group_report" in include_sheets and grouped:
        ws = _sheet("Resumo Grupo")
        headers = [
            "Grupo", "N Grupo", "% Total",
            "Variavel", "N", "Ausentes", "% Ausentes",
            "Media", "Mediana", "Moda", "DP", "Variancia", "CV%", "SEM",
            "Min", "Max", "Amplitude", "Q1", "Q3", "IQR",
            "P5", "P10", "P90", "P95", "Assimetria", "Curtose",
            "IC Inf", "IC Sup", "Soma"
        ]
        rows = _build_group_report_rows(grouped, summaries)
        _write_simple_table(ws, headers, rows, start_row=1)

    # Sheet 5: Group matrix (compact comparative view)
    if "group_matrix" in include_sheets and grouped:
        ws = _sheet("Matriz Grupo")
        headers, rows = _build_group_matrix_table(grouped, variables, columns_meta, summaries)
        _write_simple_table(ws, headers, rows, start_row=1)

    # Sheet 6: Mean rankings by variable
    if "group_ranking" in include_sheets and grouped:
        ws = _sheet("Ranking Medias")
        headers = [
            "Variavel", "Ranking", "Grupo",
            "Media", "DP", "CV%", "Mediana",
            "Min", "Max", "Amplitude", "N", "IC Inf", "IC Sup"
        ]
        rows = _build_group_ranking_rows(grouped, variables, columns_meta)
        _write_simple_table(ws, headers, rows, start_row=1)

    # Sheet 7: Comparison tests
    if "comparison" in include_sheets and tests:
        ws = _sheet("Testes Comparativos")
        headers = ["Variavel", "Teste", "Estatistica", "p-valor", "Significativo", "Tamanho Efeito", "Interpretacao"]
        for col_idx, h in enumerate(headers, 1):
            ws.cell(row=1, column=col_idx, value=h)
        _style_header(ws, 1, len(headers))

        for row_idx, test in enumerate(tests, 2):
            values = [
                test.variable_name, test.test_name_display,
                test.statistic, test.p_value,
                "Sim" if test.significant else "Nao",
                f"{test.effect_size_name} = {test.effect_size}" if test.effect_size else "-",
                test.interpretation,
            ]
            for col_idx, v in enumerate(values, 1):
                cell = ws.cell(row=row_idx, column=col_idx, value=v)
                cell.font = CELL_FONT

    # Remove default empty sheet if we created named ones
    if wb.sheetnames[0] == "Sheet" and len(wb.sheetnames) > 1:
        del wb["Sheet"]

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
