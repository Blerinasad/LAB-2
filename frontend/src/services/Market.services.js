import api from "./api.js";

export const getStores = async () => { const r = await api.get("/market/stores"); return r.data; };
export const getMyOrders = async () => { const r = await api.get("/market/orders/my"); return r.data; };
export const getStoreOrders = async () => { const r = await api.get("/market/orders/store"); return r.data; };
export const getCourierOrders = async () => { const r = await api.get("/market/orders/courier"); return r.data; };
export const getOrder = async (id) => { const r = await api.get(`/market/orders/${id}`); return r.data; };
export const createOrder = async (data) => { const r = await api.post("/market/orders", data); return r.data; };
export const updateOrderStatus = async (id, status)=> { const r = await api.patch(`/market/orders/${id}/status`, { status }); return r.data; };
export const claimOrder = async (id) => { const r = await api.post(`/market/orders/${id}/claim`); return r.data; };
export const rebuyOrder = async (id) => { const r = await api.post(`/market/orders/${id}/rebuy`); return r.data; };
export const getForecast = async () => { const r = await api.get("/market/orders/forecast"); return r.data; };
