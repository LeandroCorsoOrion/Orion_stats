# Orion Analytics - Deploy na EC2 (Docker)

## Objetivo (bem simples)
Voce vai subir o Orion Analytics com 2 containers:
- `web` (Nginx): serve o frontend e encaminha `/api/*` para o backend
- `backend` (FastAPI): API + processamento + SQLite + arquivos (data/models)

O acesso fica protegido por senha via Basic Auth. A senha fica em um TXT no host: `secrets/orion_password.txt`.

## 1) Preparar a EC2
- Sistema sugerido: Ubuntu 22.04 LTS (ou Amazon Linux 2023).
- Security Group:
  - Inbound: `80/tcp` aberto para Internet (0.0.0.0/0)
  - Inbound: `22/tcp` apenas seu IP

## 2) Instalar Docker + Docker Compose (Ubuntu)
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

## 3) Subir o Orion Analytics
```bash
git clone <SEU_REPO_AQUI> orion-analytics
cd orion-analytics
mkdir -p secrets
```

Crie a senha (TXT):
```bash
printf "%s\n" "SUA_SENHA_FORTE_AQUI" > secrets/orion_password.txt
chmod 600 secrets/orion_password.txt
```

Suba os containers:
```bash
docker compose up -d --build
docker compose ps
```

## 4) Acessar
- App: `http://SEU_IP_PUBLICO/`
- Health (publico, sem senha): `http://SEU_IP_PUBLICO/healthz`
- API health: `http://SEU_IP_PUBLICO/api/health`
- Swagger: `http://SEU_IP_PUBLICO/api/docs`

Login (Basic Auth):
- Usuario: `orion` (padrao)
- Senha: conteudo de `secrets/orion_password.txt`

## 5) Operacao / Manutencao (basico)
Ver logs:
```bash
docker compose logs -f web backend
```

Atualizar (pull + rebuild):
```bash
git pull
docker compose up -d --build
```

Onde ficam dados/modelos/DB:
- Volume `orion-data` (inclui `data/` e o SQLite em `data/orion_analytics.db`)
- Volume `orion-models`
