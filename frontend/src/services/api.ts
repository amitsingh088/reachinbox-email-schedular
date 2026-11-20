import axios from 'axios';
import type { Email, EmailStats, ScheduleEmailRequest } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const getScheduledEmails = async (): Promise<Email[]> => {
  const { data } = await api.get('/emails/scheduled');
  return Array.isArray(data) ? data : (data.emails || []);
};

export const getSentEmails = async (): Promise<Email[]> => {
  const { data } = await api.get('/emails/sent');
  return Array.isArray(data) ? data : (data.emails || []);
};

export const searchEmails = async (q: string): Promise<Email[]> => {
  const { data } = await api.get('/emails/search', { params: { q } });
  return Array.isArray(data) ? data : (data.results || data.emails || []);
};

export const getStats = async (): Promise<EmailStats> => {
  const { data } = await api.get('/emails/stats');
  return data;
};

export const scheduleEmails = async (
  reqData: ScheduleEmailRequest,
  file?: File
): Promise<Email[]> => {
  const formData = new FormData();
  formData.append('sender', reqData.sender);
  formData.append('recipients', JSON.stringify(reqData.recipients));
  formData.append('subject', reqData.subject);
  formData.append('body', reqData.body);
  formData.append('scheduledAt', reqData.scheduledAt);
  formData.append('delayBetweenMs', String(reqData.delayBetweenMs));
  formData.append('hourlyLimit', String(reqData.hourlyLimit));
  if (file) {
    formData.append('file', file);
  }
  const { data } = await api.post('/emails/schedule', formData);
  return Array.isArray(data) ? data : (data.emails || []);
};

export const getSlackStatus = async (): Promise<{ connected: boolean }> => {
  const { data } = await api.get('/slack/status');
  return data;
};

export const connectSlack = (): void => {
  const token = localStorage.getItem('token');
  window.location.href = `/api/slack/connect?token=${token}`;
};

export default api;
