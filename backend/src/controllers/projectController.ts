import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
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
    
    // Преобразуем пути в URL и проверяем существование файлов
    const projectsWithUrls = projects.map((project) => {
      const originalFileName = path.basename(project.originalImage);
      const restoredFileName = project.restoredImage ? path.basename(project.restoredImage) : null;
      const videoFileName = project.video ? path.basename(project.video) : null;
      
      // Проверяем существование файлов
      const originalExists = fs.existsSync(project.originalImage);
      const restoredExists = project.restoredImage ? fs.existsSync(project.restoredImage) : false;
      const videoExists = project.video ? fs.existsSync(project.video) : false;
      
      if (!originalExists) {
        console.warn(`⚠️ Оригинальный файл не найден: ${project.originalImage}`);
      }
      if (project.restoredImage && !restoredExists) {
        console.warn(`⚠️ Восстановленный файл не найден: ${project.restoredImage}`);
      }
      if (project.video && !videoExists) {
        console.warn(`⚠️ Видео файл не найден: ${project.video}`);
      }
      
      return {
        ...project,
        originalUrl: originalExists ? `${backendUrl}/uploads/${originalFileName}` : null,
        restoredUrl: restoredExists ? `${backendUrl}/uploads/${restoredFileName}` : null,
        videoUrl: videoExists ? `${backendUrl}/uploads/${videoFileName}` : null,
      };
    });

    res.json(projectsWithUrls);
  } catch (error) {
    console.error('Ошибка при получении проектов:', error);
    res.status(500).json({ error: 'Ошибка при получении проектов' });
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

    // Удаляем файлы
    const filesToDelete = [
      project.originalImage,
      project.restoredImage,
      project.video,
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

