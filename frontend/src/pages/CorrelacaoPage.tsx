// Orion Stats - Correlation Page (With Insights)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Loader2, AlertTriangle, ArrowUpRight, ArrowDownRight, Database, Info } from 'lucide-react';
import { getCorrelation } from '@/lib/api';
import { useApp } from '@/lib/context';
import Plot from 'react-plotly.js';
import type Plotly from 'plotly.js';

interface CorrelationInsight {
    var1: string;
    var2: string;
    value: number;
    type: 'strong_positive' | 'strong_negative' | 'medium_positive' | 'medium_negative';
}

export function CorrelacaoPage() {
    const {
        currentDataset, filters,
        correlationVariables, setCorrelationVariables,
        treatMissingAsZero
    } = useApp();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [varNames, setVarNames] = useState<string[]>([]);
    const [matrix, setMatrix] = useState<number[][]>([]);
    const [sampleSize, setSampleSize] = useState<number>(0);

    const continuousColumns = currentDataset?.columns.filter(
        (c) => c.var_type === 'continuous'
    ) || [];

    // Auto-calculate when variables change
    useEffect(() => {
        if (currentDataset && correlationVariables.length >= 2) {
            handleCalculate();
        } else {
            setVarNames([]);
            setMatrix([]);
        }
    }, [correlationVariables, filters, treatMissingAsZero, currentDataset?.id]);

    const handleCalculate = useCallback(async () => {
        if (!currentDataset || correlationVariables.length < 2) return;

        setLoading(true);
        setError(null);
        try {
            const response = await getCorrelation({
                dataset_id: currentDataset.id,
                filters,
                variables: correlationVariables,
                treat_missing_as_zero: treatMissingAsZero,
            });
            setSampleSize(response.sample_size);
            setVarNames(response.variables);
            setMatrix(response.matrix);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } }; message?: string };
            setError(err.response?.data?.detail || err.message || 'Erro ao calcular correlação');
        } finally {
            setLoading(false);
        }
    }, [currentDataset, correlationVariables, filters, treatMissingAsZero]);

    function toggleVariable(colKey: string) {
        const isSelected = correlationVariables.includes(colKey);
        if (isSelected) {
            setCorrelationVariables(correlationVariables.filter((v) => v !== colKey));
        } else {
            setCorrelationVariables([...correlationVariables, colKey]);
        }
    }

    function selectAll() {
        setCorrelationVariables(continuousColumns.map(c => c.col_key));
    }

    function clearAll() {
        setCorrelationVariables([]);
    }

    // Calculate insights
    const insights = useMemo<CorrelationInsight[]>(() => {
        if (matrix.length === 0 || varNames.length === 0) return [];

        const results: CorrelationInsight[] = [];

        for (let i = 0; i < matrix.length; i++) {
            for (let j = i + 1; j < matrix[i].length; j++) {
                const value = matrix[i][j];

                if (Math.abs(value) >= 0.8) {
                    results.push({
                        var1: varNames[i],
                        var2: varNames[j],
                        value,
                        type: value > 0 ? 'strong_positive' : 'strong_negative'
                    });
                } else if (Math.abs(value) >= 0.5) {
                    results.push({
                        var1: varNames[i],
                        var2: varNames[j],
                        value,
                        type: value > 0 ? 'medium_positive' : 'medium_negative'
                    });
                }
            }
        }

        return results.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    }, [matrix, varNames]);

    const strongPositive = insights.filter(i => i.type === 'strong_positive');
    const strongNegative = insights.filter(i => i.type === 'strong_negative');
    const mediumPositive = insights.filter(i => i.type === 'medium_positive');
    const mediumNegative = insights.filter(i => i.type === 'medium_negative');

    if (!currentDataset) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <TrendingUp size={48} className="text-muted" />
                <p className="text-secondary">Carregue um dataset primeiro</p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <h2 className="section-title mb-6">Correlação de Variáveis</h2>

            <div className="grid gap-6" style={{ gridTemplateColumns: '300px 1fr' }}>
                {/* Left Panel - Variable Selection */}
                <div className="flex flex-col gap-4">
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">Selecionar Variáveis</h3>
                            {loading && <Loader2 size={16} className="animate-spin text-primary" />}
                        </div>

                        <div className="flex gap-2 mb-3">
                            <button className="btn btn-secondary text-xs py-1 px-2 flex-1" onClick={selectAll}>
                                Todas
                            </button>
                            <button className="btn btn-ghost text-xs py-1 px-2 flex-1" onClick={clearAll}>
                                Limpar
                            </button>
                        </div>

                        <p className="text-xs text-muted mb-3">
                            Selecione pelo menos 2 variáveis contínuas
                        </p>

                        <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
                            {continuousColumns.map((col) => {
                                const isSelected = correlationVariables.includes(col.col_key);
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

                    {/* Insights Panel */}
                    {insights.length > 0 && (
                        <div className="glass-card p-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-warning" />
                                Insights de Correlação
                            </h3>

                            {strongPositive.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ArrowUpRight size={14} className="text-success" />
                                        <span className="text-xs font-medium text-success">Forte Positiva (≥0.8)</span>
                                    </div>
                                    {strongPositive.slice(0, 3).map((insight, i) => (
                                        <div key={i} className="p-2 rounded bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] mb-1">
                                            <div className="text-xs">
                                                <span className="font-medium">{insight.var1}</span>
                                                <span className="text-muted"> × </span>
                                                <span className="font-medium">{insight.var2}</span>
                                            </div>
                                            <div className="text-success font-bold">{insight.value.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {strongNegative.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ArrowDownRight size={14} className="text-error" />
                                        <span className="text-xs font-medium text-error">Forte Negativa (≤-0.8)</span>
                                    </div>
                                    {strongNegative.slice(0, 3).map((insight, i) => (
                                        <div key={i} className="p-2 rounded bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)] mb-1">
                                            <div className="text-xs">
                                                <span className="font-medium">{insight.var1}</span>
                                                <span className="text-muted"> × </span>
                                                <span className="font-medium">{insight.var2}</span>
                                            </div>
                                            <div className="text-error font-bold">{insight.value.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {mediumPositive.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={14} className="text-primary" />
                                        <span className="text-xs font-medium text-primary">Média Positiva (0.5-0.8)</span>
                                    </div>
                                    {mediumPositive.slice(0, 3).map((insight, i) => (
                                        <div key={i} className="p-2 rounded bg-[rgba(160,208,255,0.1)] border border-[rgba(160,208,255,0.2)] mb-1">
                                            <div className="text-xs">
                                                <span className="font-medium">{insight.var1}</span>
                                                <span className="text-muted"> × </span>
                                                <span className="font-medium">{insight.var2}</span>
                                            </div>
                                            <div className="text-primary font-bold">{insight.value.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {mediumNegative.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingDown size={14} className="text-warning" />
                                        <span className="text-xs font-medium text-warning">Média Negativa (-0.5 a -0.8)</span>
                                    </div>
                                    {mediumNegative.slice(0, 3).map((insight, i) => (
                                        <div key={i} className="p-2 rounded bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)] mb-1">
                                            <div className="text-xs">
                                                <span className="font-medium">{insight.var1}</span>
                                                <span className="text-muted"> × </span>
                                                <span className="font-medium">{insight.var2}</span>
                                            </div>
                                            <div className="text-warning font-bold">{insight.value.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel - Heatmap */}
                <div>
                    {/* Sample Count Indicator */}
                    {sampleSize > 0 && correlationVariables.length >= 2 && (
                        <div className={`flex items-center gap-2 p-3 mb-4 rounded-lg ${sampleSize < 10
                            ? 'bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)]'
                            : sampleSize < 30
                                ? 'bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.3)]'
                                : 'bg-[rgba(160,208,255,0.1)] border border-[rgba(160,208,255,0.3)]'
                            }`}>
                            <Database size={16} className={sampleSize < 10 ? 'text-error' : sampleSize < 30 ? 'text-warning' : 'text-primary'} />
                            <span className={`text-sm ${sampleSize < 10 ? 'text-error' : sampleSize < 30 ? 'text-warning' : 'text-secondary'}`}>
                                Amostra: <span className="font-bold">{sampleSize.toLocaleString()}</span> registros após filtros
                            </span>
                            {sampleSize < 30 && (
                                <span className="ml-auto text-xs text-muted flex items-center gap-1">
                                    <Info size={12} />
                                    {sampleSize < 10 ? 'Dados insuficientes para correlação confiável' : 'Amostra pequena'}
                                </span>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-4 mb-4 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)]">
                            <AlertTriangle className="text-error" size={20} />
                            <span className="text-error">{error}</span>
                        </div>
                    )}

                    {matrix.length > 0 && varNames.length > 0 ? (
                        <div className="glass-card p-6">
                            <h3 className="font-semibold mb-4">Matriz de Correlação de Pearson</h3>

                            <Plot
                                data={[{
                                    z: matrix,
                                    x: varNames,
                                    y: varNames,
                                    type: 'heatmap',
                                    colorscale: [
                                        [0, '#f87171'],
                                        [0.25, '#fbbf24'],
                                        [0.5, '#1e293b'],
                                        [0.75, '#22d3ee'],
                                        [1, '#4ade80']
                                    ],
                                    zmin: -1,
                                    zmax: 1,
                                    hovertemplate: '%{x} × %{y}<br>Correlação: %{z:.2f}<extra></extra>',
                                    showscale: true,
                                    colorbar: {
                                        title: { text: 'Correlação', font: { color: '#e8f0f9' } },
                                        tickfont: { color: '#8ba3c0' },
                                    }
                                } as Plotly.Data]}
                                layout={{
                                    width: 700,
                                    height: 600,
                                    paper_bgcolor: 'transparent',
                                    plot_bgcolor: 'transparent',
                                    font: {
                                        family: 'Exo 2, sans-serif',
                                        color: '#e8f0f9'
                                    },
                                    xaxis: {
                                        tickangle: -45,
                                        tickfont: { size: 10, color: '#8ba3c0' },
                                        side: 'bottom'
                                    },
                                    yaxis: {
                                        tickfont: { size: 10, color: '#8ba3c0' },
                                        autorange: 'reversed'
                                    },
                                    margin: { l: 120, r: 80, t: 30, b: 120 }
                                }}
                                config={{
                                    displayModeBar: false,
                                    responsive: true,
                                }}
                            />

                            {/* Legend */}
                            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f87171' }}></div>
                                    <span className="text-muted">-1 (Negativa Forte)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1e293b' }}></div>
                                    <span className="text-muted">0 (Sem Correlação)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4ade80' }}></div>
                                    <span className="text-muted">+1 (Positiva Forte)</span>
                                </div>
                            </div>
                        </div>
                    ) : correlationVariables.length < 2 ? (
                        <div className="flex flex-col items-center justify-center h-96 gap-4 glass-card">
                            <TrendingUp size={48} className="text-muted" />
                            <p className="text-secondary">Selecione pelo menos 2 variáveis</p>
                            <p className="text-muted text-sm">para ver a matriz de correlação</p>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center h-96 gap-4 glass-card">
                            <Loader2 size={48} className="text-primary animate-spin" />
                            <p className="text-secondary">Calculando correlações...</p>
                        </div>
                    ) : sampleSize > 0 && matrix.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-96 gap-4 glass-card">
                            <AlertTriangle size={48} className="text-warning" />
                            <p className="text-secondary">Não foi possível calcular a correlação</p>
                            <div className="text-center text-muted text-sm max-w-md">
                                <p>Possíveis causas:</p>
                                <ul className="mt-2 space-y-1">
                                    <li>• Os filtros aplicados reduziram muito os dados ({sampleSize} registros)</li>
                                    <li>• As variáveis selecionadas não têm variação suficiente</li>
                                    <li>• Muitos valores ausentes nas colunas selecionadas</li>
                                </ul>
                                <p className="mt-3 text-xs">Tente remover alguns filtros ou selecionar outras variáveis</p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
