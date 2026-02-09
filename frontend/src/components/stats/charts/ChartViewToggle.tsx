import { Table2, BarChart3, BoxSelect, Waves } from 'lucide-react';

export type ChartView = 'table' | 'boxplot' | 'bar' | 'violin';

const VIEWS: { id: ChartView; label: string; icon: typeof Table2 }[] = [
    { id: 'table', label: 'Tabela', icon: Table2 },
    { id: 'boxplot', label: 'Boxplot', icon: BoxSelect },
    { id: 'bar', label: 'Barras', icon: BarChart3 },
    { id: 'violin', label: 'Violin', icon: Waves },
];

interface Props {
    activeView: ChartView;
    onViewChange: (view: ChartView) => void;
}

export function ChartViewToggle({ activeView, onViewChange }: Props) {
    return (
        <div className="flex gap-1 bg-[var(--color-surface)] rounded-lg p-1">
            {VIEWS.map(v => (
                <button
                    key={v.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition ${activeView === v.id ? 'bg-[var(--color-primary)] text-white' : 'text-muted hover:text-secondary'}`}
                    onClick={() => onViewChange(v.id)}
                >
                    <v.icon size={12} />
                    {v.label}
                </button>
            ))}
        </div>
    );
}
