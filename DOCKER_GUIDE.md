# Guia Docker - Backup Automático PostgreSQL

## 📦 O que é Docker?

Docker é uma plataforma que permite empacotar sua aplicação com todas as dependências (Node.js, PostgreSQL client, etc.) em um **container** isolado. Isso garante que funcionará igual em qualquer Linux VPS.

---

## 🚀 Como usar (Passo a Passo)

### 1. **Prepare o arquivo .env**

Crie um arquivo `.env` na raiz do projeto com suas variáveis:

```bash
# Configurações PostgreSQL
DB_HOST=seu-servidor-postgres.com
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=seu_banco

# Dropbox
DROPBOX_TOKEN=seu_token_dropbox

# Cron (meia-noite São Paulo = 03:00 UTC)
CRON_SCHEDULE=0 3 * * *
```

### 2. **Build da imagem Docker** (fazer uma vez)

```bash
docker build -t backup-postgres .
```

Ou com docker-compose:

```bash
docker-compose build
```

### 3. **Executar o container**

**Opção A: Com Docker (simples)**
```bash
docker run -d \
  --name backup-postgres \
  --restart unless-stopped \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  backup-postgres
```

**Opção B: Com Docker Compose (recomendado)**
```bash
docker-compose up -d
```

### 4. **Verificar se está funcionando**

```bash
# Ver containers rodando
docker ps

# Ver TODOS os containers (inclusive parados)
docker ps -a

# Ver apenas os IDs dos containers
docker ps -q

# Ver containers com tamanho
docker ps -s

# Ver logs
docker logs -f backup-postgres
```

### 5. **Parar e Excluir Containers**

**Com Docker (manual):**
```bash
# Parar o container
docker stop backup-postgres

# Remover o container
docker rm backup-postgres

# Parar E remover (comando único)
docker rm -f backup-postgres
```

**Com Docker Compose (recomendado):**
```bash
# Parar os containers (mantém configurações)
docker-compose stop

# Parar E remover os containers
docker-compose down

# Remover containers + volumes + redes criadas
docker-compose down -v

# Remover containers + imagens criadas
docker-compose down --rmi all
```

**Limpeza completa do sistema:**
```bash
# Remove todos os containers parados
docker container prune

# Remove todas as imagens não utilizadas
docker image prune -a

# Limpeza geral (containers, redes, imagens, build cache)
docker system prune -a --volumes
```

### 6. **Listar Imagens e Inspecionar**

```bash
# Ver todas as imagens Docker
docker images

# Ver apenas os IDs das imagens
docker images -q

# Ver imagens com filtro
docker images backup-postgres

# Inspecionar detalhes de um container
docker inspect backup-postgres

# Ver processos rodando dentro do container
docker top backup-postgres

# Ver estatísticas de uso (CPU, memória, rede)
docker stats backup-postgres
```

---

## 📋 Implantação em VPS Linux

### Passo 1: Conectar na VPS
```bash
ssh seu_usuario@seu_vps_ip
```

### Passo 2: Instalar Docker e Docker Compose
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Passo 3: Clone e configure
```bash
git clone https://github.com/KaykyOne/auto-db-backup.git
cd auto-db-backup
nano .env  # Edite com suas credenciais
```

### Passo 4: Inicie o container
```bash
docker-compose up -d
```

### Passo 5: Monitorar
```bash
docker logs -f backup-postgres
```

---

## 🔧 Comandos úteis

```bash
# Rebuild após mudanças
docker-compose down
docker-compose up -d --build

# Ver recursos usados
docker stats

# Entrar no container (debug)
docker exec -it backup-postgres sh

# Limpar tudo
docker-compose down -v
```

---

## ✅ Checklist de Implantação

- [ ] Docker instalado na VPS
- [ ] Arquivo `.env` criado com credenciais
- [ ] `docker-compose up -d` executado com sucesso
- [ ] `docker ps` mostra o container rodando
- [ ] `docker logs` mostra execução normal
- [ ] Backup apareceu no Dropbox (aguarde próxima execução do cron)

---

## 🐛 Troubleshooting

**Container sai imediatamente após iniciar?**
```bash
docker logs backup-postgres
```
Procure por erros de variáveis de ambiente ou conexão.

**Permissão negada ao conectar PostgreSQL?**
- Verifique credenciais em `.env`
- Certifique-se que PostgreSQL aceita conexões remotas (pg_hba.conf)

**Erro de escrita em logs?**
```bash
mkdir -p logs
chmod 777 logs
```
