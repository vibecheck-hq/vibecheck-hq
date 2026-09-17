import { Activity, BarChart3, Home, LayoutDashboard, Settings, Terminal } from 'lucide-react';

export type Page = 'landing' | 'dashboard' | 'telemetry' | 'stylometry' | 'system' | 'settings';

interface NavItem {
  id: Page;
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { id: 'landing', label: 'Overview', icon: Home },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'telemetry', label: 'Telemetry Events', icon: Activity },
  { id: 'stylometry', label: 'Stylometry Vectors', icon: BarChart3 },
  { id: 'system', label: 'System Metrics', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onClose: () => void;
}

export function Sidebar({ currentPage, onNavigate, collapsed, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {collapsed && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-60 bg-base-900 border-r border-base-700/60 flex flex-col transition-transform duration-300 ${
          collapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-base-700/60">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Activity className="w-5 h-5 text-base-950" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-100 tracking-tight">CogniMetrics</span>
            <span className="text-[10px] text-muted-500 font-mono uppercase tracking-wider">CMTE v1.0</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary-500/10 text-primary-300 border border-primary-500/20'
                    : 'text-muted-400 hover:text-slate-200 hover:bg-base-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-primary-400' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-base-700/60">
          <div className="px-3 py-2 rounded-lg bg-base-850/60">
            <p className="text-[10px] text-muted-500 font-mono">RW-IDP v1.0</p>
            <p className="text-[10px] text-muted-600 font-mono mt-0.5">Deterministic execution</p>
          </div>
        </div>
      </aside>
    </>
  );
}
