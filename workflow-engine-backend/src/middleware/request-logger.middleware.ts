import type { NextFunction, Request, Response } from 'express';
import { HEADER_REQUEST_ID } from '../common/constants/http.js';
import { createRequestId } from '../common/utils/request-id.js';
import { loggerContext } from '../common/logger/logger.js';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  req.requestId = createRequestId(req.headers[HEADER_REQUEST_ID]);

  loggerContext.run({ requestId: req.requestId }, () => {
    res.on('finish', () => {
      const durationMs = Date.now() - started;
      const line = {
        level: 'info',
        requestId: req.requestId,
        userId: req.auth?.userId,
        tenantId: req.tenantId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        statusCode: res.statusCode,
        durationMs,
      };
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(line));
    });

    next();
  });
}
