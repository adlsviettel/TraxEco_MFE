/**
 * IT Inventory App Entry Point
 * Wraps all IT Inventory contexts and layout under shared auth
 */
import './i18n/index.ts';
import { PushProvider } from './contexts/PushContext.tsx';
import { NotifProvider } from './contexts/NotifContext.tsx';
import { MobileSidebarProvider } from './contexts/MobileSidebarContext.tsx';
import MainLayout from './components/MainLayout.tsx';

// Import IT Inventory styles
import './index.css';

export default function ITInventoryApp() {
  return (
    <div className="it-inventory-app">
      <MobileSidebarProvider>
        <PushProvider>
          <NotifProvider>
            <MainLayout />
          </NotifProvider>
        </PushProvider>
      </MobileSidebarProvider>
    </div>
  );
}
