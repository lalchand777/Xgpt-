import { ChatSession, Message } from '../types';

const CHAT_SESSIONS_KEY = 'xgptChatSessions';
const ACTIVE_CHAT_ID_KEY = 'xgptActiveChatId';

// Helper to ensure messages have Date objects after parsing from JSON
const parseMessages = (messages: any[]): Message[] => {
  return messages.map(msg => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));
};

export const saveChatSessions = (sessions: ChatSession[]): void => {
  try {
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving chat sessions to localStorage:", error);
  }
};

export const loadChatSessions = (): ChatSession[] => {
  try {
    const storedSessions = localStorage.getItem(CHAT_SESSIONS_KEY);
    if (storedSessions) {
      const parsed = JSON.parse(storedSessions) as any[];
      return parsed.map(session => ({
        ...session,
        messages: parseMessages(session.messages || []),
        lastActive: new Date(session.lastActive),
      }));
    }
  } catch (error) {
    console.error("Error loading chat sessions from localStorage:", error);
    // Return empty array or default if loading fails
  }
  return [];
};

export const saveActiveChatId = (chatId: string | null): void => {
  try {
    if (chatId) {
      localStorage.setItem(ACTIVE_CHAT_ID_KEY, chatId);
    } else {
      localStorage.removeItem(ACTIVE_CHAT_ID_KEY);
    }
  } catch (error) {
    console.error("Error saving active chat ID to localStorage:", error);
  }
};

export const loadActiveChatId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_CHAT_ID_KEY);
  } catch (error) {
    console.error("Error loading active chat ID from localStorage:", error);
  }
  return null;
};
