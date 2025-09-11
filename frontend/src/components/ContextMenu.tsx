import React, { useEffect, useRef } from 'react';
import { ContextMenuAction } from '../types/file';
import { 
  FilePlus, 
  FolderPlus, 
  Edit, 
  Trash2, 
  Upload,
  Copy,
  Scissors,
  Download
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onAction: (actionId: string) => void;
  onClose: () => void;
}

const iconMap = {
  FilePlus,
  FolderPlus,
  Edit,
  Trash2,
  Upload,
  Copy,
  Cut: Scissors,
  Download,
};

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  actions,
  onAction,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  const handleActionClick = (actionId: string, disabled?: boolean) => {
    if (disabled) return;
    onAction(actionId);
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {actions.map((action) => {
        if (action.separator) {
          return (
            <div
              key={action.id}
              className="h-px bg-gray-200 dark:bg-gray-600 my-1"
            />
          );
        }

        const IconComponent = action.icon ? iconMap[action.icon as keyof typeof iconMap] : null;

        return (
          <button
            key={action.id}
            onClick={() => handleActionClick(action.id, action.disabled)}
            disabled={action.disabled}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm text-left
              ${action.disabled 
                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            {IconComponent && (
              <IconComponent className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
};