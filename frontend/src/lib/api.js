import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND}/api`;

export const api = axios.create({ baseURL: API_BASE });

export const fetchPrompts = () => api.get("/prompts").then((r) => r.data);

export const listSessions = () => api.get("/sessions").then((r) => r.data);
export const createSession = (data) =>
    api.post("/sessions", data).then((r) => r.data);
export const getSession = (id) => api.get(`/sessions/${id}`).then((r) => r.data);
export const deleteSession = (id) =>
    api.delete(`/sessions/${id}`).then((r) => r.data);

export const uploadTake = (sessionId, promptId, blob, filename) => {
    const fd = new FormData();
    fd.append("prompt_id", promptId);
    fd.append("file", blob, filename);
    return api
        .post(`/sessions/${sessionId}/takes`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
};
export const listTakes = (sessionId, promptId) => {
    const q = promptId ? `?prompt_id=${promptId}` : "";
    return api.get(`/sessions/${sessionId}/takes${q}`).then((r) => r.data);
};
export const updateTake = (sessionId, takeId, data) =>
    api.patch(`/sessions/${sessionId}/takes/${takeId}`, data).then((r) => r.data);
export const deleteTake = (sessionId, takeId) =>
    api.delete(`/sessions/${sessionId}/takes/${takeId}`).then((r) => r.data);

export const audioUrl = (sessionId, filename) =>
    `${API_BASE}/audio/${sessionId}/${filename}`;

export const cleanTake = (sessionId, takeId) =>
    api.post(`/sessions/${sessionId}/takes/${takeId}/clean`).then((r) => r.data);

export const cleanUpload = (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
        .post(`/cleaner/clean`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
};

export const getBiometrics = (sessionId) =>
    api.get(`/sessions/${sessionId}/biometrics`).then((r) => r.data);

export const downloadPackageUrl = (sessionId) =>
    `${API_BASE}/sessions/${sessionId}/package/download`;

export const uploadModel = (sessionId, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
        .post(`/sessions/${sessionId}/model`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
};

export const listApiKeys = (sessionId) => {
    const q = sessionId ? `?session_id=${sessionId}` : "";
    return api.get(`/api-keys${q}`).then((r) => r.data);
};
export const createApiKey = (data) =>
    api.post(`/api-keys`, data).then((r) => r.data);
export const revokeApiKey = (keyId) =>
    api.delete(`/api-keys/${keyId}`).then((r) => r.data);
