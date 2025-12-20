import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Ошибка:', err);

  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Неавторизован' });
    return;
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Внутренняя ошибка сервера',
  });
};

