import api from "./api.js";

export const getMealPlans = async (params = {}) => { const r = await api.get("/meal-plans", { params }); return r.data; };
export const getMealPlan = async (id) => { const r = await api.get(`/meal-plans/${id}`); return r.data; };
export const createMealPlan = async (data) => { const r = await api.post("/meal-plans", data); return r.data; };
export const updateMealPlan = async (id, data) => { const r = await api.put(`/meal-plans/${id}`, data); return r.data; };
export const deleteMealPlan = async (id) => { const r = await api.delete(`/meal-plans/${id}`); return r.data; };
export const generateList = async (id) => { const r = await api.post(`/meal-plans/${id}/generate-shopping`); return r.data; };
