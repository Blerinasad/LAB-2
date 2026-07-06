import api from "./api.js";

export const getSummary       = async ()            => { const r = await api.get("/reports/summary"); return r.data; };
export const getWasteReport   = async (params = {}) => { const r = await api.get("/reports/waste", { params }); return r.data; };
export const getConsumption   = async (params = {}) => { const r = await api.get("/reports/consumption", { params }); return r.data; };
export const getAuditLog      = async (params = {}) => { const r = await api.get("/reports/audit", { params }); return r.data; };
export const exportReport     = async (type, params)=> { const r = await api.get(`/reports/${type}/export`, { params, responseType: "blob" }); return r; };
