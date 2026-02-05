// Orion Stats - Statistics Page (Fixed)

import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3, Download, Loader2, X, Info } from 'lucide-react';
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
    const [loadingValues, setLoadingValues] = useState<Set<string>>(new Set());
    const [showGroupByHelp, setShowGroupByHelp] = useState(false);
    const initialLoadDone = useRef(false);

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
        if (currentDataset && statsVariables.length > 0) {
            const timer = setTimeout(() => {
                calculateStats();
            }, 300); // Debounce
            return () => clearTimeout(timer);
        } else {
            setResult(null);
        }
    }, [statsVariables, statsGroupBy, filters, treatMissingAsZero, currentDataset?.id]);

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
            });
            setResult(response);
        } catch (e) {
            console.error('Failed to calculate stats:', e);
        } finally {
            setLoading(false);
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
        const isSelected = statsVariables.includes(colKey);
        if (isSelected) {
            setStatsVariables(statsVariables.filter(v => v !== colKey));
        } else {
            setStatsVariables([...statsVariables, colKey]);
        }
    }

    function toggleGroupBy(colKey: string) {
        const isSelected = statsGroupBy.includes(colKey);
        if (isSelected) {
            setStatsGroupBy(statsGroupBy.filter(v => v !== colKey));
        } else {
            setStatsGroupBy([...statsGroupBy, colKey]);
        }
    }

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
                                            className="chip active flex items-center gap-1 cursor-pointer"
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
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Filtros</h3>
                            {getSelectedCount() > 0 && (
                                <button
                                    className="text-xs text-error hover:underline"
                                    onClick={() => setFilters([])}
                                >
                                    Limpar ({getSelectedCount()})
                                </button>
                            )}
                        </div>

                        {discreteColumns.length === 0 ? (
                            <p className="text-sm text-muted">Nenhuma variável discreta disponível</p>
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
                                                <select
                                                    multiple
                                                    className="w-full bg-[var(--color-surface)] border border-[var(--glass-border)] rounded-lg text-sm focus:border-[var(--color-primary)] focus:outline-none"
                                                    style={{ height: Math.min(values.length * 28 + 8, 120) }}
                                                    value={selectedInFilter.map(String)}
                                                    onChange={(e) => {
                                                        const selected = Array.from(e.target.selectedOptions, opt => {
                                                            const original = values.find(v => String(v) === opt.value);
                                                            return original !== undefined ? original : opt.value;
                                                        });
                                                        handleFilterChange(col.col_key, selected);
                                                    }}
                                                >
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
