// API Client for Orion Stats Backend

import axios from 'axios';
import type {
    DatasetMeta,
    DatasetList,
    DataQueryRequest,
    DataQueryResponse,
    UniqueValuesResponse,
    StatsRequest,
    StatsResponse,
    CorrelationRequest,
    CorrelationResponse,
    MLTrainRequest,
    MLTrainResponse,
    MLPredictRequest,
    MLPredictResponse,
    ScenarioCreate,
    Scenario,
    ScenarioList,
} from '@/types';

// Create axios instance
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// ---------- Dataset API ----------

export async function uploadDataset(file: File, name?: string): Promise<DatasetMeta> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) {
        formData.append('name', name);
    }

    const response = await api.post<DatasetMeta>('/datasets/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
}

export async function getDatasets(): Promise<DatasetList> {
    const response = await api.get<DatasetList>('/datasets/');
    return response.data;
}

export async function getDatasetMeta(datasetId: number): Promise<DatasetMeta> {
    const response = await api.get<DatasetMeta>(`/datasets/${datasetId}/meta`);
    return response.data;
}

export async function updateColumnType(
    datasetId: number,
    colKey: string,
    varType: string
): Promise<void> {
    await api.put(`/datasets/${datasetId}/column-type`, {
        col_key: colKey,
        var_type: varType,
    });
}

export async function deleteDataset(datasetId: number): Promise<void> {
    await api.delete(`/datasets/${datasetId}`);
}

// ---------- Data Query API ----------

export async function queryData(request: DataQueryRequest): Promise<DataQueryResponse> {
    const response = await api.post<DataQueryResponse>('/data/query', request);
    return response.data;
}

export async function getUniqueValues(
    datasetId: number,
    colKey: string
): Promise<UniqueValuesResponse> {
    const response = await api.post<UniqueValuesResponse>('/data/unique-values', {
        dataset_id: datasetId,
        col_key: colKey,
    });
    return response.data;
}

// ---------- Statistics API ----------

export async function getDescriptiveStats(request: StatsRequest): Promise<StatsResponse> {
    const response = await api.post<StatsResponse>('/stats/descriptive', request);
    return response.data;
}

// ---------- Correlation API ----------

export async function getCorrelation(request: CorrelationRequest): Promise<CorrelationResponse> {
    const response = await api.post<CorrelationResponse>('/stats/correlation', request);
    return response.data;
}

// ---------- ML API ----------

export async function trainModels(request: MLTrainRequest): Promise<MLTrainResponse> {
    const response = await api.post<MLTrainResponse>('/ml/train', request);
    return response.data;
}

export async function predict(request: MLPredictRequest): Promise<MLPredictResponse> {
    const response = await api.post<MLPredictResponse>('/ml/predict', request);
    return response.data;
}

// ---------- Scenarios API ----------

export async function createScenario(scenario: ScenarioCreate): Promise<Scenario> {
    const response = await api.post<Scenario>('/scenarios/', scenario);
    return response.data;
}

export async function getScenarios(): Promise<ScenarioList> {
    const response = await api.get<ScenarioList>('/scenarios/');
    return response.data;
}

export async function getScenariosByDataset(datasetId: number): Promise<ScenarioList> {
    const response = await api.get<ScenarioList>(`/scenarios/dataset/${datasetId}`);
    return response.data;
}

export async function getScenario(scenarioId: number): Promise<Scenario> {
    const response = await api.get<Scenario>(`/scenarios/${scenarioId}`);
    return response.data;
}

export async function updateScenario(
    scenarioId: number,
    update: Partial<ScenarioCreate>
): Promise<Scenario> {
    const response = await api.put<Scenario>(`/scenarios/${scenarioId}`, update);
    return response.data;
}

export async function deleteScenario(scenarioId: number): Promise<void> {
    await api.delete(`/scenarios/${scenarioId}`);
}

export async function duplicateScenario(
    scenarioId: number,
    newName: string
): Promise<Scenario> {
    const response = await api.post<Scenario>(
        `/scenarios/${scenarioId}/duplicate?new_name=${encodeURIComponent(newName)}`
    );
    return response.data;
}

export async function exportScenario(scenarioId: number): Promise<Blob> {
    const response = await api.get(`/scenarios/${scenarioId}/export`, {
        responseType: 'blob',
    });
    return response.data;
}

export async function importScenario(data: object): Promise<Scenario> {
    const response = await api.post<Scenario>('/scenarios/import', data);
    return response.data;
}

export default api;
