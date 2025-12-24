import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { deleteFromR2 } from '../utils/r2';
import path from 'path';
import fs from 'fs';

export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { liked } = req.query;
    const where: any = {
      userId: authReq.user.userId,
    };

    if (liked === 'true') {
      where.isLiked = true;
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Получаем URL бэкенда (используем https в продакшене)
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const backendUrl = process.env.BACKEND_URL || 
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
      `${protocol}://${req.get('host')}` || 
      'http://localhost:3000';
    
    // Преобразуем пути в URL
    // Если путь начинается с http:// или https://, это уже R2 URL
    const isR2Url = (url: string) => url.startsWith('http://') || url.startsWith('https://');
    
    const projectsWithUrls = projects.map((project, index) => {
      return {
        ...project,
        originalUrl: isR2Url(project.originalImage) 
          ? project.originalImage 
          : `${backendUrl}/uploads/${path.basename(project.originalImage)}`,
        restoredUrl: project.restoredImage 
          ? (isR2Url(project.restoredImage) 
              ? project.restoredImage 
              : `${backendUrl}/uploads/${path.basename(project.restoredImage)}`)
          : null,
        videoUrl: project.video
          ? (isR2Url(project.video)
              ? project.video
              : `${backendUrl}/uploads/${path.basename(project.video)}`)
          : null,
        // Добавляем название проекта
        name: `Restoration ${projects.length - index}`,
      };
    });

    res.json(projectsWithUrls);
  } catch (error) {
    console.error('Ошибка при получении проектов:', error);
    res.status(500).json({ error: 'Ошибка при получении проектов' });
  }
};

// Новый эндпоинт для получения лайкнутых медиа (отдельные фото/видео)
export const getLikedMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: authReq.user.userId,
        isLiked: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Получаем URL бэкенда
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const backendUrl = process.env.BACKEND_URL || 
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
      `${protocol}://${req.get('host')}` || 
      'http://localhost:3000';
    
    const isR2Url = (url: string) => url.startsWith('http://') || url.startsWith('https://');
    
    // Создаем массив отдельных медиа из лайкнутых проектов
    const likedMedia: any[] = [];
    
    projects.forEach((project) => {
      // Добавляем восстановленное фото, если есть
      if (project.restoredImage) {
        const restoredUrl = isR2Url(project.restoredImage) 
          ? project.restoredImage 
          : `${backendUrl}/uploads/${path.basename(project.restoredImage)}`;
        
        likedMedia.push({
          id: `${project.id}-restored`,
          type: 'image',
          url: restoredUrl,
          projectId: project.id,
          createdAt: project.createdAt.toISOString(),
        });
      }
      
      // Добавляем видео, если есть
      if (project.video) {
        const videoUrl = isR2Url(project.video)
          ? project.video
          : `${backendUrl}/uploads/${path.basename(project.video)}`;
        
        likedMedia.push({
          id: `${project.id}-video`,
          type: 'video',
          url: videoUrl,
          projectId: project.id,
          createdAt: project.createdAt.toISOString(),
        });
      }
    });

    res.json(likedMedia);
  } catch (error) {
    console.error('Ошибка при получении лайкнутых медиа:', error);
    res.status(500).json({ error: 'Ошибка при получении лайкнутых медиа' });
  }
};

export const toggleLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: authReq.user.userId,
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Проект не найден' });
      return;
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        isLiked: !project.isLiked,
      },
    });

    res.json(updatedProject);
  } catch (error) {
    console.error('Ошибка при изменении статуса лайка:', error);
    res.status(500).json({ error: 'Ошибка при изменении статуса лайка' });
  }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: authReq.user.userId,
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Проект не найден' });
      return;
    }

    // Удаляем файлы из R2 (если это R2 URLs)
    const isR2Url = (url: string) => url.startsWith('http://') || url.startsWith('https://');
    
    if (isR2Url(project.originalImage)) {
      // Извлекаем ключ из R2 URL
      // Формат URL: https://pub-xxx.r2.dev/originals/filename.jpg
      const urlParts = project.originalImage.split('/');
      const key = urlParts.slice(-2).join('/'); // 'originals/filename.jpg'
      await deleteFromR2(key);
    }
    
    if (project.restoredImage && isR2Url(project.restoredImage)) {
      const urlParts = project.restoredImage.split('/');
      const key = urlParts.slice(-2).join('/');
      await deleteFromR2(key);
    }
    
    if (project.video && isR2Url(project.video)) {
      const urlParts = project.video.split('/');
      const key = urlParts.slice(-2).join('/');
      await deleteFromR2(key);
    }

    // Удаляем локальные файлы (если они еще существуют)
    const filesToDelete = [
      !isR2Url(project.originalImage) ? project.originalImage : null,
      project.restoredImage && !isR2Url(project.restoredImage) ? project.restoredImage : null,
      project.video && !isR2Url(project.video) ? project.video : null,
    ].filter(Boolean) as string[];

    for (const filePath of filesToDelete) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error(`Ошибка при удалении файла ${filePath}:`, fileError);
      }
    }

    // Удаляем проект из БД
    await prisma.project.delete({
      where: { id },
    });

    res.json({ message: 'Проект успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении проекта:', error);
    res.status(500).json({ error: 'Ошибка при удалении проекта' });
  }
};

