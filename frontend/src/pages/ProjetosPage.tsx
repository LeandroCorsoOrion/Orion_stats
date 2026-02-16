// Orion Analytics - Projects Page

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Rocket, ArrowRight, RefreshCw } from 'lucide-react';
import { getProjects } from '@/lib/api';
import { AskOrionButton } from '@/components/AskOrionButton';
import type { ProjectSummary } from '@/types';

function statusLabel(status: string) {
    if (status === 'active') return 'Ativo';
    if (status === 'draft') return 'Rascunho';
    if (status === 'archived') return 'Arquivado';
    return status;
}

export function ProjetosPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projects, setProjects] = useState<ProjectSummary[]>([]);

    const hasProjects = projects.length > 0;

    const grouped = useMemo(() => {
        const active: ProjectSummary[] = [];
        const draft: ProjectSummary[] = [];
        const archived: ProjectSummary[] = [];
        const other: ProjectSummary[] = [];

        for (const p of projects) {
            if (p.status === 'active') active.push(p);
            else if (p.status === 'draft') draft.push(p);
            else if (p.status === 'archived') archived.push(p);
            else other.push(p);
        }

        return { active, draft, archived, other };
    }, [projects]);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await getProjects();
            setProjects(res.projects || []);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err.response?.data?.detail || 'Erro ao carregar projetos');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    return (
        <div className="animate-fadeIn">
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h2 className="section-title">Projetos</h2>
                    <p className="text-secondary mt-2 max-w-3xl">
                        Projetos transformam um modelo treinado em uma aplicação operacional:
                        inputs definidos, endpoint de previsão e playground prontos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <AskOrionButton topicId="projects_overview" className="btn btn-secondary" label="O que e isso?" />
                    <button className="btn btn-secondary" onClick={load} disabled={loading}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Atualizar
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] mb-6">
                    <p className="text-error text-sm">{error}</p>
                </div>
            )}

            {!hasProjects && !loading && (
                <div className="glass-card p-8 flex flex-col items-center justify-center gap-3">
                    <Rocket size={44} className="text-muted" />
                    <div className="text-center">
                        <p className="text-secondary font-medium">Nenhum projeto ainda</p>
                        <p className="text-muted text-sm mt-1 max-w-xl">
                            Para criar o primeiro, vá em <b>Modelagem e Simulação</b>, treine um modelo e clique em
                            <b> Transformar em Projeto</b>.
                        </p>
                    </div>
                    <Link to="/modelagem" className="btn btn-primary">
                        Ir para Modelagem
                        <ArrowRight size={16} />
                    </Link>
                </div>
            )}

            {loading && (
                <div className="glass-card p-8 flex items-center justify-center gap-3">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-secondary">Carregando projetos...</span>
                </div>
            )}

            {hasProjects && !loading && (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    {[...grouped.active, ...grouped.draft, ...grouped.archived, ...grouped.other].map((p) => (
                        <Link
                            key={p.id}
                            to={`/projetos/${p.id}`}
                            className="glass-card p-5 glass-card-hover"
                            style={{ textDecoration: 'none' }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-lg truncate" title={p.name}>{p.name}</h3>
                                    </div>
                                    <p className="text-xs text-muted mt-1">
                                        Dataset: <span className="text-secondary">{p.dataset_name || `#${p.dataset_id}`}</span>
                                    </p>
                                </div>

                                <span
                                    className={`chip ${p.status === 'active' ? 'active' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {statusLabel(p.status)}
                                </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="stat-card">
                                    <div className="stat-label">Modelo</div>
                                    <div className="text-sm text-secondary truncate" title={p.model_label}>
                                        {p.model_label}
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Alvo (Y)</div>
                                    <div className="text-sm text-secondary truncate" title={p.target}>
                                        {p.target}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between text-xs text-muted">
                                <span>Atualizado em {new Date(p.updated_at).toLocaleString()}</span>
                                <span className="text-primary flex items-center gap-1">
                                    Abrir <ArrowRight size={14} />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
