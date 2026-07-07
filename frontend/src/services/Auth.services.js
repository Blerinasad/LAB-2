import api from "./api.js";

export const loginUser = async (credentials) => { const r = await api.post("/auth/login", credentials); return r.data; };
export const logoutUser = async () => { const r = await api.post("/auth/logout"); return r.data; };
export const refreshToken = async () => { const r = await api.post("/auth/refresh-token"); return r.data; };
export const getMe = async () => { const r = await api.get("/auth/me"); return r.data; };
