export enum Sender {
  User = 'user',
  Bot = 'bot',
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  isError?: boolean;
  streaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastActive: Date; // Timestamp of the last message or creation
  systemInstruction?: string; // Optional: if system instructions can vary per chat
}

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null; // Optional: if you want to display user's Google profile picture
}