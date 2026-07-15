import { Response } from 'express';
import { ApiResponse, ErrorCode } from '../types';

export function success<T>(res: Response, data: T, message: string = 'ok'): void {
  const body: ApiResponse<T> = { code: ErrorCode.SUCCESS, message, data };
  res.json(body);
}

export function fail(res: Response, code: ErrorCode, message: string, statusCode: number = 400): void {
  const body: ApiResponse = { code, message, data: null };
  res.status(statusCode).json(body);
}

export function serverError(res: Response, message: string = '服务器内部错误'): void {
  fail(res, ErrorCode.INTERNAL_ERROR, message, 500);
}