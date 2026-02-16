// Orion Analytics - App Context

import { createContext, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { DatasetMeta, FilterCondition, MLTrainResponse, ReportSection, ScenarioPayload } from '@/types';

interface AppContextType {
    // Dataset
    currentDataset: DatasetMeta | null;
    setCurrentDataset: Dispatch<SetStateAction<DatasetMeta | null>>;

    // Filters
    filters: FilterCondition[];
    setFilters: Dispatch<SetStateAction<FilterCondition[]>>;

    // Settings
    treatMissingAsZero: boolean;
    setTreatMissingAsZero: Dispatch<SetStateAction<boolean>>;

    // Stats variables
    statsVariables: string[];
    setStatsVariables: Dispatch<SetStateAction<string[]>>;
    statsGroupBy: string[];
    setStatsGroupBy: Dispatch<SetStateAction<string[]>>;

    // Correlation variables
    correlationVariables: string[];
    setCorrelationVariables: Dispatch<SetStateAction<string[]>>;

    // ML
    target: string;
    setTarget: Dispatch<SetStateAction<string>>;
    features: string[];
    setFeatures: Dispatch<SetStateAction<string[]>>;
    selectionMetric: 'r2' | 'rmse' | 'mae';
    setSelectionMetric: Dispatch<SetStateAction<'r2' | 'rmse' | 'mae'>>;
    mlResult: MLTrainResponse | null;
    setMlResult: Dispatch<SetStateAction<MLTrainResponse | null>>;

    // Composite report sections
    reportSections: ReportSection[];
    setReportSections: Dispatch<SetStateAction<ReportSection[]>>;
    addReportSection: (section: ReportSection) => void;
    removeReportSection: (id: string) => void;
    clearReportSections: () => void;

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
    const [reportSections, setReportSections] = useState<ReportSection[]>([]);

    const addReportSection = (section: ReportSection) => {
        setReportSections((prev) => [section, ...prev]);
    };

    const removeReportSection = (id: string) => {
        setReportSections((prev) => prev.filter((item) => item.id !== id));
    };

    const clearReportSections = () => {
        setReportSections([]);
    };

    const loadScenario = (payload: ScenarioPayload) => {
        setFilters(payload.filters || []);
        setStatsVariables(payload.stats_variables || []);
        setStatsGroupBy(payload.stats_group_by || []);
        setCorrelationVariables(payload.correlation_variables || []);
        setTarget(payload.target || '');
        setFeatures(payload.features || []);
        setSelectionMetric((payload.selection_metric as 'r2' | 'rmse' | 'mae') || 'rmse');
        setTreatMissingAsZero(payload.treat_missing_as_zero ?? true);
        setReportSections(payload.report_sections || []);
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
        report_sections: reportSections,
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
            reportSections, setReportSections,
            addReportSection, removeReportSection, clearReportSections,
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
