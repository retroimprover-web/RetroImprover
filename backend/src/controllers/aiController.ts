import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { restoreImage, generateAnimationPrompts, generateVideo as generateVideoUtil } from '../utils/gemini';
import path from 'path';
import fs from 'fs';

export const restore = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Файл не загружен' });
      return;
    }

    // Проверяем баланс кредитов
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    if (user.credits < 1) {
      res.status(400).json({ error: 'Недостаточно кредитов. Минимум 1 кредит требуется для восстановления' });
      return;
    }

    const originalImagePath = req.file.path;

    // Вызываем Google API для восстановления изображения
    let restoredImagePath: string;
    try {
      restoredImagePath = await restoreImage(originalImagePath);
      
      // Проверяем, что файл существует
      if (!fs.existsSync(restoredImagePath)) {
        throw new Error('Восстановленное изображение не было создано');
      }
      
      console.log('✅ Изображение успешно восстановлено:', restoredImagePath);
    } catch (error: any) {
      console.error('❌ Ошибка при восстановлении изображения:', error);
      
      // В случае ошибки НЕ списываем кредиты и возвращаем ошибку
      res.status(500).json({ 
        error: 'Не удалось восстановить изображение', 
        details: error.message || 'Неизвестная ошибка'
      });
      return;
    }

    // Создаем проект в БД
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        originalImage: originalImagePath,
        restoredImage: restoredImagePath,
      },
    });

    // Вычитаем 1 кредит
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: {
          decrement: 1,
        },
      },
    });

    // Получаем URL бэкенда (используем https в продакшене)
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const backendUrl = process.env.BACKEND_URL || 
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
      `${protocol}://${req.get('host')}` || 
      'http://localhost:3000';
    
    res.json({
      project: {
        id: project.id,
        originalImage: `${backendUrl}/uploads/${path.basename(project.originalImage)}`,
        restoredImage: `${backendUrl}/uploads/${path.basename(project.restoredImage!)}`,
        video: null,
        prompts: null,
        isLiked: false,
        createdAt: project.createdAt.toISOString(),
      },
      creditsLeft: updatedUser.credits,
    });
  } catch (error) {
    console.error('Ошибка при восстановлении изображения:', error);
    res.status(500).json({ error: 'Ошибка при восстановлении изображения' });
  }
};

export const generatePrompts = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { projectId } = req.body;

    if (!projectId) {
      res.status(400).json({ error: 'projectId обязателен' });
      return;
    }

    // Находим проект
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: authReq.user.userId,
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Проект не найден' });
      return;
    }

    if (!project.restoredImage) {
      res.status(400).json({ error: 'Сначала необходимо восстановить изображение' });
      return;
    }

    // Генерируем промпты
    let prompts: string[];
    try {
      prompts = await generateAnimationPrompts(project.restoredImage);
      
      if (!prompts || prompts.length < 4) {
        throw new Error('Не удалось сгенерировать 4 промпта');
      }
      
      console.log('✅ Успешно сгенерировано', prompts.length, 'промптов');
    } catch (error: any) {
      console.error('❌ Ошибка при генерации промптов:', error);
      res.status(500).json({ 
        error: 'Не удалось сгенерировать промпты', 
        details: error.message || 'Неизвестная ошибка'
      });
      return;
    }

    // Обновляем проект в БД
    await prisma.project.update({
      where: { id: projectId },
      data: {
        prompts: prompts,
      },
    });

    res.json({ prompts });
  } catch (error) {
    console.error('Ошибка при генерации промптов:', error);
    res.status(500).json({ error: 'Ошибка при генерации промптов' });
  }
};

export const generateVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { projectId, selectedPrompts } = req.body;

    if (!projectId || !selectedPrompts || !Array.isArray(selectedPrompts)) {
      res.status(400).json({ error: 'projectId и selectedPrompts (массив) обязательны' });
      return;
    }

    // Находим проект
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: authReq.user.userId,
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Проект не найден' });
      return;
    }

    if (!project.restoredImage) {
      res.status(400).json({ error: 'Сначала необходимо восстановить изображение' });
      return;
    }

    // Проверяем баланс кредитов (требуется 3 кредита)
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    if (user.credits < 3) {
      res.status(400).json({ error: 'Недостаточно кредитов. Требуется 3 кредита для генерации видео' });
      return;
    }

    // Генерируем видео (это может занять 1-2 минуты)
    let videoPath: string;
    try {
      console.log('🔄 Начало генерации видео...');
      videoPath = await generateVideoUtil(project.restoredImage, selectedPrompts);
      
      // Проверяем, что файл существует
      if (!fs.existsSync(videoPath)) {
        throw new Error('Видео не было создано');
      }
      
      console.log('✅ Видео успешно сгенерировано:', videoPath);
    } catch (error: any) {
      console.error('❌ Ошибка при генерации видео:', error);
      console.error('Детали ошибки:', error.message);
      
      // В случае ошибки НЕ списываем кредиты и возвращаем ошибку
      res.status(500).json({ 
        error: 'Не удалось сгенерировать видео', 
        details: error.message || 'Неизвестная ошибка'
      });
      return;
    }

    // Сохраняем видео в проект
    await prisma.project.update({
      where: { id: projectId },
      data: {
        video: videoPath,
      },
    });

    // Вычитаем 3 кредита
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: {
          decrement: 3,
        },
      },
    });

    // Получаем URL бэкенда (используем https в продакшене)
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const backendUrl = process.env.BACKEND_URL || 
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
      `${protocol}://${req.get('host')}` || 
      'http://localhost:3000';
    
    res.json({
      videoUrl: `${backendUrl}/uploads/${path.basename(videoPath)}`,
      creditsLeft: updatedUser.credits,
    });
  } catch (error) {
    console.error('Ошибка при генерации видео:', error);
    res.status(500).json({ error: 'Ошибка при генерации видео' });
  }
};

