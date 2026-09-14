import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { chatApi } from '../api/chat';
import type { Conversation, ChatContextData } from '../types/chat';

interface ChatContextType {
  isOpen: boolean;
  isMinimized: boolean;
  unreadCount: number;
  activeConversation: Conversation | null;
  conversations: Conversation[];
  openChatWith: (recipientId: string, context?: ChatContextData, initialMessage?: string) => Promise<Conversation | null>;
  openConversation: (conv: Conversation) => void;
  closeChat: () => void;
  minimizeChat: () => void;
  maximizeChat: () => void;
  refreshUnreadCount: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  setActiveConversation: (conv: Conversation | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const isFetchingRef = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const count = await chatApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // ignore network glitches
    }
  }, [user]);

  const refreshConversations = useCallback(async () => {
    if (!user || isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      const list = await chatApi.listConversations();
      setConversations(list);
    } catch {
      // ignore network glitches
    } finally {
      isFetchingRef.current = false;
    }
  }, [user]);

  // Periodic polling for unread badge count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setConversations([]);
      setActiveConversation(null);
      return;
    }

    refreshUnreadCount();
    refreshConversations();

    const interval = setInterval(() => {
      refreshUnreadCount();
      if (isOpen) {
        refreshConversations();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [user, isOpen, refreshUnreadCount, refreshConversations]);

  const openChatWith = async (
    recipientId: string,
    context?: ChatContextData,
    initialMessage?: string
  ): Promise<Conversation | null> => {
    if (!user) {
      window.location.href = '/login';
      return null;
    }
    if (user.id === recipientId) {
      return null; // Don't chat with self
    }

    try {
      const conv = await chatApi.createOrGetConversation({
        recipientId,
        context,
        initialMessage,
      });

      setActiveConversation(conv);
      setIsOpen(true);
      setIsMinimized(false);
      refreshConversations();
      refreshUnreadCount();
      return conv;
    } catch (err) {
      console.error('Failed to open chat:', err);
      return null;
    }
  };

  const openConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setIsOpen(true);
    setIsMinimized(false);
    setConversations((prev) => {
      if (prev.some((c) => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  const maximizeChat = () => {
    setIsMinimized(false);
  };

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        isMinimized,
        unreadCount,
        activeConversation,
        conversations,
        openChatWith,
        openConversation,
        closeChat,
        minimizeChat,
        maximizeChat,
        refreshUnreadCount,
        refreshConversations,
        setActiveConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
