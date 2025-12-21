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

    // Вызываем Gemini API для восстановления изображения
    // Примечание: В реальности Gemini может не возвращать изображение напрямую
    // Здесь мы используем оригинальное изображение как восстановленное для MVP
    // В продакшене нужно будет использовать правильный API для обработки изображений
    let restoredImagePath: string;
    try {
      const restoredResult = await restoreImage(originalImagePath);
      // Если API возвращает путь к файлу, используем его
      // Иначе создаем копию оригинального изображения
      if (fs.existsSync(restoredResult)) {
        restoredImagePath = restoredResult;
      } else {
        // Создаем копию для демонстрации
        const ext = path.extname(originalImagePath);
        const restoredFileName = `restored-${Date.now()}${ext}`;
        restoredImagePath = path.join(path.dirname(originalImagePath), restoredFileName);
        fs.copyFileSync(originalImagePath, restoredImagePath);
      }
    } catch (error) {
      console.error('Ошибка при восстановлении изображения:', error);
      // В случае ошибки создаем копию оригинального изображения
      const ext = path.extname(originalImagePath);
      const restoredFileName = `restored-${Date.now()}${ext}`;
      restoredImagePath = path.join(path.dirname(originalImagePath), restoredFileName);
      fs.copyFileSync(originalImagePath, restoredImagePath);
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
    const prompts = await generateAnimationPrompts(project.restoredImage);

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

    // Генерируем видео
    let videoUrl: string;
    try {
      const videoResult = await generateVideoUtil(project.restoredImage, selectedPrompts);
      // Если API возвращает URL, используем его
      // Иначе создаем заглушку
      if (videoResult.startsWith('http') || videoResult.startsWith('/')) {
        videoUrl = videoResult;
      } else {
        // Создаем путь для видео файла (заглушка)
        const videoFileName = `video-${Date.now()}.mp4`;
        const videoPath = path.join(path.dirname(project.restoredImage), videoFileName);
        // В реальности здесь будет сохранен файл видео
        videoUrl = videoPath;
      }
    } catch (error: any) {
      console.error('Ошибка при генерации видео:', error);
      console.error('Детали ошибки:', error.message, error.stack);
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
        video: videoUrl,
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
      videoUrl: `${backendUrl}/uploads/${path.basename(videoUrl)}`,
      creditsLeft: updatedUser.credits,
    });
  } catch (error) {
    console.error('Ошибка при генерации видео:', error);
    res.status(500).json({ error: 'Ошибка при генерации видео' });
  }
};

