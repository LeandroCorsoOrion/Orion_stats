# Orion Analytics

Plataforma de Análise de Dados com Estatísticas, Correlação e Machine Learning, com foco em **Projetos Operacionais**: transformar um modelo treinado em uma aplicação reutilizável (com inputs, endpoint e playground prontos).

## Principais Funcionalidades

- **Upload de XLSX**: carregue planilhas e visualize os dados com paginação
- **Detecção automática de tipos**: categórica, discreta numérica, contínua
- **Estatísticas descritivas**: média, mediana, moda, desvio padrão, quartis etc.
- **Correlação**: matriz (heatmap) com valores anotados
- **Modelagem**: treino automático de 5 modelos + regressão linear (equação e coeficientes)
- **Simulação**: formulário de inputs para previsão
- **Cenários**: salve e reutilize configurações de análise
- **Projetos (Operacionalização)**: transforme um treino em um “projeto de aplicação”:
  - inputs gerados a partir das *features (X)* do treino (o que você treina é o que você usa depois)
  - endpoint de previsão por projeto (`/projects/{id}/predict`)
  - configuração salva (dataset, Y, X, filtros, métrica, missing)
  - status (ativo/rascunho/arquivado)

## Requisitos

- Docker e Docker Compose **OU**
- Python 3.11+ e Node.js 20+

## Execução

### Com Docker (recomendado)

```bash
cd orion-analytics
mkdir -p secrets
# Defina a senha (Basic Auth) em um TXT no host:
printf "%s\n" "SUA_SENHA_FORTE_AQUI" > secrets/orion_password.txt
docker-compose up --build
```

Acesse:
- App: http://localhost
- Backend API: http://localhost/api
- Swagger Docs: http://localhost/api/docs

Login (Basic Auth):
- Usuario: `orion` (padrao)
- Senha: conteudo de `secrets/orion_password.txt`

Obs: se `secrets/orion_password.txt` nao existir, o container `web` vai gerar uma senha automaticamente e salvar nesse arquivo.

### Desenvolvimento Local (Windows)

Você pode usar o `START.bat`, que agora faz auto-setup:
- verifica Python e Node.js/npm;
- tenta instalar automaticamente com `winget` se faltar;
- cria/atualiza o `backend\.venv`;
- instala dependências do backend e frontend;
- abre backend e frontend em janelas separadas.

Comando:

```bat
START.bat
```

Modos úteis:
- Somente preparar ambiente (sem abrir janelas): `set ORION_SKIP_LAUNCH=1 && START.bat`
- Não pausar em erro/fim: `set ORION_NO_PAUSE=1 && START.bat`

## Deploy EC2

Guia completo: `docs/EC2_DEPLOY.md`

## Checklist

Checklist de funcionalidades + pronto para EC2: `docs/CHECKLIST.md`

## Troubleshooting (Conexao)

Guia rapido para intermitencia de conexao: `docs/TROUBLESHOOTING_CONNECTIVITY.md`

## Como Usar (bem direto)

1. **Dataset**
   - Faça upload do XLSX e confira as colunas/tipos.
2. **Modelagem e Simulação**
   - Selecione a variável alvo (Y) e as variáveis explicativas (X).
   - Clique em **Treinar Modelos** e compare as métricas.
3. **Transformar em Projeto**
   - Ainda na página de Modelagem, clique em **Transformar em Projeto**.
   - Dê um nome e pronto: o projeto fica “operacional” (com inputs e endpoint).
4. **Projetos**
   - Abra o projeto para usar o Playground (formulário) ou chamar o endpoint via API.

## Estrutura do Projeto

```
orion-analytics/
├── backend/
│   ├── app/
│   │   ├── api/           # Endpoints FastAPI
│   │   ├── services/      # Lógica de negócio
│   │   ├── db/            # Modelos SQLAlchemy
│   │   ├── schemas/       # Schemas Pydantic
│   │   └── core/          # Configurações
│   ├── data/              # Datasets (parquet)
│   ├── models/            # Modelos treinados (artefatos)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/         # Páginas React
│   │   ├── components/    # Componentes
│   │   ├── lib/           # API client e context
│   │   └── types/         # TypeScript types
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|----------|
| POST | `/datasets/upload` | Upload de XLSX |
| GET | `/datasets/{id}/meta` | Metadados do dataset |
| POST | `/data/query` | Consulta filtrada |
| POST | `/stats/descriptive` | Estatísticas descritivas |
| POST | `/stats/correlation` | Matriz de correlação |
| POST | `/ml/train` | Treinar modelos |
| POST | `/ml/predict` | Previsão por `model_id` |
| CRUD | `/scenarios` | Gerenciar cenários |
| CRUD | `/projects` | Gerenciar projetos operacionais |
| POST | `/projects/{id}/predict` | Previsão via projeto (operacional) |

Documentação completa: http://localhost:8000/docs

## Licença

MIT
