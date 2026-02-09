import { BarChart3, List, Grid3X3, Activity, FlaskConical } from 'lucide-react';

const TABS = [
    { id: 'descritivas', label: 'Descritivas', icon: BarChart3 },
    { id: 'frequencias', label: 'Frequencias', icon: List },
    { id: 'crosstabs', label: 'Crosstabs', icon: Grid3X3 },
    { id: 'normalidade', label: 'Normalidade', icon: Activity },
    { id: 'testes', label: 'Testes', icon: FlaskConical },
];

interface Props {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function StatsTabNav({ activeTab, onTabChange }: Props) {
    return (
        <div className="flex gap-2 mb-6 flex-wrap">
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    className={`chip flex items-center gap-2 px-4 py-2 ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    <tab.icon size={14} />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
