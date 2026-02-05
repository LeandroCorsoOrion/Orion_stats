# Orion Stats

Plataforma de Análise de Dados com Estatísticas, Correlação e Machine Learning.

![Dark Theme](https://img.shields.io/badge/theme-dark-1a1a2e)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688)
![React](https://img.shields.io/badge/React-18+-61DAFB)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB)

## 🚀 Funcionalidades

- **Upload de XLSX**: Carregue planilhas e visualize dados com paginação
- **Detecção automática de tipos**: Categórica, discreta numérica, contínua
- **Estatísticas descritivas**: Média, mediana, moda, desvio padrão, quartis, etc.
- **Correlação de Pearson**: Heatmap interativo com valores anotados
- **5 Modelos de ML**: Treinamento automático e comparação de métricas
- **Regressão Linear**: Equação e coeficientes com statsmodels
- **Simulação**: Previsão de valores com o melhor modelo
- **Cenários**: Salve e reutilize configurações de análise

## 📦 Requisitos

- Docker e Docker Compose **OU**
- Python 3.11+ e Node.js 20+

## 🏃 Execução

### Com Docker (recomendado)

```bash
cd orion-stats
docker-compose up --build
```

Acesse:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

### Desenvolvimento Local

#### Backend

```bash
cd backend

# Criar ambiente virtual
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Instalar dependências
pip install -r requirements.txt

# Executar
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Executar
npm run dev
```

## 📖 Como Usar

### 1. Upload de Dataset

1. Acesse a página **Dataset**
2. Arraste um arquivo XLSX ou clique para selecionar
3. Visualize a prévia dos dados
4. Ajuste os tipos de variáveis se necessário

### 2. Estatísticas

1. Vá para **Estatísticas**
2. Selecione filtros nas variáveis discretas
3. Escolha variáveis contínuas para análise
4. Opcionalmente agrupe por variáveis
5. Clique em **Calcular**

### 3. Correlação

1. Vá para **Correlação**
2. Selecione variáveis contínuas (mínimo 2)
3. Clique em **Calcular Correlação**
4. Visualize o heatmap com valores

### 4. Modelagem e Simulação

1. Vá para **Modelagem e Simulação**
2. Selecione a variável alvo (Y) - ex: REND_METAL
3. Selecione variáveis explicativas (X)
4. Escolha a métrica de seleção (RMSE, R², MAE)
5. Clique em **Treinar Modelos**
6. Compare os 5 modelos:
   - Machine Learning - Pro
   - Machine Learning - Alpha
   - Machine Learning - Sigma
   - Machine Learning - Delta
   - Machine Learning - Nova
7. Use o formulário de simulação para prever valores

### 5. Cenários

1. Vá para **Cenários**
2. Dê um nome e salve o cenário atual
3. Carregue cenários salvos para restaurar configurações
4. Exporte/importe cenários como JSON

## 🧪 Teste com Amostra_Hidro.xlsx

Se disponível, o arquivo `Amostra_Hidro.xlsx` pode ser usado para teste:

1. Faça upload do arquivo
2. Vá para Modelagem
3. Selecione `REND_METAL` como alvo
4. Selecione features como `PESO_LIQ_IT`, `PESO_BRT_IT`, `QTD_CAV`, etc.
5. Treine os modelos
6. Simule valores

## 🏗️ Estrutura do Projeto

```
orion-stats/
├── backend/
│   ├── app/
│   │   ├── api/           # Endpoints FastAPI
│   │   ├── services/      # Lógica de negócio
│   │   ├── db/            # Modelos SQLAlchemy
│   │   ├── schemas/       # Schemas Pydantic
│   │   └── core/          # Configurações
│   ├── data/              # Datasets (parquet)
│   ├── models/            # Modelos treinados
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

## 📡 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /datasets/upload | Upload de XLSX |
| GET | /datasets/{id}/meta | Metadados do dataset |
| POST | /data/query | Consulta filtrada |
| POST | /stats/descriptive | Estatísticas descritivas |
| POST | /stats/correlation | Matriz de correlação |
| POST | /ml/train | Treinar modelos |
| POST | /ml/predict | Fazer previsão |
| CRUD | /scenarios | Gerenciar cenários |

Documentação completa: http://localhost:8000/docs

## 🎨 Design System

- **Tema**: Dark com glassmorphism
- **Cor primária**: #A0D0FF
- **Fundo**: Gradiente #0d1421 → #17233d
- **Fonte**: Exo 2 (Google Fonts)
- **Componentes**: Cards com blur, bordas suaves, sombras discretas

## 📄 Licença

MIT
