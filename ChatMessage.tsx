import React from 'react';
import { Message, Sender } from '../types';
import { CopyIcon, RegenerateIcon, CheckIcon } from './icons';

interface ChatMessageProps {
  message: Message;
  onCopy: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  isCopied: boolean;
  canRegenerate: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCopy, onRegenerate, isCopied, canRegenerate }) => {
  const isUser = message.sender === Sender.User;

  const formatDate = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(message.id);
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRegenerate(message.id);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end group`}>
      <div
        className={`
          px-3 py-2 sm:px-4 sm:py-3 rounded-xl max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-2xl break-words shadow-sm
          ${isUser ? 'bg-white text-slate-800 rounded-br-none border-2 border-black' 
                  : message.isError ? 'bg-red-100 text-red-700 border border-red-200 rounded-bl-none' 
                                    : 'bg-white text-slate-800 rounded-bl-none border-2 border-black'}
        `}
      >
        <p className="whitespace-pre-wrap text-sm md:text-base">{message.text}</p>
        <p className={`text-xs mt-1 ${
            isUser ? 'text-slate-500 text-right' 
                   : message.isError ? 'text-red-500 text-left' 
                                     : 'text-slate-500 text-left'
          }`}
        >
          {formatDate(message.timestamp)}
        </p>

        {!isUser && !message.isError && !message.streaming && (
          <div className="flex items-center justify-end mt-1.5 space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
            <button
              onClick={handleCopy}
              title={isCopied ? "Copied!" : "Copy text"}
              className="p-1.5 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 rounded"
              aria-label={isCopied ? "Content copied to clipboard" : "Copy message content"}
            >
              {isCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
            </button>
            {canRegenerate && (
              <button
                onClick={handleRegenerate}
                title="Regenerate response"
                className="p-1.5 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 rounded"
                aria-label="Regenerate this response"
              >
                <RegenerateIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};