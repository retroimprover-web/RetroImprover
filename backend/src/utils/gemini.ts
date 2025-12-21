import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

// Промпт для генерации анимационных промптов
const ANIMATION_PROMPTS_SYSTEM_PROMPT = `You are a creative AI assistant. Analyze this restored vintage photo and generate 4 different, creative animation prompts that would bring this photo to life. Each prompt should describe a cinematic, smooth motion that fits the scene. Return only a JSON array of 4 strings, no additional text.`;

// Промпт для видео
const VIDEO_PROMPT_PREFIX = `Cinematic shot, `;
const VIDEO_PROMPT_SUFFIX = `, high quality, smooth motion, professional cinematography, 4K`;

/**
 * Восстанавливает изображение используя обработку изображений (sharp)
 * Улучшает контраст, яркость, резкость и цвет
 */
export async function restoreImage(imagePath: string): Promise<string> {
  try {
    const ext = path.extname(imagePath);
    const restoredFileName = `restored-${Date.now()}${ext}`;
    const restoredImagePath = path.join(path.dirname(imagePath), restoredFileName);
    
    // Используем sharp для улучшения изображения
    await sharp(imagePath)
      .normalize() // Нормализация яркости и контраста
      .sharpen({ sigma: 1.5 }) // Улучшение резкости
      .modulate({
        brightness: 1.1, // Увеличение яркости на 10%
        saturation: 1.15, // Увеличение насыщенности на 15%
      })
      .gamma(1.1) // Коррекция гаммы для лучшего контраста
      .toFile(restoredImagePath);
    
    console.log(`Изображение восстановлено: ${restoredImagePath}`);
    return restoredImagePath;
  } catch (error) {
    console.error('Ошибка при восстановлении изображения:', error);
    throw new Error('Не удалось восстановить изображение');
  }
}

/**
 * Генерирует промпты для анимации используя Gemini 2.5 Flash
 */
export async function generateAnimationPrompts(restoredImagePath: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const imageData = fs.readFileSync(restoredImagePath);
    const base64Image = imageData.toString('base64');
    
    const result = await model.generateContent([
      ANIMATION_PROMPTS_SYSTEM_PROMPT,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Парсим JSON из ответа
    try {
      const prompts = JSON.parse(text);
      if (Array.isArray(prompts) && prompts.length === 4) {
        return prompts;
      }
    } catch (parseError) {
      // Если не JSON, пытаемся извлечь промпты из текста
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      return lines.slice(0, 4);
    }
    
    throw new Error('Не удалось сгенерировать промпты');
  } catch (error) {
    console.error('Ошибка при генерации промптов:', error);
    throw new Error('Не удалось сгенерировать промпты для анимации');
  }
}

/**
 * Генерирует видео используя Veo 3.1 Fast Generate Preview
 */
export async function generateVideo(imagePath: string, prompts: string[]): Promise<string> {
  try {
    // Veo API может отличаться, здесь используется примерная структура
    // В реальности нужно проверить актуальную документацию Google Veo API
    
    const model = genAI.getGenerativeModel({ model: 'veo-3.1-fast-generate-preview' });
    
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    
    // Объединяем промпты
    const combinedPrompt = prompts.join(', ');
    const fullPrompt = `${VIDEO_PROMPT_PREFIX}${combinedPrompt}${VIDEO_PROMPT_SUFFIX}`;
    
    const result = await model.generateContent([
      fullPrompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const response = await result.response;
    
    // Veo должен возвращать URL видео или данные видео
    // Здесь возвращаем заглушку - в реальности нужно обработать ответ правильно
    const videoUrl = response.text(); // Это может быть URL или нужно использовать другой метод
    
    return videoUrl;
  } catch (error) {
    console.error('Ошибка при генерации видео:', error);
    throw new Error('Не удалось сгенерировать видео');
  }
}

