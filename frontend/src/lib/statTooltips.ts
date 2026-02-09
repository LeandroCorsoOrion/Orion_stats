// Statistical tooltips dictionary in Portuguese

export interface StatTooltipData {
    key: string;
    label: string;
    shortLabel: string;
    description: string;
    formula?: string;
    interpretation?: string;
}

export const STAT_TOOLTIPS: Record<string, StatTooltipData> = {
    mean: { key: 'mean', label: 'Media Aritmetica', shortLabel: 'Media', description: 'Soma de todos os valores dividida pelo numero de observacoes.', formula: 'x = Sigma(xi) / n', interpretation: 'Valor central dos dados. Sensivel a outliers.' },
    median: { key: 'median', label: 'Mediana', shortLabel: 'Mediana', description: 'Valor central quando os dados sao ordenados.', interpretation: 'Mais robusta que a media para dados com outliers.' },
    mode: { key: 'mode', label: 'Moda', shortLabel: 'Moda', description: 'Valor mais frequente na distribuicao.', interpretation: 'Util para variaveis discretas.' },
    std: { key: 'std', label: 'Desvio Padrao', shortLabel: 'D.P.', description: 'Medida de dispersao dos dados em torno da media.', formula: 's = sqrt(Sigma(xi - x)^2 / (n-1))', interpretation: 'Quanto maior, mais dispersos os dados.' },
    variance: { key: 'variance', label: 'Variancia', shortLabel: 'Var.', description: 'Quadrado do desvio padrao.', formula: 's^2', interpretation: 'Util em formulas estatisticas.' },
    sem: { key: 'sem', label: 'Erro Padrao da Media', shortLabel: 'SEM', description: 'Precisao da estimativa da media.', formula: 'SEM = s / sqrt(n)', interpretation: 'Quanto menor, mais precisa a estimativa da media.' },
    cv: { key: 'cv', label: 'Coeficiente de Variacao', shortLabel: 'CV%', description: 'Dispersao relativa. Permite comparar variabilidade entre variaveis diferentes.', formula: 'CV = (s / x) * 100%', interpretation: '< 15% baixa | 15-30% moderada | > 30% alta variabilidade.' },
    min: { key: 'min', label: 'Minimo', shortLabel: 'Min', description: 'Menor valor observado.' },
    max: { key: 'max', label: 'Maximo', shortLabel: 'Max', description: 'Maior valor observado.' },
    range: { key: 'range', label: 'Amplitude', shortLabel: 'Amp.', description: 'Diferenca entre o maior e o menor valor.', formula: 'Amplitude = Max - Min' },
    q1: { key: 'q1', label: 'Primeiro Quartil (Q1)', shortLabel: 'Q1', description: '25% dos dados estao abaixo deste valor.', interpretation: 'Percentil 25.' },
    q3: { key: 'q3', label: 'Terceiro Quartil (Q3)', shortLabel: 'Q3', description: '75% dos dados estao abaixo deste valor.', interpretation: 'Percentil 75.' },
    iqr: { key: 'iqr', label: 'Intervalo Interquartil', shortLabel: 'IQR', description: 'Faixa que contem os 50% centrais dos dados.', formula: 'IQR = Q3 - Q1', interpretation: 'Usado para detectar outliers.' },
    p5: { key: 'p5', label: 'Percentil 5', shortLabel: 'P5', description: '5% dos dados estao abaixo deste valor.' },
    p10: { key: 'p10', label: 'Percentil 10', shortLabel: 'P10', description: '10% dos dados estao abaixo deste valor.' },
    p90: { key: 'p90', label: 'Percentil 90', shortLabel: 'P90', description: '90% dos dados estao abaixo deste valor.' },
    p95: { key: 'p95', label: 'Percentil 95', shortLabel: 'P95', description: '95% dos dados estao abaixo deste valor.' },
    skewness: { key: 'skewness', label: 'Assimetria (Skewness)', shortLabel: 'Assim.', description: 'Mede o quanto a distribuicao desvia da simetria.', interpretation: '~0: simetrica | > 0: cauda a direita | < 0: cauda a esquerda.' },
    kurtosis: { key: 'kurtosis', label: 'Curtose (Kurtosis)', shortLabel: 'Curt.', description: 'Mede o achatamento da distribuicao.', interpretation: '> 0: mais pontiaguda | < 0: mais achatada que a normal.' },
    ci_lower: { key: 'ci_lower', label: 'IC 95% Inferior', shortLabel: 'IC Inf', description: 'Limite inferior do intervalo de confianca de 95% para a media.' },
    ci_upper: { key: 'ci_upper', label: 'IC 95% Superior', shortLabel: 'IC Sup', description: 'Limite superior do intervalo de confianca de 95% para a media.' },
    sum: { key: 'sum', label: 'Soma', shortLabel: 'Soma', description: 'Soma de todos os valores.' },
    count: { key: 'count', label: 'Contagem (N)', shortLabel: 'N', description: 'Numero total de observacoes.' },
    missing_count: { key: 'missing_count', label: 'Ausentes', shortLabel: 'Aus.', description: 'Numero de valores ausentes (NaN/vazio).' },
    missing_pct: { key: 'missing_pct', label: '% Ausentes', shortLabel: '% Aus.', description: 'Percentual de valores ausentes.' },
};

export type StatPreset = 'basico' | 'completo' | 'spss' | 'industrial';

export const STAT_PRESETS: Record<StatPreset, { label: string; stats: string[] }> = {
    basico: {
        label: 'Basico',
        stats: ['mean', 'median', 'std', 'min', 'max', 'count', 'missing_count'],
    },
    completo: {
        label: 'Completo',
        stats: Object.keys(STAT_TOOLTIPS),
    },
    spss: {
        label: 'SPSS',
        stats: ['mean', 'sem', 'median', 'mode', 'std', 'variance', 'skewness', 'kurtosis', 'min', 'max', 'q1', 'q3', 'count'],
    },
    industrial: {
        label: 'Industrial',
        stats: ['mean', 'std', 'cv', 'min', 'max', 'p5', 'p95', 'range', 'count'],
    },
};

// Stat categories for the selector panel
export const STAT_CATEGORIES = [
    { label: 'Tendencia Central', stats: ['mean', 'median', 'mode'] },
    { label: 'Dispersao', stats: ['std', 'variance', 'cv', 'sem', 'range', 'iqr'] },
    { label: 'Posicao', stats: ['min', 'max', 'q1', 'q3', 'p5', 'p10', 'p90', 'p95'] },
    { label: 'Forma', stats: ['skewness', 'kurtosis'] },
    { label: 'Inferencia', stats: ['ci_lower', 'ci_upper', 'sum'] },
    { label: 'Dados', stats: ['count', 'missing_count', 'missing_pct'] },
];
