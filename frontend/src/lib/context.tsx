// Orion Stats - App Context

import { createContext, useContext, useState, ReactNode } from 'react';
import type { DatasetMeta, FilterCondition, MLTrainResponse, ScenarioPayload } from '@/types';

interface AppContextType {
    // Dataset
    currentDataset: DatasetMeta | null;
    setCurrentDataset: (dataset: DatasetMeta | null) => void;

    // Filters
    filters: FilterCondition[];
    setFilters: (filters: FilterCondition[]) => void;

    // Settings
    treatMissingAsZero: boolean;
    setTreatMissingAsZero: (value: boolean) => void;

    // Stats variables
    statsVariables: string[];
    setStatsVariables: (vars: string[]) => void;
    statsGroupBy: string[];
    setStatsGroupBy: (vars: string[]) => void;

    // Correlation variables
    correlationVariables: string[];
    setCorrelationVariables: (vars: string[]) => void;

    // ML
    target: string;
    setTarget: (target: string) => void;
    features: string[];
    setFeatures: (features: string[]) => void;
    selectionMetric: 'r2' | 'rmse' | 'mae';
    setSelectionMetric: (metric: 'r2' | 'rmse' | 'mae') => void;
    mlResult: MLTrainResponse | null;
    setMlResult: (result: MLTrainResponse | null) => void;

    // Scenario
    loadScenario: (payload: ScenarioPayload) => void;
    getCurrentPayload: () => ScenarioPayload;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [currentDataset, setCurrentDataset] = useState<DatasetMeta | null>(null);
    const [filters, setFilters] = useState<FilterCondition[]>([]);
    const [treatMissingAsZero, setTreatMissingAsZero] = useState(true);
    const [statsVariables, setStatsVariables] = useState<string[]>([]);
    const [statsGroupBy, setStatsGroupBy] = useState<string[]>([]);
    const [correlationVariables, setCorrelationVariables] = useState<string[]>([]);
    const [target, setTarget] = useState('');
    const [features, setFeatures] = useState<string[]>([]);
    const [selectionMetric, setSelectionMetric] = useState<'r2' | 'rmse' | 'mae'>('rmse');
    const [mlResult, setMlResult] = useState<MLTrainResponse | null>(null);

    const loadScenario = (payload: ScenarioPayload) => {
        setFilters(payload.filters || []);
        setStatsVariables(payload.stats_variables || []);
        setStatsGroupBy(payload.stats_group_by || []);
        setCorrelationVariables(payload.correlation_variables || []);
        setTarget(payload.target || '');
        setFeatures(payload.features || []);
        setSelectionMetric((payload.selection_metric as 'r2' | 'rmse' | 'mae') || 'rmse');
        setTreatMissingAsZero(payload.treat_missing_as_zero ?? true);
    };

    const getCurrentPayload = (): ScenarioPayload => ({
        filters,
        stats_variables: statsVariables,
        stats_group_by: statsGroupBy,
        correlation_variables: correlationVariables,
        target: target || undefined,
        features,
        selection_metric: selectionMetric,
        treat_missing_as_zero: treatMissingAsZero,
        best_model_label: mlResult?.best_model_label,
        model_id: mlResult?.model_id,
    });

    return (
        <AppContext.Provider value={{
            currentDataset, setCurrentDataset,
            filters, setFilters,
            treatMissingAsZero, setTreatMissingAsZero,
            statsVariables, setStatsVariables,
            statsGroupBy, setStatsGroupBy,
            correlationVariables, setCorrelationVariables,
            target, setTarget,
            features, setFeatures,
            selectionMetric, setSelectionMetric,
            mlResult, setMlResult,
            loadScenario, getCurrentPayload,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}
