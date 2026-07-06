import api from "./api.js";

export const getDashboardSummary  = async () => { const r = await api.get("/dashboard/summary"); return r.data; };
export const getDashboardActivity = async (limit=10) => { const r = await api.get("/dashboard/activity", { params:{limit} }); return r.data; };
export const getDashboardCharts   = async () => { const r = await api.get("/dashboard/charts"); return r.data; };
