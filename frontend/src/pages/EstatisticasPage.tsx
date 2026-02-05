// Orion Stats - Statistics Page (Improved UX)

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, Loader2, X, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { getDescriptiveStats, getUniqueValues } from '@/lib/api';
import { useApp } from '@/lib/context';
import type { ColumnStats, FilterCondition, StatsResponse } from '@/types';

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
    const [loadingValues, setLoadingValues] = useState<string | null>(null);
    const [expandedFilters, setExpandedFilters] = useState<string[]>([]);
    const [showGroupByHelp, setShowGroupByHelp] = useState(false);

    const discreteColumns = currentDataset?.columns.filter(
        (c) => c.var_type === 'categorical' || c.var_type === 'discrete'
    ) || [];

    const continuousColumns = currentDataset?.columns.filter(
        (c) => c.var_type === 'continuous'
    ) || [];

    // Auto-calculate when variables change
    useEffect(() => {
        if (currentDataset && statsVariables.length > 0) {
            handleCalculate();
        } else {
            setResult(null);
        }
    }, [statsVariables, statsGroupBy, filters, treatMissingAsZero, currentDataset?.id]);

    async function loadUniqueValues(colKey: string) {
        if (!currentDataset || filterValues[colKey]) {
            setExpandedFilters(prev =>
                prev.includes(colKey) ? prev.filter(k => k !== colKey) : [...prev, colKey]
            );
            return;
        }
        setLoadingValues(colKey);
        try {
            const resp = await getUniqueValues(currentDataset.id, colKey);
            setFilterValues((prev) => ({ ...prev, [colKey]: resp.values }));
            setExpandedFilters(prev => [...prev, colKey]);
        } catch (e) {
            console.error('Failed to load unique values:', e);
        } finally {
            setLoadingValues(null);
        }
    }

    function toggleFilterValue(colKey: string, value: string | number) {
        setFilters((prev: FilterCondition[]) => {
            const existing = prev.find((f) => f.col_key === colKey);
            if (!existing) {
                return [...prev, { col_key: colKey, values: [value] }];
            }

            const hasValue = existing.values.includes(value);
            const newValues = hasValue
                ? existing.values.filter((v) => v !== value)
                : [...existing.values, value];

            if (newValues.length === 0) {
                return prev.filter((f) => f.col_key !== colKey);
            }

            return prev.map((f) => f.col_key === colKey ? { ...f, values: newValues } : f);
        });
    }

    function isValueSelected(colKey: string, value: string | number) {
        const filter = filters.find((f) => f.col_key === colKey);
        return filter?.values.includes(value) || false;
    }

    function toggleVariable(colKey: string) {
        setStatsVariables((prev: string[]) =>
            prev.includes(colKey)
                ? prev.filter((v) => v !== colKey)
                : [...prev, colKey]
        );
    }

    function toggleGroupBy(colKey: string) {
        setStatsGroupBy((prev: string[]) =>
            prev.includes(colKey)
                ? prev.filter((v) => v !== colKey)
                : [...prev, colKey]
        );
    }

    const handleCalculate = useCallback(async () => {
        if (!currentDataset || statsVariables.length === 0) return;

        setLoading(true);
        try {
            const response = await getDescriptiveStats({
                dataset_id: currentDataset.id,
                filters,
                variables: statsVariables,
                group_by: statsGroupBy,
                treat_missing_as_zero: treatMissingAsZero,
            });
            setResult(response);
        } catch (e) {
            console.error('Failed to calculate stats:', e);
        } finally {
            setLoading(false);
        }
    }, [currentDataset, statsVariables, statsGroupBy, filters, treatMissingAsZero]);

    function exportCSV() {
        if (!result) return;

        const headers = ['Variável', 'Média', 'Mediana', 'Moda', 'Desvio Padrão', 'Variância', 'Mín', 'Máx', 'Q1', 'Q3', 'IQR', 'Contagem', 'Ausentes'];
        const rows = result.statistics.map((s) => [
            s.name, s.mean, s.median, s.mode, s.std, s.variance, s.min, s.max, s.q1, s.q3, s.iqr, s.count, s.missing_count
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'estatisticas.csv';
        a.click();
    }

    function getSelectedCount() {
        return filters.reduce((acc, f) => acc + f.values.length, 0);
    }

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
            <h2 className="section-title mb-6">Estatísticas Descritivas</h2>

            <div className="grid gap-6" style={{ gridTemplateColumns: '340px 1fr' }}>
                {/* Left Panel - Controls */}
                <div className="flex flex-col gap-4">

                    {/* Selected Variables Tags */}
                    {statsVariables.length > 0 && (
                        <div className="glass-card p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-sm">Variáveis Selecionadas</h3>
                                <span className="text-xs text-primary">{statsVariables.length} selecionadas</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {statsVariables.map((vKey) => {
                                    const col = continuousColumns.find(c => c.col_key === vKey);
                                    return (
                                        <span
                                            key={vKey}
                                            className="chip active flex items-center gap-1"
                                            onClick={() => toggleVariable(vKey)}
                                        >
                                            {col?.name || vKey}
                                            <X size={12} />
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Treatment Option */}
                    <div className="glass-card p-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={treatMissingAsZero}
                                onChange={(e) => setTreatMissingAsZero(e.target.checked)}
                                className="w-5 h-5 accent-[var(--color-primary)]"
                            />
                            <span className="text-sm">Tratar valores ausentes como 0</span>
                        </label>
                    </div>

                    {/* Variables Selection */}
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">Variáveis de Análise</h3>
                            {loading && <Loader2 size={16} className="animate-spin text-primary" />}
                        </div>
                        <p className="text-xs text-muted mb-3">Selecione as variáveis contínuas para calcular estatísticas</p>

                        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                            {continuousColumns.map((col) => {
                                const isSelected = statsVariables.includes(col.col_key);
                                return (
                                    <label
                                        key={col.col_key}
                                        className={`flex items-center gap-2 cursor-pointer p-2 rounded transition ${isSelected
                                                ? 'bg-[rgba(160,208,255,0.15)] border border-[var(--color-primary)]'
                                                : 'hover:bg-[var(--color-surface)] border border-transparent'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleVariable(col.col_key)}
                                            className="w-4 h-4 accent-[var(--color-primary)]"
                                        />
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
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">Filtros</h3>
                            {getSelectedCount() > 0 && (
                                <span className="chip text-xs py-0.5 px-2">{getSelectedCount()} filtros</span>
                            )}
                        </div>

                        {discreteColumns.length === 0 ? (
                            <p className="text-sm text-muted">Nenhuma variável discreta disponível</p>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                                {discreteColumns.map((col) => {
                                    const isExpanded = expandedFilters.includes(col.col_key);
                                    const selectedInFilter = filters.find(f => f.col_key === col.col_key)?.values.length || 0;

                                    return (
                                        <div key={col.col_key} className="border border-[var(--glass-border)] rounded-lg overflow-hidden">
                                            <button
                                                className="w-full flex items-center justify-between p-2 text-left text-sm hover:bg-[var(--color-surface)] transition"
                                                onClick={() => loadUniqueValues(col.col_key)}
                                            >
                                                <span className="flex items-center gap-2">
                                                    {col.name}
                                                    {selectedInFilter > 0 && (
                                                        <span className="chip active text-xs py-0 px-2">{selectedInFilter}</span>
                                                    )}
                                                </span>
                                                {loadingValues === col.col_key ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : isExpanded ? (
                                                    <ChevronUp size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                )}
                                            </button>

                                            {isExpanded && filterValues[col.col_key] && (
                                                <div className="max-h-48 overflow-y-auto border-t border-[var(--glass-border)] bg-[rgba(0,0,0,0.2)]">
                                                    {filterValues[col.col_key].slice(0, 50).map((value) => {
                                                        const isSelected = isValueSelected(col.col_key, value);
                                                        return (
                                                            <label
                                                                key={String(value)}
                                                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition border-b border-[var(--glass-border)] last:border-b-0 ${isSelected
                                                                    ? 'bg-[rgba(160,208,255,0.15)]'
                                                                    : 'hover:bg-[var(--color-surface)]'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleFilterValue(col.col_key, value)}
                                                                    className="w-4 h-4 accent-[var(--color-primary)] flex-shrink-0"
                                                                />
                                                                <span className={`text-sm ${isSelected ? 'text-primary font-medium' : ''}`}>
                                                                    {String(value)}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                    {filterValues[col.col_key].length > 50 && (
                                                        <div className="px-3 py-2 text-xs text-muted text-center">
                                                            +{filterValues[col.col_key].length - 50} mais valores
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {filters.length > 0 && (
                            <button
                                className="btn btn-ghost w-full mt-3 text-sm"
                                onClick={() => setFilters([])}
                            >
                                <X size={14} /> Limpar Filtros
                            </button>
                        )}
                    </div>

                    {/* Group By */}
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Agrupar Por</h3>
                            <button
                                className="text-muted hover:text-primary transition"
                                onClick={() => setShowGroupByHelp(!showGroupByHelp)}
                            >
                                <Info size={16} />
                            </button>
                        </div>

                        {showGroupByHelp && (
                            <div className="mb-3 p-3 rounded-lg bg-[rgba(160,208,255,0.1)] border border-[rgba(160,208,255,0.2)] text-xs">
                                <p className="text-primary font-medium mb-1">Como funciona:</p>
                                <p className="text-secondary">
                                    Selecione variáveis categóricas para ver as estatísticas separadas por grupo.
                                    Por exemplo, agrupando por "Turno", você verá média, mediana, etc.
                                    calculadas separadamente para cada turno (Manhã, Tarde, Noite).
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                            {discreteColumns.map((col) => {
                                const isSelected = statsGroupBy.includes(col.col_key);
                                return (
                                    <label
                                        key={col.col_key}
                                        className={`flex items-center gap-2 cursor-pointer p-2 rounded transition ${isSelected
                                                ? 'bg-[rgba(160,208,255,0.15)] border border-[var(--color-primary)]'
                                                : 'hover:bg-[var(--color-surface)] border border-transparent'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleGroupBy(col.col_key)}
                                            className="w-4 h-4 accent-[var(--color-primary)]"
                                        />
                                        <span className={`text-sm ${isSelected ? 'text-primary font-medium' : ''}`}>
                                            {col.name}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Results */}
                <div>
                    {result && (
                        <div className="glass-card p-6 animate-fadeIn">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-semibold text-lg">Resultados</h3>
                                    <p className="text-sm text-secondary">Amostra: {result.sample_size.toLocaleString()} registros</p>
                                </div>
                                <button className="btn btn-secondary" onClick={exportCSV}>
                                    <Download size={16} /> Exportar CSV
                                </button>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                {result.statistics.slice(0, 4).map((stat) => (
                                    <div key={stat.col_key} className="stat-card">
                                        <div className="stat-label truncate" title={stat.name}>{stat.name}</div>
                                        <div className="stat-value">{stat.mean?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '-'}</div>
                                        <div className="text-xs text-muted mt-1">Média</div>
                                    </div>
                                ))}
                            </div>

                            {/* Stats Table */}
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Variável</th>
                                            <th>Média</th>
                                            <th>Mediana</th>
                                            <th>Moda</th>
                                            <th>D. Padrão</th>
                                            <th>Mín</th>
                                            <th>Máx</th>
                                            <th>Q1</th>
                                            <th>Q3</th>
                                            <th>IQR</th>
                                            <th>N</th>
                                            <th>Ausentes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.statistics.map((stat: ColumnStats) => (
                                            <tr key={stat.col_key}>
                                                <td className="font-medium">{stat.name}</td>
                                                <td>{stat.mean?.toFixed(2) || '-'}</td>
                                                <td>{stat.median?.toFixed(2) || '-'}</td>
                                                <td>{stat.mode?.toFixed(2) || '-'}</td>
                                                <td>{stat.std?.toFixed(2) || '-'}</td>
                                                <td>{stat.min?.toFixed(2) || '-'}</td>
                                                <td>{stat.max?.toFixed(2) || '-'}</td>
                                                <td>{stat.q1?.toFixed(2) || '-'}</td>
                                                <td>{stat.q3?.toFixed(2) || '-'}</td>
                                                <td>{stat.iqr?.toFixed(2) || '-'}</td>
                                                <td>{stat.count.toLocaleString()}</td>
                                                <td className={stat.missing_count > 0 ? 'text-warning' : ''}>
                                                    {stat.missing_count.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Grouped Statistics */}
                            {result.grouped_statistics && Object.keys(result.grouped_statistics).length > 0 && (
                                <div className="mt-8">
                                    <h4 className="font-semibold mb-4">Estatísticas por Grupo</h4>
                                    {Object.entries(result.grouped_statistics).map(([groupName, stats]) => (
                                        <div key={groupName} className="mb-6">
                                            <div className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                                                <span className="chip active text-xs py-0.5 px-2">{groupName}</span>
                                            </div>
                                            <div className="table-container">
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th>Variável</th>
                                                            <th>Média</th>
                                                            <th>Mediana</th>
                                                            <th>D. Padrão</th>
                                                            <th>N</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {stats.map((s: ColumnStats) => (
                                                            <tr key={s.col_key}>
                                                                <td>{s.name}</td>
                                                                <td>{s.mean?.toFixed(2) || '-'}</td>
                                                                <td>{s.median?.toFixed(2) || '-'}</td>
                                                                <td>{s.std?.toFixed(2) || '-'}</td>
                                                                <td>{s.count}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {!result && statsVariables.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-96 gap-4 glass-card">
                            <BarChart3 size={48} className="text-muted" />
                            <p className="text-secondary">Selecione variáveis para ver estatísticas</p>
                            <p className="text-muted text-sm">Os cálculos são feitos automaticamente</p>
                        </div>
                    )}

                    {!result && statsVariables.length > 0 && loading && (
                        <div className="flex flex-col items-center justify-center h-96 gap-4 glass-card">
                            <Loader2 size={48} className="text-primary animate-spin" />
                            <p className="text-secondary">Calculando estatísticas...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
