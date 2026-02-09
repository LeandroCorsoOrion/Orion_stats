import { Settings2 } from 'lucide-react';
import { STAT_PRESETS, STAT_TOOLTIPS, type StatPreset } from '@/lib/statTooltips';

interface Props {
    selectedStats: string[];
    onChangeStats: (stats: string[]) => void;
}

export function StatSelectorPanel({ selectedStats, onChangeStats }: Props) {
    function applyPreset(preset: StatPreset) {
        onChangeStats(STAT_PRESETS[preset].stats);
    }

    return (
        <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
                <Settings2 size={16} className="text-primary" />
                <h3 className="font-semibold text-sm">Estatisticas Exibidas</h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {(Object.entries(STAT_PRESETS) as [StatPreset, { label: string; stats: string[] }][]).map(([key, preset]) => {
                    const isActive = JSON.stringify(selectedStats.sort()) === JSON.stringify([...preset.stats].sort());
                    return (
                        <button
                            key={key}
                            className={`chip text-xs px-3 py-1 ${isActive ? 'active' : ''}`}
                            onClick={() => applyPreset(key)}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </div>
            <p className="text-xs text-muted mt-2">{selectedStats.length} de {Object.keys(STAT_TOOLTIPS).length} estatisticas selecionadas</p>
        </div>
    );
}
