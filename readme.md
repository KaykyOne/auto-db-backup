# SP Nightly Backup

Um sistema de backup automático de bancos de dados PostgreSQL para Dropbox, rodando com Node.js e cron, configurado para o horário de São Paulo.

---

## Funcionalidades

- Geração automática de dump do PostgreSQL (`pg_dump`)  
- Upload seguro para Dropbox  
- Agendamento diário via `node-cron` (meia-noite, horário de São Paulo)  
- Logging detalhado para monitorar backups  
- Fácil execução com PM2  

---

## Pré-requisitos

- Node.js >= 18  
- PostgreSQL  
- Conta no Dropbox com token de acesso  
- PM2 (opcional, mas recomendado para manter o processo rodando)

---

## Instalação

1. Clone o repositório:

```bash
git clone https://github.com/KaykyOne/auto-db-backup.git
cd auto-db-backup
