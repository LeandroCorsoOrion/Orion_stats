import { useState } from 'react';
import { Loader2, List } from 'lucide-react';
import { getFrequencies } from '@/lib/api';
import type { FrequencyResponse, FilterCondition, ColumnMeta } from '@/types';

interface Props {
    datasetId: number;
    filters: FilterCondition[];
    discreteColumns: ColumnMeta[];
    treatMissingAsZero: boolean;
}

export function FrequencyTab({ datasetId, filters, discreteColumns, treatMissingAsZero }: Props) {
    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    const [result, setResult] = useState<FrequencyResponse | null>(null);
    const [loading, setLoading] = useState(false);

    async function calculate() {
        if (selectedVars.length === 0) return;
        setLoading(true);
        try {
            const resp = await getFrequencies({
                dataset_id: datasetId, filters, variables: selectedVars,
                max_categories: 200, treat_missing_as_zero: treatMissingAsZero,
            });
            setResult(resp);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    function toggleVar(key: string) {
        setSelectedVars(prev => prev.includes(key) ? prev.filter(v => v !== key) : [...prev, key]);
    }

    return (
        <div>
            <div className="glass-card p-4 mb-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <List size={16} className="text-primary" />
                    Tabela de Frequencias
                </h4>
                <p className="text-xs text-muted mb-3">Selecione variaveis categoricas/discretas para ver a distribuicao de valores.</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    {discreteColumns.map(col => (
                        <button key={col.col_key} className={`chip text-sm ${selectedVars.includes(col.col_key) ? 'active' : ''}`}
                            onClick={() => toggleVar(col.col_key)}>
                            {col.name}
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary text-sm" onClick={calculate} disabled={loading || selectedVars.length === 0}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Calcular
                </button>
            </div>

            {result && Object.entries(result.tables).map(([varName, rows]) => (
                <div key={varName} className="glass-card p-4 mb-4 animate-fadeIn">
                    <h4 className="font-semibold mb-2">{varName}</h4>
                    <p className="text-xs text-muted mb-3">Amostra: {result.sample_size.toLocaleString()}</p>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Valor</th>
                                    <th>Frequencia</th>
                                    <th>%</th>
                                    <th>% Acumulado</th>
                                    <th style={{ width: '30%' }}>Distribuicao</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.value}>
                                        <td className="font-medium">{row.value}</td>
                                        <td>{row.count.toLocaleString()}</td>
                                        <td>{row.percentage.toFixed(1)}%</td>
                                        <td>{row.cumulative_pct.toFixed(1)}%</td>
                                        <td>
                                            <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
                                                <div className="h-2 rounded-full bg-[var(--color-primary)]"
                                                    style={{ width: `${Math.min(row.percentage, 100)}%` }} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}
