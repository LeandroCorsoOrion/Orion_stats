import { useState } from 'react';
import { Loader2, FlaskConical, CheckCircle2, XCircle } from 'lucide-react';
import { getHypothesisTest } from '@/lib/api';
import { AskOrionButton } from '@/components/AskOrionButton';
import type { HypothesisTestResponse, FilterCondition, ColumnMeta } from '@/types';

const TEST_TYPES = [
    { value: 'one_sample_t', label: 'Teste t (1 amostra)', desc: 'Compara a media com um valor de referencia' },
    { value: 'independent_t', label: 'Teste t independente', desc: 'Compara medias de 2 grupos' },
    { value: 'mann_whitney', label: 'Mann-Whitney U', desc: 'Alternativa nao-parametrica ao teste t' },
    { value: 'one_way_anova', label: 'ANOVA one-way', desc: 'Compara medias de 3+ grupos' },
    { value: 'kruskal_wallis', label: 'Kruskal-Wallis', desc: 'Alternativa nao-parametrica a ANOVA' },
    { value: 'paired_t', label: 'Teste t pareado', desc: 'Compara 2 medicoes relacionadas' },
    { value: 'wilcoxon', label: 'Wilcoxon signed-rank', desc: 'Alternativa nao-parametrica ao t pareado' },
];

const TEST_HELP_TOPICS: Record<string, string> = {
    one_sample_t: 'test_one_sample_t',
    independent_t: 'test_independent_t',
    mann_whitney: 'test_mann_whitney',
    one_way_anova: 'test_one_way_anova',
    kruskal_wallis: 'test_kruskal_wallis',
    paired_t: 'test_paired_t',
    wilcoxon: 'test_wilcoxon',
};

interface Props {
    datasetId: number;
    filters: FilterCondition[];
    continuousColumns: ColumnMeta[];
    discreteColumns: ColumnMeta[];
    treatMissingAsZero: boolean;
}

export function HypothesisTab({ datasetId, filters, continuousColumns, discreteColumns, treatMissingAsZero }: Props) {
    const [testType, setTestType] = useState('');
    const [variable, setVariable] = useState('');
    const [groupVar, setGroupVar] = useState('');
    const [pairedVar, setPairedVar] = useState('');
    const [testValue, setTestValue] = useState('');
    const [result, setResult] = useState<HypothesisTestResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const needsGroup = ['independent_t', 'mann_whitney', 'one_way_anova', 'kruskal_wallis'].includes(testType);
    const needsPaired = ['paired_t', 'wilcoxon'].includes(testType);
    const needsTestValue = testType === 'one_sample_t';

    async function calculate() {
        if (!testType || !variable) return;
        setLoading(true);
        try {
            const resp = await getHypothesisTest({
                dataset_id: datasetId, filters, test_type: testType, variable,
                group_variable: needsGroup ? groupVar : undefined,
                paired_variable: needsPaired ? pairedVar : undefined,
                test_value: needsTestValue ? parseFloat(testValue) : undefined,
                treat_missing_as_zero: treatMissingAsZero,
            });
            setResult(resp);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    return (
        <div>
            <div className="glass-card p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                        <FlaskConical size={16} className="text-primary" />
                        Testes de Hipotese
                    </h4>
                    <AskOrionButton topicId="hypothesis_tests_overview" />
                </div>

                {/* Step 1: Choose test */}
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <label className="label">1. Escolha o teste</label>
                        <AskOrionButton topicId="hypothesis_tests_overview" />
                    </div>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        {TEST_TYPES.map(t => (
                            <label key={t.value} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition ${testType === t.value ? 'bg-[rgba(160,208,255,0.15)] border border-[var(--color-primary)]' : 'hover:bg-[var(--color-surface)] border border-transparent'}`}>
                                <input type="radio" name="testType" checked={testType === t.value} onChange={() => setTestType(t.value)} className="accent-[var(--color-primary)]" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm">{t.label}</div>
                                        <AskOrionButton topicId={TEST_HELP_TOPICS[t.value] || 'hypothesis_tests_overview'} />
                                    </div>
                                    <div className="text-xs text-muted">{t.desc}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Step 2: Select variables */}
                {testType && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between">
                            <label className="label">2. Selecione as variaveis</label>
                            <AskOrionButton topicId="variable_types" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-muted">Variavel principal</label>
                                <select className="select w-full" value={variable} onChange={e => setVariable(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {continuousColumns.map(c => <option key={c.col_key} value={c.col_key}>{c.name}</option>)}
                                </select>
                            </div>
                            {needsGroup && (
                                <div>
                                    <label className="text-xs text-muted">Variavel de grupo</label>
                                    <select className="select w-full" value={groupVar} onChange={e => setGroupVar(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {discreteColumns.map(c => <option key={c.col_key} value={c.col_key}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            {needsPaired && (
                                <div>
                                    <label className="text-xs text-muted">Variavel pareada</label>
                                    <select className="select w-full" value={pairedVar} onChange={e => setPairedVar(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {continuousColumns.filter(c => c.col_key !== variable).map(c => <option key={c.col_key} value={c.col_key}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            {needsTestValue && (
                                <div>
                                    <label className="text-xs text-muted">Valor de referencia</label>
                                    <input type="number" className="input w-full" value={testValue} onChange={e => setTestValue(e.target.value)} placeholder="Ex: 50" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Run */}
                <button className="btn btn-primary text-sm" onClick={calculate} disabled={loading || !testType || !variable}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Executar Teste
                </button>
            </div>

            {/* Result */}
            {result && (
                <div className="glass-card p-6 animate-fadeIn">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{result.test_name}</h4>
                            <AskOrionButton topicId={TEST_HELP_TOPICS[result.test_type] || 'hypothesis_tests_overview'} />
                        </div>
                        {result.significant ? (
                            <span className="chip active text-xs flex items-center gap-1"><CheckCircle2 size={12} /> {result.decision}</span>
                        ) : (
                            <span className="chip text-xs flex items-center gap-1"><XCircle size={12} /> {result.decision}</span>
                        )}
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="stat-card">
                            <div className="stat-label flex items-center gap-2">
                                Estatistica
                                <AskOrionButton topicId="test_statistic" />
                            </div>
                            <div className="stat-value text-lg">{result.statistic.toFixed(2)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label flex items-center gap-2">
                                p-valor
                                <AskOrionButton topicId="p_value" />
                            </div>
                            <div className={`stat-value text-lg ${result.significant ? 'text-success' : ''}`}>
                                {result.p_value < 0.001 ? '< 0.001' : result.p_value.toFixed(4)}
                            </div>
                        </div>
                        {result.effect_size != null && (
                            <div className="stat-card">
                                <div className="stat-label flex items-center gap-2">
                                    {result.effect_size_name}
                                    <AskOrionButton topicId="effect_size" />
                                </div>
                                <div className="stat-value text-lg">{result.effect_size.toFixed(3)}</div>
                            </div>
                        )}
                        {result.ci_lower != null && (
                            <div className="stat-card">
                                <div className="stat-label flex items-center gap-2">
                                    IC 95%
                                    <AskOrionButton topicId="confidence_interval" />
                                </div>
                                <div className="stat-value text-lg">[{result.ci_lower.toFixed(2)}, {result.ci_upper?.toFixed(2)}]</div>
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-secondary">{result.interpretation}</p>

                    {result.groups_summary && result.groups_summary.length > 0 && (
                        <div className="mt-4">
                            <h5 className="text-sm font-medium mb-2">Resumo por Grupo</h5>
                            <div className="table-container">
                                <table className="table">
                                    <thead><tr><th>Grupo</th><th>N</th><th>Media</th><th>D.P.</th></tr></thead>
                                    <tbody>
                                        {result.groups_summary.map((g, i) => (
                                            <tr key={i}>
                                                <td>{(g as Record<string, unknown>).grupo as string}</td>
                                                <td>{((g as Record<string, unknown>).n as number)?.toLocaleString()}</td>
                                                <td>{((g as Record<string, unknown>).media as number)?.toFixed(2)}</td>
                                                <td>{((g as Record<string, unknown>).dp as number)?.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
