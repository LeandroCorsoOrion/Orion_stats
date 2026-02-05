// Orion Stats - Dataset Page (Improved UX)

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Trash2, Database, Columns, Eye } from 'lucide-react';
import { uploadDataset, queryData, getDatasets, deleteDataset, updateColumnType } from '@/lib/api';
import { useApp } from '@/lib/context';
import type { DatasetMeta, ColumnMeta } from '@/types';

export function DatasetPage() {
    const { currentDataset, setCurrentDataset } = useApp();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
    const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [activeTab, setActiveTab] = useState<'info' | 'preview'>('info');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const PREVIEW_LIMIT = 50;

    // Load datasets on mount
    useEffect(() => {
        loadDatasets();
    }, []);

    // Load preview when dataset changes
    useEffect(() => {
        if (currentDataset) {
            loadPreview(currentDataset);
        }
    }, [currentDataset?.id]);

    async function loadDatasets() {
        try {
            const result = await getDatasets();
            setDatasets(result.datasets);
        } catch (e) {
            console.error('Failed to load datasets:', e);
        }
    }

    async function loadPreview(dataset: DatasetMeta, offset = 0) {
        try {
            const result = await queryData({
                dataset_id: dataset.id,
                filters: [],
                limit: PREVIEW_LIMIT,
                offset,
            });
            setPreviewData(result.data);
            setTotalCount(result.total_count);
            setPage(Math.floor(offset / PREVIEW_LIMIT));
        } catch (e) {
            console.error('Failed to load preview:', e);
        }
    }

    const handleFile = useCallback(async (file: File) => {
        const ext = file.name.toLowerCase().split('.').pop();
        if (ext !== 'xlsx' && ext !== 'xls') {
            setError('Apenas arquivos .xlsx e .xls são permitidos');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const result = await uploadDataset(file);
            setCurrentDataset(result);
            await loadDatasets();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err.response?.data?.detail || 'Falha ao carregar arquivo');
        } finally {
            setUploading(false);
        }
    }, [setCurrentDataset]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    async function handleSelectDataset(dataset: DatasetMeta) {
        setCurrentDataset(dataset);
    }

    async function handleDeleteDataset(id: number) {
        if (!confirm('Tem certeza que deseja excluir este dataset?')) return;
        try {
            await deleteDataset(id);
            if (currentDataset?.id === id) {
                setCurrentDataset(null);
                setPreviewData([]);
            }
            await loadDatasets();
        } catch (e) {
            console.error('Failed to delete dataset:', e);
        }
    }

    async function handleTypeChange(col: ColumnMeta, newType: string) {
        if (!currentDataset) return;
        try {
            await updateColumnType(currentDataset.id, col.col_key, newType);
            const updated = {
                ...currentDataset,
                columns: currentDataset.columns.map(c =>
                    c.col_key === col.col_key ? { ...c, var_type: newType as 'categorical' | 'discrete' | 'continuous' } : c
                )
            };
            setCurrentDataset(updated);
        } catch (e) {
            console.error('Failed to update column type:', e);
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'categorical': return 'text-warning';
            case 'discrete': return 'text-success';
            case 'continuous': return 'text-primary';
            default: return 'text-muted';
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="grid gap-6" style={{ gridTemplateColumns: currentDataset ? '320px 1fr' : '1fr' }}>

                {/* Left Panel - Upload & Datasets List */}
                <div className="flex flex-col gap-4">
                    <h2 className="section-title">Dataset</h2>

                    {/* Upload Zone */}
                    <div
                        className={`upload-zone ${dragOver ? 'dragover' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ padding: '32px 24px' }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileInput}
                        />

                        {uploading ? (
                            <>
                                <Loader2 className="upload-zone-icon animate-pulse" size={40} />
                                <span className="upload-zone-title text-base">Processando...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="upload-zone-icon" size={40} />
                                <span className="upload-zone-title text-base">Arraste um arquivo XLSX</span>
                                <span className="upload-zone-subtitle text-xs">ou clique para selecionar</span>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)]">
                            <AlertCircle className="text-error" size={16} />
                            <span className="text-error text-sm">{error}</span>
                        </div>
                    )}

                    {/* Datasets List */}
                    {datasets.length > 0 && (
                        <div className="glass-card p-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Database size={16} />
                                Datasets Disponíveis
                            </h3>
                            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                                {datasets.map((ds) => (
                                    <div
                                        key={ds.id}
                                        className={`p-3 rounded-lg cursor-pointer transition border ${currentDataset?.id === ds.id
                                            ? 'bg-[rgba(160,208,255,0.15)] border-[var(--color-primary)]'
                                            : 'bg-[var(--color-surface)] border-transparent hover:border-[var(--color-surface-border)]'
                                            }`}
                                        onClick={() => handleSelectDataset(ds)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileSpreadsheet className={currentDataset?.id === ds.id ? 'text-primary' : 'text-muted'} size={18} />
                                                <div>
                                                    <div className={`text-sm font-medium ${currentDataset?.id === ds.id ? 'text-primary' : ''}`}>
                                                        {ds.name}
                                                    </div>
                                                    <div className="text-xs text-muted">
                                                        {ds.row_count.toLocaleString()} × {ds.col_count}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-ghost p-1.5 opacity-50 hover:opacity-100"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteDataset(ds.id); }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Dataset Details */}
                {currentDataset && (
                    <div className="flex flex-col gap-4">
                        {/* Dataset Header */}
                        <div className="glass-card p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-[rgba(160,208,255,0.15)] flex items-center justify-center">
                                        <CheckCircle className="text-primary" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{currentDataset.name}</h3>
                                        <p className="text-sm text-secondary">{currentDataset.original_filename}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-primary">{currentDataset.row_count.toLocaleString()}</div>
                                        <div className="text-xs text-muted">Linhas</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-primary">{currentDataset.col_count}</div>
                                        <div className="text-xs text-muted">Colunas</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2">
                            <button
                                className={`btn ${activeTab === 'info' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setActiveTab('info')}
                            >
                                <Columns size={16} /> Informações das Colunas
                            </button>
                            <button
                                className={`btn ${activeTab === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setActiveTab('preview')}
                            >
                                <Eye size={16} /> Pré-visualização
                            </button>
                        </div>

                        {/* Column Info Tab */}
                        {activeTab === 'info' && (
                            <div className="glass-card p-4">
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="p-3 rounded-lg bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)]">
                                        <div className="text-xl font-bold text-warning">
                                            {currentDataset.columns.filter(c => c.var_type === 'categorical').length}
                                        </div>
                                        <div className="text-xs text-warning">Categóricas</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)]">
                                        <div className="text-xl font-bold text-success">
                                            {currentDataset.columns.filter(c => c.var_type === 'discrete').length}
                                        </div>
                                        <div className="text-xs text-success">Discretas</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-[rgba(160,208,255,0.1)] border border-[rgba(160,208,255,0.2)]">
                                        <div className="text-xl font-bold text-primary">
                                            {currentDataset.columns.filter(c => c.var_type === 'continuous').length}
                                        </div>
                                        <div className="text-xs text-primary">Contínuas</div>
                                    </div>
                                </div>

                                <div className="table-container" style={{ maxHeight: '400px' }}>
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Coluna</th>
                                                <th>Tipo de Dado</th>
                                                <th>Únicos</th>
                                                <th>Ausentes</th>
                                                <th>Tipo de Variável</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentDataset.columns.map((col) => (
                                                <tr key={col.col_key}>
                                                    <td className="font-medium">{col.name}</td>
                                                    <td className="text-muted text-xs">{col.dtype}</td>
                                                    <td>{col.unique_count.toLocaleString()}</td>
                                                    <td className={col.missing_count > 0 ? 'text-warning' : ''}>
                                                        {col.missing_count > 0 ? col.missing_count.toLocaleString() : '-'}
                                                    </td>
                                                    <td>
                                                        <select
                                                            className={`input select py-1 px-2 text-sm ${getTypeColor(col.var_type)}`}
                                                            value={col.var_type}
                                                            onChange={(e) => handleTypeChange(col, e.target.value)}
                                                        >
                                                            <option value="categorical">Categórica</option>
                                                            <option value="discrete">Discreta</option>
                                                            <option value="continuous">Contínua</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Preview Tab */}
                        {activeTab === 'preview' && previewData.length > 0 && (
                            <div className="glass-card p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-secondary">
                                        Mostrando {page * PREVIEW_LIMIT + 1} - {Math.min((page + 1) * PREVIEW_LIMIT, totalCount)} de {totalCount.toLocaleString()}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="btn btn-secondary py-1 px-3 text-sm"
                                            disabled={page === 0}
                                            onClick={() => loadPreview(currentDataset, (page - 1) * PREVIEW_LIMIT)}
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            className="btn btn-secondary py-1 px-3 text-sm"
                                            disabled={(page + 1) * PREVIEW_LIMIT >= totalCount}
                                            onClick={() => loadPreview(currentDataset, (page + 1) * PREVIEW_LIMIT)}
                                        >
                                            Próximo
                                        </button>
                                    </div>
                                </div>

                                <div className="table-container overflow-auto" style={{ maxHeight: '400px' }}>
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                {currentDataset.columns.map((col) => (
                                                    <th key={col.col_key} className="whitespace-nowrap text-xs">
                                                        <span className={getTypeColor(col.var_type)}>●</span> {col.name}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((row, i) => (
                                                <tr key={i}>
                                                    {currentDataset.columns.map((col) => (
                                                        <td key={col.col_key} className="whitespace-nowrap text-sm">
                                                            {row[col.col_key] != null ? String(row[col.col_key]) : <span className="text-muted">-</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State when no dataset */}
                {!currentDataset && datasets.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-96 gap-4 glass-card">
                        <Database size={64} className="text-muted" />
                        <h3 className="text-xl font-semibold">Nenhum Dataset Carregado</h3>
                        <p className="text-secondary text-center max-w-md">
                            Faça upload de um arquivo Excel (.xlsx) para começar a analisar seus dados.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
