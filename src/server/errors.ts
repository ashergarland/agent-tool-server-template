import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/index.js';
import { AppError, toAppError } from '../errors.js';

export const registerErrorHandler = (app: FastifyInstance, config: AppConfig): void => {
  app.setErrorHandler((error, request, reply) => {
    const appError = toAppError(error);
    const message =
      config.isProduction && appError.statusCode >= 500
        ? 'The tool server failed to complete the request'
        : appError.message;

    if (!(error instanceof AppError)) {
      request.log.error({ err: error, event: 'request.error' }, 'unhandled request failure');
    }

    void reply.status(appError.statusCode).send({
      error: {
        code: appError.code,
        message,
        ...(appError.details === undefined ? {} : { details: appError.details }),
        retryable: appError.retryable,
        requestId: request.id,
      },
    });
  });
};
