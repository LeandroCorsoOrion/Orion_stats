// Orion Stats - Statistics Page (Full Evolution)

import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3, Download, Loader2, X, FileSpreadsheet } from 'lucide-react';
import { getDescriptiveStats, getUniqueValues, getChartData, exportStatsExcel } from '@/lib/api';
import { useApp } from '@/lib/context';
import { STAT_TOOLTIPS, STAT_PRESETS } from '@/lib/statTooltips';
import type { ColumnStats, StatsResponse, ChartDataResponse } from '@/types';

import { StatsTabNav } from '@/components/stats/StatsTabNav';
import { StatSelectorPanel } from '@/components/stats/StatSelectorPanel';
import { GroupComparisonCard } from '@/components/stats/GroupComparisonCard';
import { InsightsPanel } from '@/components/stats/InsightsPanel';
import { FrequencyTab } from '@/components/stats/FrequencyTab';
import { CrosstabTab } from '@/components/stats/CrosstabTab';
import { NormalityTab } from '@/components/stats/NormalityTab';
import { HypothesisTab } from '@/components/stats/HypothesisTab';
import { ChartViewToggle, type ChartView } from '@/components/stats/charts/ChartViewToggle';
import { GroupBoxplot } from '@/components/stats/charts/GroupBoxplot';
import { GroupBarChart } from '@/components/stats/charts/GroupBarChart';
import { GroupViolinPlot } from '@/components/stats/charts/GroupViolinPlot';

export function EstatisticasPage() {
    const {
        currentDataset, filters, setFilters,
        statsVariables, setStatsVariables,
        statsGroupBy, setStatsGroupBy,
        treatMissingAsZero, setTreatMissingAsZero
    } = useApp();

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<StatsResponse | null>(null);
    const [filterValues, setFilterValues] = useState<Record<string, (string | number)[]>>({});
    const [loadingValues, setLoadingValues] = useState<Set<string>>(new Set());
    const initialLoadDone = useRef(false);

    // New states for evolution
    const [activeTab, setActiveTab] = useState('descritivas');
    const [selectedStats, setSelectedStats] = useState<string[]>(STAT_PRESETS.basico.stats);
    const [runComparisonTests, setRunComparisonTests] = useState(true);
    const [chartView, setChartView] = useState<ChartView>('table');
    const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
    const [chartVariable, setChartVariable] = useState('');
    const [loadingChart, setLoadingChart] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);

    const discreteColumns = currentDataset?.columns.filter(
        (c) => c.var_type === 'categorical' || c.var_type === 'discrete'
    ) || [];

    const continuousColumns = currentDataset?.columns.filter(
        (c) => c.var_type === 'continuous'
    ) || [];

    // Load filter values once when component mounts
    useEffect(() => {
        if (currentDataset && !initialLoadDone.current && discreteColumns.length > 0) {
            initialLoadDone.current = true;
            discreteColumns.slice(0, 5).forEach(col => {
                loadUniqueValuesForColumn(col.col_key);
            });
        }
    }, [currentDataset?.id]);

    // Auto-calculate when variables change
    useEffect(() => {
        if (currentDataset && statsVariables.length > 0 && activeTab === 'descritivas') {
            const timer = setTimeout(() => {
                calculateStats();
            }, 300);
            return () => clearTimeout(timer);
        } else if (activeTab === 'descritivas') {
            setResult(null);
        }
    }, [statsVariables, statsGroupBy, filters, treatMissingAsZero, currentDataset?.id, selectedStats, runComparisonTests]);

    async function loadUniqueValuesForColumn(colKey: string) {
        if (!currentDataset || filterValues[colKey] || loadingValues.has(colKey)) return;

        setLoadingValues(prev => new Set(prev).add(colKey));
        try {
            const resp = await getUniqueValues(currentDataset.id, colKey);
            setFilterValues(prev => ({ ...prev, [colKey]: resp.values }));
        } catch (e) {
            console.error('Failed to load unique values:', e);
        } finally {
            setLoadingValues(prev => {
                const next = new Set(prev);
                next.delete(colKey);
                return next;
            });
        }
    }

    async function calculateStats() {
        if (!currentDataset || statsVariables.length === 0) return;

        setLoading(true);
        try {
            const response = await getDescriptiveStats({
                dataset_id: currentDataset.id,
                filters,
                variables: statsVariables,
                group_by: statsGroupBy,
                treat_missing_as_zero: treatMissingAsZero,
                selected_stats: selectedStats,
                run_comparison_tests: runComparisonTests && statsGroupBy.length > 0,
                confidence_level: 0.95,
            });
            setResult(response);
        } catch (e) {
            console.error('Failed to calculate stats:', e);
        } finally {
            setLoading(false);
        }
    }

    async function loadChartData(variable: string) {
        if (!currentDataset || statsGroupBy.length === 0) return;

        setLoadingChart(true);
        setChartVariable(variable);
        try {
            const resp = await getChartData({
                dataset_id: currentDataset.id,
                filters,
                variable,
                group_by: statsGroupBy[0],
                treat_missing_as_zero: treatMissingAsZero,
            });
            setChartData(resp);
        } catch (e) {
            console.error('Failed to load chart data:', e);
        } finally {
            setLoadingChart(false);
        }
    }

    async function handleExportExcel() {
        if (!currentDataset) return;
        setExportingExcel(true);
        try {
            const blob = await exportStatsExcel({
                dataset_id: currentDataset.id,
                filters,
                variables: statsVariables,
                group_by: statsGroupBy,
                treat_missing_as_zero: treatMissingAsZero,
                selected_stats: selectedStats,
                run_comparison_tests: runComparisonTests,
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `estatisticas_${currentDataset.name}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Failed to export Excel:', e);
        } finally {
            setExportingExcel(false);
        }
    }

    function handleFilterChange(colKey: string, selectedValues: (string | number)[]) {
        if (selectedValues.length === 0) {
            setFilters(filters.filter(f => f.col_key !== colKey));
        } else {
            const existing = filters.find(f => f.col_key === colKey);
            if (existing) {
                setFilters(filters.map(f => f.col_key === colKey ? { ...f, values: selectedValues } : f));
            } else {
                setFilters([...filters, { col_key: colKey, values: selectedValues }]);
            }
        }
    }

    function toggleVariable(colKey: string) {
        if (statsVariables.includes(colKey)) {
            setStatsVariables(statsVariables.filter(v => v !== colKey));
        } else {
            setStatsVariables([...statsVariables, colKey]);
        }
    }

    function toggleGroupBy(colKey: string) {
        if (statsGroupBy.includes(colKey)) {
            setStatsGroupBy(statsGroupBy.filter(v => v !== colKey));
        } else {
            setStatsGroupBy([...statsGroupBy, colKey]);
        }
    }

    function exportCSV() {
        if (!result) return;
        const statKeys = selectedStats.filter(k => k !== 'count' && k !== 'missing_count');
        const headers = ['Variavel', ...statKeys.map(k => STAT_TOOLTIPS[k]?.shortLabel || k), 'N', 'Ausentes'];
        const rows = result.statistics.map(s => {
            const vals = statKeys.map(k => {
                const v = s[k as keyof ColumnStats];
                return typeof v === 'number' ? v : '';
            });
            return [s.name, ...vals, s.count, s.missing_count].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'estatisticas.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function getSelectedCount() {
        return filters.reduce((acc, f) => acc + f.values.length, 0);
    }

    // Determine which stat columns to show in the table
    const visibleStatKeys = selectedStats.filter(k => STAT_TOOLTIPS[k]);

    if (!currentDataset) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <BarChart3 size={48} className="text-muted" />
                <p className="text-secondary">Carregue um dataset primeiro</p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <h2 className="section-title mb-4">Estatisticas</h2>

            {/* Sub-tab navigation */}
            <StatsTabNav activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Descritivas tab */}
            {activeTab === 'descritivas' && (
                <div className="grid gap-6" style={{ gridTemplateColumns: '340px 1fr' }}>
                    {/* Left Panel - Controls */}
                    <div className="flex flex-col gap-4">

                        {/* Selected Variables Tags */}
                        {statsVariables.length > 0 && (
                            <div className="glass-card p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-sm">Variaveis Selecionadas</h3>
                                    <span className="text-xs text-primary">{statsVariables.length} selecionadas</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {statsVariables.map((vKey) => {
                                        const col = continuousColumns.find(c => c.col_key === vKey);
                                        return (
                                            <span key={vKey} className="chip active flex items-center gap-1 cursor-pointer"
                                                onClick={() => toggleVariable(vKey)}>
                                                {col?.name || vKey}
                                                <X size={12} />
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Stat Selector */}
                        <StatSelectorPanel selectedStats={selectedStats} onChangeStats={setSelectedStats} />

                        {/* Treatment Option */}
                        <div className="glass-card p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={treatMissingAsZero}
                                    onChange={(e) => setTreatMissingAsZero(e.target.checked)}
                                    className="w-5 h-5 accent-[var(--color-primary)]" />
                                <span className="text-sm">Tratar valores ausentes como 0</span>
                            </label>
                        </div>

                        {/* Variables Selection */}
                        <div className="glass-card p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold">Variaveis de Analise</h3>
                                {loading && <Loader2 size={16} className="animate-spin text-primary" />}
                            </div>
                            <p className="text-xs text-muted mb-3">Selecione as variaveis continuas para calcular estatisticas</p>

                            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                                {continuousColumns.map((col) => {
                                    const isSelected = statsVariables.includes(col.col_key);
                                    return (
                                        <label key={col.col_key}
                                            className={`flex items-center gap-2 cursor-pointer p-2 rounded transition ${isSelected
                                                ? 'bg-[rgba(160,208,255,0.15)] border border-[var(--color-primary)]'
                                                : 'hover:bg-[var(--color-surface)] border border-transparent'}`}>
                                            <input type="checkbox" checked={isSelected}
                                                onChange={() => toggleVariable(col.col_key)}
                                                className="w-4 h-4 accent-[var(--color-primary)]" />
                                            <span className={`text-sm ${isSelected ? 'text-primary font-medium' : ''}`}>
                                                {col.name}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="glass-card p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">Filtros</h3>
                                {getSelectedCount() > 0 && (
                                    <button className="text-xs text-error hover:underline"
                                        onClick={() => setFilters([])}>
                                        Limpar ({getSelectedCount()})
                                    </button>
                                )}
                            </div>

                            {discreteColumns.length === 0 ? (
                                <p className="text-sm text-muted">Nenhuma variavel discreta disponivel</p>
                            ) : (
                                <div className="flex flex-col gap-4 max-h-80 overflow-y-auto">
                                    {discreteColumns.slice(0, 5).map((col) => {
                                        const values = filterValues[col.col_key];
                                        const selectedInFilter = filters.find(f => f.col_key === col.col_key)?.values || [];
                                        const isLoading = loadingValues.has(col.col_key);

                                        return (
                                            <div key={col.col_key}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium">{col.name}</span>
                                                    {selectedInFilter.length > 0 && (
                                                        <span className="text-xs text-primary">{selectedInFilter.length} selecionados</span>
                                                    )}
                                                </div>

                                                {isLoading || !values ? (
                                                    <div className="flex items-center gap-2 text-xs text-muted">
                                                        <Loader2 size={12} className="animate-spin" />
                                                        Carregando...
                                                    </div>
                                                ) : (
                                                    <select multiple
                                                        className="w-full bg-[var(--color-surface)] border border-[var(--glass-border)] rounded-lg text-sm focus:border-[var(--color-primary)] focus:outline-none"
                                                        style={{ height: Math.min(values.length * 28 + 8, 120) }}
                                                        value={selectedInFilter.map(String)}
                                                        onChange={(e) => {
                                                            const selected = Array.from(e.target.selectedOptions, opt => {
                                                                const original = values.find(v => String(v) === opt.value);
                                                                return original !== undefined ? original : opt.value;
                                                            });
                                                            handleFilterChange(col.col_key, selected);
                                                        }}>
                                                        {values.slice(0, 30).map((value) => (
                                                            <option key={String(value)} value={String(value)} className="py-1 px-2">
                                                                {String(value)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Group By */}
                        <div className="glass-card p-4">
                            <div className="mb-3">
                                <h3 className="font-semibold">Agrupar Por</h3>
                                <p className="text-xs text-muted mt-1">
                                    Subdivide os resultados por categoria. Ex: agrupar por "Cliente" mostra as estatisticas de cada cliente separadamente.
                                </p>
                            </div>

                            {/* Comparison tests toggle */}
                            {statsGroupBy.length > 0 && (
                                <label className="flex items-center gap-2 cursor-pointer mb-3 p-2 rounded bg-[var(--color-surface)]">
                                    <input type="checkbox" checked={runComparisonTests}
                                        onChange={(e) => setRunComparisonTests(e.target.checked)}
                                        className="w-4 h-4 accent-[var(--color-primary)]" />
                                    <span className="text-xs">Executar testes comparativos</span>
                                </label>
                            )}

                            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                                {discreteColumns.map((col) => {
                                    const isSelected = statsGroupBy.includes(col.col_key);
                                    return (
                                        <label key={col.col_key}
                                            className={`flex items-center gap-2 cursor-pointer p-2 rounded transition ${isSelected
                                                ? 'bg-[rgba(160,208,255,0.15)] border border-[var(--color-primary)]'
                                                : 'hover:bg-[var(--color-surface)] border border-transparent'}`}>
                                            <input type="checkbox" checked={isSelected}
                                                onChange={() => toggleGroupBy(col.col_key)}
                                                className="w-4 h-4 accent-[var(--color-primary)]" />
                                            <span className={`text-sm ${isSelected ? 'text-primary font-medium' : ''}`}>
                                                {col.name}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            {statsGroupBy.length === 0 && statsVariables.length > 0 && (
                                <p className="text-xs text-muted mt-3 italic">
                                    Nenhum agrupamento selecionado — os resultados mostram o total geral.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Results */}
                    <div>
                        {result && (
                            <div className="animate-fadeIn">
                                <div className="glass-card p-6 mb-4">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="font-semibold text-lg">Resultados</h3>
                                            <p className="text-sm text-secondary">
                                                Amostra: {result.sample_size.toLocaleString()} registros
                                                {result.total_groups && result.total_groups > 0 && ` | ${result.total_groups} grupos`}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="btn btn-secondary text-sm" onClick={exportCSV}>
                                                <Download size={14} /> CSV
                                            </button>
                                            <button className="btn btn-secondary text-sm" onClick={handleExportExcel}
                                                disabled={exportingExcel}>
                                                {exportingExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                                                Excel
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Cards - top 4 */}
                                    <div className="grid grid-cols-4 gap-4 mb-6">
                                        {result.statistics.slice(0, 4).map((stat) => (
                                            <div key={stat.col_key} className="stat-card">
                                                <div className="stat-label truncate" title={stat.name}>{stat.name}</div>
                                                <div className="stat-value">{stat.mean?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '-'}</div>
                                                <div className="text-xs text-muted mt-1">Media</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Dynamic Stats Table */}
                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Variavel</th>
                                                    {visibleStatKeys.map(k => (
                                                        <th key={k} title={STAT_TOOLTIPS[k]?.description}>
                                                            {STAT_TOOLTIPS[k]?.shortLabel || k}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.statistics.map((stat: ColumnStats) => (
                                                    <tr key={stat.col_key}>
                                                        <td className="font-medium">{stat.name}</td>
                                                        {visibleStatKeys.map(k => {
                                                            const val = stat[k as keyof ColumnStats];
                                                            let display = '-';
                                                            if (typeof val === 'number') {
                                                                if (k === 'count' || k === 'missing_count') {
                                                                    display = val.toLocaleString();
                                                                } else if (k === 'missing_pct' || k === 'cv' || k === 'group_pct') {
                                                                    display = val.toFixed(1) + '%';
                                                                } else {
                                                                    display = val.toFixed(2);
                                                                }
                                                            }
                                                            const isWarning = k === 'missing_count' && typeof val === 'number' && val > 0;
                                                            return (
                                                                <td key={k} className={isWarning ? 'text-warning' : ''}>
                                                                    {display}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Grouped Statistics */}
                                {result.grouped_statistics && Object.keys(result.grouped_statistics).length > 0 && (
                                    <div className="glass-card p-6 mb-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold">Estatisticas por Grupo</h4>

                                            {/* Chart view toggle (only when grouped) */}
                                            {statsGroupBy.length > 0 && statsVariables.length > 0 && (
                                                <div className="flex items-center gap-3">
                                                    {chartView !== 'table' && statsVariables.length > 1 && (
                                                        <select className="select text-xs" value={chartVariable}
                                                            onChange={e => { setChartVariable(e.target.value); loadChartData(e.target.value); }}>
                                                            <option value="">Variavel do grafico...</option>
                                                            {statsVariables.map(v => {
                                                                const col = continuousColumns.find(c => c.col_key === v);
                                                                return <option key={v} value={v}>{col?.name || v}</option>;
                                                            })}
                                                        </select>
                                                    )}
                                                    <ChartViewToggle activeView={chartView} onViewChange={(view) => {
                                                        setChartView(view);
                                                        if (view !== 'table' && !chartData && statsVariables.length > 0) {
                                                            const varToChart = chartVariable || statsVariables[0];
                                                            setChartVariable(varToChart);
                                                            loadChartData(varToChart);
                                                        }
                                                    }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Group summary */}
                                        {result.group_summaries && result.group_summaries.length > 0 && chartView === 'table' && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {result.group_summaries.map(gs => (
                                                    <div key={gs.group_key} className="chip text-xs">
                                                        {gs.group_key}: {gs.sample_size.toLocaleString()} ({gs.pct_of_total.toFixed(1)}%)
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Chart views */}
                                        {chartView !== 'table' && (
                                            <div className="mb-4">
                                                {loadingChart ? (
                                                    <div className="flex items-center justify-center h-48">
                                                        <Loader2 size={24} className="animate-spin text-primary" />
                                                    </div>
                                                ) : chartData ? (
                                                    <>
                                                        {chartView === 'boxplot' && <GroupBoxplot data={chartData} />}
                                                        {chartView === 'bar' && <GroupBarChart data={chartData} />}
                                                        {chartView === 'violin' && <GroupViolinPlot data={chartData} />}
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-muted text-center py-8">Selecione uma variavel para visualizar</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Grouped table */}
                                        {chartView === 'table' && Object.entries(result.grouped_statistics).map(([groupName, stats]) => (
                                            <div key={groupName} className="mb-6">
                                                <div className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                                                    <span className="chip active text-xs py-0.5 px-2">{groupName}</span>
                                                </div>
                                                <div className="table-container">
                                                    <table className="table">
                                                        <thead>
                                                            <tr>
                                                                <th>Variavel</th>
                                                                {visibleStatKeys.map(k => (
                                                                    <th key={k} title={STAT_TOOLTIPS[k]?.description}>
                                                                        {STAT_TOOLTIPS[k]?.shortLabel || k}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {stats.map((s: ColumnStats) => (
                                                                <tr key={s.col_key}>
                                                                    <td className="font-medium">{s.name}</td>
                                                                    {visibleStatKeys.map(k => {
                                                                        const val = s[k as keyof ColumnStats];
                                                                        let display = '-';
                                                                        if (typeof val === 'number') {
                                                                            if (k === 'count' || k === 'missing_count') {
                                                                                display = val.toLocaleString();
                                                                            } else if (k === 'missing_pct' || k === 'cv' || k === 'group_pct') {
                                                                                display = val.toFixed(1) + '%';
                                                                            } else {
                                                                                display = val.toFixed(2);
                                                                            }
                                                                        }
                                                                        return <td key={k}>{display}</td>;
                                                                    })}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Group Comparison Tests */}
                                {result.group_comparison_tests && result.group_comparison_tests.length > 0 && (
                                    <div className="glass-card p-6 mb-4">
                                        <GroupComparisonCard tests={result.group_comparison_tests} />
                                    </div>
                                )}

                                {/* Insights */}
                                <InsightsPanel
                                    statistics={result.statistics}
                                    comparisonTests={result.group_comparison_tests}
                                />
                            </div>
                        )}

                        {!result && statsVariables.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-96 gap-4 glass-card">
                                <BarChart3 size={48} className="text-muted" />
                                <p className="text-secondary">Selecione variaveis para ver estatisticas</p>
                                <p className="text-muted text-sm">Os calculos sao feitos automaticamente</p>
                            </div>
                        )}

                        {!result && statsVariables.length > 0 && loading && (
                            <div className="flex flex-col items-center justify-center h-96 gap-4 glass-card">
                                <Loader2 size={48} className="text-primary animate-spin" />
                                <p className="text-secondary">Calculando estatisticas...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Frequencias tab */}
            {activeTab === 'frequencias' && (
                <FrequencyTab
                    datasetId={currentDataset.id}
                    filters={filters}
                    discreteColumns={discreteColumns}
                    treatMissingAsZero={treatMissingAsZero}
                />
            )}

            {/* Crosstabs tab */}
            {activeTab === 'crosstabs' && (
                <CrosstabTab
                    datasetId={currentDataset.id}
                    filters={filters}
                    discreteColumns={discreteColumns}
                    treatMissingAsZero={treatMissingAsZero}
                />
            )}

            {/* Normalidade tab */}
            {activeTab === 'normalidade' && (
                <NormalityTab
                    datasetId={currentDataset.id}
                    filters={filters}
                    continuousColumns={continuousColumns}
                    treatMissingAsZero={treatMissingAsZero}
                />
            )}

            {/* Testes de Hipotese tab */}
            {activeTab === 'testes' && (
                <HypothesisTab
                    datasetId={currentDataset.id}
                    filters={filters}
                    continuousColumns={continuousColumns}
                    discreteColumns={discreteColumns}
                    treatMissingAsZero={treatMissingAsZero}
                />
            )}
        </div>
    );
}
