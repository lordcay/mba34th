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
  async createPost({ content, images = [], postType = 'text', visibility = 'public', poll = null, documents = [] }) {
    const response = await api.post('/posts', {
      content,
      images,
      postType,
      visibility,
      poll,
      documents
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
   * Reply to a comment
   */
  async replyToComment(postId, commentId, text) {
    const response = await api.post(`/posts/${postId}/comments/${commentId}/reply`, { text });
    return response.data;
  },

  /**
   * Like a reply
   */
  async likeReply(postId, commentId, replyIndex) {
    const response = await api.post(`/posts/${postId}/comments/${commentId}/replies/${replyIndex}/like`);
    return response.data;
  },

  /**
   * Share/repost a post
   */
  async sharePost(postId, content = null, visibility = 'public') {
    const body = { visibility };
    if (content) body.content = content;
    const response = await api.post(`/posts/${postId}/share`, body);
    return response.data;
  },

  /**
   * Share post to specific connections with notifications
   * @param {string} postId - The ID of the post to share
   * @param {string[]} connectionIds - Array of connection user IDs to share with
   * @param {string} message - Optional message to send with the share
   */
  async shareToConnections(postId, connectionIds, message = '') {
    const response = await api.post(`/posts/${postId}/share/connections`, {
      connectionIds,
      message
    });
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
  },

  /**
   * Report a post
   * @param {string} postId - The ID of the post to report
   * @param {string} reasonCategory - Category of the report
   * @param {string} reason - Detailed reason
   */
  async reportPost(postId, reasonCategory, reason) {
    const response = await api.post(`/reports/post/${postId}`, {
      reasonCategory,
      reason
    });
    return response.data;
  },

  /**
   * Report a comment
   * @param {string} postId - The ID of the post containing the comment
   * @param {string} commentId - The ID of the comment to report
   * @param {string} reasonCategory - Category of the report
   * @param {string} reason - Detailed reason
   */
  async reportComment(postId, commentId, reasonCategory, reason) {
    const response = await api.post(`/reports/post/${postId}/comment/${commentId}`, {
      reasonCategory,
      reason
    });
    return response.data;
  }
};

export default postService;
