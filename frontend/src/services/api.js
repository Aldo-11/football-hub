import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let currentAccessToken = null;

export const setAccessToken = (token) => {
  currentAccessToken = token;
};

export const getAccessToken = () => currentAccessToken;

// Interceptor para inyectar token de autorización
api.interceptors.request.use((config) => {
  if (currentAccessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return config;
});

// Interceptor para renovar token expirado (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login') && !originalRequest.url.includes('/auth/refresh')) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = refreshResponse.data.accessToken;
        setAccessToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;