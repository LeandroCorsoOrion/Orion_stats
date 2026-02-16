import { STAT_TOOLTIPS } from '@/lib/statTooltips';

export type HelpTopic = {
    id: string;
    title: string;
    aliases: string[];
    body: string; // Markdown-lite: **bold** + newlines. Rendered by OrionAI.
    related?: string[];
};

function normalizeText(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function scoreMatch(query: string, topic: HelpTopic): number {
    const q = normalizeText(query);
    if (!q) return 0;

    const haystack = [topic.title, ...topic.aliases].map(normalizeText).join(' ');

    // Strong match: exact ID mention.
    if (q === normalizeText(topic.id) || q.includes(normalizeText(topic.id))) return 100;

    // Token overlap score.
    const tokens = q.split(' ').filter(Boolean);
    let score = 0;
    for (const t of tokens) {
        if (t.length <= 2) continue;
        if (haystack.includes(t)) score += 3;
    }

    // Phrase contains.
    if (haystack.includes(q)) score += 10;
    return score;
}

export function findHelpTopic(query: string, topics: HelpTopic[]) {
    const ranked = topics
        .map((t) => ({ t, s: scoreMatch(query, t) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s);

    return {
        best: ranked[0]?.t || null,
        suggestions: ranked.slice(0, 5).map((x) => x.t),
    };
}

const BASE_TOPICS: HelpTopic[] = [
    {
        id: 'getting_started',
        title: 'Como Usar a Plataforma (Passo a Passo)',
        aliases: ['como usar', 'passo a passo', 'guia', 'primeiros passos', 'ajuda geral'],
        body:
            '**Fluxo rapido (para zero conhecimento):**\n' +
            '1) Va em **Dataset** e faca upload do Excel.\n' +
            '2) Confira os tipos de variavel (categorica/discreta/continua).\n' +
            '3) Use **Estatisticas** para entender o comportamento dos dados.\n' +
            '4) Use **Correlacao** para ver relacoes lineares.\n' +
            '5) Use **Modelagem** para treinar e simular previsoes.\n' +
            '6) Clique em **Transformar em Projeto** para operacionalizar o modelo.\n\n' +
            '**Dica:** se aplicar filtros, a amostra muda e os resultados mudam.',
        related: ['variable_types', 'filters', 'projects_overview'],
    },
    {
        id: 'variable_types',
        title: 'Tipos de Variavel (Categorica, Discreta, Continua)',
        aliases: ['tipo de variavel', 'categorica', 'discreta', 'continua', 'var_type'],
        body:
            '**Categorica:** valores em categorias (ex: Cliente, Estado, Tipo). Normalmente vira filtro, crosstab e grupos.\n' +
            '**Discreta:** numeros que representam contagens/valores inteiros (ex: quantidade). Pode ser tratada como numero.\n' +
            '**Continua:** numeros em escala continua (ex: peso, temperatura, rendimento). Usada em media, desvio, correlacao e ML.\n\n' +
            '**Por que isso importa?**\n' +
            '- Se voce marcar errado, pode gerar analises confusas (ex: tratar um codigo como numero).\n' +
            '- Em ML, variaveis categoricas viram selecao (uma lista) e nao um numero direto.',
        related: ['filters', 'descriptive_stats_overview', 'ml_overview'],
    },
    {
        id: 'unique_values',
        title: 'Valores Unicos (o que significa "Unicos")',
        aliases: ['unicos', 'valores unicos', 'unique', 'unique_count'],
        body:
            '**Unicos** e quantos valores diferentes existem em uma coluna.\n\n' +
            '**Para que serve:**\n' +
            '- ajuda a perceber se a coluna e categorica (poucos valores) ou continua (muitos valores).\n' +
            '- ajuda a identificar "codigo" (muitos unicos) que nao deve ser tratado como categoria.\n\n' +
            '**Dica:** se quase todo valor e unico, normalmente nao e bom usar como grupo/filtro.',
        related: ['variable_types', 'filters'],
    },
    {
        id: 'data_type',
        title: 'Tipo de Dado (dtype)',
        aliases: ['dtype', 'tipo de dado', 'texto', 'numero', 'data'],
        body:
            '**Tipo de dado** e como o arquivo representa a coluna (texto, numero, data).\n\n' +
            '**Por que importa:**\n' +
            '- se uma coluna numerica veio como texto, estatisticas e ML podem falhar.\n' +
            '- datas podem precisar de tratamento antes de modelagem.\n\n' +
            '**Dica:** se algo parece numero mas esta como texto, revise o Excel (virgula/ponto, espacos, etc.).',
        related: ['variable_types'],
    },
    {
        id: 'filters',
        title: 'Filtros (o que fazem e como afetam os resultados)',
        aliases: ['filtro', 'filtrar', 'segmentar', 'amostra', 'subset'],
        body:
            '**O que e:** filtrar significa analisar apenas uma parte do dataset (ex: apenas um cliente ou periodo).\n\n' +
            '**Como afeta:**\n' +
            '- Reduz ou altera a amostra (N).\n' +
            '- Pode mudar medias, correlacoes e modelos.\n' +
            '- Se N ficar pequeno, os resultados ficam instaveis.\n\n' +
            '**Regra pratica:** quanto menor o N, mais cuidado na interpretacao.',
        related: ['sample_size', 'p_value', 'confidence_interval'],
    },
    {
        id: 'sample_size',
        title: 'Tamanho da Amostra (N) e Confiabilidade',
        aliases: ['n', 'amostra', 'tamanho da amostra', 'quantidade de dados'],
        body:
            '**N (amostra)** e quantos registros entraram no calculo.\n\n' +
            '**Quanto maior o N:**\n' +
            '- mais estavel fica a media, o desvio e a correlacao;\n' +
            '- intervalos de confianca tendem a ficar menores.\n\n' +
            '**Quanto menor o N:**\n' +
            '- uma mudanca pequena nos dados pode mudar muito o resultado;\n' +
            '- testes podem nao detectar diferencas reais (baixa potencia).',
        related: ['confidence_interval', 'p_value'],
    },
    {
        id: 'missing_values',
        title: 'Valores Ausentes (NaN) e a opcao "Tratar como 0"',
        aliases: ['ausentes', 'missing', 'nan', 'tratar como 0', 'valores ausentes como 0'],
        body:
            '**O que e:** valor ausente e um campo vazio/NaN.\n\n' +
            '**Tratar ausentes como 0** significa substituir vazio por 0 (ou "MISSING" em categoricas) antes de calcular/treinar.\n\n' +
            '**Quando faz sentido:**\n' +
            '- quando vazio realmente significa "zero" (ex: quantidade nao informada mas que e 0).\n\n' +
            '**Quando e perigoso:**\n' +
            '- quando vazio significa "desconhecido" (ai 0 distorce media, desvio e modelos).\n\n' +
            '**Dica:** se tiver muitos ausentes, considere revisar a origem do dado.',
        related: ['descriptive_stats_overview', 'ml_overview'],
    },
    {
        id: 'descriptive_stats_overview',
        title: 'Estatisticas Descritivas (o que sao e para que servem)',
        aliases: ['estatisticas descritivas', 'descritivas', 'resumo dos dados'],
        body:
            '**Objetivo:** resumir uma coluna em poucos numeros para entender o comportamento.\n\n' +
            '**Exemplos:**\n' +
            '- Media/Mediana: valor tipico.\n' +
            '- Desvio padrao/IQR: variacao.\n' +
            '- Percentis: limites (P5, P95).\n' +
            '- IC: faixa de incerteza da media.\n\n' +
            '**Use quando:** voce quer responder "como esta esse indicador?" e "ele varia muito?".',
        related: ['confidence_interval', 'missing_values'],
    },
    {
        id: 'group_by',
        title: 'Agrupar Por (comparar categorias)',
        aliases: ['agrupar', 'agrupar por', 'group by', 'grupos', 'comparar grupos'],
        body:
            '**O que faz:** divide o calculo por categorias (ex: Cliente, Turno, Produto).\n\n' +
            '**Exemplo:** "media de rendimento por cliente".\n\n' +
            '**Quando usar:** quando voce quer comparar desempenhos entre categorias.\n\n' +
            '**Cuidado:** se voce filtrar a mesma coluna que esta agrupando, pode sobrar 1 grupo e perder comparacao.',
        related: ['filters', 'statistical_significance'],
    },
    {
        id: 'comparison_tests',
        title: 'Testes Comparativos entre Grupos (p-valor + efeito)',
        aliases: ['testes comparativos', 'comparacao entre grupos', 'grupo significativo'],
        body:
            '**O que faz:** quando voce agrupa, a plataforma pode testar se os grupos diferem de forma estatistica.\n\n' +
            '**Como ler:**\n' +
            '- p-valor -> evidencia de diferenca.\n' +
            '- tamanho de efeito -> se a diferenca e pequena/medio/grande.\n\n' +
            '**Dica:** diferenca significativa com efeito pequeno pode nao justificar mudanca na pratica.',
        related: ['p_value', 'effect_size', 'group_by'],
    },
    {
        id: 'p_value',
        title: 'p-valor (p-value)',
        aliases: ['p valor', 'pvalue', 'p-value', 'valor p'],
        body:
            '**O que e (bem simples):** e um numero que mostra o quao estranho seria ver um resultado como o seu **se nao existisse efeito/diferenca**.\n\n' +
            '**Como ler:**\n' +
            '- p pequeno (ex: < 0.05) -> evidencia contra H0 (o "nao ha diferenca/relacao").\n' +
            '- p grande -> nao temos evidencia suficiente para dizer que ha diferenca.\n\n' +
            '**O que NAO e:**\n' +
            '- nao e "probabilidade da hipotese ser verdadeira".\n' +
            '- nao mede o tamanho do efeito.\n\n' +
            '**Regra de ouro:** olhe p-valor + tamanho de efeito + contexto.',
        related: ['statistical_significance', 'effect_size'],
    },
    {
        id: 'statistical_significance',
        title: 'Significancia (o que significa "significativo")',
        aliases: ['significancia', 'significativo', 'nao significativo', 'alpha', 'nivel de significancia'],
        body:
            '**Significativo** normalmente quer dizer: **p <= 0.05** (convencao).\n\n' +
            '**Interpretacao correta:**\n' +
            '- "Os dados sao pouco compativeis com a hipotese de nao haver diferenca (H0)".\n\n' +
            '**Erros comuns:**\n' +
            '- Achar que "significativo" = "importante na pratica".\n' +
            '- Ignorar o tamanho de efeito.\n\n' +
            '**Dica:** um resultado pode ser significativo e ainda assim ter efeito pequeno.',
        related: ['p_value', 'effect_size'],
    },
    {
        id: 'confidence_interval',
        title: 'Intervalo de Confianca (IC 95%)',
        aliases: ['intervalo de confianca', 'ic', 'ic 95', 'confidence interval'],
        body:
            '**O que e:** uma faixa de valores plausiveis para o valor real (ex: media real).\n\n' +
            '**IC 95% (interpretacao pratica):** se repetirmos o mesmo processo varias vezes, cerca de 95% dos ICs gerados conteriam o valor real.\n\n' +
            '**Como usar:**\n' +
            '- IC estreito -> estimativa mais precisa.\n' +
            '- IC largo -> estimativa incerta (geralmente N pequeno ou variacao alta).\n\n' +
            '**O que NAO significa:** "ha 95% de chance do valor real estar dentro deste IC".',
        related: ['sample_size'],
    },
    {
        id: 'effect_size',
        title: 'Tamanho de Efeito (por que importa)',
        aliases: ['tamanho de efeito', 'effect size', 'cohen', 'eta', 'epsilon', 'cramer'],
        body:
            '**O que e:** mede o quao grande e a diferenca/relacao na pratica.\n\n' +
            '**Por que importa:**\n' +
            '- p-valor responde "e provavel que seja sorte?".\n' +
            '- tamanho de efeito responde "isso e grande o suficiente para importar?".\n\n' +
            '**Na plataforma:**\n' +
            '- d de Cohen (2 grupos)\n' +
            '- eta² / epsilon² (3+ grupos)\n' +
            '- V de Cramer (crosstab)\n\n' +
            '**Dica:** use as etiquetas (pequeno/medio/grande) como guia, nao como lei.',
        related: ['p_value'],
    },
    {
        id: 'normality_tests_overview',
        title: 'Normalidade (o que e e por que checar)',
        aliases: ['normalidade', 'shapiro', 'kolmogorov', 'dagostino', 'normal test'],
        body:
            '**Normalidade** significa: os dados se parecem com uma "curva normal".\n\n' +
            '**Por que importa:** muitos testes (como t-test/ANOVA) assumem normalidade (principalmente em amostras pequenas).\n\n' +
            '**Como interpretar:**\n' +
            '- p > 0.05 -> nao encontramos evidencias fortes contra normalidade.\n' +
            '- p <= 0.05 -> evidencias de que nao e normal.\n\n' +
            '**Dica:** em amostras grandes, ate desvios pequenos podem dar p pequeno. Use tambem graficos e contexto.',
        related: ['p_value'],
    },
    {
        id: 'hypothesis_tests_overview',
        title: 'Testes de Hipotese (o que sao e quando usar)',
        aliases: ['teste de hipotese', 'hipotese', 'h0', 'ha', 'teste t', 'anova'],
        body:
            '**Objetivo:** responder perguntas do tipo:\n' +
            '- "A media e diferente de um valor?"\n' +
            '- "Dois grupos sao diferentes?"\n' +
            '- "3 ou mais grupos sao diferentes?"\n\n' +
            '**Como ler o resultado:**\n' +
            '- p-valor (evidencia)\n' +
            '- decisao (rejeitar ou nao H0)\n' +
            '- tamanho de efeito (importancia pratica)\n' +
            '- IC (precisao)\n\n' +
            '**Dica:** escolha o teste pelo seu cenario (1 amostra, 2 grupos, 3+ grupos, pareado).',
        related: ['p_value', 'effect_size', 'confidence_interval'],
    },
    {
        id: 'test_statistic',
        title: 'Estatistica do Teste (t, F, X², U, W...)',
        aliases: ['estatistica', 'estatistica do teste', 't', 'f', 'x2', 'chi2', 'u', 'w'],
        body:
            '**O que e:** um numero calculado a partir dos seus dados que resume "o quao longe" o resultado esta do que seria esperado se nao houvesse efeito (H0).\n\n' +
            '**Por que aparece:** cada teste tem sua propria estatistica (ex: t, F, X²).\n\n' +
            '**Como interpretar:** normalmente, quanto mais longe do valor esperado em H0, menor tende a ser o p-valor.\n\n' +
            '**Dica:** para leigos, geralmente p-valor + efeito sao mais faceis de usar que a estatistica em si.',
        related: ['p_value', 'hypothesis_tests_overview'],
    },
    {
        id: 'h0_ha',
        title: 'H0 e HA (o que significa "Rejeitar H0")',
        aliases: ['h0', 'ha', 'hipotese nula', 'hipotese alternativa', 'rejeitar h0', 'nao rejeitar h0'],
        body:
            '**H0 (hipotese nula):** "nao ha diferenca/efeito".\n' +
            '**HA (alternativa):** "existe diferenca/efeito".\n\n' +
            '**Rejeitar H0:** os dados sugerem diferenca (p pequeno).\n' +
            '**Nao rejeitar H0:** nao encontramos evidencia suficiente (p grande).\n\n' +
            '**Importante:** "nao rejeitar" nao prova que H0 e verdadeira; pode faltar dados ou potencia.',
        related: ['p_value', 'sample_size'],
    },
    {
        id: 'test_one_sample_t',
        title: 'Teste t (1 amostra)',
        aliases: ['teste t 1 amostra', 'one sample t', 'ttest_1samp', 'comparar com valor', 'valor de referencia'],
        body:
            '**Quando usar:** quando voce quer comparar a media de uma coluna com um valor fixo.\n\n' +
            '**Exemplo:** "A media de rendimento e diferente de 50?"\n\n' +
            '**Como ler:**\n' +
            '- p-valor: evidencia de diferenca.\n' +
            '- IC: faixa plausivel para a media.\n' +
            '- d de Cohen: tamanho da diferenca (efeito).',
        related: ['p_value', 'confidence_interval', 'effect_size'],
    },
    {
        id: 'test_independent_t',
        title: 'Teste t independente (2 grupos)',
        aliases: ['teste t independente', 'welch', 'ttest_ind', '2 grupos', 'comparar medias de dois grupos'],
        body:
            '**Quando usar:** quando voce tem 2 grupos independentes (ex: Turno A vs Turno B) e quer comparar a media.\n\n' +
            '**Suposicoes:** grupos independentes e dados razoavelmente "normais" (principalmente com N pequeno).\n\n' +
            '**Se normalidade falhar:** considere Mann-Whitney.\n\n' +
            '**Leia junto:** p-valor (evidencia) + d de Cohen (tamanho do efeito).',
        related: ['normality_tests_overview', 'p_value', 'effect_size'],
    },
    {
        id: 'test_mann_whitney',
        title: 'Mann-Whitney U (2 grupos, nao parametrico)',
        aliases: ['mann whitney', 'mann-whitney', 'nao parametrico 2 grupos', 'comparar mediana', 'rank'],
        body:
            '**Quando usar:** 2 grupos, mas os dados nao parecem normais ou tem outliers fortes.\n\n' +
            '**O que ele faz:** compara distribuicoes pelos ranks (ordens), sem assumir normalidade.\n\n' +
            '**Como ler:** p-valor diz se ha diferenca; tamanho de efeito ajuda a ver se importa.',
        related: ['p_value', 'effect_size'],
    },
    {
        id: 'test_one_way_anova',
        title: 'ANOVA one-way (3+ grupos)',
        aliases: ['anova', 'one way anova', '3 grupos', 'comparar medias 3 ou mais'],
        body:
            '**Quando usar:** quando voce tem 3 ou mais grupos (ex: 3 clientes) e quer saber se alguma media difere.\n\n' +
            '**Importante:** se ANOVA der significativo, ela indica "existe diferenca em algum lugar", mas nao diz entre quais pares.\n\n' +
            '**Na plataforma:** mostramos p-valor e eta² (tamanho de efeito).',
        related: ['p_value', 'effect_size'],
    },
    {
        id: 'test_kruskal_wallis',
        title: 'Kruskal-Wallis (3+ grupos, nao parametrico)',
        aliases: ['kruskal', 'kruskal wallis', 'nao parametrico 3 grupos', 'rank 3 grupos'],
        body:
            '**Quando usar:** 3 ou mais grupos, sem assumir normalidade.\n\n' +
            '**Como ler:** p-valor indica se ha diferenca entre grupos.\n' +
            '**Tamanho de efeito:** epsilon² ajuda a quantificar a forca da diferenca.',
        related: ['p_value', 'effect_size'],
    },
    {
        id: 'test_paired_t',
        title: 'Teste t pareado (2 medidas relacionadas)',
        aliases: ['t pareado', 'paired t', 'antes e depois', 'mesma amostra'],
        body:
            '**Quando usar:** quando as duas colunas sao medidas do mesmo item/pessoa (antes/depois, entrada/saida).\n\n' +
            '**Ideia:** o teste olha para as diferencas par a par.\n\n' +
            '**Leia junto:** p-valor + d de Cohen (efeito).',
        related: ['p_value', 'effect_size'],
    },
    {
        id: 'test_wilcoxon',
        title: 'Wilcoxon signed-rank (pareado, nao parametrico)',
        aliases: ['wilcoxon', 'signed rank', 'pareado nao parametrico'],
        body:
            '**Quando usar:** dados pareados (antes/depois), mas sem assumir normalidade.\n\n' +
            '**Como ler:** p-valor indica se ha diferenca consistente entre as duas medidas.',
        related: ['p_value'],
    },
    {
        id: 'frequency_table',
        title: 'Tabela de Frequencias (contagem e porcentagem)',
        aliases: ['frequencia', 'tabela de frequencias', 'percentual acumulado', 'cumulative'],
        body:
            '**O que mostra:** quantas vezes cada valor aparece.\n\n' +
            '**Colunas:**\n' +
            '- Frequencia: contagem.\n' +
            '- %: contagem / total.\n' +
            '- % acumulado: soma das porcentagens ate aquele valor.\n\n' +
            '**Use quando:** voce quer entender distribuicao de categorias (ex: quais clientes sao mais comuns).',
        related: ['filters', 'sample_size'],
    },
    {
        id: 'chi_square_independence',
        title: 'Qui-Quadrado (Independencia em Crosstab)',
        aliases: ['qui quadrado', 'chi-square', 'chi square', 'independencia', 'associacao'],
        body:
            '**O que testa:** se duas variaveis categoricas sao independentes (sem relacao) ou associadas.\n\n' +
            '**Como ler:**\n' +
            '- p <= 0.05 -> evidencia de associacao (nao-independencia).\n' +
            '- p > 0.05 -> nao encontramos evidencia de associacao.\n\n' +
            '**Importante:** com amostra muito grande, associacoes pequenas podem dar p pequeno.\n' +
            'Por isso existe o **V de Cramer** (tamanho de efeito).',
        related: ['cramers_v', 'p_value'],
    },
    {
        id: 'cramers_v',
        title: 'V de Cramer (forca de associacao no Crosstab)',
        aliases: ['v de cramer', 'cramer', 'cramers v'],
        body:
            '**O que e:** um tamanho de efeito para tabelas cruzadas (0 a 1).\n\n' +
            '**Como ler (regra pratica):**\n' +
            '- < 0.10: associacao fraca\n' +
            '- 0.10 a 0.30: moderada\n' +
            '- > 0.30: forte\n\n' +
            '**Dica:** V alto + p pequeno = associacao clara. V baixo + p pequeno = associacao existe, mas e fraca.',
        related: ['chi_square_independence', 'effect_size'],
    },
    {
        id: 'pearson_correlation',
        title: 'Correlacao de Pearson (r)',
        aliases: ['correlacao', 'pearson', 'r', 'matriz de correlacao'],
        body:
            '**O que e:** mede relacao linear entre duas variaveis continuas (vai de -1 a +1).\n\n' +
            '**Como ler:**\n' +
            '- +1: sobem juntas (forte positiva)\n' +
            '- -1: uma sobe e a outra desce (forte negativa)\n' +
            '- 0: sem relacao linear clara\n\n' +
            '**Atenção:** correlacao nao prova causa.\n' +
            '**Dica:** correlacao fica mais instavel quando N e pequeno.',
        related: ['sample_size'],
    },
    {
        id: 'ml_overview',
        title: 'Modelagem / Machine Learning (o que acontece no treino)',
        aliases: ['modelagem', 'machine learning', 'ml', 'treinar', 'features', 'alvo'],
        body:
            '**Alvo (Y):** o que voce quer prever.\n' +
            '**Features (X):** informacoes que entram no modelo.\n\n' +
            '**O que o treino faz:**\n' +
            '- separa parte dos dados para testar (avaliar generalizacao).\n' +
            '- treina varios modelos e compara metricas.\n\n' +
            '**Dica:** se voce usar filtros, o modelo aprende apenas naquele recorte.',
        related: ['r2', 'rmse', 'mae', 'projects_overview'],
    },
    {
        id: 'features_x',
        title: 'Features (X) / Variaveis de Entrada',
        aliases: ['features', 'variaveis x', 'x', 'variavel explicativa', 'variaveis explicativas', 'inputs do modelo'],
        body:
            '**Features (X)** sao as colunas que voce usa para prever o alvo (Y).\n\n' +
            '**Pense assim:**\n' +
            '- Y = o que voce quer prever.\n' +
            '- X = as pistas/informacoes que ajudam a prever.\n\n' +
            '**Na pratica:**\n' +
            '- Em um **Projeto**, as features viram os campos do formulario e do payload da API.\n' +
            '- Se uma feature estiver errada (tipo ou valores), o modelo pode prever mal.',
        related: ['ml_overview', 'projects_overview', 'variable_types'],
    },
    {
        id: 'linear_regression_overview',
        title: 'Regressao Linear (equacao e coeficientes)',
        aliases: ['regressao linear', 'ols', 'equacao', 'coeficientes', 'intercepto'],
        body:
            '**O que e:** um modelo simples que tenta explicar o Y como uma soma de (coeficiente × X).\n\n' +
            '**O que voce ve na tela:**\n' +
            '- Equacao: um resumo do modelo.\n' +
            '- Coeficientes: quanto cada X "puxa" o Y para cima/baixo.\n' +
            '- p-valor por coeficiente: evidencia de que aquele coeficiente difere de 0.\n\n' +
            '**Dica:** a regressao linear ajuda a entender direcao/impacto, mas nem sempre e o melhor preditor.',
        related: ['p_value', 'r2'],
    },
    {
        id: 'regression_intercept',
        title: 'Intercepto (na regressao)',
        aliases: ['intercepto', 'constante', 'baseline'],
        body:
            '**Intercepto** e o valor que o modelo "comeca" quando todas as variaveis X estao em 0.\n\n' +
            '**Quando faz sentido:**\n' +
            '- Se X=0 e um cenario possivel, o intercepto vira um ponto de partida.\n\n' +
            '**Cuidado:**\n' +
            '- Se X=0 nao faz sentido (ex: temperatura nunca e 0), o intercepto pode nao ter interpretacao pratica.\n' +
            '- O importante costuma ser a combinacao: intercepto + (coeficientes x valores de X).',
        related: ['linear_regression_overview'],
    },
    {
        id: 'regression_coefficient',
        title: 'Coeficiente (na regressao)',
        aliases: ['coeficiente', 'beta', 'peso da variavel', 'impacto'],
        body:
            '**Coeficiente** diz quanto o Y muda quando a variavel X aumenta 1 unidade (mantendo as outras iguais).\n\n' +
            '**Sinal:**\n' +
            '- positivo -> X maior tende a aumentar Y.\n' +
            '- negativo -> X maior tende a reduzir Y.\n\n' +
            '**Cuidado:** se X estiver em escala diferente (ex: kg vs gramas), o coeficiente muda de tamanho.',
        related: ['linear_regression_overview'],
    },
    {
        id: 'regression_standard_error',
        title: 'Erro Padrao (do coeficiente)',
        aliases: ['erro padrao', 'standard error', 'std error', 'std_error', 'incerteza do coeficiente'],
        body:
            '**Erro padrao** (do coeficiente) mede a incerteza do coeficiente estimado.\n\n' +
            '**Ideia simples:**\n' +
            '- erro padrao pequeno -> coeficiente mais "confiavel" (mais preciso).\n' +
            '- erro padrao grande -> coeficiente mais instavel (muda mais se os dados mudarem).\n\n' +
            '**Na regressao:** ele entra no calculo do t-valor e do p-valor do coeficiente.',
        related: ['t_value', 'p_value', 'regression_coefficient'],
    },
    {
        id: 't_value',
        title: 't-valor (na regressao)',
        aliases: ['t-valor', 't value', 'estatistica t', 't statistic'],
        body:
            '**t-valor** e uma estatistica usada para calcular o p-valor do coeficiente.\n\n' +
            '**Ideia simples:** quanto maior o |t|, mais evidencia de que o coeficiente nao e zero (tende a dar p menor).\n\n' +
            '**Para leigos:** foque no p-valor e na direcao do coeficiente.',
        related: ['p_value', 'regression_coefficient'],
    },
    {
        id: 'metric_selection',
        title: 'Metrica de Selecao (RMSE, MAE, R²)',
        aliases: ['metrica', 'selecao', 'rmse ou mae', 'r2 ou rmse', 'escolher metrica'],
        body:
            '**Para escolher o melhor modelo, voce escolhe uma metrica:**\n' +
            '- **RMSE:** penaliza mais erros grandes (bom quando erro grande e muito ruim).\n' +
            '- **MAE:** media do erro absoluto (mais interpretavel e robusto).\n' +
            '- **R²:** porcentagem de variacao explicada (bom para comparacao, mas cuidado em alguns casos).\n\n' +
            '**Regra pratica:** se voce quer "errar pouco" na unidade do alvo, use RMSE/MAE.',
        related: ['rmse', 'mae', 'r2'],
    },
    {
        id: 'r2',
        title: 'R² (coeficiente de determinacao)',
        aliases: ['r2', 'r quadrado', 'coeficiente de determinacao'],
        body:
            '**O que e:** quanto da variacao do Y o modelo explica (0 a 1).\n\n' +
            '**Exemplo:** R² = 0.80 -> cerca de 80% da variacao do Y e explicada.\n\n' +
            '**Cuidado:**\n' +
            '- R² alto nao garante previsao boa fora do padrao.\n' +
            '- compare com RMSE/MAE para entender erro em unidades reais.',
        related: ['rmse', 'mae'],
    },
    {
        id: 'rmse',
        title: 'RMSE (Root Mean Squared Error)',
        aliases: ['rmse', 'erro quadratico medio', 'root mean squared error'],
        body:
            '**O que e:** tamanho medio do erro do modelo (na mesma unidade do Y).\n\n' +
            '**Como ler:** quanto menor, melhor.\n' +
            '**Dica:** RMSE penaliza mais erros grandes.',
        related: ['mae', 'metric_selection'],
    },
    {
        id: 'mae',
        title: 'MAE (Mean Absolute Error)',
        aliases: ['mae', 'erro absoluto medio', 'mean absolute error'],
        body:
            '**O que e:** media do erro absoluto (na mesma unidade do Y).\n\n' +
            '**Como ler:** quanto menor, melhor.\n' +
            '**Dica:** MAE e mais "direto" e menos sensivel a poucos erros muito grandes.',
        related: ['rmse', 'metric_selection'],
    },
    {
        id: 'mape',
        title: 'MAPE (erro percentual medio)',
        aliases: ['mape', 'erro percentual', 'percentual medio'],
        body:
            '**O que e:** erro medio em percentual.\n\n' +
            '**Cuidado:** se o Y pode ser 0, MAPE pode ficar instavel (divide por zero).\n' +
            '**Use quando:** faz sentido comparar erro relativo em %.',
        related: ['rmse', 'mae'],
    },
    {
        id: 'projects_overview',
        title: 'Projetos Operacionais (operacionalizar um modelo)',
        aliases: ['projeto', 'operacionalizar', 'deploy', 'endpoint', 'playground'],
        body:
            '**O que e um Projeto:** um pacote operacional do seu modelo.\n\n' +
            '**O que ele guarda:**\n' +
            '- dataset + alvo (Y) + features (X)\n' +
            '- modelo escolhido\n' +
            '- schema de inputs (os campos que voce precisa preencher)\n' +
            '- endpoint de previsao e historico de execucoes\n\n' +
            '**Por que e bom:** voce para de "refazer analise" e passa a ter uma aplicacao reutilizavel.',
        related: ['ml_overview'],
    },
    {
        id: 'project_runs_overview',
        title: 'Historico / Auditoria de Previsoes (Runs)',
        aliases: ['historico', 'auditoria', 'runs', 'execucoes', 'log de previsao', 'monitoramento'],
        body:
            '**O que e:** cada vez que voce clica em **Prever** em um Projeto, a plataforma salva um registro (um "run").\n\n' +
            '**O que aparece no historico:**\n' +
            '- quando foi executado\n' +
            '- valor previsto\n' +
            '- erro esperado (uma referencia de incerteza)\n' +
            '- qual modelo foi usado\n' +
            '- quais inputs foram enviados (JSON)\n\n' +
            '**Por que isso chama a atencao (valor real):**\n' +
            '- permite auditoria e rastreabilidade\n' +
            '- ajuda a comparar previsoes ao longo do tempo\n' +
            '- facilita integracao (voce consegue copiar o JSON exato)',
        related: ['projects_overview', 'rmse'],
    },
    {
        id: 'scenarios_vs_projects',
        title: 'Cenarios x Projetos (qual a diferenca?)',
        aliases: ['cenario', 'cenarios', 'cenario vs projeto', 'diferenca cenario projeto'],
        body:
            '**Cenario:** salva o estado da analise (filtros, variaveis, relatorio, modelo treinado daquele momento).\n' +
            'Use para voltar rapidamente a uma configuracao.\n\n' +
            '**Projeto:** transforma um modelo em uma aplicacao operacional (inputs definidos + endpoint + playground + historico).\n' +
            'Use quando voce quer previsao recorrente e integracao.\n\n' +
            '**Resumo:** cenario = lembrar configuracao. projeto = colocar em producao/operar.',
        related: ['projects_overview', 'getting_started'],
    },
];

function buildStatTopics(): HelpTopic[] {
    return Object.values(STAT_TOOLTIPS).map((s) => {
        const title = `${s.shortLabel} (${s.label})`;
        const bodyParts: string[] = [];
        bodyParts.push(`**O que e:** ${s.description}`);
        if (s.formula) bodyParts.push(`**Formula (resumo):** ${s.formula}`);
        if (s.interpretation) bodyParts.push(`**Como interpretar:** ${s.interpretation}`);

        return {
            id: `stat.${s.key}`,
            title,
            aliases: [
                s.key,
                s.shortLabel,
                s.label,
                `o que e ${s.shortLabel}`,
                `o que e ${s.label}`,
            ],
            body: bodyParts.join('\n'),
            related: ['descriptive_stats_overview'],
        };
    });
}

export const HELP_TOPICS: HelpTopic[] = [
    ...BASE_TOPICS,
    ...buildStatTopics(),
];
