import React from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Folder,
  MessageSquare,
  Terminal,
  Settings,
  Github,
  Play,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
}

const navigationItems = [
  {
    name: 'Explorer',
    href: '/workspace',
    icon: Folder,
    description: 'Browse and manage files',
  },
  {
    name: 'Editor',
    href: '/editor',
    icon: FileText,
    description: 'Code editor',
  },
  {
    name: 'AI Chat',
    href: '/chat',
    icon: MessageSquare,
    description: 'Chat with Kiro AI',
  },
  {
    name: 'Terminal',
    href: '/terminal',
    icon: Terminal,
    description: 'Integrated terminal',
  },
  {
    name: 'Run & Debug',
    href: '/run',
    icon: Play,
    description: 'Execute and debug code',
  },
  {
    name: 'GitHub',
    href: '/github',
    icon: Github,
    description: 'Version control',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get('demo') === 'true';
  
  // Helper function to preserve demo mode in navigation
  const getHref = (href: string) => {
    return isDemoMode ? `${href}?demo=true` : href;
  };

  return (
    <aside
      className={`
        bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
        flex flex-col
      `}
    >
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <NavLink
                  to={getHref(item.href)}
                  className={({ isActive }) =>
                    `
                      flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `
                  }
                  title={!isOpen ? item.description : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isOpen && (
                    <span className="truncate">{item.name}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <NavLink
            to={getHref("/settings")}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
          >
            <Settings className="w-5 h-5" />
            Settings
          </NavLink>
        </div>
      )}
    </aside>
  );
};