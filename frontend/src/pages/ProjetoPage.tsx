// Orion Analytics - Project Detail Page

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Loader2, Play, RefreshCw, Save, Trash2 } from 'lucide-react';

import { deleteProject, getProject, getProjectRuns, predictProject, updateProject } from '@/lib/api';
import { AskOrionButton } from '@/components/AskOrionButton';
import type { Project, ProjectInputField, ProjectRun, ProjectStatus, ProjectPredictResponse } from '@/types';

function statusLabel(status: string) {
    if (status === 'active') return 'Ativo';
    if (status === 'draft') return 'Rascunho';
    if (status === 'archived') return 'Arquivado';
    return status;
}

function buildInitialValues(schema: ProjectInputField[]) {
    const values: Record<string, string> = {};
    for (const f of schema) {
        const def = f.default_value;
        if (def === undefined || def === null) values[f.col_key] = '';
        else values[f.col_key] = String(def);
    }
    return values;
}

export function ProjetoPage() {
    const params = useParams();
    const navigate = useNavigate();
    const projectId = Number(params.projectId);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [predicting, setPredicting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [project, setProject] = useState<Project | null>(null);
    const [inputValues, setInputValues] = useState<Record<string, string>>({});
    const [prediction, setPrediction] = useState<ProjectPredictResponse | null>(null);
    const [runsLoading, setRunsLoading] = useState(false);
    const [runs, setRuns] = useState<ProjectRun[]>([]);
    const [runsTotal, setRunsTotal] = useState(0);

    const schema = project?.input_schema || [];

    const endpointPath = useMemo(() => {
        if (!project) return '';
        return `/projects/${project.id}/predict`;
    }, [project]);

    async function load() {
        if (!Number.isFinite(projectId) || Number.isNaN(projectId)) {
            setError('ID de projeto inválido');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const p = await getProject(projectId);
            setProject(p);
            setInputValues(buildInitialValues(p.input_schema || []));

            setRunsLoading(true);
            try {
                const r = await getProjectRuns(projectId, 20, 0);
                setRuns(r.runs || []);
                setRunsTotal(r.total || 0);
            } catch {
                setRuns([]);
                setRunsTotal(0);
            } finally {
                setRunsLoading(false);
            }
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err.response?.data?.detail || 'Erro ao carregar projeto');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, [projectId]);

    async function handleStatusChange(status: ProjectStatus) {
        if (!project) return;
        setSaving(true);
        setError(null);
        try {
            const updated = await updateProject(project.id, { status });
            setProject(updated);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err.response?.data?.detail || 'Erro ao atualizar status');
        } finally {
            setSaving(false);
        }
    }

    async function handlePredict() {
        if (!project) return;
        setPredicting(true);
        setPrediction(null);
        setError(null);

        try {
            const values: Record<string, unknown> = {};
            for (const field of schema) {
                const raw = inputValues[field.col_key];
                if (field.input_type === 'number') {
                    values[field.col_key] = raw === '' ? 0 : Number(raw);
                } else {
                    values[field.col_key] = raw || '';
                }
            }

            const res = await predictProject(project.id, { input_values: values });
            setPrediction(res);

            try {
                const r = await getProjectRuns(project.id, 20, 0);
                setRuns(r.runs || []);
                setRunsTotal(r.total || 0);
            } catch {
                // ignore
            }
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err.response?.data?.detail || 'Erro ao prever');
        } finally {
            setPredicting(false);
        }
    }

    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Silent: clipboard might be blocked.
        }
    }

    async function handleDelete() {
        if (!project) return;
        const ok = window.confirm(`Excluir o projeto "${project.name}"? Isso não apaga o dataset nem o modelo treinado.`);
        if (!ok) return;

        setDeleting(true);
        setError(null);
        try {
            await deleteProject(project.id);
            navigate('/projetos');
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err.response?.data?.detail || 'Erro ao excluir projeto');
        } finally {
            setDeleting(false);
        }
    }

    if (loading) {
        return (
            <div className="glass-card p-8 flex items-center justify-center gap-3">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-secondary">Carregando projeto...</span>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="glass-card p-8">
                <p className="text-error">{error || 'Projeto não encontrado'}</p>
                <Link to="/projetos" className="btn btn-secondary mt-4">
                    <ArrowLeft size={16} />
                    Voltar
                </Link>
            </div>
        );
    }

    const requestExample = JSON.stringify(
        {
            input_values: Object.fromEntries(schema.map((f) => [f.col_key, f.input_type === 'number' ? 0 : ''])),
        },
        null,
        2
    );

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="min-w-0">
                    <Link to="/projetos" className="text-sm text-secondary flex items-center gap-2" style={{ textDecoration: 'none' }}>
                        <ArrowLeft size={16} />
                        Projetos
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                        <h2 className="section-title truncate" title={project.name}>{project.name}</h2>
                        <AskOrionButton topicId="projects_overview" />
                    </div>
                    <p className="text-muted text-sm mt-1">
                        Dataset: <span className="text-secondary">{project.dataset_name || `#${project.dataset_id}`}</span>
                        <span className="text-muted"> · </span>
                        Modelo: <span className="text-secondary">{project.model_label}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button className="btn btn-secondary" onClick={load} disabled={loading}>
                        <RefreshCw size={16} />
                        Atualizar
                    </button>
                    <button className="btn btn-secondary" onClick={handleDelete} disabled={deleting}>
                        {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Excluir
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] mb-6">
                    <p className="text-error text-sm">{error}</p>
                </div>
            )}

            <div className="grid gap-6" style={{ gridTemplateColumns: '380px 1fr' }}>
                {/* Left: Project Settings */}
                <div className="flex flex-col gap-4">
                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold">Status</h3>
                            {saving && <Loader2 size={16} className="animate-spin text-muted" />}
                        </div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                            {(['active', 'draft', 'archived'] as ProjectStatus[]).map((s) => (
                                <button
                                    key={s}
                                    className={`chip ${project.status === s ? 'active' : ''}`}
                                    onClick={() => handleStatusChange(s)}
                                    disabled={saving}
                                    title={statusLabel(s)}
                                >
                                    {statusLabel(s)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="font-semibold mb-3">Configuração do Treino</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="stat-card">
                                <div className="stat-label">Alvo (Y)</div>
                                <div className="text-sm text-secondary truncate" title={project.target}>{project.target}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Features (X)</div>
                                <div className="text-sm text-secondary">{project.features.length}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Métrica</div>
                                <div className="text-sm text-secondary">{project.train_config?.selection_metric?.toUpperCase?.() || '-'}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Missing</div>
                                <div className="text-sm text-secondary">
                                    {project.train_config?.treat_missing_as_zero ? 'Zero/MISSING' : 'Remover NaN'}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <p className="text-xs text-muted mb-2">Features usadas no projeto</p>
                            <div className="flex flex-wrap gap-2">
                                {project.features.slice(0, 12).map((f) => (
                                    <span key={f} className="chip" style={{ cursor: 'default' }}>{f}</span>
                                ))}
                                {project.features.length > 12 && (
                                    <span className="chip" style={{ cursor: 'default' }}>
                                        +{project.features.length - 12}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="font-semibold mb-2">Endpoint</h3>
                        <p className="text-xs text-muted mb-3">
                            Use este endpoint para integrar o projeto em sistemas, planilhas ou automações.
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="text-primary text-xs font-mono" style={{ wordBreak: 'break-all' }}>
                                POST {endpointPath}
                            </code>
                            <button className="btn btn-ghost" onClick={() => copy(`POST ${endpointPath}`)} title="Copiar">
                                <Copy size={14} />
                            </button>
                        </div>
                        <div className="mt-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted">Exemplo de payload</p>
                                <button className="btn btn-ghost" onClick={() => copy(requestExample)} title="Copiar JSON">
                                    <Copy size={14} />
                                </button>
                            </div>
                            <pre className="bg-[rgba(13,20,33,0.6)] p-3 rounded-lg mt-2 overflow-x-auto text-xs">
                                <code className="text-secondary">{requestExample}</code>
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Right: Playground */}
                <div className="flex flex-col gap-6">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-semibold text-lg">Playground</h3>
                                <p className="text-muted text-sm mt-1">
                                    Preencha os inputs e clique em <b>Prever</b>. Esses campos são as mesmas features (X) usadas no treino.
                                </p>
                            </div>
                            <button
                                className="btn btn-secondary text-sm"
                                onClick={() => setInputValues(buildInitialValues(schema))}
                                disabled={predicting}
                                title="Resetar inputs"
                            >
                                <Save size={14} />
                                Reset
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {schema.map((field) => (
                                <div key={field.col_key}>
                                    <label className="label">{field.name}</label>
                                    {field.input_type === 'select' ? (
                                        <select
                                            className="input select"
                                            value={inputValues[field.col_key] || ''}
                                            onChange={(e) => setInputValues((prev) => ({ ...prev, [field.col_key]: e.target.value }))}
                                        >
                                            <option value="">Selecione...</option>
                                            {(field.allowed_values || []).slice(0, 400).map((v) => (
                                                <option key={String(v)} value={String(v)}>{String(v)}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="0"
                                            value={inputValues[field.col_key] ?? ''}
                                            onChange={(e) => setInputValues((prev) => ({ ...prev, [field.col_key]: e.target.value }))}
                                        />
                                    )}
                                    <p className="text-xs text-muted mt-1">{field.col_key}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 mt-5">
                            <button className="btn btn-primary" onClick={handlePredict} disabled={predicting}>
                                {predicting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                Prever
                            </button>
                            {prediction && (
                                <div className="flex items-center gap-4 animate-fadeIn">
                                    <div className="stat-card px-6">
                                        <div className="stat-label">Valor Previsto</div>
                                        <div className="stat-value text-2xl">{prediction.predicted_value.toFixed(4)}</div>
                                        <div className="text-xs text-muted mt-1 flex items-center gap-2">
                                            Erro esperado: ±{prediction.expected_error.toFixed(4)}
                                            <AskOrionButton topicId="rmse" />
                                        </div>
                                    </div>
                                    <div className="text-sm text-secondary">
                                        Modelo: <span className="text-primary">{prediction.model_used}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-card p-6">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    Histórico
                                    <AskOrionButton topicId="project_runs_overview" />
                                </h3>
                                    <p className="text-muted text-sm mt-1">
                                        Últimas previsões executadas neste projeto (útil para auditoria e acompanhamento).
                                    </p>
                                </div>
                                <span className="chip" style={{ cursor: 'default' }}>
                                {runsTotal} execuções
                            </span>
                        </div>

                        {runsLoading ? (
                            <div className="flex items-center gap-2 text-secondary">
                                <Loader2 size={16} className="animate-spin" />
                                Carregando histórico...
                            </div>
                        ) : runs.length === 0 ? (
                            <p className="text-secondary">Sem histórico ainda. Faça uma previsão no Playground.</p>
                        ) : (
                            <div className="table-container">
                                <table className="table text-sm">
                                    <thead>
                                        <tr>
                                            <th>Quando</th>
                                            <th>Previsto</th>
                                            <th>Erro</th>
                                            <th>Modelo</th>
                                            <th>Inputs</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {runs.map((r) => (
                                            <tr key={r.id}>
                                                <td className="text-secondary">{new Date(r.created_at).toLocaleString()}</td>
                                                <td className="text-secondary">{Number(r.predicted_value).toFixed(4)}</td>
                                                <td className="text-muted">±{Number(r.expected_error).toFixed(4)}</td>
                                                <td className="text-secondary truncate max-w-32" title={r.model_used}>
                                                    {r.model_used}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-ghost"
                                                        onClick={() => copy(JSON.stringify(r.input_values, null, 2))}
                                                        title="Copiar inputs (JSON)"
                                                    >
                                                        <Copy size={14} />
                                                        Copiar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="font-semibold text-lg mb-3">Dica (para leigos)</h3>
                        <p className="text-secondary">
                            Pense no projeto como um “mini-sistema” de previsão. Você define o que quer prever (Y),
                            escolhe quais informações entram (X), treina, e depois só precisa preencher esses mesmos inputs
                            para obter novas previsões.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
