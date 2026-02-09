import Plot from 'react-plotly.js';
import type Plotly from 'plotly.js';
import type { ChartDataResponse } from '@/types';

interface Props {
    data: ChartDataResponse;
}

export function GroupBarChart({ data }: Props) {
    const groups = Object.keys(data.group_stats);
    const means = groups.map(g => data.group_stats[g]?.mean ?? 0);
    const ciLower = groups.map(g => data.group_stats[g]?.ci_lower ?? 0);
    const ciUpper = groups.map(g => data.group_stats[g]?.ci_upper ?? 0);

    const errorBarsY = means.map((m, i) => ciUpper[i] - m);
    const errorBarsYMinus = means.map((m, i) => m - ciLower[i]);

    const hasCI = ciLower.some(v => v !== 0) || ciUpper.some(v => v !== 0);

    const traces: Plotly.Data[] = [{
        type: 'bar' as const,
        x: groups,
        y: means,
        marker: { color: 'rgba(160,208,255,0.7)', line: { color: 'rgba(160,208,255,1)', width: 1 } },
        error_y: hasCI ? {
            type: 'data',
            array: errorBarsY,
            arrayminus: errorBarsYMinus,
            visible: true,
            color: '#e0e0e0',
            thickness: 1.5,
        } : undefined,
    }];

    const layout: Partial<Plotly.Layout> = {
        title: { text: `Media de ${data.variable_name} por ${data.group_variable_name}`, font: { color: '#e0e0e0', size: 14 } },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#a0a0a0' },
        xaxis: { title: { text: data.group_variable_name }, gridcolor: 'rgba(255,255,255,0.05)' },
        yaxis: { title: { text: `Media (${data.variable_name})` }, gridcolor: 'rgba(255,255,255,0.08)' },
        showlegend: false,
        margin: { t: 40, r: 20, b: 60, l: 60 },
    };

    return (
        <div className="w-full">
            <Plot data={traces} layout={layout} config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '400px' }} />
        </div>
    );
}
