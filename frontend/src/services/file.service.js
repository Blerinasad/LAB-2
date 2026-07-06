import api from "./api.js";

export const uploadFile  = async (file, entity, entity_id) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("entity", entity);
  fd.append("entity_id", entity_id);
  const r = await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return r.data;
};
export const deleteFile  = async (id) => { const r = await api.delete(`/files/${id}`); return r.data; };
