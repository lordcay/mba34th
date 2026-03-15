// services/post.service.js
import api from './api';

const postService = {
  /**
   * Get feed posts
   */
  async getFeed(page = 1, limit = 20) {
    const response = await api.get('/posts/feed', {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * Get a single post by ID
   */
  async getPost(postId) {
    const response = await api.get(`/posts/${postId}`);
    return response.data;
  },

  /**
   * Get posts by a specific user
   */
  async getUserPosts(userId, page = 1, limit = 20) {
    const response = await api.get(`/posts/user/${userId}`, {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * Create a new post
   */
  async createPost({ content, images = [], postType = 'text', visibility = 'public', poll = null }) {
    const response = await api.post('/posts', {
      content,
      images,
      postType,
      visibility,
      poll
    });
    return response.data;
  },

  /**
   * Update a post
   */
  async updatePost(postId, updateData) {
    const response = await api.put(`/posts/${postId}`, updateData);
    return response.data;
  },

  /**
   * Delete a post
   */
  async deletePost(postId) {
    const response = await api.delete(`/posts/${postId}`);
    return response.data;
  },

  /**
   * React to a post
   * @param {string} postId
   * @param {string} type - 'like' | 'love' | 'celebrate' | 'insightful' | 'fire'
   */
  async reactToPost(postId, type = 'like') {
    const response = await api.post(`/posts/${postId}/react`, { type });
    return response.data;
  },

  /**
   * Remove reaction from a post
   */
  async removeReaction(postId) {
    const response = await api.delete(`/posts/${postId}/react`);
    return response.data;
  },

  /**
   * Add a comment to a post
   */
  async addComment(postId, text) {
    const response = await api.post(`/posts/${postId}/comments`, { text });
    return response.data;
  },

  /**
   * Delete a comment
   */
  async deleteComment(postId, commentId) {
    const response = await api.delete(`/posts/${postId}/comments/${commentId}`);
    return response.data;
  },

  /**
   * Like a comment
   */
  async likeComment(postId, commentId) {
    const response = await api.post(`/posts/${postId}/comments/${commentId}/like`);
    return response.data;
  },

  /**
   * Share/repost a post
   */
  async sharePost(postId, content = '') {
    const response = await api.post(`/posts/${postId}/share`, { content });
    return response.data;
  },

  /**
   * Vote on a poll
   */
  async votePoll(postId, optionIndex) {
    const response = await api.post(`/posts/${postId}/poll/vote`, { optionIndex });
    return response.data;
  },

  /**
   * Search posts by hashtag
   */
  async searchByHashtag(hashtag, page = 1, limit = 20) {
    const response = await api.get(`/posts/search/hashtag/${encodeURIComponent(hashtag)}`, {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * Get trending hashtags
   */
  async getTrendingHashtags(limit = 10) {
    const response = await api.get('/posts/trending/hashtags', {
      params: { limit }
    });
    return response.data;
  }
};

export default postService;
