import api from "./api.js";

export const getRecipes     = async (params = {}) => { const r = await api.get("/recipes", { params }); return r.data; };
export const getRecipe      = async (id)          => { const r = await api.get(`/recipes/${id}`); return r.data; };
export const createRecipe   = async (data)        => { const r = await api.post("/recipes", data); return r.data; };
export const updateRecipe   = async (id, data)    => { const r = await api.put(`/recipes/${id}`, data); return r.data; };
export const deleteRecipe   = async (id)          => { const r = await api.delete(`/recipes/${id}`); return r.data; };
export const rateRecipe     = async (id, rating)  => { const r = await api.post(`/recipes/${id}/rate`, { rating }); return r.data; };
export const exportRecipes  = async ()            => { const r = await api.get("/recipes/export", { responseType: "blob" }); return r; };
