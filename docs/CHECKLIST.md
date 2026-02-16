# Orion Analytics - Checklist (Funcionalidades + Pronto Para EC2)

## Checklist de Funcionalidades (Produto)
- [ ] Dataset: upload de XLSX funciona (arquivo pequeno e arquivo grande)
- [ ] Dataset: preview/paginacao funciona
- [ ] Dataset: tipos de variavel (categorica/discreta/continua) detectados e editaveis
- [ ] Dataset: unique values funciona para colunas categoricas
- [ ] Estatisticas: descritivas calculam corretamente com e sem filtros
- [ ] Estatisticas: presets (Basico/Completo/SPSS/Industrial) funcionam
- [ ] Estatisticas: "Tratar ausentes como 0" tem impacto esperado e esta bem explicado
- [ ] Estatisticas: Agrupar Por (group-by) funciona e o usuario entende o resultado
- [ ] Estatisticas: Testes comparativos (p-valor + efeito) aparecem quando fizer sentido
- [ ] Normalidade: testes e interpretacao aparecem com explicacao para leigos
- [ ] Hipoteses: 1 amostra / 2 grupos / 3+ grupos / pareado funcionam e estao explicados
- [ ] Frequencias: tabela (freq, %, % acumulado) funciona
- [ ] Crosstab: qui-quadrado + V de Cramer funciona e esta explicado
- [ ] Correlacao: matriz de Pearson funciona (minimo 2 variaveis)
- [ ] Modelagem: treino (5 modelos) funciona e compara metricas
- [ ] Modelagem: regressao linear mostra equacao, coeficientes e termos (erro padrao, t, p)
- [ ] Simulacao: formulario de inputs gera previsao
- [ ] Projetos: "Transformar em Projeto" cria projeto operacional
- [ ] Projetos: playground do projeto funciona (prever)
- [ ] Projetos: historico/auditoria (runs) registra e exibe execucoes
- [ ] Cenarios: salvar e carregar cenario funciona
- [ ] Exportacao: excel/word (quando habilitado) funciona e nao quebra com filtros

## Checklist de UX Para Leigos (Onboarding)
- [ ] Existe um caminho claro de "o que fazer agora" (Dataset -> Estatisticas -> Modelagem -> Projeto)
- [ ] Orion.AI responde termos do glossario (ex: "o que e p-valor?")
- [ ] Botao "?" aparece ao lado dos numeros/termos importantes (tabelas e opcoes)
- [ ] Orion.AI abre no topico exato quando clicar no "?"
- [ ] As telas nao exigem conhecimento estatistico para executar o basico (o usuario consegue terminar um fluxo)

## Checklist de Pronto Para EC2 (Infra/Deploy)
- [ ] `docker-compose.yml` sobe com `docker compose up -d --build`
- [ ] Web (Nginx) atende em porta 80 (ou `ORION_WEB_PORT`) e carrega rotas do React (refresh em /modelagem nao quebra)
- [ ] API funciona via `/api/*` (ex: `/api/health`, `/api/docs`)
- [ ] Upload grande funciona atras do Nginx (client_max_body_size)
- [ ] Dados persistem em volume (datasets e modelos continuam apos restart)
- [ ] Senha esta em TXT no host (`secrets/orion_password.txt`) e protege todo o app (Basic Auth)
- [ ] Security Group da EC2: 80 liberado, 22 restrito ao seu IP
- [ ] Backups (minimo): snapshot do volume/disco ou copia de `backend/data` e `backend/models`
- [ ] Observabilidade basica: `docker compose logs -f web backend` e endpoint `/api/health`

