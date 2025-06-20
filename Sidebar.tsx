import React from 'react';
import { ChatSession, User } from '../types';
import { MessageSquareIcon, GoogleIcon, UserCircleIcon, SignOutIcon } from './icons';

interface SidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  isOpen: boolean;
  currentUser: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chatSessions,
  activeChatId,
  onSelectChat,
  isOpen,
  currentUser,
  onSignIn,
  onSignOut,
}) => {
  const sortedSessions = [...chatSessions].sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());

  return (
    <aside 
      className={`fixed top-0 left-0 z-40 h-full bg-slate-50 flex flex-col border-r border-slate-200 
                 overflow-y-auto transition-transform duration-300 ease-in-out transform
                 w-60 sm:w-64 md:w-72 
                 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                 pt-4 sm:pt-6 pb-4`}
      aria-hidden={!isOpen}
    >

      <div className="flex-grow space-y-1 overflow-y-auto px-2 sm:px-4"> 
        <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 px-1 pt-2">Recent Chats</h2>
        {sortedSessions.length === 0 && (
          <p className="text-sm text-slate-500 px-1">No recent chats.</p>
        )}
        {sortedSessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectChat(session.id)}
            className={`
              w-full flex items-center space-x-2 p-2 rounded-md text-left text-sm transition-colors duration-150
              ${activeChatId === session.id ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'}
            `}
            aria-current={activeChatId === session.id ? "page" : undefined}
            tabIndex={isOpen ? 0 : -1} 
          >
            <MessageSquareIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate flex-grow">{session.title || 'Untitled Chat'}</span>
          </button>
        ))}
      </div>
      <div className="mt-auto pt-4 px-3 sm:px-4 space-y-3 border-t border-slate-200">
        {currentUser ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 p-2 rounded-md bg-slate-100">
              <UserCircleIcon className="w-6 h-6 text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-700 truncate font-medium">
                {currentUser.displayName || currentUser.email || 'User'}
              </span>
            </div>
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center space-x-2 p-2 rounded-md text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors duration-150"
              tabIndex={isOpen ? 0 : -1} 
            >
              <SignOutIcon className="w-4 h-4 flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full flex items-center justify-center space-x-2 p-2 rounded-md text-sm bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-150"
            tabIndex={isOpen ? 0 : -1} 
          >
            <GoogleIcon className="w-5 h-5 flex-shrink-0" />
            <span>Join with Google</span>
          </button>
        )}
        <p className="text-xs text-slate-400 text-center">Xgpt v1.1</p>
       </div>
    </aside>
  );
};