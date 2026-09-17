import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-16 sticky top-0 z-20 bg-base-900/80 backdrop-blur-md border-b border-base-700/60 flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 rounded-lg hover:bg-base-800 text-muted-400"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
          <span className="text-xs text-muted-400 font-mono">System: Operational</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-base-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-base-950" />
              </div>
              <span className="text-sm text-slate-300 hidden sm:block">{user.email}</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-12 z-20 w-48 card shadow-xl py-2">
                  <div className="px-4 py-2 border-b border-base-700/60">
                    <p className="text-xs text-muted-500">Signed in as</p>
                    <p className="text-sm text-slate-300 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-400 hover:text-error-400 hover:bg-base-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-500">Not signed in</span>
        )}
      </div>
    </header>
  );
}
