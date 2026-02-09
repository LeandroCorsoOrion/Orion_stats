"""
Orion Stats - Export Service
Generates Excel exports with multiple sheets.
"""
import io
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import Optional

from app.schemas.schemas import FilterCondition
from app.services.data_service import apply_filters
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


def _style_header(ws, row, max_col):
    """Apply header styling to a row."""
    for col in range(1, max_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center")
        cell.border = BORDER


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

    # Auto-width
    for col in ws.columns:
        max_length = 0
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[col[0].column_letter].width = min(max_length + 2, 20)

    return start_row + len(stats_list) + 1


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

    # Sheet 1: Descriptive stats
    if "descriptive" in include_sheets:
        ws = wb.active
        ws.title = "Estatisticas Gerais"
        ws.cell(row=1, column=1, value=f"Amostra: {sample_size} registros").font = Font(bold=True, size=12, color="A0D0FF")
        _write_stats_table(ws, stats, start_row=3)

    # Sheet 2: Grouped stats
    if "grouped" in include_sheets and grouped:
        ws = wb.create_sheet("Por Grupo")
        current_row = 1
        for group_key, group_stats in grouped.items():
            ws.cell(row=current_row, column=1, value=f"Grupo: {group_key}").font = Font(bold=True, size=11, color="22D3EE")
            current_row = _write_stats_table(ws, group_stats, start_row=current_row + 1)
            current_row += 1

    # Sheet 3: Comparison tests
    if "comparison" in include_sheets and tests:
        ws = wb.create_sheet("Testes Comparativos")
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
