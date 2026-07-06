import api from "./api.js";

export const getShoppingLists     = async (params = {}) => { const r = await api.get("/shopping-lists", { params }); return r.data; };
export const getShoppingList      = async (id)          => { const r = await api.get(`/shopping-lists/${id}`); return r.data; };
export const createShoppingList   = async (data)        => { const r = await api.post("/shopping-lists", data); return r.data; };
export const updateListStatus     = async (id, status)  => { const r = await api.patch(`/shopping-lists/${id}/status`, { status }); return r.data; };
export const deleteShoppingList   = async (id)          => { const r = await api.delete(`/shopping-lists/${id}`); return r.data; };
export const addListItem          = async (id, data)    => { const r = await api.post(`/shopping-lists/${id}/items`, data); return r.data; };
export const purchaseItem         = async (lid, iid)    => { const r = await api.patch(`/shopping-lists/${lid}/items/${iid}/purchase`); return r.data; };
export const deleteListItem       = async (lid, iid)    => { const r = await api.delete(`/shopping-lists/${lid}/items/${iid}`); return r.data; };
export const getListSuggestions   = async (limit = 8)   => { const r = await api.get("/shopping-lists/suggestions", { params: { limit } }); return r.data; };
export const exportList           = async (id)          => { const r = await api.get(`/shopping-lists/${id}/export`, { responseType: "blob" }); return r; };
