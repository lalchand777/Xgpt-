import React from 'react';
import { XLogoIcon, MenuIcon, CloseIcon } from './icons';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onNewChat, isSidebarOpen }) => {
  return (
    <header className="bg-slate-50 p-3 shadow-md flex items-center justify-between sticky top-0 z-20 shrink-0 border-b border-slate-200">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none rounded-md hover:bg-slate-200"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center p-0.5 sm:p-1 border border-slate-200">
            <XLogoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800">Xgpt</h1>
        </div>
      </div>
      
      <button
        onClick={onNewChat}
        className="px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
        aria-label="Start a new chat"
      >
        New
      </button>
    </header>
  );
};
