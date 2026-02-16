import { useState } from 'react';
import { Loader2, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { getNormality } from '@/lib/api';
import { AskOrionButton } from '@/components/AskOrionButton';
import type { NormalityResponse, FilterCondition, ColumnMeta } from '@/types';

interface Props {
    datasetId: number;
    filters: FilterCondition[];
    continuousColumns: ColumnMeta[];
    treatMissingAsZero: boolean;
}

export function NormalityTab({ datasetId, filters, continuousColumns, treatMissingAsZero }: Props) {
    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    const [result, setResult] = useState<NormalityResponse | null>(null);
    const [loading, setLoading] = useState(false);

    async function calculate() {
        if (selectedVars.length === 0) return;
        setLoading(true);
        try {
            const resp = await getNormality({
                dataset_id: datasetId, filters, variables: selectedVars,
                treat_missing_as_zero: treatMissingAsZero,
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
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                        <Activity size={16} className="text-primary" />
                        Testes de Normalidade
                    </h4>
                    <AskOrionButton topicId="normality_tests_overview" />
                </div>
                <p className="text-xs text-muted mb-3">Verifica se as variaveis seguem distribuicao normal (Shapiro-Wilk, Kolmogorov-Smirnov, D'Agostino).</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    {continuousColumns.map(col => (
                        <button key={col.col_key} className={`chip text-sm ${selectedVars.includes(col.col_key) ? 'active' : ''}`}
                            onClick={() => toggleVar(col.col_key)}>
                            {col.name}
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary text-sm" onClick={calculate} disabled={loading || selectedVars.length === 0}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Testar Normalidade
                </button>
            </div>

            {result && (
                <div className="animate-fadeIn">
                    <div className="glass-card p-4 mb-4">
                        <p className="text-sm text-secondary">{result.recommendation}</p>
                    </div>

                    {result.results.map(r => (
                        <div key={r.variable} className="glass-card p-4 mb-3">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-medium">{r.variable_name} <span className="text-xs text-muted">(n = {r.n.toLocaleString()})</span></span>
                                {r.overall_normal ? (
                                    <span className="chip active text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Normal</span>
                                ) : (
                                    <span className="chip text-xs flex items-center gap-1" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}><XCircle size={12} /> Nao-normal</span>
                                )}
                            </div>

                            <div className="table-container mb-2">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Teste</th>
                                            <th className="flex items-center gap-2">
                                                Estatistica <AskOrionButton topicId="test_statistic" />
                                            </th>
                                            <th className="flex items-center gap-2">
                                                p-valor <AskOrionButton topicId="p_value" />
                                            </th>
                                            <th>Resultado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {r.tests.map(t => (
                                            <tr key={t.test_name}>
                                                <td>{t.test_name}</td>
                                                <td>{t.statistic.toFixed(4)}</td>
                                                <td>{t.p_value < 0.001 ? '< 0.001' : t.p_value.toFixed(4)}</td>
                                                <td>{t.is_normal ?
                                                    <span className="text-success text-xs">Normal</span> :
                                                    <span className="text-error text-xs">Nao-normal</span>
                                                }</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex gap-4 text-xs text-muted">
                                <span className="flex items-center gap-2">
                                    Assimetria: {r.skewness.toFixed(2)} <AskOrionButton topicId="stat.skewness" />
                                </span>
                                <span className="flex items-center gap-2">
                                    Curtose: {r.kurtosis.toFixed(2)} <AskOrionButton topicId="stat.kurtosis" />
                                </span>
                            </div>
                            <p className="text-xs text-secondary mt-1">{r.interpretation}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
