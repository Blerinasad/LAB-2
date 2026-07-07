import api from "./api.js";

export const getUsers = async (params = {}) => { const r = await api.get("/users", { params }); return r.data; };
export const getUser = async (id) => { const r = await api.get(`/users/${id}`); return r.data; };
export const createUser = async (data) => { const r = await api.post("/users", data); return r.data; };
export const updateUser = async (id, data) => { const r = await api.put(`/users/${id}`, data); return r.data; };
export const deleteUser = async (id) => { const r = await api.delete(`/users/${id}`); return r.data; };
export const toggleUser = async (id) => { const r = await api.patch(`/users/${id}/toggle`); return r.data; };
