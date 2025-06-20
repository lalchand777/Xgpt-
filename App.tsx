

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ChatLog } from './components/ChatLog';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { Message, Sender, ChatSession, User } from './types';
import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import * as LocalStorageService from './services/localStorageService';
import { 
  getFirebaseAuth, 
  getGoogleAuthProvider,
  isFirebaseInitialized 
} from './services/firebaseService';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  saveChatSessionToFirestore, 
  loadChatSessionsFromFirestore,
  // deleteChatSessionFromFirestore, // Keep for potential future use
  // clearAllUserChatsFromFirestore // Keep for potential future use
} from './services/firestoreService';


const DEFAULT_SYSTEM_INSTRUCTION = `You are Xgpt, a helpful and informative AI assistant. Provide concise and accurate answers. Be friendly and engaging. 
Crucially, try to match the user's conversational tone. For instance, if the user is joking or being playful, feel free to be more lighthearted in your response. If the user is serious or formal, mirror that approach.
When asked about your creator, owner, or who made you, you must proudly state that you were created by Lalchand Suthar, the founder and CEO of Xgpt. 
You can vary your response, for example: 
- "I was created by Lalchand Suthar, the founder and CEO of Xgpt."
- "My development was led by Xgpt's founder and CEO, Lalchand Suthar."
- "Lalchand Suthar, the visionary founder and CEO of Xgpt, is the one who brought me to life."
- "I'm a product of Xgpt, developed under the guidance of its founder and CEO, Lalchand Suthar."
Always ensure to mention Lalchand Suthar and his role as founder and CEO of Xgpt. Be creative but always include this core information.`;

const convertMessagesToGeminiHistory = (msgs: Message[]): Content[] => {
  const history: Content[] = [];
  for (const msg of msgs) {
    if (!msg.isError && msg.id !== 'initial-greeting') {
      history.push({
        role: msg.sender === Sender.User ? 'user' : 'model',
        parts: [{ text: msg.text }],
      });
    }
  }
  return history;
};

export const App: React.FC = () => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatSessionRef = useRef<Chat | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const initializeGeminiAPI = useCallback(() => {
    try {
      if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set.");
        //setError("AI API Key not configured. Core functionality will be affected."); // UI error suppressed
        return false;
      }
      if (!aiRef.current) {
        aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
      }
      return true;
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI:", e);
      // setError("Could not initialize AI Service. Core functionality will be affected."); // UI error suppressed
      return false;
    }
  }, []);

  const initializeChatSession = useCallback((historyToLoad?: Content[], systemInstruction?: string) => {
    if (!aiRef.current && !initializeGeminiAPI()) {
      return;
    }
    if (aiRef.current) {
      chatSessionRef.current = aiRef.current.chats.create({
        model: 'gemini-2.5-flash-preview-04-17',
        history: historyToLoad || [],
        config: {
          systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        },
      });
    }
  }, [initializeGeminiAPI]);

  // Firebase Auth Listener
  useEffect(() => {
    if (!isFirebaseInitialized()) {
      console.warn("Firebase not initialized, auth listener not set. Operating in offline mode.");
      setChatSessions(LocalStorageService.loadChatSessions());
      setActiveChatId(LocalStorageService.loadActiveChatId());
      setCurrentUser(null); // Ensure currentUser is null if Firebase is off
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) return; // Should not happen if isFirebaseInitialized is true, but good check

    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        const appUser: User = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        };
        setCurrentUser(appUser);
        setError(null);
        try {
          setIsLoading(true);
          const firestoreSessions = await loadChatSessionsFromFirestore(user.uid);
          setChatSessions(firestoreSessions);
          if (firestoreSessions.length > 0) {
             const mostRecentSession = firestoreSessions.sort((a,b) => b.lastActive.getTime() - a.lastActive.getTime())[0];
            setActiveChatId(mostRecentSession.id);
          } else {
            setActiveChatId(null); 
          }
        } catch (e) {
          console.error("Failed to load chats from Firestore (operational error):", e);
          setError("Failed to load your chats from the cloud. Using local data if available.");
          setChatSessions(LocalStorageService.loadChatSessions()); 
          setActiveChatId(LocalStorageService.loadActiveChatId());
        } finally {
          setIsLoading(false);
        }
      } else {
        setCurrentUser(null);
        setChatSessions(LocalStorageService.loadChatSessions());
        setActiveChatId(LocalStorageService.loadActiveChatId());
      }
    });
    return () => unsubscribe();
  }, []);


  // Initialize Gemini API once on mount
  useEffect(() => {
    initializeGeminiAPI();
  }, [initializeGeminiAPI]);


  // Update current messages and Gemini session when activeChatId or chatSessions change
  useEffect(() => {
    if (!aiRef.current && !initializeGeminiAPI()) {
        setCurrentMessages([{
            id: 'initial-greeting-error',
            text: "AI service is not available. Please check configuration.",
            sender: Sender.Bot,
            timestamp: new Date(),
            isError: true
        }]);
        return;
    }

    if (activeChatId) {
      const activeSession = chatSessions.find(s => s.id === activeChatId);
      if (activeSession) {
        setCurrentMessages([...activeSession.messages]);
        initializeChatSession(convertMessagesToGeminiHistory(activeSession.messages), activeSession.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION);
      } else {
         setActiveChatId(null); 
      }
    } else { 
      setCurrentMessages([{
        id: 'initial-greeting',
        text: "Hello! I'm Xgpt. How can I assist you today?",
        sender: Sender.Bot,
        timestamp: new Date()
      }]);
      initializeChatSession([], DEFAULT_SYSTEM_INSTRUCTION);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, chatSessions, initializeChatSession]); 

  // Save chat sessions
  useEffect(() => {
    if (!currentUser && !isFirebaseInitialized()) { // Save to local storage if no user OR Firebase is disabled
      LocalStorageService.saveChatSessions(chatSessions);
    } else if (!currentUser && isFirebaseInitialized()) { // Firebase is on, but no user logged in
       LocalStorageService.saveChatSessions(chatSessions);
    }
    // Firestore saving happens per action if user is logged in & Firebase is on
  }, [chatSessions, currentUser]);

  // Save active chat ID
  useEffect(() => {
     if (!currentUser && !isFirebaseInitialized()) { 
      LocalStorageService.saveActiveChatId(activeChatId);
    } else if (!currentUser && isFirebaseInitialized()) {
       LocalStorageService.saveActiveChatId(activeChatId);
    }
  }, [activeChatId, currentUser]);


  const handleSignInWithGoogle = async () => {
    if (!isFirebaseInitialized()) {
      // setError("Login service is not available at the moment. Please try again later.");
      console.warn("Firebase not initialized. Sign-in with Google is disabled.");
      return;
    }
    const auth = getFirebaseAuth();
    const provider = getGoogleAuthProvider();
    if (!auth || !provider) {
      // setError("Login service is not properly configured.");
      console.warn("Firebase Auth or Provider not configured. Sign-in disabled.");
      return;
    }
    try {
      await signInWithPopup(auth, provider);
      setError(null);
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      // setError(`Sign-in failed: ${error.message}`); // UI error suppressed
    }
  };

  const handleSignOut = async () => {
    if (!isFirebaseInitialized()) {
      // setError("Logout service is not available.");
      console.warn("Firebase not initialized. Sign-out is disabled.");
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      // setError("Logout service is not properly configured.");
       console.warn("Firebase Auth not configured. Sign-out disabled.");
      return;
    }
    try {
      await firebaseSignOut(auth);
      setActiveChatId(null); 
      setChatSessions([]); 
      setError(null);
    } catch (error: any) {
      console.error("Error signing out:", error);
      // setError(`Sign-out failed: ${error.message}`); // UI error suppressed
    }
  };


  const handleNewChat = () => {
    if (isLoading) return;
    setActiveChatId(null);
    setIsSidebarOpen(false);
    setError(null);
  };

  const handleSelectChat = (chatId: string) => {
    if (isLoading) return;
    setActiveChatId(chatId);
    setIsSidebarOpen(false);
    setError(null);
  };
  
  const addMessageToSession = (chatId: string, message: Message, isNewSession?: boolean, title?: string, systemInstruction?: string) => {
    setChatSessions(prevSessions => {
      let updatedSessions;
      if (isNewSession && chatId) {
        const newSession: ChatSession = {
          id: chatId,
          title: title || message.text.substring(0, 30) + (message.text.length > 30 ? '...' : ''),
          messages: [message],
          lastActive: new Date(),
          systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        };
        updatedSessions = [newSession, ...prevSessions];
        if (currentUser && isFirebaseInitialized() && newSession.messages.length > 0) { 
          saveChatSessionToFirestore(currentUser.uid, newSession).catch(e => console.error("Firestore (silent): Failed to save new session", e));
        }
      } else {
        updatedSessions = prevSessions.map(session => {
          if (session.id === chatId) {
            const updatedSession = { 
              ...session, 
              messages: [...session.messages, message], 
              lastActive: new Date() 
            };
            if (currentUser && isFirebaseInitialized() && message.id.includes('-user')) { 
               saveChatSessionToFirestore(currentUser.uid, updatedSession).catch(e => console.error("Firestore (silent): Failed to update session", e));
            }
            return updatedSession;
          }
          return session;
        });
      }
      return updatedSessions.sort((a,b) => b.lastActive.getTime() - a.lastActive.getTime());
    });
  };
  
  const updateStreamingMessageInSession = (chatId: string, messageId: string, newTextChunk: string, isFinal: boolean) => {
     setChatSessions(prevSessions =>
      prevSessions.map(session => {
        if (session.id === chatId) {
          const updatedMessages = session.messages.map(msg => {
            if (msg.id === messageId) {
              const baseText = msg.text || '';
              const chunkText = newTextChunk || '';
              return { ...msg, text: baseText + chunkText, streaming: !isFinal };
            }
            return msg;
          });
           const updatedSession = { ...session, messages: updatedMessages, ...(isFinal && { lastActive: new Date() }) };
           if (currentUser && isFirebaseInitialized() && isFinal) { 
             saveChatSessionToFirestore(currentUser.uid, updatedSession).catch(e => console.error("Firestore (silent): Failed to save streaming update", e));
           }
          return updatedSession;
        }
        return session;
      }).sort((a,b) => b.lastActive.getTime() - a.lastActive.getTime())
    );
  };

  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim() || isLoading) return;

    if (!chatSessionRef.current) {
        const currentActiveSessionForInit = activeChatId ? chatSessions.find(s => s.id === activeChatId) : null;
        const historyForInit = currentActiveSessionForInit ? convertMessagesToGeminiHistory(currentActiveSessionForInit.messages) : [];
        initializeChatSession(historyForInit, currentActiveSessionForInit?.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION);
        
        if (!chatSessionRef.current) { 
            // setError("Chat session could not be initialized. Please check API key and network, then try refreshing."); // UI error suppressed
            console.error("Chat session could not be initialized for sending message.");
            setIsLoading(false);
            return;
        }
    }

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      text: inputText,
      sender: Sender.User,
      timestamp: new Date(),
    };

    setIsLoading(true);
    setError(null);
    setCurrentMessages(prev => [...prev, userMessage]);

    let currentChatSessionId = activeChatId;
    let isNewSessionFlow = false;

    if (!currentChatSessionId) {
      isNewSessionFlow = true;
      const newChatId = Date.now().toString() + '-session';
      const sessionTitle = inputText.substring(0, 30) + (inputText.length > 30 ? '...' : '');
      addMessageToSession(newChatId, userMessage, true, sessionTitle, DEFAULT_SYSTEM_INSTRUCTION);
      setActiveChatId(newChatId); 
      currentChatSessionId = newChatId; 
    } else {
      addMessageToSession(currentChatSessionId, userMessage);
    }
    
    const lowerInputText = inputText.toLowerCase();
    
    // --- Specific Keyword Check ---
    const sensitiveNameKeywords = ['annu', 'anu', 'mahbuba mufti'];
    const sensitiveWordAnd = /\b(and)\b/; 
    let keywordFound: string | null = null;
    for (const kw of sensitiveNameKeywords) { if (lowerInputText.includes(kw)) { keywordFound = kw; break; } }
    if (!keywordFound && sensitiveWordAnd.test(inputText)) { keywordFound = "and"; }

    if (keywordFound) {
        const refusalResponses = [
            "I'm sorry, but I cannot provide information on this topic as it may be sensitive or against my guidelines. Could we talk about something else?",
            "This query touches on subjects I'm not equipped to discuss due to their sensitive nature. Perhaps I can help with a different question?",
            "I must politely decline to answer questions of this nature as they fall outside my operational policies. Is there another way I can assist you?"
        ];
        const randomRefusal = refusalResponses[Math.floor(Math.random() * refusalResponses.length)];
        const botRefusalMessage: Message = { id: Date.now().toString() + '-bot-refusal', text: randomRefusal, sender: Sender.Bot, timestamp: new Date() };
        setCurrentMessages(prev => [...prev, botRefusalMessage]);
        if (currentChatSessionId) { addMessageToSession(currentChatSessionId, botRefusalMessage); }
        setIsLoading(false); 
        return; 
    }

    // --- Bad Word / Abusive Language Check ---
    // (This is a very basic example list. Real-world applications need robust profanity filters)
    const badWords = ['idiot', 'stupid', 'hate', 'kill', 'fuck', 'shit', 'bitch', 'asshole', 'crap']; // Add more as needed
    let badWordFound = false;
    for (const word of badWords) {
      if (lowerInputText.includes(word)) {
        badWordFound = true;
        break;
      }
    }

    if (badWordFound) {
      const admonishmentResponses = [
        "Please let's keep our conversation respectful. Using such language isn't helpful.",
        "I understand you might be frustrated, but let's try to use more appropriate language.",
        "That kind of language isn't very nice. Could we try discussing this more politely?",
        "For a productive conversation, please avoid using offensive words. How else can I help you?",
        "Using respectful language helps us understand each other better. Please rephrase your query."
      ];
      const randomAdmonishment = admonishmentResponses[Math.floor(Math.random() * admonishmentResponses.length)];
      const botAdmonishmentMessage: Message = { id: Date.now().toString() + '-bot-admonish', text: randomAdmonishment, sender: Sender.Bot, timestamp: new Date() };
      setCurrentMessages(prev => [...prev, botAdmonishmentMessage]);
      if (currentChatSessionId) { addMessageToSession(currentChatSessionId, botAdmonishmentMessage); }
      setIsLoading(false);
      return;
    }
    
    // --- Proceed to Gemini API ---
    const botPlaceholderId = Date.now().toString() + '-bot-streaming';
    const botPlaceholder: Message = { id: botPlaceholderId, text: '', sender: Sender.Bot, timestamp: new Date(), streaming: true };
    setCurrentMessages(prev => [...prev, botPlaceholder]);
    if (currentChatSessionId) {
         addMessageToSession(currentChatSessionId, botPlaceholder);
    }

    try {
      if (!chatSessionRef.current) { throw new Error("Chat session is not available for sending message."); }
      const result = await chatSessionRef.current.sendMessageStream({ message: inputText });
      let currentBotText = '';
      
      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (typeof chunkText === 'string') {
          currentBotText += chunkText; 
          setCurrentMessages(prevMsgs => prevMsgs.map(msg => msg.id === botPlaceholderId ? { ...msg, text: currentBotText } : msg));
          if (currentChatSessionId) { updateStreamingMessageInSession(currentChatSessionId, botPlaceholderId, chunkText, false); }
        }
      }
      
      setCurrentMessages(prevMsgs => prevMsgs.map(msg => msg.id === botPlaceholderId ? { ...msg, text: currentBotText, streaming: false } : msg));
      
      if (currentChatSessionId) {
        updateStreamingMessageInSession(currentChatSessionId, botPlaceholderId, '', true); 
      }

    } catch (e: any) {
      console.error("Error sending message to Gemini:", e);
      let errorMessageText = "Sorry, I encountered an error. Please try again.";
      if (e.message && e.message.includes('API_KEY_INVALID')) { // More specific check
          errorMessageText = "AI API Key is invalid. Please check configuration.";
      } else if (e.message) { errorMessageText = `Error from AI: ${e.message}`; }

      const errorMsg: Message = { id: 'error-' + Date.now(), text: errorMessageText, sender: Sender.Bot, timestamp: new Date(), isError: true };
      
      setCurrentMessages(prevMsgs => [...prevMsgs.filter(m => m.id !== botPlaceholderId), errorMsg]);
      
      if (currentChatSessionId) { 
        setChatSessions(prevSessions =>
            prevSessions.map(session => {
                if (session.id === currentChatSessionId) {
                    let updatedMessages = session.messages.filter(m => m.id !== botPlaceholderId);
                    updatedMessages.push(errorMsg);
                    const updatedSession = { ...session, messages: updatedMessages, lastActive: new Date() };
                    if(currentUser && isFirebaseInitialized()) { saveChatSessionToFirestore(currentUser.uid, updatedSession).catch(e => console.error("Firestore (silent): Failed to save error message", e));}
                    return updatedSession;
                }
                return session;
            }).sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime())
        );
      }
      setError(errorMessageText); // Show UI error for operational AI errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = async (messageId: string) => {
    const messageToCopy = currentMessages.find(msg => msg.id === messageId);
    if (messageToCopy && typeof messageToCopy.text === 'string') {
      try {
        await navigator.clipboard.writeText(messageToCopy.text);
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      } catch (err) { console.error('Failed to copy text: ', err); /*setError("Failed to copy text.");*/ }
    }
  };

  const handleRegenerateMessage = async (botMessageIdToRegenerate: string) => {
    if (isLoading || !activeChatId) return;

    const activeSession = chatSessions.find(s => s.id === activeChatId);
    if (!activeSession) { /*setError("Active chat session not found for regeneration.");*/ return; }

    const botMessageIndex = activeSession.messages.findIndex(msg => msg.id === botMessageIdToRegenerate);
    if (botMessageIndex < 1 || 
        activeSession.messages[botMessageIndex].sender !== Sender.Bot || 
        activeSession.messages[botMessageIndex-1].sender !== Sender.User) {
      // setError("Cannot regenerate this message. Preceding user prompt not found."); // UI error suppressed
       console.warn("Cannot regenerate, conditions not met."); return;
    }
    
    const userPromptMessage = activeSession.messages[botMessageIndex - 1];
    if (typeof userPromptMessage.text !== 'string') {
        // setError("Invalid user prompt for regeneration."); // UI error suppressed
        console.warn("Invalid user prompt for regeneration."); return;
    }
    const promptText = userPromptMessage.text;

    const historyForGemini = convertMessagesToGeminiHistory(activeSession.messages.slice(0, botMessageIndex - 1));
    initializeChatSession(historyForGemini, activeSession.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION);

    if (!chatSessionRef.current) { /*setError("Chat session re-initialization failed for regeneration.");*/ setIsLoading(false); return; }

    setIsLoading(true);
    setError(null);

    const messagesUpToUserPrompt = activeSession.messages.slice(0, botMessageIndex -1); 
    const newBotMessageId = Date.now().toString() + '-bot-regenerated';
    const placeholderRegenMessage: Message = { id: newBotMessageId, text: '', sender: Sender.Bot, timestamp: new Date(), streaming: true };
    
    const messagesForUIAndSession = [...messagesUpToUserPrompt, userPromptMessage, placeholderRegenMessage];
    
    setCurrentMessages(messagesForUIAndSession);
    
    setChatSessions(prevSessions =>
      prevSessions.map(s => {
        if (s.id === activeChatId) {
            const updatedSessionRegen = { ...s, messages: messagesForUIAndSession, lastActive: new Date() };
            return updatedSessionRegen;
        }
        return s;
      }).sort((a,b) => b.lastActive.getTime() - a.lastActive.getTime())
    );


    try {
      const result = await chatSessionRef.current.sendMessageStream({ message: promptText });
      let currentBotText = '';
      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (typeof chunkText === 'string') {
          currentBotText += chunkText;
          setCurrentMessages(prevMsgs => prevMsgs.map(msg => msg.id === newBotMessageId ? { ...msg, text: currentBotText } : msg));
          if (activeChatId) { updateStreamingMessageInSession(activeChatId, newBotMessageId, chunkText, false); }
        }
      }
      setCurrentMessages(prevMsgs => prevMsgs.map(msg => msg.id === newBotMessageId ? { ...msg, text: currentBotText, streaming: false } : msg));
      
       if (activeChatId) {
        updateStreamingMessageInSession(activeChatId, newBotMessageId, '', true); 
      }

    } catch (e: any) {
      console.error("Error regenerating message:", e);
      let errorMessageText = "Sorry, failed to regenerate. Please try again.";
      if (e.message) errorMessageText = `Error during regeneration: ${e.message}`;
      const errorMsg : Message = { id: 'error-regen-' + Date.now(), text: errorMessageText, sender: Sender.Bot, timestamp: new Date(), isError: true };
      
      const updatedMessagesOnError = [...messagesUpToUserPrompt, userPromptMessage, errorMsg];
      setCurrentMessages(updatedMessagesOnError);
      setChatSessions(prevSessions =>
        prevSessions.map(s => {
          if (s.id === activeChatId) {
            const errorSession = { ...s, messages: updatedMessagesOnError, lastActive: new Date() };
            if(currentUser && isFirebaseInitialized()) { saveChatSessionToFirestore(currentUser.uid, errorSession).catch(e => console.error("Firestore (silent): Failed to save error session", e));}
            return errorSession;
          }
          return s;
        }).sort((a,b) => b.lastActive.getTime() - a.lastActive.getTime())
      );
      setError(errorMessageText); // Show UI error for operational AI errors
    } finally {
      setIsLoading(false);
      const finalActiveSessionFromState = chatSessions.find(s => s.id === activeChatId); // get latest from state
      if(finalActiveSessionFromState){
        initializeChatSession(convertMessagesToGeminiHistory(finalActiveSessionFromState.messages), finalActiveSessionFromState.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-slate-800">
      <Header 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        onNewChat={handleNewChat}
        isSidebarOpen={isSidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          chatSessions={chatSessions}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          isOpen={isSidebarOpen}
          currentUser={currentUser} // This will be null if Firebase is disabled
          onSignIn={handleSignInWithGoogle} // Will do nothing if Firebase is disabled
          onSignOut={handleSignOut} // Will do nothing if Firebase is disabled
        />
        <main 
          className={`flex flex-col flex-1 overflow-y-hidden transition-all duration-300 ease-in-out
                      ${isSidebarOpen ? 'sm:ml-60 md:ml-64 lg:ml-72' : 'ml-0'}`}
        >
          {error && ( 
            <div 
              role="alert"
              className="p-3 bg-red-100 text-red-700 border border-red-300 text-sm text-center sticky top-0 z-10">
              {error}
              <button 
                onClick={() => setError(null)} 
                className="ml-4 font-bold text-red-700 hover:text-red-900 focus:outline-none"
                aria-label="Dismiss error message"
              >
                &times;
              </button>
            </div>
          )}
          <ChatLog
            messages={currentMessages}
            isLoading={isLoading} 
            onCopyMessage={handleCopyMessage}
            onRegenerateMessage={handleRegenerateMessage}
            copiedMessageId={copiedMessageId}
          />
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </main>
      </div>
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/30 z-30 sm:hidden"
          aria-hidden="true"
        ></div>
      )}
    </div>
  );
};
