import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_V1 = `${API_BASE}/api/v1`;

const api = axios.create({
  baseURL: API_V1,
  headers: { "Content-Type": "application/json" },
});

// Автоматически приклеиваем JWT токен к каждому запросу
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Токен недействителен — разлогиниваем
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

export { API_V1 };
