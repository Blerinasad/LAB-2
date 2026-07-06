import api from "./api.js";

export const getMLRecommendations = async ()       => { const r = await api.get("/ml/recommendations/my"); return r.data; };
export const getClassifiers       = async (retrain)=> { const r = await api.get("/ml/classifiers/compare", { params: { retrain: retrain ? "true" : undefined } }); return r.data; };
export const getClustering        = async (k = 3)  => { const r = await api.get("/ml/clustering/my", { params: { n_clusters: k } }); return r.data; };
export const getPreferences       = async ()       => { const r = await api.get("/ml/preferences/my"); return r.data; };
export const predictRisk          = async (data)   => { const r = await api.post("/ml/classify/risk", data); return r.data; };
