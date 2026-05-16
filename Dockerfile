FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/* \
	&& mkdir -p /app/logs /app/backups

COPY package*.json ./
RUN npm ci --omit=dev

COPY app.js logger.js ./

ENV NODE_ENV=production

CMD ["node", "app.js"]
