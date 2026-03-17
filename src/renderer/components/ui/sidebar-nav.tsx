import {
  LayoutDashboard,
  Columns3,
  GitBranch,
  BarChart3,
  Settings,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@renderer/lib/cn';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/' },
  { id: 'kanban', label: 'Kanban', icon: Columns3, route: '/kanban' },
  { id: 'tasks', label: 'Tasks', icon: GitBranch, route: '/tasks' },
  { id: 'stats', label: 'Statistics', icon: BarChart3, route: '/statistics' },
  { id: 'settings', label: 'Settings', icon: Settings, route: '/settings' },
];

interface SidebarNavProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  onToggleChat?: () => void;
  className?: string;
}

export function SidebarNav({
  activeRoute,
  onNavigate,
  onToggleChat,
  className,
}: SidebarNavProps) {
  return (
    <aside
      className={cn(
        'flex flex-col w-[52px] h-full',
        'bg-surface-0 border-r border-surface-200/60',
        'py-4 items-center gap-1',
        className,
      )}
    >
      {/* Logo mark */}
      <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center mb-6">
        <span className="text-surface-0 font-bold text-xs">T</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.route;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.route)}
              title={item.label}
              className={cn(
                'relative w-9 h-9 rounded-lg',
                'flex items-center justify-center',
                'transition-all duration-150',
                'press-feedback',
                isActive
                  ? 'bg-accent-50 text-accent-600'
                  : 'text-surface-400 hover:text-surface-700 hover:bg-surface-50',
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[1px] w-[3px] h-4 bg-accent-500 rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* AI chat toggle — bottom */}
      {onToggleChat && (
        <button
          onClick={onToggleChat}
          title="AI Assistant"
          className={cn(
            'w-9 h-9 rounded-lg',
            'flex items-center justify-center',
            'text-surface-400 hover:text-accent-500 hover:bg-accent-50',
            'transition-all duration-150',
            'press-feedback',
          )}
        >
          <MessageCircle size={18} strokeWidth={1.8} />
        </button>
      )}
    </aside>
  );
}
