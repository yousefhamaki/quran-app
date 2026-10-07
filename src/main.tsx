import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/context/theme';
import App from '@/App';
import { SettingsProvider } from '@/context/settings';
import { LibraryProvider } from '@/context/library';
import { PlayerProvider } from '@/context/player';
import { AuthProvider } from '@/context/auth';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <LibraryProvider>
          <AuthProvider>
            <PlayerProvider>
              <TooltipProvider delayDuration={300}>
                <App />
                <Toaster position="top-center" />
              </TooltipProvider>
            </PlayerProvider>
          </AuthProvider>
        </LibraryProvider>
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
