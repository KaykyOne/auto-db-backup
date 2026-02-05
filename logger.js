import pino from 'pino'

export const logger = pino({
  transport: {
    target: 'pino/file',
    options: {
      destination: './logs/app.log',
      mkdir: true
    }
  }
})