// Orion Stats - Statistics Page (Full Evolution)

import { useState, useEffect, useRef } from 'react';
import { BarChart3, Download, Loader2, X, FileSpreadsheet, Save, Play, Trash2 } from 'lucide-react';
import { getDescriptiveStats, getUniqueValues, getChartData, exportStatsExcel } from '@/lib/api';
import { useApp } from '@/lib/context';
import { STAT_TOOLTIPS, STAT_PRESETS } from '@/lib/statTooltips';
import type { ColumnStats, StatsResponse, ChartDataResponse, FilterCondition } from '@/types';

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
import { GroupAutomatedReport } from '@/components/stats/GroupAutomatedReport';

interface SavedDescriptiveAnalysis {
    id: string;
    createdAt: string;
    datasetId: number;
    result: StatsResponse;
    config: {
        filters: FilterCondition[];
        variables: string[];
        groupBy: string[];
        selectedStats: string[];
        runComparisonTests: boolean;
        treatMissingAsZero: boolean;
        applyGroupFilters: boolean;
    };
}

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
    const [savedAnalyses, setSavedAnalyses] = useState<SavedDescriptiveAnalysis[]>([]);
    const [applyGroupFilters, setApplyGroupFilters] = useState(false);
    const [statsError, setStatsError] = useState<string | null>(null);

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

    useEffect(() => {
        setSavedAnalyses([]);
        setApplyGroupFilters(false);
        setStatsError(null);
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
    }, [statsVariables, statsGroupBy, filters, treatMissingAsZero, currentDataset?.id, selectedStats, runComparisonTests, applyGroupFilters]);

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
        setStatsError(null);
        try {
            const effectiveFilters = getEffectiveFilters();
            const response = await getDescriptiveStats({
                dataset_id: currentDataset.id,
                filters: effectiveFilters,
                variables: statsVariables,
                group_by: statsGroupBy,
                treat_missing_as_zero: treatMissingAsZero,
                selected_stats: selectedStats,
                run_comparison_tests: runComparisonTests && statsGroupBy.length > 0,
                confidence_level: 0.95,
                max_groups: 200,
            });
            setResult(response);
        } catch (e) {
            console.error('Failed to calculate stats:', e);
            setResult(null);
            const err = e as { response?: { data?: { detail?: string } } };
            const detail = err.response?.data?.detail;
            const fallbackMsg = e instanceof Error ? e.message : '';
            setStatsError(
                detail
                    ? `Falha ao calcular estatisticas: ${detail}`
                    : fallbackMsg
                        ? `Falha ao calcular estatisticas: ${fallbackMsg}`
                        : 'Falha ao calcular estatisticas. Verifique os filtros e tente novamente.'
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadChartData(variable: string) {
        if (!currentDataset || statsGroupBy.length === 0) return;

        setLoadingChart(true);
        setChartVariable(variable);
        try {
            const effectiveFilters = getEffectiveFilters();
            const resp = await getChartData({
                dataset_id: currentDataset.id,
                filters: effectiveFilters,
                variable,
                group_by: statsGroupBy[0],
                treat_missing_as_zero: treatMissingAsZero,
                max_groups: 200,
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
            const includeSheets = ['executive', 'descriptive'];
            if (statsGroupBy.length > 0) {
                includeSheets.push('grouped', 'group_report', 'group_matrix', 'group_ranking');
                if (runComparisonTests) {
                    includeSheets.push('comparison');
                }
            }

            const effectiveFilters = getEffectiveFilters();
            const blob = await exportStatsExcel({
                dataset_id: currentDataset.id,
                filters: effectiveFilters,
                variables: statsVariables,
                group_by: statsGroupBy,
                treat_missing_as_zero: treatMissingAsZero,
                selected_stats: selectedStats,
                run_comparison_tests: runComparisonTests,
                include_sheets: includeSheets,
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio_estatistico_${currentDataset.name}.xlsx`;
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

    function getColumnDisplayName(colKey: string) {
        const col = currentDataset?.columns.find(c => c.col_key === colKey);
        return col?.name || colKey;
    }

    function formatColumnList(colKeys: string[], maxItems = 3) {
        const labels = colKeys.map(getColumnDisplayName);
        if (labels.length <= maxItems) return labels.join(', ');
        return `${labels.slice(0, maxItems).join(', ')} +${labels.length - maxItems}`;
    }

    function findColumnKey(candidates: string[]) {
        if (!currentDataset) return '';
        for (const c of candidates) {
            if (currentDataset.columns.some(col => col.col_key === c)) {
                return c;
            }
        }
        return '';
    }

    function findFamilyGroupKey() {
        const exact = discreteColumns.find(c => c.col_key === 'familia');
        if (exact) return exact.col_key;
        const guess = discreteColumns.find(c => c.col_key.includes('famil'));
        return guess?.col_key || '';
    }

    function applyFamilyPreset(variableCandidates: string[], statsPreset: keyof typeof STAT_PRESETS = 'industrial') {
        const variableKey = findColumnKey(variableCandidates);
        const familyKey = findFamilyGroupKey();

        if (!variableKey || !familyKey) {
            setStatsError('Preset indisponivel para este dataset (variavel ou coluna de familia nao encontrada).');
            return;
        }

        setStatsError(null);
        setChartData(null);
        setChartVariable('');
        setStatsVariables([variableKey]);
        setStatsGroupBy([familyKey]);
        setSelectedStats([...STAT_PRESETS[statsPreset].stats]);
        setRunComparisonTests(true);
        setApplyGroupFilters(false);
    }

    function getEffectiveFilters() {
        if (statsGroupBy.length === 0 || applyGroupFilters) {
            return filters;
        }
        const groupedColumns = new Set(statsGroupBy);
        return filters.filter(f => !groupedColumns.has(f.col_key));
    }

    function getIgnoredGroupFilters() {
        if (statsGroupBy.length === 0 || applyGroupFilters) {
            return [] as FilterCondition[];
        }
        const groupedColumns = new Set(statsGroupBy);
        return filters.filter(f => groupedColumns.has(f.col_key));
    }

    function getGroupMean(groupKey: string, variableKey: string): number | null {
        if (!result?.grouped_statistics) return null;
        const groupStats = result.grouped_statistics[groupKey];
        if (!groupStats) return null;
        const variableStats = groupStats.find(s => s.col_key === variableKey);
        return typeof variableStats?.mean === 'number' ? variableStats.mean : null;
    }

    function saveCurrentAnalysis() {
        if (!currentDataset || !result) return;
        const snapshot: SavedDescriptiveAnalysis = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
            datasetId: currentDataset.id,
            result: JSON.parse(JSON.stringify(result)) as StatsResponse,
            config: {
                filters: filters.map(f => ({ col_key: f.col_key, values: [...f.values] })),
                variables: [...statsVariables],
                groupBy: [...statsGroupBy],
                selectedStats: [...selectedStats],
                runComparisonTests,
                treatMissingAsZero,
                applyGroupFilters,
            },
        };
        setSavedAnalyses(prev => [snapshot, ...prev]);
    }

    function openSavedAnalysis(analysis: SavedDescriptiveAnalysis) {
        if (!currentDataset || analysis.datasetId !== currentDataset.id) return;
        setFilters(analysis.config.filters.map(f => ({ col_key: f.col_key, values: [...f.values] })));
        setStatsVariables([...analysis.config.variables]);
        setStatsGroupBy([...analysis.config.groupBy]);
        setSelectedStats([...analysis.config.selectedStats]);
        setRunComparisonTests(analysis.config.runComparisonTests);
        setTreatMissingAsZero(analysis.config.treatMissingAsZero);
        setApplyGroupFilters(analysis.config.applyGroupFilters ?? false);
        setResult(analysis.result);
        setActiveTab('descritivas');
    }

    function removeSavedAnalysis(id: string) {
        setSavedAnalyses(prev => prev.filter(a => a.id !== id));
    }

    // Determine which stat columns to show in the table
    const visibleStatKeys = selectedStats.filter(k => STAT_TOOLTIPS[k]);
    const primaryGroupedVariable = statsVariables[0] || '';
    const primaryGroupedVariableName = primaryGroupedVariable ? getColumnDisplayName(primaryGroupedVariable) : '';
    const ignoredGroupFilters = getIgnoredGroupFilters();
    const ignoredGroupFilterNames = ignoredGroupFilters.map(f => getColumnDisplayName(f.col_key));

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

                        {/* Analysis Presets */}
                        <div className="glass-card p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-sm">Presets de Analise</h3>
                                <span className="text-xs text-muted">1 clique</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    className="btn btn-secondary text-xs py-1 px-3"
                                    onClick={() => applyFamilyPreset(['peso_liq_it', 'peso_brt_it', 'peso_conj'], 'industrial')}
                                >
                                    Peso x Familia
                                </button>
                                <button
                                    className="btn btn-secondary text-xs py-1 px-3"
                                    onClick={() => applyFamilyPreset(['custo_item', 'custo_bruto'], 'industrial')}
                                >
                                    Custo x Familia
                                </button>
                                <button
                                    className="btn btn-secondary text-xs py-1 px-3"
                                    onClick={() => applyFamilyPreset(['rend_metal'], 'spss')}
                                >
                                    Rendimento x Familia
                                </button>
                            </div>
                            <p className="text-xs text-muted mt-2">
                                O preset marca variavel, agrupa por familia, ativa testes comparativos e desliga filtro da coluna agrupada.
                            </p>
                        </div>

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

                            {statsGroupBy.length > 0 && (
                                <label className="flex items-center gap-2 cursor-pointer mb-3 p-2 rounded bg-[var(--color-surface)]">
                                    <input
                                        type="checkbox"
                                        checked={applyGroupFilters}
                                        onChange={(e) => setApplyGroupFilters(e.target.checked)}
                                        className="w-4 h-4 accent-[var(--color-primary)]"
                                    />
                                    <span className="text-xs">Aplicar filtro da coluna agrupada (pode reduzir para 1 grupo)</span>
                                </label>
                            )}

                            {statsGroupBy.length > 0 && !applyGroupFilters && ignoredGroupFilters.length > 0 && (
                                <p className="text-xs text-warning mb-3">
                                    Filtros ignorados para comparar todos os grupos: {ignoredGroupFilterNames.join(', ')}
                                </p>
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
                                            {statsGroupBy.length > 0 && !applyGroupFilters && ignoredGroupFilters.length > 0 && (
                                                <p className="text-xs text-warning mt-1">
                                                    Comparacao por grupo usando filtros sem {ignoredGroupFilterNames.join(', ')}.
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="btn btn-secondary text-sm" onClick={saveCurrentAnalysis}>
                                                <Save size={14} /> Salvar Analise
                                            </button>
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
                                                {result.group_summaries.map(gs => {
                                                    const groupMean = primaryGroupedVariable
                                                        ? getGroupMean(gs.group_key, primaryGroupedVariable)
                                                        : null;
                                                    return (
                                                        <div key={gs.group_key} className="chip text-xs">
                                                            {gs.group_key}: {gs.sample_size.toLocaleString()} ({gs.pct_of_total.toFixed(1)}%)
                                                            {groupMean !== null && ` | Media ${primaryGroupedVariableName}: ${groupMean.toFixed(2)}`}
                                                        </div>
                                                    );
                                                })}
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
                                                        {chartView === 'report' && <GroupAutomatedReport data={chartData} />}
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

                                {savedAnalyses.length > 0 && (
                                    <div className="glass-card p-6 mt-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="font-semibold">Relatorio de Analises na Aba</h4>
                                                <p className="text-xs text-muted mt-1">
                                                    {savedAnalyses.length} analise(s) salva(s) para comparacao rapida
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {savedAnalyses.map((analysis, idx) => (
                                                <div
                                                    key={analysis.id}
                                                    className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--color-surface)]"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="font-medium">
                                                                Analise {savedAnalyses.length - idx}
                                                            </div>
                                                            <div className="text-xs text-muted mt-1">
                                                                {new Date(analysis.createdAt).toLocaleString('pt-BR')} | Amostra {analysis.result.sample_size.toLocaleString()} registros
                                                                {analysis.result.total_groups && analysis.result.total_groups > 0 && ` | ${analysis.result.total_groups} grupos`}
                                                            </div>
                                                            <div className="text-xs text-secondary mt-2">
                                                                Variaveis: {formatColumnList(analysis.config.variables)}
                                                            </div>
                                                            <div className="text-xs text-secondary mt-1">
                                                                Agrupamento: {analysis.config.groupBy.length > 0 ? formatColumnList(analysis.config.groupBy) : 'Sem agrupamento'}
                                                            </div>
                                                            {analysis.config.groupBy.length > 0 && (
                                                                <div className="text-xs text-secondary mt-1">
                                                                    Filtro da coluna agrupada: {analysis.config.applyGroupFilters ? 'Aplicado' : 'Ignorado'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button className="btn btn-secondary text-xs" onClick={() => openSavedAnalysis(analysis)}>
                                                                <Play size={12} /> Reabrir
                                                            </button>
                                                            <button className="btn btn-secondary text-xs" onClick={() => removeSavedAnalysis(analysis.id)}>
                                                                <Trash2 size={12} /> Remover
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="table-container mt-3">
                                                        <table className="table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Variavel</th>
                                                                    <th>Media</th>
                                                                    <th>D.P.</th>
                                                                    <th>N</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {analysis.result.statistics.slice(0, 6).map(stat => (
                                                                    <tr key={`${analysis.id}-${stat.col_key}`}>
                                                                        <td className="font-medium">{stat.name}</td>
                                                                        <td>{typeof stat.mean === 'number' ? stat.mean.toFixed(2) : '-'}</td>
                                                                        <td>{typeof stat.std === 'number' ? stat.std.toFixed(2) : '-'}</td>
                                                                        <td>{stat.count.toLocaleString()}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!result && statsError && (
                            <div className="glass-card p-4 mb-4">
                                <p className="text-sm text-error">{statsError}</p>
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
