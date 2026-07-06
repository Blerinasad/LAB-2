import api from "./api.js";

export const getNotifications  = async (params = {}) => { const r = await api.get("/notifications", { params }); return r.data; };
export const markRead          = async (id)          => { const r = await api.patch(`/notifications/${id}/read`); return r.data; };
export const markAllRead       = async ()            => { const r = await api.patch("/notifications/read-all"); return r.data; };
export const getUnreadCount    = async ()            => { const r = await api.get("/notifications/unread-count"); return r.data; };
