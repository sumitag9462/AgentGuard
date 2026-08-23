import axios from 'axios';

const rawUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').trim().replace(/\/+$/, '');
const baseURL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_API_KEY || 'default-dev-key'
  }
});

export const fetcher = (url: string) => api.get(url).then(res => res.data);

export default api;
