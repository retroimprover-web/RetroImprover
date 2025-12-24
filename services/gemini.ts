// This file is now acting as the API Client for your Backend
// Backend runs on localhost:3000 in development, or VITE_API_URL in production
let API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Очищаем URL от лишних путей и параметров
if (API_BASE) {
  // Удаляем протокол если есть, чтобы нормализовать
  API_BASE = API_BASE.trim();
  
  // Удаляем /uploads/ если случайно попал
  API_BASE = API_BASE.replace(/\/uploads\/?/g, '');
  
  // Удаляем /api если есть (добавим позже)
  API_BASE = API_BASE.replace(/\/api\/?$/g, '');
  
  // Удаляем слэши в начале и конце
  API_BASE = API_BASE.replace(/^\/+|\/+$/g, '');
  
  // Если начинается с http:// или https://, оставляем как есть
  // Иначе добавляем https://
  if (!API_BASE.startsWith('http://') && !API_BASE.startsWith('https://')) {
    API_BASE = `https://${API_BASE}`;
  }
  
  // Удаляем протокол если он дублируется
  API_BASE = API_BASE.replace(/^https?:\/\/https?:\/\//, 'https://');
}

// Убеждаемся, что URL заканчивается на /api
const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

// Логирование для отладки (всегда, чтобы видеть в production)
console.log('[API Config] VITE_API_URL from env:', import.meta.env.VITE_API_URL);
console.log('[API Config] API_BASE (cleaned):', API_BASE);
console.log('[API Config] API_URL (final):', API_URL);

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    credits: number;
  };
}

interface ProjectResponse {
  id: string;
  originalImage: string;
  restoredImage: string;
  video: string | null;
  prompts: string[]; // Stored as JSON string in DB usually, parsed here
  isLiked: boolean;
  createdAt: string;
}

// --- Auth Services ---

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(error.error || error.message || 'Login failed');
    }
    return res.json();
  } catch (error: any) {
    if (error.message) throw error;
    throw new Error('Network error: Could not connect to server');
  }
};

export const registerUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(error.error || error.message || 'Registration failed');
    }
    return res.json();
  } catch (error: any) {
    if (error.message) throw error;
    throw new Error('Network error: Could not connect to server');
  }
};

export const getProfile = async (token: string) => {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
};

export const updateLanguage = async (token: string, language: string): Promise<void> => {
  const res = await fetch(`${API_URL}/auth/language`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ language }),
  });
  if (!res.ok) throw new Error('Failed to update language');
};

// Проверка доступности OAuth провайдеров
export const getOAuthStatus = async (): Promise<{ google: boolean; facebook: boolean; apple: boolean }> => {
  try {
    console.log('[OAuth Status] Fetching from:', `${API_URL}/auth/oauth/status`);
    const res = await fetch(`${API_URL}/auth/oauth/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[OAuth Status] Response status:', res.status, res.statusText);
    
    if (!res.ok) {
      const text = await res.text();
      console.error('[OAuth Status] Response not OK. Status:', res.status, 'Body:', text);
      return { google: false, facebook: false, apple: false };
    }
    
    const data = await res.json();
    console.log('[OAuth Status] Success:', data);
    return data;
  } catch (error: any) {
    console.error('[OAuth Status] Failed to fetch:', error);
    console.error('[OAuth Status] Error details:', {
      message: error.message,
      API_URL: API_URL
    });
    return { google: false, facebook: false, apple: false };
  }
};

// --- Project / Gallery Services ---

export const getProjects = async (token: string, likedOnly = false): Promise<ProjectResponse[]> => {
  const res = await fetch(`${API_URL}/projects${likedOnly ? '?liked=true' : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
};

export const toggleLikeProject = async (token: string, projectId: string): Promise<void> => {
  await fetch(`${API_URL}/projects/${projectId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getLikedMedia = async (token: string): Promise<any[]> => {
  const res = await fetch(`${API_URL}/projects/liked-media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
};

// --- AI Generation Services ---

export const restorePhoto = async (token: string, imageFile: File | Blob): Promise<{ project: ProjectResponse, creditsLeft: number }> => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const res = await fetch(`${API_URL}/ai/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Restoration failed');
  }
  return res.json();
};

export const generatePrompts = async (token: string, projectId: string): Promise<string[]> => {
  const res = await fetch(`${API_URL}/ai/prompts`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ projectId }),
  });

  if (!res.ok) throw new Error('Failed to generate prompts');
  const data = await res.json();
  return data.prompts;
};

export const generateVideo = async (token: string, projectId: string, selectedPrompts: string[]): Promise<{ videoUrl: string, creditsLeft: number }> => {
  const res = await fetch(`${API_URL}/ai/video`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ projectId, selectedPrompts }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Video generation failed');
  }
  return res.json();
};
