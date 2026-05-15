import { AsyncLocalStorage } from 'node:async_hooks';

export interface LogContext {
  requestId?: string;
  userId?: string;
  tenantId?: string;
  module?: string;
  action?: string;
}

const storage = new AsyncLocalStorage<LogContext>();

export const loggerContext = {
  run: <T>(context: LogContext, fn: () => T): T => {
    const parentContext = storage.getStore() || {};
    return storage.run({ ...parentContext, ...context }, fn);
  },
  get: (): LogContext => storage.getStore() || {},
  update: (context: Partial<LogContext>) => {
    const current = storage.getStore();
    if (current) {
      Object.assign(current, context);
    }
  },
};

type LogLevel = 'info' | 'debug' | 'warn' | 'error';

function maskEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}***@${domain}`;
}

function formatLog(level: LogLevel, message: string, meta?: any) {
  const context = loggerContext.get();
  const requestId = context.requestId ? ` [requestId=${context.requestId}]` : '';
  const userId = context.userId ? ` [userId=${context.userId}]` : '';
  const tenantId = context.tenantId ? ` [tenantId=${context.tenantId}]` : '';
  const modulePart = context.module ? `[${context.module}]` : '';
  const action = context.action ? ` [action=${context.action}]` : '';

  const prefix = `${modulePart}${requestId}${userId}${tenantId}${action}`.trim();

  // For real production we'd use a library like pino or winston and output JSON.
  // Here we'll stick to a readable format that includes the structured data.
  const logMessage = `[${level.toUpperCase()}] ${prefix ? prefix + ' ' : ''}${message}`;
  
  if (meta && typeof meta === 'object') {
    const sanitizedMeta = { ...meta };
    if (sanitizedMeta.email) sanitizedMeta.email = maskEmail(sanitizedMeta.email);
    if (sanitizedMeta.password) delete sanitizedMeta.password;
    if (sanitizedMeta.token) delete sanitizedMeta.token;
    
    // eslint-disable-next-line no-console
    console.log(`${logMessage} ${JSON.stringify(sanitizedMeta)}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(logMessage);
  }
}

export const logger = {
  info: (message: string, meta?: any) => formatLog('info', message, meta),
  debug: (message: string, meta?: any) => formatLog('debug', message, meta),
  warn: (message: string, meta?: any) => formatLog('warn', message, meta),
  error: (message: string, meta?: any) => formatLog('error', message, meta),
};
