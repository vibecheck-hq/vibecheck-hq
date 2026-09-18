import { useAuth } from '@/lib/auth';
import { Sidebar, type Page } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { LandingPage } from '@/pages/LandingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TelemetryPage } from '@/pages/TelemetryPage';
import { StylometryPage } from '@/pages/StylometryPage';
import { SystemPage } from '@/pages/SystemPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AuthModal } from '@/components/AuthModal';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTelemetryStream } from '@/hooks/useTelemetryStream';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  useTelemetryStream();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const handleNavigate = (page: Page) => {
    // Guard: require auth for dashboard pages
    if (page !== 'landing' && !user) {
      setAuthOpen(true);
      return;
    }
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  // Landing page is full-screen (no sidebar)
  if (currentPage === 'landing') {
    return (
      <div className="min-h-screen bg-base-950">
        <LandingPage onNavigate={handleNavigate} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-950 flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        collapsed={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1">
          {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {currentPage === 'telemetry' && <TelemetryPage />}
          {currentPage === 'stylometry' && <StylometryPage />}
          {currentPage === 'system' && <SystemPage />}
          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
    </div>
  );
}

export default App;
