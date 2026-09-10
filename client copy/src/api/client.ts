import axios from "axios";
import type { ApiResponse } from "../types";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
export const api = axios.create({ baseURL, withCredentials: true });

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

const refresh = async () => {
  if (!refreshing) {
    refreshing = axios
      .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        const token = data?.data?.accessToken ?? null;
        setAccessToken(token);
        return token;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original?._retry &&
      !String(original?.url).includes("/auth/")
    ) {
      original._retry = true;
      const token = await refresh();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export const unwrap = <T>(request: Promise<{ data: ApiResponse<T> }>) =>
  request.then((r) => r.data.data);
