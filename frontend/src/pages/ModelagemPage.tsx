// Orion Stats - Modeling Page

import { useState } from 'react';
import { BrainCircuit, Loader2, Play, Trophy, AlertCircle, Calculator, ArrowRight, Database, Info, PlusCircle } from 'lucide-react';
import { trainModels, predict } from '@/lib/api';
import { useApp } from '@/lib/context';
import type { MLPredictResponse, ModelMetrics, LinearCoefficient } from '@/types';
import { buildMLSection } from '@/lib/reportSections';

export function ModelagemPage() {
    const {
        currentDataset, filters,
        target, setTarget,
        features, setFeatures,
        selectionMetric, setSelectionMetric,
        treatMissingAsZero,
        mlResult, setMlResult,
        addReportSection,
        reportSections
    } = useApp();

    const [loading, setLoading] = useState(false);
    const [predicting, setPredicting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inputValues, setInputValues] = useState<Record<string, string>>({});
    const [prediction, setPrediction] = useState<MLPredictResponse | null>(null);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [sectionAdded, setSectionAdded] = useState(false);

    const numericColumns = currentDataset?.columns.filter(
        (c) => c.var_type === 'continuous' || c.var_type === 'discrete'
    ) || [];

    const allColumns = currentDataset?.columns || [];

    function toggleFeature(colKey: string) {
        setFeatures((prev: string[]) =>
            prev.includes(colKey)
                ? prev.filter((v) => v !== colKey)
                : [...prev, colKey]
        );
    }

    async function handleTrain() {
        if (!currentDataset || !target || features.length === 0) {
            setError('Selecione variável alvo e pelo menos uma feature');
            return;
        }

        setLoading(true);
        setError(null);
        setPrediction(null);
        setSectionAdded(false);

        try {
            const response = await trainModels({
                dataset_id: currentDataset.id,
                filters,
                target,
                features,
                treat_missing_as_zero: treatMissingAsZero,
                selection_metric: selectionMetric,
            });
            setMlResult(response);
            setSelectedModel(response.best_model_label);

            // Initialize input values
            const initialValues: Record<string, string> = {};
            features.forEach((f) => {
                initialValues[f] = '';
            });
            setInputValues(initialValues);

        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err.response?.data?.detail || 'Erro ao treinar modelos');
        } finally {
            setLoading(false);
        }
    }

    function addMlToReport() {
        if (!mlResult || !target || features.length === 0) {
            setError('Treine um modelo antes de adicionar ao relatorio.');
            return;
        }

        const targetCol = currentDataset?.columns.find((c) => c.col_key === target);
        const featureNames = features.map((featureKey) => {
            const featureCol = currentDataset?.columns.find((c) => c.col_key === featureKey);
            return featureCol?.name || featureKey;
        });

        addReportSection(buildMLSection({
            filters,
            target,
            target_name: targetCol?.name || target,
            features,
            feature_names: featureNames,
            selection_metric: selectionMetric,
            treat_missing_as_zero: treatMissingAsZero,
            selected_model: selectedModel,
            ml_result: mlResult,
        }));
        setSectionAdded(true);
    }

    async function handlePredict() {
        if (!mlResult) return;

        setPredicting(true);
        setPrediction(null);

        try {
            // Convert input values to appropriate types
            const values: Record<string, unknown> = {};
            features.forEach((f) => {
                const col = currentDataset?.columns.find((c) => c.col_key === f);
                const val = inputValues[f];

                if (col?.var_type === 'categorical') {
                    values[f] = val || '';
                } else {
                    values[f] = val ? parseFloat(val) : 0;
                }
            });

            const response = await predict({
                model_id: mlResult.model_id,
                model_label: selectedModel ?? undefined,
                input_values: values,
            });
            setPrediction(response);

        } catch (e) {
            console.error('Prediction error:', e);
        } finally {
            setPredicting(false);
        }
    }

    if (!currentDataset) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <BrainCircuit size={48} className="text-muted" />
                <p className="text-secondary">Carregue um dataset primeiro</p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <h2 className="section-title mb-6">Modelagem e Simulação</h2>

            <div className="grid gap-6" style={{ gridTemplateColumns: '320px 1fr' }}>
                {/* Left Panel - Configuration */}
                <div className="flex flex-col gap-4">
                    {/* Filter Warning */}
                    {filters.length > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.3)]">
                            <Database size={16} className="text-warning" />
                            <span className="text-sm text-warning">
                                {filters.reduce((acc, f) => acc + f.values.length, 0)} filtros ativos
                            </span>
                            <span className="text-xs text-muted ml-auto">
                                Os dados para treinamento serão filtrados
                            </span>
                        </div>
                    )}

                    {/* Target Selection */}
                    <div className="glass-card p-4">
                        <h3 className="font-semibold mb-3">Variável Alvo (Y)</h3>
                        <select
                            className="input select"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {numericColumns.map((col) => (
                                <option key={col.col_key} value={col.col_key}>
                                    {col.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Features Selection */}
                    <div className="glass-card p-4">
                        <h3 className="font-semibold mb-3">Variáveis Explicativas (X)</h3>
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                            {allColumns.filter((c) => c.col_key !== target).map((col) => (
                                <label key={col.col_key} className="flex items-center gap-2 cursor-pointer hover:bg-[var(--color-surface)] p-2 rounded transition">
                                    <input
                                        type="checkbox"
                                        checked={features.includes(col.col_key)}
                                        onChange={() => toggleFeature(col.col_key)}
                                        className="w-4 h-4 accent-[var(--color-primary)]"
                                    />
                                    <span className="text-sm">{col.name}</span>
                                    <span className={`text-xs ml-auto ${col.var_type === 'categorical' ? 'text-warning' : 'text-muted'}`}>
                                        {col.var_type === 'categorical' ? 'cat' : col.var_type === 'discrete' ? 'disc' : 'cont'}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-muted mt-3">
                            Selecionadas: {features.length}
                        </p>
                    </div>

                    {/* Metric Selection */}
                    <div className="glass-card p-4">
                        <h3 className="font-semibold mb-3">Métrica de Seleção</h3>
                        <div className="flex gap-2">
                            {(['rmse', 'r2', 'mae'] as const).map((m) => (
                                <button
                                    key={m}
                                    className={`chip ${selectionMetric === m ? 'active' : ''}`}
                                    onClick={() => setSelectionMetric(m)}
                                >
                                    {m.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        className="btn btn-primary w-full"
                        disabled={loading || !target || features.length === 0}
                        onClick={handleTrain}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
                        Treinar Modelos
                    </button>

                    {error && (
                        <div className="p-3 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)]">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="text-error" size={16} />
                                <span className="text-error text-sm">{error}</span>
                            </div>
                            {error.toLowerCase().includes('enough samples') && (
                                <div className="mt-2 pl-6 text-xs text-muted">
                                    <p className="flex items-center gap-1 mb-1">
                                        <Info size={12} />
                                        Os filtros aplicados reduziram muito os dados.
                                    </p>
                                    <p>Tente remover alguns filtros para aumentar a amostra disponível.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel - Results */}
                <div className="flex flex-col gap-6">
                    {mlResult ? (
                        <>
                            {/* Model Metrics */}
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Trophy className="text-warning" size={20} />
                                        Comparativo de Modelos
                                    </h3>
                                    <button className="btn btn-secondary text-sm" onClick={addMlToReport}>
                                        <PlusCircle size={14} />
                                        Adicionar ao Relatorio
                                    </button>
                                </div>
                                {sectionAdded && (
                                    <p className="text-xs text-success mb-3">
                                        Bloco de modelagem adicionado ao relatorio composto.
                                    </p>
                                )}
                                {reportSections.length > 0 && (
                                    <p className="text-xs text-secondary mb-3">
                                        Itens no relatorio composto: {reportSections.length}
                                    </p>
                                )}

                                <div className="grid grid-cols-5 gap-4">
                                    {mlResult.models.map((model: ModelMetrics) => (
                                        <button
                                            key={model.label}
                                            className={`stat-card cursor-pointer transition ${model.is_best ? 'border-[var(--color-primary)] border-2' : ''
                                                } ${selectedModel === model.label ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
                                            onClick={() => setSelectedModel(model.label)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium">{model.label.split(' - ')[1]}</span>
                                                {model.is_best && <Trophy className="text-warning" size={14} />}
                                            </div>
                                            <div className="stat-value text-lg">{model.rmse.toFixed(2)}</div>
                                            <div className="text-xs text-muted">RMSE</div>
                                            <div className="mt-2 text-xs">
                                                <span className="text-secondary">R²:</span> {model.r2.toFixed(3)}
                                            </div>
                                            <div className="text-xs">
                                                <span className="text-secondary">MAE:</span> {model.mae.toFixed(2)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Linear Regression */}
                            <div className="glass-card p-6">
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <Calculator size={20} />
                                    Regressão Linear
                                </h3>

                                <div className="bg-[rgba(13,20,33,0.6)] p-4 rounded-lg mb-4 overflow-x-auto">
                                    <code className="text-primary text-sm font-mono">
                                        {mlResult.linear_regression.equation}
                                    </code>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="stat-card">
                                        <div className="stat-label">R²</div>
                                        <div className="stat-value text-xl">{mlResult.linear_regression.r2.toFixed(4)}</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-label">RMSE</div>
                                        <div className="stat-value text-xl">{mlResult.linear_regression.rmse.toFixed(4)}</div>
                                    </div>
                                </div>

                                {mlResult.linear_regression.coefficients.length > 0 && (
                                    <div className="table-container max-h-48 overflow-y-auto">
                                        <table className="table text-sm">
                                            <thead>
                                                <tr>
                                                    <th>Variável</th>
                                                    <th>Coeficiente</th>
                                                    <th>Erro Padrão</th>
                                                    <th>t-valor</th>
                                                    <th>p-valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="font-medium">Intercepto</td>
                                                    <td>{mlResult.linear_regression.intercept.toFixed(4)}</td>
                                                    <td>-</td>
                                                    <td>-</td>
                                                    <td>-</td>
                                                </tr>
                                                {mlResult.linear_regression.coefficients.slice(0, 10).map((coef: LinearCoefficient) => (
                                                    <tr key={coef.feature}>
                                                        <td className="font-medium truncate max-w-32" title={coef.feature}>{coef.feature}</td>
                                                        <td>{coef.coefficient.toFixed(4)}</td>
                                                        <td>{coef.std_error?.toFixed(4) || '-'}</td>
                                                        <td>{coef.t_value?.toFixed(2) || '-'}</td>
                                                        <td className={coef.p_value && coef.p_value < 0.05 ? 'text-success' : ''}>
                                                            {coef.p_value?.toFixed(4) || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {mlResult.linear_regression.coefficients.length > 10 && (
                                                    <tr>
                                                        <td colSpan={5} className="text-center text-muted">
                                                            +{mlResult.linear_regression.coefficients.length - 10} mais
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Simulation */}
                            <div className="glass-card p-6">
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <Play size={20} />
                                    Simulação
                                </h3>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    {features.map((f) => {
                                        const col = currentDataset?.columns.find((c) => c.col_key === f);
                                        const isCategorical = col?.var_type === 'categorical';
                                        const categories = mlResult.categorical_features[f];

                                        return (
                                            <div key={f}>
                                                <label className="label">{col?.name || f}</label>
                                                {isCategorical && categories ? (
                                                    <select
                                                        className="input select"
                                                        value={inputValues[f] || ''}
                                                        onChange={(e) => setInputValues((prev) => ({ ...prev, [f]: e.target.value }))}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {categories.map((cat) => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        placeholder="0"
                                                        value={inputValues[f] || ''}
                                                        onChange={(e) => setInputValues((prev) => ({ ...prev, [f]: e.target.value }))}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        className="btn btn-primary"
                                        disabled={predicting}
                                        onClick={handlePredict}
                                    >
                                        {predicting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                        Simular
                                    </button>

                                    {prediction && (
                                        <div className="flex items-center gap-4 animate-fadeIn">
                                            <div className="stat-card px-6">
                                                <div className="stat-label">Valor Previsto</div>
                                                <div className="stat-value text-2xl">{prediction.predicted_value.toFixed(4)}</div>
                                                <div className="text-xs text-muted mt-1">
                                                    Erro esperado: ±{prediction.expected_error.toFixed(4)}
                                                </div>
                                            </div>
                                            <div className="text-sm text-secondary">
                                                Modelo: <span className="text-primary">{prediction.model_used}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-96 gap-4 glass-card">
                            <BrainCircuit size={48} className="text-muted" />
                            <p className="text-secondary">Configure e treine os modelos</p>
                            <p className="text-muted text-sm">5 modelos serão treinados e comparados automaticamente</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
