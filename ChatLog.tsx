import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { ChatMessage } from './ChatMessage';
import { LoadingDots } from './LoadingDots';

interface ChatLogProps {
  messages: Message[];
  isLoading: boolean; // True if any message in currentMessages is streaming or main send is loading
  onCopyMessage: (messageId: string) => void;
  onRegenerateMessage: (messageId: string) => void;
  copiedMessageId: string | null;
}

export const ChatLog: React.FC<ChatLogProps> = ({ messages, isLoading, onCopyMessage, onRegenerateMessage, copiedMessageId }) => {
  const chatLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages, isLoading]); // Also trigger on isLoading to scroll down when loading dots appear

  const isLastMessageStreaming = messages.length > 0 && messages[messages.length - 1].streaming === true;

  return (
    <div ref={chatLogRef} className="flex-grow p-3 sm:p-4 md:p-6 space-y-4 overflow-y-auto bg-white">
      {messages.map((msg, index) => (
        <ChatMessage 
          key={msg.id} 
          message={msg}
          onCopy={onCopyMessage}
          onRegenerate={onRegenerateMessage}
          isCopied={copiedMessageId === msg.id}
          canRegenerate={
            msg.sender === 'bot' && 
            !msg.isError && 
            !msg.streaming && 
            msg.id !== 'initial-greeting' &&
            index > 0 && 
            messages[index - 1]?.sender === 'user' 
          }
        />
      ))}
      {isLoading && isLastMessageStreaming && ( 
        <div className="flex justify-start">
          <div className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 rounded-bl-none max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-2xl self-start">
            <LoadingDots />
          </div>
        </div>
      )}
    </div>
  );
};
