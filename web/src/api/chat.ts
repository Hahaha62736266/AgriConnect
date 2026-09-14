import { apiClient } from './index';
import type {
  Conversation,
  ChatMessage,
  CreateConversationPayload,
  SendMessagePayload,
  ChatUnreadCountResponse,
} from '../types/chat';

export const chatApi = {
  createOrGetConversation: async (payload: CreateConversationPayload): Promise<Conversation> => {
    const res = await apiClient.post<Conversation>('/api/chat/conversations', payload);
    return res.data;
  },

  listConversations: async (): Promise<Conversation[]> => {
    const res = await apiClient.get<Conversation[]>('/api/chat/conversations');
    return res.data;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const res = await apiClient.get<Conversation>(`/api/chat/conversations/${id}`);
    return res.data;
  },

  listMessages: async (conversationId: string): Promise<ChatMessage[]> => {
    if (!conversationId || conversationId.startsWith('support_')) {
      return [];
    }
    try {
      const res = await apiClient.get<ChatMessage[]>(`/api/chat/conversations/${conversationId}/messages`);
      return res.data;
    } catch {
      return [];
    }
  },

  sendMessage: async (conversationId: string, payload: SendMessagePayload): Promise<ChatMessage> => {
    const res = await apiClient.post<ChatMessage>(`/api/chat/conversations/${conversationId}/messages`, payload);
    return res.data;
  },

  markAsRead: async (conversationId: string): Promise<void> => {
    if (!conversationId || conversationId.startsWith('support_')) return;
    try {
      await apiClient.put(`/api/chat/conversations/${conversationId}/read`);
    } catch {
      // ignore
    }
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get<ChatUnreadCountResponse>('/api/chat/unread-count');
    return res.data.unreadCount;
  },
};
