

import React, { useState } from 'react';
import { EnterKeyIcon } from './icons'; 

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-end space-x-2 sm:space-x-3 shrink-0">
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask me Anything"
        className="flex-grow p-2 sm:p-3 bg-white text-slate-800 text-sm sm:text-base rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none placeholder-slate-400"
        rows={1}
        style={{ maxHeight: '100px', overflowY: 'auto' }}
        disabled={isLoading}
        aria-label="Chat input"
      />
      <button
        type="submit"
        disabled={isLoading || !inputValue.trim()}
        className="p-2 sm:p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Send message"
      >
        <EnterKeyIcon className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    </form>
  );
};
