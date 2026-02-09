import Plot from 'react-plotly.js';
import type Plotly from 'plotly.js';
import type { ChartDataResponse } from '@/types';

interface Props {
    data: ChartDataResponse;
}

export function GroupBoxplot({ data }: Props) {
    const traces: Plotly.Data[] = Object.entries(data.groups).map(([group, values]) => ({
        type: 'box' as const,
        y: values,
        name: group,
        boxmean: true,
        marker: { opacity: 0.7 },
    }));

    const layout: Partial<Plotly.Layout> = {
        title: { text: `${data.variable_name} por ${data.group_variable_name}`, font: { color: '#e0e0e0', size: 14 } },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#a0a0a0' },
        xaxis: { gridcolor: 'rgba(255,255,255,0.05)' },
        yaxis: { title: { text: data.variable_name }, gridcolor: 'rgba(255,255,255,0.08)' },
        showlegend: false,
        margin: { t: 40, r: 20, b: 40, l: 60 },
    };

    return (
        <div className="w-full">
            <Plot data={traces} layout={layout} config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '400px' }} />
        </div>
    );
}
