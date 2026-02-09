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
    ActivityLogList,
    FrequencyRequest,
    FrequencyResponse,
    CrosstabRequest,
    CrosstabResponse,
    NormalityRequest,
    NormalityResponse,
    HypothesisTestRequest,
    HypothesisTestResponse,
    ChartDataRequest,
    ChartDataResponse,
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

export async function getFrequencies(request: FrequencyRequest): Promise<FrequencyResponse> {
    const response = await api.post<FrequencyResponse>('/stats/frequencies', request);
    return response.data;
}

export async function getCrosstab(request: CrosstabRequest): Promise<CrosstabResponse> {
    const response = await api.post<CrosstabResponse>('/stats/crosstabs', request);
    return response.data;
}

export async function getNormality(request: NormalityRequest): Promise<NormalityResponse> {
    const response = await api.post<NormalityResponse>('/stats/normality', request);
    return response.data;
}

export async function getHypothesisTest(request: HypothesisTestRequest): Promise<HypothesisTestResponse> {
    const response = await api.post<HypothesisTestResponse>('/stats/hypothesis-test', request);
    return response.data;
}

export async function getChartData(request: ChartDataRequest): Promise<ChartDataResponse> {
    const response = await api.post<ChartDataResponse>('/stats/chart-data', request);
    return response.data;
}

export async function exportStatsExcel(request: object): Promise<Blob> {
    const response = await api.post('/stats/export-excel', request, { responseType: 'blob' });
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

// ---------- Activity Logs API ----------

export async function getActivityLogs(
    limit: number = 100,
    offset: number = 0,
    datasetId?: number,
    action?: string
): Promise<ActivityLogList> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (datasetId !== undefined) params.append('dataset_id', datasetId.toString());
    if (action) params.append('action', action);

    const response = await api.get<ActivityLogList>(`/activity/?${params.toString()}`);
    return response.data;
}

export async function getDatasetActivityHistory(
    datasetId: number,
    limit: number = 50
): Promise<ActivityLogList> {
    const response = await api.get<ActivityLogList>(`/activity/dataset/${datasetId}?limit=${limit}`);
    return response.data;
}

export default api;

