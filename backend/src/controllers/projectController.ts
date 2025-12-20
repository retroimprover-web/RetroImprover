import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { liked } = req.query;
    const where: any = {
      userId: req.user.userId,
    };

    if (liked === 'true') {
      where.isLiked = true;
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Преобразуем пути в URL
    const projectsWithUrls = projects.map((project) => ({
      ...project,
      originalUrl: `/uploads/${path.basename(project.originalImage)}`,
      restoredUrl: project.restoredImage
        ? `/uploads/${path.basename(project.restoredImage)}`
        : null,
      videoUrl: project.video ? `/uploads/${path.basename(project.video)}` : null,
    }));

    res.json(projectsWithUrls);
  } catch (error) {
    console.error('Ошибка при получении проектов:', error);
    res.status(500).json({ error: 'Ошибка при получении проектов' });
  }
};

export const toggleLike = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.userId,
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

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.userId,
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

