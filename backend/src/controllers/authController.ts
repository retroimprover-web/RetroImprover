import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email и пароль обязательны' });
      return;
    }

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Пользователь с таким email уже существует' });
      return;
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        credits: 3, // Даем 3 бесплатные звезды при регистрации
      },
    });

    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
      },
    });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({ error: 'Ошибка при регистрации пользователя' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email и пароль обязательны' });
      return;
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
      },
    });
  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({ error: 'Ошибка при входе в систему' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
      select: {
        id: true,
        email: true,
        credits: true,
        language: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Ошибка при получении профиля:', error);
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
};

// Проверка доступности OAuth провайдеров
export const getOAuthStatus = async (req: Request, res: Response): Promise<void> => {
  res.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    apple: !!(
      process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY
    ),
  });
};

// Обновление языка пользователя
export const updateLanguage = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { language } = req.body;

    if (!language || !['en', 'ru'].includes(language)) {
      res.status(400).json({ error: 'Некорректный язык. Допустимые значения: en, ru' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: authReq.user.userId },
      data: { language },
      select: {
        id: true,
        email: true,
        credits: true,
        language: true,
        createdAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Ошибка при обновлении языка:', error);
    res.status(500).json({ error: 'Ошибка при обновлении языка' });
  }
};

// Callback для социальной авторизации
export const socialAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    
    if (!user) {
      res.status(401).json({ error: 'Ошибка авторизации' });
      return;
    }

    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Перенаправляем на фронтенд с токеном
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Ошибка в callback социальной авторизации:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error`);
  }
};

