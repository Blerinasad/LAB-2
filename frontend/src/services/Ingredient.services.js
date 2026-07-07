import api from "./api.js";

export const getIngredients = async (params = {}) => { const r = await api.get("/ingredients", { params }); return r.data; };
export const getIngredient = async (id) => { const r = await api.get(`/ingredients/${id}`); return r.data; };
export const createIngredient = async (data) => { const r = await api.post("/ingredients", data); return r.data; };
export const updateIngredient = async (id, data) => { const r = await api.put(`/ingredients/${id}`, data); return r.data; };
export const deleteIngredient = async (id) => { const r = await api.delete(`/ingredients/${id}`); return r.data; };
export const getCategories = async () => { const r = await api.get("/categories"); return r.data; };
