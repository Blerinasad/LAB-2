import axios from "axios";
import tokenStore from "./token-store.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Interceptor: shto Authorization header me çdo request
api.interceptors.request.use((config) => {
  const token = tokenStore.get(); // lexon nga localStorage çdo herë
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token logic
let isRefreshing = false;
let pending = [];

function onRefreshed(newToken) {
  pending.forEach((cb) => cb(newToken));
  pending = [];
}
function addPending(cb) { pending.push(cb); }

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err?.response?.status !== 401) return Promise.reject(err);

    // Mos u provo refresh nëse vetë refresh ose login dështoi
    if (
      original?.url?.includes("/auth/refresh-token") ||
      original?.url?.includes("/auth/login") ||
      original?.url?.includes("/auth/me")
    ) return Promise.reject(err);

    if (!tokenStore.get()) return Promise.reject(err);
    if (original._retry) return Promise.reject(err);
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        addPending((newToken) => {
          try {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(original));
          } catch (e) { reject(e); }
        });
      });
    }

    isRefreshing = true;
    try {
      const { data } = await api.post("/auth/refresh-token");
      // Backend tani kthen data.data.accessToken
      const newToken = data.data?.accessToken || data.data?.token || data.accessToken || data.token;
      if (!newToken) throw new Error("No token in refresh response");

      tokenStore.set(newToken);
      isRefreshing = false;
      onRefreshed(newToken);

      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (e) {
      isRefreshing = false;
      pending      = [];
      tokenStore.clear();
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(e);
    }
  }
);

export default api;
