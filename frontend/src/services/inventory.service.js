import api from "./api.js";

export const getInventory         = async (params = {}) => { const r = await api.get("/inventory", { params }); return r.data; };
export const getInventoryItem     = async (id)          => { const r = await api.get(`/inventory/${id}`); return r.data; };
export const createInventoryItem  = async (data)        => { const r = await api.post("/inventory", data); return r.data; };
export const updateInventoryItem  = async (id, data)    => { const r = await api.put(`/inventory/${id}`, data); return r.data; };
export const deleteInventoryItem  = async (id)          => { const r = await api.delete(`/inventory/${id}`); return r.data; };
export const getExpiringItems     = async (days = 3)    => { const r = await api.get("/inventory/expiring", { params: { days } }); return r.data; };
export const exportInventory      = async ()            => { const r = await api.get("/inventory/export", { responseType: "blob" }); return r; };
export const importInventory      = async (file)        => {
  const fd = new FormData(); fd.append("file", file);
  const r = await api.post("/inventory/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return r.data;
};
