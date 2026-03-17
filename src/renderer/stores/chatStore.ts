// @TASK P4-S6 - Chat state management (renderer-only, no IPC)
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatMessage } from '@shared/types';

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
}

interface ChatActions {
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setTyping: (typing: boolean) => void;
  clearMessages: () => void;
}

type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  messages: [],
  isTyping: false,
};

export const useChatStore = create<ChatStore>()(
  devtools(
    (set) => ({
      ...initialState,

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      setMessages: (messages) => set({ messages }),

      setTyping: (isTyping) => set({ isTyping }),

      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'ChatStore', enabled: process.env.NODE_ENV === 'development' },
  ),
);
