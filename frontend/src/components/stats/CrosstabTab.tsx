import { useState } from 'react';
import { Loader2, Grid3X3, CheckCircle2, XCircle, PlusCircle } from 'lucide-react';
import { getCrosstab } from '@/lib/api';
import { AskOrionButton } from '@/components/AskOrionButton';
import type { CrosstabResponse, FilterCondition, ColumnMeta, ReportSection } from '@/types';
import { buildCrosstabSection } from '@/lib/reportSections';

interface Props {
    datasetId: number;
    filters: FilterCondition[];
    discreteColumns: ColumnMeta[];
    treatMissingAsZero: boolean;
    onAddToReport?: (section: ReportSection) => void;
}

export function CrosstabTab({ datasetId, filters, discreteColumns, treatMissingAsZero, onAddToReport }: Props) {
    const [rowVar, setRowVar] = useState('');
    const [colVar, setColVar] = useState('');
    const [result, setResult] = useState<CrosstabResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [sectionAdded, setSectionAdded] = useState(false);

    async function calculate() {
        if (!rowVar || !colVar || rowVar === colVar) return;
        setLoading(true);
        setSectionAdded(false);
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

    function handleAddToReport() {
        if (!result || !onAddToReport || !rowVar || !colVar) return;
        const section = buildCrosstabSection({
            filters,
            row_variable: rowVar,
            col_variable: colVar,
            row_variable_name: result.row_variable_name,
            col_variable_name: result.col_variable_name,
            treat_missing_as_zero: treatMissingAsZero,
            result,
        });
        onAddToReport(section);
        setSectionAdded(true);
    }

    return (
        <div>
            <div className="glass-card p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                        <Grid3X3 size={16} className="text-primary" />
                        Tabela Cruzada (Crosstab)
                    </h4>
                    <AskOrionButton topicId="chi_square_independence" />
                </div>
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
                {result && onAddToReport && (
                    <button className="btn btn-secondary text-sm ml-2" onClick={handleAddToReport}>
                        <PlusCircle size={14} />
                        Adicionar ao Relatorio
                    </button>
                )}
                {sectionAdded && (
                    <p className="text-xs text-success mt-2">Cruzamento adicionado ao relatorio composto.</p>
                )}
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
                                <span className="font-medium flex items-center gap-2">
                                    Teste Qui-Quadrado
                                    <AskOrionButton topicId="chi_square_independence" />
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-2">
                                <div>
                                    <span className="text-xs text-muted flex items-center gap-2">
                                        X² <AskOrionButton topicId="test_statistic" />
                                    </span>
                                    <div className="text-sm">{result.chi_square.toFixed(2)}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted flex items-center gap-2">
                                        p-valor <AskOrionButton topicId="p_value" />
                                    </span>
                                    <div className="text-sm">
                                        {result.chi_square_p_value != null && result.chi_square_p_value < 0.001 ? '< 0.001' : result.chi_square_p_value?.toFixed(4)}
                                    </div>
                                </div>
                                {result.cramers_v != null && (
                                    <div>
                                        <span className="text-xs text-muted flex items-center gap-2">
                                            V de Cramer <AskOrionButton topicId="cramers_v" />
                                        </span>
                                        <div className="text-sm">{result.cramers_v.toFixed(3)}</div>
                                    </div>
                                )}
                            </div>
                            {result.interpretation && <p className="text-xs text-secondary">{result.interpretation}</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
