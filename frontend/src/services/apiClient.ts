import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_API_KEY || 'default-dev-key'
  }
});

export const fetcher = (url: string) => api.get(url).then(res => res.data);

export default api;
