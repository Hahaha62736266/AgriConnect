import { apiClient } from './index';
import type { Comment, CreateCommentPayload, CreatePostPayload, UpdatePostPayload, Post, PostReaction, ReactionType } from '../types/community';

export const communityApi = {
  listPosts: async (category?: string): Promise<Post[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    const res = await apiClient.get<Post[]>(`/api/community/posts?${params.toString()}`);
    return res.data;
  },

  getPostByID: async (id: string): Promise<Post> => {
    const res = await apiClient.get<Post>(`/api/community/posts/${id}`);
    return res.data;
  },

  createPost: async (payload: CreatePostPayload): Promise<Post> => {
    const res = await apiClient.post<Post>('/api/community/posts', payload);
    return res.data;
  },

  reactToPost: async (postId: string, reaction: ReactionType): Promise<Post> => {
    const res = await apiClient.post<Post>(`/api/community/posts/${postId}/react`, { reaction });
    return res.data;
  },

  getPostReactions: async (postId: string): Promise<PostReaction[]> => {
    const res = await apiClient.get<PostReaction[]>(`/api/community/posts/${postId}/reactions`);
    return res.data;
  },

  toggleUpvote: async (postId: string): Promise<{ isUpvoted: boolean }> => {
    const res = await apiClient.post<{ isUpvoted: boolean }>(`/api/community/posts/${postId}/upvote`);
    return res.data;
  },

  listComments: async (postId: string): Promise<Comment[]> => {
    const res = await apiClient.get<Comment[]>(`/api/community/posts/${postId}/comments`);
    return res.data;
  },

  createComment: async (postId: string, payload: CreateCommentPayload): Promise<Comment> => {
    const res = await apiClient.post<Comment>(`/api/community/posts/${postId}/comments`, payload);
    return res.data;
  },

  uploadMedia: async (file: File): Promise<{ url: string; filename: string; fileType: 'image' | 'video' }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<{ url: string; filename: string; fileType: 'image' | 'video' }>('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updatePost: async (id: string, payload: UpdatePostPayload): Promise<Post> => {
    const res = await apiClient.put<Post>(`/api/community/posts/${id}`, payload);
    return res.data;
  },

  deletePost: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/community/posts/${id}`);
  },

  listMyPosts: async (): Promise<Post[]> => {
    const res = await apiClient.get<Post[]>('/api/community/posts/my');
    return res.data;
  },
};
