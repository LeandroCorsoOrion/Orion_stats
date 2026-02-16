# Orion Analytics - Diagnostico de Conexao Intermitente

Use este roteiro quando o sistema "conecta as vezes" e "as vezes nao".

## 1) Ver o status dentro da propria interface
- No topo (Topbar) existe o indicador `API online/offline`.
- Clique nele para forcar uma nova verificacao imediata.
- Se estiver `offline`, abra o tooltip (mouse hover) para ver o detalhe.

## 2) Verificar backend e web no servidor (EC2)
```bash
docker compose ps
docker compose logs -f web backend
```

Sinais comuns:
- `connection refused` no `web`: backend caiu ou reiniciou.
- `401` no browser/API: senha Basic Auth incorreta.
- `5xx` no backend: erro interno na API (ver stack trace nos logs).

## 3) Checar endpoints de saude
- Health publico do Nginx (sem senha): `http://SEU_IP/healthz`
- Health da API (com auth): `http://SEU_IP/api/health`

Se `/healthz` responde e `/api/health` falha, o problema esta no backend.
Se ambos falham, o problema esta no container `web`, rede/porta ou EC2.

## 4) Causas mais comuns
- Container backend reiniciando por falta de memoria/CPU.
- Security Group bloqueando porta 80/22.
- Senha em `secrets/orion_password.txt` ausente/corrompida.
- Timeout/rede instavel entre cliente e EC2.

## 5) Acao rapida de recuperacao
```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=120 web backend
```

