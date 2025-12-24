import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import passport from './config/passport';
import { errorHandler } from './middleware/errorHandler';

// Роуты
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import aiRoutes from './routes/aiRoutes';
import downloadRoutes from './routes/downloadRoutes';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Разрешаем несколько origin для поддержки разных доменов
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://www.retroimprover.com',
  'https://retroimprover.com',
  'http://localhost:5173',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, из Postman или мобильных приложений)
    if (!origin) return callback(null, true);
    
    // Проверяем, есть ли origin в списке разрешенных
    if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}. Allowed:`, allowedOrigins);
      callback(null, true); // Разрешаем для отладки, в продакшене можно вернуть ошибку
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Инициализация Passport
app.use(passport.initialize());

// Статические файлы для загрузок
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/download', downloadRoutes);

// Корневой маршрут с информацией об API
app.get('/', (req, res) => {
  res.json({
    message: 'RetroImprover Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        google: 'GET /api/auth/google',
        facebook: 'GET /api/auth/facebook',
        apple: 'GET /api/auth/apple',
      },
      projects: {
        list: 'GET /api/projects',
        like: 'POST /api/projects/:id/like',
        delete: 'DELETE /api/projects/:id',
      },
      ai: {
        restore: 'POST /api/ai/restore',
        prompts: 'POST /api/ai/prompts',
        video: 'POST /api/ai/video',
      },
    },
    documentation: 'См. README.md или PROJECT_DOCUMENTATION.md',
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📁 Загрузки сохраняются в: ${path.resolve(uploadDir)}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

export default app;

