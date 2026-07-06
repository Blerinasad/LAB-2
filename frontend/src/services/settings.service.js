import api from "./api.js";

export const getSettings = async () => {
  const r = await api.get("/settings");
  return r.data;
};

export const updateSetting = async (key, value) => {
  const r = await api.put(`/settings/${encodeURIComponent(key)}`, { value });
  return r.data;
};
