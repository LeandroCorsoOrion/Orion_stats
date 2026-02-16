// API Client for Orion Analytics Backend

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
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
    ProjectCreate,
    ProjectUpdate,
    Project,
    ProjectList,
    ProjectPredictRequest,
    ProjectPredictResponse,
    ProjectRunList,
} from '@/types';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
    __retryCount?: number;
};

const API_TIMEOUT_MS = 25000;
const READ_RETRY_MAX = 2;
const RETRYABLE_HTTP_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function isReadMethod(method?: string) {
    const m = (method || 'get').toLowerCase();
    return m === 'get' || m === 'head' || m === 'options';
}

function isRetryableError(error: AxiosError) {
    const status = error.response?.status;
    if (typeof status === 'number' && RETRYABLE_HTTP_STATUS.has(status)) {
        return true;
    }

    if (!error.response) {
        return true;
    }

    if (error.code === 'ECONNABORTED') {
        return true;
    }

    return false;
}

function retryDelayMs(retryCount: number) {
    const base = 300;
    const jitter = Math.floor(Math.random() * 120);
    return base * Math.pow(2, retryCount) + jitter;
}

// Create axios instance
const api = axios.create({
    baseURL: '/api',
    timeout: API_TIMEOUT_MS,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as RetryableRequestConfig | undefined;
        if (!config || !isReadMethod(config.method) || !isRetryableError(error)) {
            return Promise.reject(error);
        }

        const retryCount = config.__retryCount ?? 0;
        if (retryCount >= READ_RETRY_MAX) {
            return Promise.reject(error);
        }

        config.__retryCount = retryCount + 1;
        const delay = retryDelayMs(retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(config);
    }
);

export type ApiHealthStatus = {
    ok: boolean;
    detail?: string;
};

export async function checkApiHealth(): Promise<ApiHealthStatus> {
    try {
        const response = await api.get<{ status?: string }>('/health', { timeout: 5000 });
        return { ok: response.status >= 200 && response.status < 300 };
    } catch (e: unknown) {
        const err = e as AxiosError<{ detail?: string }>;
        return {
            ok: false,
            detail: err.response?.data?.detail || err.message || 'Falha de conexao',
        };
    }
}

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

export async function exportStatsWord(request: object): Promise<Blob> {
    const response = await api.post('/stats/export-word', request, { responseType: 'blob' });
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

// ---------- Projects API ----------

export async function createProject(project: ProjectCreate): Promise<Project> {
    const response = await api.post<Project>('/projects/', project);
    return response.data;
}

export async function getProjects(limit: number = 200, offset: number = 0): Promise<ProjectList> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    const response = await api.get<ProjectList>(`/projects/?${params.toString()}`);
    return response.data;
}

export async function getProject(projectId: number): Promise<Project> {
    const response = await api.get<Project>(`/projects/${projectId}`);
    return response.data;
}

export async function updateProject(projectId: number, update: ProjectUpdate): Promise<Project> {
    const response = await api.put<Project>(`/projects/${projectId}`, update);
    return response.data;
}

export async function deleteProject(projectId: number): Promise<void> {
    await api.delete(`/projects/${projectId}`);
}

export async function predictProject(
    projectId: number,
    request: ProjectPredictRequest
): Promise<ProjectPredictResponse> {
    const response = await api.post<ProjectPredictResponse>(`/projects/${projectId}/predict`, request);
    return response.data;
}

export async function getProjectRuns(
    projectId: number,
    limit: number = 50,
    offset: number = 0
): Promise<ProjectRunList> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    const response = await api.get<ProjectRunList>(`/projects/${projectId}/runs?${params.toString()}`);
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
