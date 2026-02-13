import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type Plotly from 'plotly.js';
import { Activity, Sigma, TrendingDown, TrendingUp, Users } from 'lucide-react';
import type { ChartDataResponse } from '@/types';

interface GroupMetric {
    group: string;
    count: number;
    mean: number;
    median: number;
    std: number;
    variance: number;
    cv: number;
    min: number;
    max: number;
    range: number;
    q1: number;
    q3: number;
    iqr: number;
    p10: number;
    p90: number;
    sem: number;
    ciLower: number;
    ciUpper: number;
}

interface Props {
    data: ChartDataResponse;
}

function quantile(sortedValues: number[], q: number): number {
    if (sortedValues.length === 0) return 0;
    const pos = (sortedValues.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedValues[base + 1] !== undefined) {
        return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
    }
    return sortedValues[base];
}

function safeNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function formatNumber(value: number, digits = 2) {
    if (!Number.isFinite(value)) return '-';
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

function formatInteger(value: number) {
    if (!Number.isFinite(value)) return '-';
    return Math.round(value).toLocaleString('pt-BR');
}

export function GroupAutomatedReport({ data }: Props) {
    const groupMetrics = useMemo(() => {
        const metrics: GroupMetric[] = [];

        Object.entries(data.groups).forEach(([group, values]) => {
            const valid = values.filter(v => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
            const n = valid.length;
            if (n === 0) return;

            const stats = data.group_stats[group] || {};
            const mean = safeNumber(stats.mean, valid.reduce((acc, v) => acc + v, 0) / n);
            const variance = safeNumber(
                stats.variance,
                n > 1 ? valid.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1) : 0
            );
            const std = safeNumber(stats.std, Math.sqrt(variance));
            const sem = safeNumber(stats.sem, n > 0 ? std / Math.sqrt(n) : 0);
            const cv = safeNumber(stats.cv, mean !== 0 ? (std / mean) * 100 : 0);

            const min = safeNumber(stats.min, valid[0]);
            const max = safeNumber(stats.max, valid[valid.length - 1]);
            const q1 = safeNumber(stats.q1, quantile(valid, 0.25));
            const q3 = safeNumber(stats.q3, quantile(valid, 0.75));
            const ciLower = safeNumber(stats.ci_lower, mean - 1.96 * sem);
            const ciUpper = safeNumber(stats.ci_upper, mean + 1.96 * sem);

            metrics.push({
                group,
                count: safeNumber(stats.count, n),
                mean,
                median: safeNumber(stats.median, quantile(valid, 0.5)),
                std,
                variance,
                cv,
                min,
                max,
                range: safeNumber(stats.range, max - min),
                q1,
                q3,
                iqr: safeNumber(stats.iqr, q3 - q1),
                p10: safeNumber(stats.p10, quantile(valid, 0.10)),
                p90: safeNumber(stats.p90, quantile(valid, 0.90)),
                sem,
                ciLower,
                ciUpper,
            });
        });

        return metrics.sort((a, b) => b.mean - a.mean);
    }, [data]);

    const summary = useMemo(() => {
        if (groupMetrics.length === 0) {
            return null;
        }

        const best = groupMetrics[0];
        const worst = groupMetrics[groupMetrics.length - 1];
        const highestStd = [...groupMetrics].sort((a, b) => b.std - a.std)[0];
        const largestGroup = [...groupMetrics].sort((a, b) => b.count - a.count)[0];
        const spread = best.mean - worst.mean;

        const countValues = groupMetrics.map(g => g.count);
        const minCount = Math.min(...countValues);
        const maxCount = Math.max(...countValues);
        const balanceRatio = minCount > 0 ? maxCount / minCount : 0;
        const avgCv = groupMetrics.reduce((acc, g) => acc + g.cv, 0) / groupMetrics.length;

        return { best, worst, highestStd, largestGroup, spread, balanceRatio, avgCv };
    }, [groupMetrics]);

    const rankingData = useMemo(() => {
        const groups = [...groupMetrics].sort((a, b) => b.mean - a.mean);
        return {
            y: groups.map(g => g.group),
            x: groups.map(g => g.mean),
            ciUpper: groups.map(g => Math.max(g.ciUpper - g.mean, 0)),
            ciLower: groups.map(g => Math.max(g.mean - g.ciLower, 0)),
            cv: groups.map(g => g.cv),
        };
    }, [groupMetrics]);

    const dispersionData = useMemo(() => {
        const counts = groupMetrics.map(g => g.count);
        const minCount = counts.length > 0 ? Math.min(...counts) : 0;
        const maxCount = counts.length > 0 ? Math.max(...counts) : 1;

        const sizes = groupMetrics.map(g => {
            if (maxCount === minCount) return 18;
            const ratio = (g.count - minCount) / (maxCount - minCount);
            return 12 + ratio * 22;
        });

        return {
            x: groupMetrics.map(g => g.mean),
            y: groupMetrics.map(g => g.std),
            text: groupMetrics.map(g => g.group),
            size: sizes,
            color: groupMetrics.map(g => g.cv),
            count: groupMetrics.map(g => g.count),
        };
    }, [groupMetrics]);

    const heatmapData = useMemo(() => {
        const metrics = [
            { label: 'Media', getter: (g: GroupMetric) => g.mean },
            { label: 'Mediana', getter: (g: GroupMetric) => g.median },
            { label: 'DP', getter: (g: GroupMetric) => g.std },
            { label: 'CV%', getter: (g: GroupMetric) => g.cv },
            { label: 'Q1', getter: (g: GroupMetric) => g.q1 },
            { label: 'Q3', getter: (g: GroupMetric) => g.q3 },
            { label: 'Min', getter: (g: GroupMetric) => g.min },
            { label: 'Max', getter: (g: GroupMetric) => g.max },
            { label: 'Amplitude', getter: (g: GroupMetric) => g.range },
        ];

        const byMetricValues = metrics.map(m => groupMetrics.map(g => m.getter(g)));
        const normalized = groupMetrics.map((group) => metrics.map((metric, idx) => {
            const values = byMetricValues[idx];
            const min = Math.min(...values);
            const max = Math.max(...values);
            const value = metric.getter(group);
            if (max === min) return 50;
            return ((value - min) / (max - min)) * 100;
        }));

        const rawValues = groupMetrics.map(group => metrics.map(metric => metric.getter(group)));

        return {
            x: metrics.map(m => m.label),
            y: groupMetrics.map(g => g.group),
            z: normalized,
            rawValues,
        };
    }, [groupMetrics]);

    const violinData = useMemo(() => {
        const topGroups = [...groupMetrics]
            .sort((a, b) => b.count - a.count)
            .slice(0, 12)
            .map(g => g.group);

        const traces: Plotly.Data[] = topGroups.map(group => ({
            type: 'violin' as const,
            y: data.groups[group] ?? [],
            name: group,
            box: { visible: true },
            meanline: { visible: true },
            points: false,
            opacity: 0.65,
        }));
        return traces;
    }, [data.groups, groupMetrics]);

    if (!summary || groupMetrics.length === 0) {
        return (
            <div className="p-6 rounded-xl border border-[var(--glass-border)] bg-[var(--color-surface)] text-sm text-muted">
                Sem dados suficientes para montar o relatorio automatizado por grupo.
            </div>
        );
    }

    const rankingTrace: Plotly.Data = {
        type: 'bar',
        orientation: 'h',
        y: rankingData.y,
        x: rankingData.x,
        marker: {
            color: rankingData.cv,
            colorscale: 'Turbo',
            line: { color: 'rgba(255,255,255,0.25)', width: 1 },
            colorbar: { title: { text: 'CV%' } },
        },
        error_x: {
            type: 'data',
            array: rankingData.ciUpper,
            arrayminus: rankingData.ciLower,
            visible: true,
            color: '#E8F0F9',
            thickness: 1.2,
        },
        hovertemplate: 'Grupo: %{y}<br>Media: %{x:.3f}<extra></extra>',
    };

    const dispersionTrace: Plotly.Data = {
        type: 'scatter',
        mode: 'text+markers',
        x: dispersionData.x,
        y: dispersionData.y,
        text: dispersionData.text,
        textposition: 'top center',
        marker: {
            size: dispersionData.size,
            color: dispersionData.color,
            colorscale: 'Portland',
            line: { color: 'rgba(255,255,255,0.35)', width: 1 },
            showscale: true,
            colorbar: { title: { text: 'CV%' } },
            opacity: 0.85,
        },
        customdata: dispersionData.count,
        hovertemplate: 'Grupo: %{text}<br>Media: %{x:.3f}<br>DP: %{y:.3f}<br>N: %{customdata}<extra></extra>',
    };

    const heatmapTrace: Plotly.Data = {
        type: 'heatmap',
        x: heatmapData.x,
        y: heatmapData.y,
        z: heatmapData.z,
        customdata: heatmapData.rawValues,
        colorscale: 'Magma',
        hovertemplate: 'Grupo: %{y}<br>Metrica: %{x}<br>Valor: %{customdata:.3f}<br>Score Relativo: %{z:.1f}<extra></extra>',
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="glass-card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <img
                            src="/orion-wordmark-only.png"
                            alt="ORION"
                            className="orion-wordmark"
                            style={{ maxWidth: '180px', maxHeight: '42px' }}
                        />
                        <div>
                            <h4 className="font-semibold">Relatorio Executivo por Grupo</h4>
                            <p className="text-xs text-secondary">Painel analitico automatizado para decisao rapida</p>
                        </div>
                    </div>
                    <div className="text-xs text-muted">
                        Atualizado em {new Date().toLocaleString('pt-BR')}
                    </div>
                </div>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card">
                    <div className="flex items-center gap-2 text-xs text-muted">
                        <Users size={14} />
                        Grupos Ativos
                    </div>
                    <div className="stat-value text-primary">{formatInteger(groupMetrics.length)}</div>
                    <div className="text-xs text-secondary">Total com dados validos</div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-2 text-xs text-muted">
                        <TrendingUp size={14} />
                        Melhor Media
                    </div>
                    <div className="text-lg font-semibold text-success">{summary.best.group}</div>
                    <div className="text-xs text-secondary">{formatNumber(summary.best.mean)} de media</div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-2 text-xs text-muted">
                        <TrendingDown size={14} />
                        Menor Media
                    </div>
                    <div className="text-lg font-semibold text-warning">{summary.worst.group}</div>
                    <div className="text-xs text-secondary">{formatNumber(summary.worst.mean)} de media</div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-2 text-xs text-muted">
                        <Sigma size={14} />
                        Maior Dispersao
                    </div>
                    <div className="text-lg font-semibold text-primary">{summary.highestStd.group}</div>
                    <div className="text-xs text-secondary">DP {formatNumber(summary.highestStd.std)}</div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-2 text-xs text-muted">
                        <Activity size={14} />
                        Amplitude Entre Medias
                    </div>
                    <div className="stat-value text-primary">{formatNumber(summary.spread)}</div>
                    <div className="text-xs text-secondary">Dif. melhor vs pior grupo</div>
                </div>
            </div>

            <div className="glass-card p-4">
                <h5 className="font-semibold mb-1">Leitura automatica</h5>
                <div className="text-xs text-secondary">
                    Melhor grupo em media: <span className="text-primary">{summary.best.group}</span>. Maior tamanho de amostra: <span className="text-primary">{summary.largestGroup.group}</span> ({formatInteger(summary.largestGroup.count)}).
                </div>
                <div className="text-xs text-secondary mt-1">
                    CV medio entre grupos: <span className="text-primary">{formatNumber(summary.avgCv)}%</span>. Razao de balanceamento de amostra: <span className="text-primary">{formatNumber(summary.balanceRatio)}</span>x.
                </div>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
                <div className="glass-card p-4">
                    <h5 className="font-semibold mb-2">Ranking de Media por Grupo (com IC)</h5>
                    <Plot
                        data={[rankingTrace]}
                        layout={{
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { color: '#a0a0a0' },
                            xaxis: { title: { text: 'Media' }, gridcolor: 'rgba(255,255,255,0.08)' },
                            yaxis: { automargin: true, gridcolor: 'rgba(255,255,255,0.04)' },
                            margin: { t: 10, r: 18, b: 44, l: 130 },
                            height: 420,
                        }}
                        config={{ responsive: true, displayModeBar: false }}
                        style={{ width: '100%', height: '420px' }}
                    />
                </div>

                <div className="glass-card p-4">
                    <h5 className="font-semibold mb-2">Mapa de Dispersao (Media x DP)</h5>
                    <Plot
                        data={[dispersionTrace]}
                        layout={{
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { color: '#a0a0a0' },
                            xaxis: { title: { text: 'Media' }, gridcolor: 'rgba(255,255,255,0.08)' },
                            yaxis: { title: { text: 'Desvio Padrao' }, gridcolor: 'rgba(255,255,255,0.08)' },
                            margin: { t: 10, r: 20, b: 48, l: 60 },
                            height: 420,
                        }}
                        config={{ responsive: true, displayModeBar: false }}
                        style={{ width: '100%', height: '420px' }}
                    />
                </div>

                <div className="glass-card p-4">
                    <h5 className="font-semibold mb-2">Heatmap Comparativo de Metricas</h5>
                    <Plot
                        data={[heatmapTrace]}
                        layout={{
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { color: '#a0a0a0' },
                            xaxis: { gridcolor: 'rgba(255,255,255,0.08)' },
                            yaxis: { automargin: true, gridcolor: 'rgba(255,255,255,0.04)' },
                            margin: { t: 10, r: 18, b: 58, l: 130 },
                            height: 440,
                        }}
                        config={{ responsive: true, displayModeBar: false }}
                        style={{ width: '100%', height: '440px' }}
                    />
                </div>

                <div className="glass-card p-4">
                    <h5 className="font-semibold mb-2">Distribuicao (Top 12 Grupos por N)</h5>
                    <Plot
                        data={violinData}
                        layout={{
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { color: '#a0a0a0' },
                            xaxis: { gridcolor: 'rgba(255,255,255,0.08)' },
                            yaxis: { gridcolor: 'rgba(255,255,255,0.08)' },
                            showlegend: false,
                            margin: { t: 10, r: 16, b: 52, l: 60 },
                            height: 440,
                        }}
                        config={{ responsive: true, displayModeBar: false }}
                        style={{ width: '100%', height: '440px' }}
                    />
                </div>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Grupo</th>
                            <th>N</th>
                            <th>Media</th>
                            <th>DP</th>
                            <th>CV%</th>
                            <th>Mediana</th>
                            <th>Q1</th>
                            <th>Q3</th>
                            <th>Min</th>
                            <th>Max</th>
                            <th>Amplitude</th>
                            <th>IC Inf</th>
                            <th>IC Sup</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupMetrics.map(g => (
                            <tr key={g.group}>
                                <td className="font-medium">{g.group}</td>
                                <td>{formatInteger(g.count)}</td>
                                <td>{formatNumber(g.mean)}</td>
                                <td>{formatNumber(g.std)}</td>
                                <td>{formatNumber(g.cv)}</td>
                                <td>{formatNumber(g.median)}</td>
                                <td>{formatNumber(g.q1)}</td>
                                <td>{formatNumber(g.q3)}</td>
                                <td>{formatNumber(g.min)}</td>
                                <td>{formatNumber(g.max)}</td>
                                <td>{formatNumber(g.range)}</td>
                                <td>{formatNumber(g.ciLower)}</td>
                                <td>{formatNumber(g.ciUpper)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
