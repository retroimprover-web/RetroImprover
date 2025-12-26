import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { restoreImage, generateAnimationPrompts, generateVideo as generateVideoUtil, BilingualPrompt } from '../utils/gemini';
import { uploadToR2, generateR2Key, getLocalFilePath } from '../utils/r2';
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

    // Создаем проект в БД (пока с локальными путями)
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        originalImage: originalImagePath,
        restoredImage: restoredImagePath,
      },
    });

    // Загружаем файлы в R2
    let originalR2Url: string | null = null;
    let restoredR2Url: string | null = null;

    try {
      // Загружаем оригинальное изображение
      const originalKey = generateR2Key(path.basename(originalImagePath), 'originals');
      originalR2Url = await uploadToR2(originalImagePath, originalKey);

      // Загружаем восстановленное изображение
      const restoredKey = generateR2Key(path.basename(restoredImagePath), 'restored');
      restoredR2Url = await uploadToR2(restoredImagePath, restoredKey);

      // Обновляем проект с R2 URLs
      await prisma.project.update({
        where: { id: project.id },
        data: {
          originalImage: originalR2Url,
          restoredImage: restoredR2Url,
        },
      });

      console.log('✅ Файлы загружены в R2');
    } catch (r2Error: any) {
      console.error('⚠️ Ошибка при загрузке в R2, используем локальные пути:', r2Error);
      // Если R2 не работает, продолжаем с локальными путями
    }

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

    // Возвращаем URLs (R2 или локальные)
    const finalOriginalUrl = originalR2Url || `${backendUrl}/uploads/${path.basename(project.originalImage)}`;
    const finalRestoredUrl = restoredR2Url || `${backendUrl}/uploads/${path.basename(project.restoredImage!)}`;
    
    res.json({
      project: {
        id: project.id,
        originalImage: finalOriginalUrl,
        restoredImage: finalRestoredUrl,
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

    // Получаем локальный путь к восстановленному изображению (скачиваем из R2, если нужно)
    let localRestoredImagePath: string;
    try {
      localRestoredImagePath = await getLocalFilePath(project.restoredImage);
    } catch (error: any) {
      console.error('❌ Ошибка при получении файла:', error);
      res.status(500).json({ 
        error: 'Не удалось получить восстановленное изображение', 
        details: error.message 
      });
      return;
    }

    // Получаем язык пользователя
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
      select: { language: true },
    });

    const userLanguage = (user?.language || 'en') as 'en' | 'ru';

    // Генерируем промпты (на двух языках)
    let bilingualPrompts: BilingualPrompt[];
    try {
      bilingualPrompts = await generateAnimationPrompts(localRestoredImagePath, userLanguage);
      
      if (!bilingualPrompts || bilingualPrompts.length < 4) {
        throw new Error('Не удалось сгенерировать 4 промпта');
      }
      
      console.log('✅ Успешно сгенерировано', bilingualPrompts.length, 'билингвальных промптов');
    } catch (error: any) {
      console.error('❌ Ошибка при генерации промптов:', error);
      res.status(500).json({ 
        error: 'Не удалось сгенерировать промпты', 
        details: error.message || 'Неизвестная ошибка'
      });
      return;
    }

    // Сохраняем билингвальные промпты в БД
    await prisma.project.update({
      where: { id: projectId },
      data: {
        prompts: bilingualPrompts as any, // Сохраняем оба языка (Prisma JSON тип)
      },
    });

    // Отправляем на фронтенд промпты с нужным языком для отображения
    // Но также отправляем оба языка, чтобы фронтенд мог использовать английские при генерации видео
    const promptsForDisplay = bilingualPrompts.map(p => userLanguage === 'ru' ? p.ru : p.en);
    
    res.json({ 
      prompts: promptsForDisplay, // Для отображения пользователю
      bilingualPrompts: bilingualPrompts // Полные данные с обоими языками
    });
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

    // Получаем локальный путь к восстановленному изображению (скачиваем из R2, если нужно)
    let localRestoredImagePath: string;
    try {
      localRestoredImagePath = await getLocalFilePath(project.restoredImage);
    } catch (error: any) {
      console.error('❌ Ошибка при получении файла:', error);
      res.status(500).json({ 
        error: 'Не удалось получить восстановленное изображение', 
        details: error.message 
      });
      return;
    }

    // Получаем билингвальные промпты из проекта и извлекаем английские версии выбранных
    let englishPrompts: string[] = [];
    if (project.prompts) {
      try {
        const bilingualPrompts = (typeof project.prompts === 'string' 
          ? JSON.parse(project.prompts) 
          : project.prompts) as BilingualPrompt[];
        
        if (Array.isArray(bilingualPrompts)) {
          // Находим английские версии выбранных промптов
          englishPrompts = selectedPrompts.map((selected: string) => {
            // Ищем промпт по русской или английской версии
            const found = bilingualPrompts.find(p => 
              p.en.toLowerCase() === selected.toLowerCase() || 
              p.ru.toLowerCase() === selected.toLowerCase()
            );
            return found ? found.en : selected; // Используем английскую версию или оригинал если не нашли
          });
        } else {
          // Fallback: если формат старый, используем selectedPrompts как есть
          englishPrompts = selectedPrompts;
        }
      } catch (e) {
        console.warn('Не удалось распарсить билингвальные промпты, используем selectedPrompts:', e);
        englishPrompts = selectedPrompts;
      }
    } else {
      // Если промптов нет, используем selectedPrompts как есть
      englishPrompts = selectedPrompts;
    }

    console.log('📝 Выбранные промпты (английские для генерации видео):', englishPrompts);

    // Генерируем видео (это может занять 1-2 минуты)
    let videoPath: string;
    try {
      console.log('🔄 Начало генерации видео...');
      videoPath = await generateVideoUtil(localRestoredImagePath, englishPrompts);
      
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

    // Сохраняем видео в проект (пока с локальным путем)
    await prisma.project.update({
      where: { id: projectId },
      data: {
        video: videoPath,
      },
    });

    // Загружаем видео в R2
    let videoR2Url: string | null = null;
    try {
      const videoKey = generateR2Key(path.basename(videoPath), 'videos');
      videoR2Url = await uploadToR2(videoPath, videoKey);

      // Обновляем проект с R2 URL
      await prisma.project.update({
        where: { id: projectId },
        data: {
          video: videoR2Url,
        },
      });

      console.log('✅ Видео загружено в R2');
    } catch (r2Error: any) {
      console.error('⚠️ Ошибка при загрузке видео в R2, используем локальный путь:', r2Error);
    }

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

    // Возвращаем URL (R2 или локальный)
    const finalVideoUrl = videoR2Url || `${backendUrl}/uploads/${path.basename(videoPath)}`;

    res.json({
      videoUrl: finalVideoUrl,
      creditsLeft: updatedUser.credits,
    });
  } catch (error) {
    console.error('Ошибка при генерации видео:', error);
    res.status(500).json({ error: 'Ошибка при генерации видео' });
  }
};

