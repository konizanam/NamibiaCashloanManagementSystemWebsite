export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown): HttpError =>
  new HttpError(400, 'bad_request', message, details);

export const unauthorized = (message = 'Authentication required'): HttpError =>
  new HttpError(401, 'unauthorized', message);

export const forbidden = (message = 'Forbidden'): HttpError =>
  new HttpError(403, 'forbidden', message);

export const notFound = (message = 'Not found'): HttpError =>
  new HttpError(404, 'not_found', message);

export const conflict = (message: string): HttpError =>
  new HttpError(409, 'conflict', message);
