import {
  collection,
  doc,
  setDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseInitialized } from './firebaseService';
import { ChatSession, Message } from '../types';

// Helper to convert Firestore Timestamps to JS Date objects and vice-versa
const convertMessageTimestampsForFirestore = (messages: Message[]): any[] => {
  return messages.map(msg => ({
    ...msg,
    timestamp: Timestamp.fromDate(new Date(msg.timestamp)), // Ensure it's a JS Date before converting
  }));
};

const parseMessagesFromFirestore = (messages: any[]): Message[] => {
  return messages.map(msg => ({
    ...msg,
    timestamp: (msg.timestamp as Timestamp).toDate(),
  }));
};


export const saveChatSessionToFirestore = async (userId: string, session: ChatSession): Promise<void> => {
  if (!isFirebaseInitialized()) {
    // console.log("Firebase not initialized. Skipping save chat session to Firestore.");
    return;
  }
  const db = getFirestoreDb();
  if (!db) return;

  const sessionForFirestore = {
    ...session,
    messages: convertMessageTimestampsForFirestore(session.messages),
    lastActive: Timestamp.fromDate(new Date(session.lastActive)),
  };

  try {
    const sessionRef = doc(db, 'users', userId, 'chats', session.id);
    await setDoc(sessionRef, sessionForFirestore);
  } catch (error) {
    console.error("Error saving chat session to Firestore:", error);
    // Do not throw error to UI, just log it.
  }
};

export const loadChatSessionsFromFirestore = async (userId: string): Promise<ChatSession[]> => {
  if (!isFirebaseInitialized()) {
    // console.log("Firebase not initialized. Skipping load chat sessions from Firestore.");
    return [];
  }
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const chatsCollectionRef = collection(db, 'users', userId, 'chats');
    const q = query(chatsCollectionRef, orderBy('lastActive', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title,
        messages: parseMessagesFromFirestore(data.messages || []),
        lastActive: (data.lastActive as Timestamp).toDate(),
        systemInstruction: data.systemInstruction,
      } as ChatSession;
    });
  } catch (error) {
    console.error("Error loading chat sessions from Firestore:", error);
    return []; // Return empty array on error
  }
};

export const deleteChatSessionFromFirestore = async (userId: string, sessionId: string): Promise<void> => {
    if (!isFirebaseInitialized()) {
        // console.log("Firebase not initialized. Skipping delete chat session from Firestore.");
        return;
    }
    const db = getFirestoreDb();
    if (!db) return;

    try {
        const sessionRef = doc(db, 'users', userId, 'chats', sessionId);
        await deleteDoc(sessionRef);
    } catch (error) {
        console.error("Error deleting chat session from Firestore:", error);
        // Do not throw error to UI
    }
};

export const clearAllUserChatsFromFirestore = async (userId: string): Promise<void> => {
    if (!isFirebaseInitialized()) {
        // console.log("Firebase not initialized. Skipping clear user chats from Firestore.");
        return;
    }
    const db = getFirestoreDb();
    if (!db) return;

    try {
        const chatsCollectionRef = collection(db, 'users', userId, 'chats');
        const querySnapshot = await getDocs(chatsCollectionRef);
        const batch = writeBatch(db);
        querySnapshot.docs.forEach(docSnap => {
            batch.delete(docSnap.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error("Error clearing all user chats from Firestore:", error);
        // Do not throw error to UI
    }
};