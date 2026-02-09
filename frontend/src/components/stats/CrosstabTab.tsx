import { useState } from 'react';
import { Loader2, Grid3X3, CheckCircle2, XCircle } from 'lucide-react';
import { getCrosstab } from '@/lib/api';
import type { CrosstabResponse, FilterCondition, ColumnMeta } from '@/types';

interface Props {
    datasetId: number;
    filters: FilterCondition[];
    discreteColumns: ColumnMeta[];
    treatMissingAsZero: boolean;
}

export function CrosstabTab({ datasetId, filters, discreteColumns, treatMissingAsZero }: Props) {
    const [rowVar, setRowVar] = useState('');
    const [colVar, setColVar] = useState('');
    const [result, setResult] = useState<CrosstabResponse | null>(null);
    const [loading, setLoading] = useState(false);

    async function calculate() {
        if (!rowVar || !colVar || rowVar === colVar) return;
        setLoading(true);
        try {
            const resp = await getCrosstab({
                dataset_id: datasetId, filters,
                row_variable: rowVar, col_variable: colVar,
                treat_missing_as_zero: treatMissingAsZero,
            });
            setResult(resp);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    return (
        <div>
            <div className="glass-card p-4 mb-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Grid3X3 size={16} className="text-primary" />
                    Tabela Cruzada (Crosstab)
                </h4>
                <p className="text-xs text-muted mb-3">Cruza duas variaveis categoricas e testa associacao (Qui-Quadrado).</p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <label className="label">Variavel das Linhas</label>
                        <select className="select w-full" value={rowVar} onChange={e => setRowVar(e.target.value)}>
                            <option value="">Selecione...</option>
                            {discreteColumns.map(c => <option key={c.col_key} value={c.col_key}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Variavel das Colunas</label>
                        <select className="select w-full" value={colVar} onChange={e => setColVar(e.target.value)}>
                            <option value="">Selecione...</option>
                            {discreteColumns.map(c => <option key={c.col_key} value={c.col_key}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                <button className="btn btn-primary text-sm" onClick={calculate}
                    disabled={loading || !rowVar || !colVar || rowVar === colVar}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Calcular
                </button>
            </div>

            {result && (
                <div className="glass-card p-4 animate-fadeIn">
                    <h4 className="font-semibold mb-2">{result.row_variable_name} x {result.col_variable_name}</h4>
                    <p className="text-xs text-muted mb-3">Amostra: {result.sample_size.toLocaleString()} | Total: {result.grand_total.toLocaleString()}</p>

                    <div className="table-container mb-4">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{result.row_variable_name}</th>
                                    {result.col_labels.map(cl => <th key={cl}>{cl}</th>)}
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.row_labels.map((rl, ri) => (
                                    <tr key={rl}>
                                        <td className="font-medium">{rl}</td>
                                        {result.counts[ri].map((count, ci) => (
                                            <td key={ci}>
                                                {count.toLocaleString()}
                                                <span className="text-xs text-muted ml-1">({result.percentages[ri][ci].toFixed(1)}%)</span>
                                            </td>
                                        ))}
                                        <td className="font-medium">{result.row_totals[ri].toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="font-medium">
                                    <td>Total</td>
                                    {result.col_totals.map((ct, i) => <td key={i}>{ct.toLocaleString()}</td>)}
                                    <td>{result.grand_total.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {result.chi_square != null && (
                        <div className="glass-card p-4">
                            <div className="flex items-center gap-2 mb-2">
                                {result.chi_square_p_value != null && result.chi_square_p_value < 0.05 ? (
                                    <CheckCircle2 size={16} className="text-success" />
                                ) : (
                                    <XCircle size={16} className="text-muted" />
                                )}
                                <span className="font-medium">Teste Qui-Quadrado</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-2">
                                <div><span className="text-xs text-muted">X²</span><div className="text-sm">{result.chi_square.toFixed(2)}</div></div>
                                <div><span className="text-xs text-muted">p-valor</span><div className="text-sm">{result.chi_square_p_value != null && result.chi_square_p_value < 0.001 ? '< 0.001' : result.chi_square_p_value?.toFixed(4)}</div></div>
                                {result.cramers_v != null && <div><span className="text-xs text-muted">V de Cramer</span><div className="text-sm">{result.cramers_v.toFixed(3)}</div></div>}
                            </div>
                            {result.interpretation && <p className="text-xs text-secondary">{result.interpretation}</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
