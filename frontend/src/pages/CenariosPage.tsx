// Orion Analytics - Scenarios Page

import { useState, useEffect } from 'react';
import {
    FolderKanban, Save, Loader2, Trash2, Copy, Download, Upload,
    Edit3, Check, X, AlertCircle
} from 'lucide-react';
import {
    getScenarios, createScenario, deleteScenario,
    duplicateScenario, updateScenario, getScenariosByDataset
} from '@/lib/api';
import { useApp } from '@/lib/context';
import { AskOrionButton } from '@/components/AskOrionButton';
import type { Scenario } from '@/types';

export function CenariosPage() {
    const {
        currentDataset,
        loadScenario,
        getCurrentPayload
    } = useApp();

    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

    useEffect(() => {
        loadScenarios();
    }, [currentDataset]);

    async function loadScenarios() {
        setLoading(true);
        try {
            const result = currentDataset
                ? await getScenariosByDataset(currentDataset.id)
                : await getScenarios();
            setScenarios(result.scenarios);
        } catch (e) {
            console.error('Failed to load scenarios:', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!currentDataset || !newName.trim()) {
            setError('Dê um nome ao cenário');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await createScenario({
                name: newName.trim(),
                description: newDescription.trim() || undefined,
                dataset_id: currentDataset.id,
                payload: getCurrentPayload(),
            });

            setNewName('');
            setNewDescription('');
            await loadScenarios();
        } catch (e) {
            setError('Erro ao salvar cenário');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Tem certeza que deseja excluir este cenário?')) return;

        try {
            await deleteScenario(id);
            await loadScenarios();
        } catch (e) {
            console.error('Failed to delete scenario:', e);
        }
    }

    async function handleDuplicate(scenario: Scenario) {
        const name = prompt('Nome do novo cenário:', `${scenario.name} (cópia)`);
        if (!name) return;

        try {
            await duplicateScenario(scenario.id, name);
            await loadScenarios();
        } catch (e) {
            console.error('Failed to duplicate scenario:', e);
        }
    }

    async function handleRename(id: number) {
        if (!editingName.trim()) return;

        try {
            await updateScenario(id, { name: editingName.trim() });
            setEditingId(null);
            await loadScenarios();
        } catch (e) {
            console.error('Failed to rename scenario:', e);
        }
    }

    function handleLoad(scenario: Scenario) {
        loadScenario(scenario.payload);
    }

    function handleExport(scenario: Scenario) {
        const data = {
            name: scenario.name,
            description: scenario.description,
            dataset_id: scenario.dataset_id,
            payload: scenario.payload,
            exported_at: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cenario_${scenario.name.replace(/\s+/g, '_')}.json`;
        a.click();
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate required fields
            if (!data.payload || !data.name) {
                setError('Arquivo inválido');
                return;
            }

            // Use current dataset if different
            const datasetId = currentDataset?.id || data.dataset_id;
            if (!datasetId) {
                setError('Carregue um dataset primeiro');
                return;
            }

            await createScenario({
                name: data.name + ' (importado)',
                description: data.description,
                dataset_id: datasetId,
                payload: data.payload,
            });

            await loadScenarios();
        } catch (e) {
            setError('Erro ao importar cenário');
        }

        // Reset input
        e.target.value = '';
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <h2 className="section-title">Cenários Salvos</h2>
                <AskOrionButton topicId="scenarios_vs_projects" />
            </div>

            {/* Save New Scenario */}
            {currentDataset && (
                <div className="glass-card p-6 mb-6">
                    <h3 className="font-semibold mb-4">Salvar Cenário Atual</h3>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="col-span-1">
                            <label className="label">Nome *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Meu cenário"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="label">Descrição</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Descrição opcional"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            className="btn btn-primary"
                            disabled={saving || !newName.trim()}
                            onClick={handleSave}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Salvar Cenário
                        </button>

                        <label className="btn btn-secondary cursor-pointer">
                            <Upload size={16} />
                            Importar JSON
                            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                        </label>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)]">
                            <AlertCircle className="text-error" size={16} />
                            <span className="text-error text-sm">{error}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Scenarios List */}
            <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">
                    Cenários {currentDataset && `do Dataset: ${currentDataset.name}`}
                </h3>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={32} className="animate-spin text-primary" />
                    </div>
                ) : scenarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <FolderKanban size={48} className="text-muted" />
                        <p className="text-secondary">Nenhum cenário salvo</p>
                        <p className="text-muted text-sm">Configure filtros e variáveis, depois salve um cenário</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Descrição</th>
                                    <th>Filtros</th>
                                    <th>Variáveis</th>
                                    <th>Relatório</th>
                                    <th>Modelo</th>
                                    <th>Atualizado</th>
                                    <th className="w-40">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scenarios.map((scenario) => (
                                    <tr key={scenario.id}>
                                        <td>
                                            {editingId === scenario.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        className="input py-1 px-2 w-40"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button className="btn btn-ghost p-1" onClick={() => handleRename(scenario.id)}>
                                                        <Check size={14} className="text-success" />
                                                    </button>
                                                    <button className="btn btn-ghost p-1" onClick={() => setEditingId(null)}>
                                                        <X size={14} className="text-error" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="font-medium">{scenario.name}</span>
                                            )}
                                        </td>
                                        <td className="text-secondary text-sm max-w-48 truncate" title={scenario.description}>
                                            {scenario.description || '-'}
                                        </td>
                                        <td className="text-sm">
                                            {scenario.payload.filters.length} filtros
                                        </td>
                                        <td className="text-sm">
                                            {scenario.payload.features.length} features
                                        </td>
                                        <td className="text-sm">
                                            {(scenario.payload.report_sections || []).length} blocos
                                        </td>
                                        <td className="text-sm">
                                            {scenario.payload.best_model_label ? (
                                                <span className="chip text-xs py-0.5 px-2">
                                                    {scenario.payload.best_model_label.split(' - ')[1]}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="text-sm text-muted">
                                            {formatDate(scenario.updated_at)}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    className="btn btn-ghost p-2"
                                                    title="Carregar"
                                                    onClick={() => handleLoad(scenario)}
                                                >
                                                    <FolderKanban size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost p-2"
                                                    title="Renomear"
                                                    onClick={() => { setEditingId(scenario.id); setEditingName(scenario.name); }}
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost p-2"
                                                    title="Duplicar"
                                                    onClick={() => handleDuplicate(scenario)}
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost p-2"
                                                    title="Exportar"
                                                    onClick={() => handleExport(scenario)}
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost p-2 text-error"
                                                    title="Excluir"
                                                    onClick={() => handleDelete(scenario.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
