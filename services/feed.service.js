import api from "./api";

/**
 * Street Gist / Feed APIs
 */

export const getTodayGist = async () => {
  const res = await api.get("/feed/today");
  return res.data;
};

export const createTodayGist = async (payload) => {
  const res = await api.post("/feed", payload);
  return res.data;
};

export const voteOnGist = async (postId, type) => {
  const res = await api.post(`/feed/${postId}/vote`, { type });
  return res.data;
};

export const getGistComments = async (postId) => {
  const res = await api.get(`/feed/${postId}/comments`);
  return res.data;
};

export const addGistComment = async (postId, text) => {
  const res = await api.post(`/feed/${postId}/comments`, { text });
  return res.data;
};
