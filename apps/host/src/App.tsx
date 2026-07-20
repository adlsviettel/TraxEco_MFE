import { Keyboard } from '@capacitor/keyboard';
import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { LockReset as LockResetIcon } from '@mui/icons-material';

import {
  lightTheme,
  AdminPage,
  ApkUpdatePrompt,
  authService,
  startTokenRefreshTimer,
  ActivityTracker,
  ToastProvider,
  ErrorBoundary
} from '@traxeco/shared';

import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';

const FgsWhApp = React.lazy(() => import('@traxeco/fgs-wh'));
const ITInventoryApp = React.lazy(() => import('@traxeco/it-inventory'));
const FabricWHApp = React.lazy(() => import('@traxeco/fabric-wh'));
const F2SDeliveryApp = React.lazy(() => import('@traxeco/f2s-delivery'));
const QCFBApp = React.lazy(() => import('@traxeco/qcfb-wh'));
const TrackingDashboard = React.lazy(() => import('./pages/TrackingDashboard'));
const RDMaterialApp = React.lazy(() => import('@traxeco/rd-material'));
const AccessoryWHApp = React.lazy(() => import('@traxeco/accessory-wh'));
const TccTemplateApp = React.lazy(() => import('@traxeco/tcc-template'));
const ClinicApp = React.lazy(() => import('@traxeco/clinic'));
const CooApp = React.lazy(() => import('@traxeco/coo'));

import { useTranslation } from 'react-i18next';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi, enUS } from 'date-fns/locale';


const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuth = localStorage.getItem('isAuthenticated') === 'true';
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};



const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const roleLevel = Number(localStorage.getItem('roleLevel') || '99');
  if (roleLevel > 2) {
    return <Navigate to="/scan" replace />;
  }
  return <>{children}</>;
};

const TrackingGuard = ({ children }: { children: React.ReactNode }) => {
  const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
  const roleLevel = Number(localStorage.getItem('roleLevel') || '99');
  if (!isSuperAdmin && roleLevel > 1) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

/**
 * Force change password dialog — shown when mustChangePassword is true
 */
const ChangePasswordGuard = ({ children }: { children: React.ReactNode }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const mustChange = authService.mustChangePassword();
  const { t } = useTranslation();

  const handleChangePassword = async () => {
    const { authFetch } = await import('@traxeco/shared');
    if (newPassword === 'Abcd@12345678') {
      setError(t('changePassword.errorDefault', 'Cannot use the default password.'));
      return;
    }
    if (newPassword.length < 12) {
      setError(t('changePassword.errorLength', 'Password must be at least 12 characters'));
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError(t('changePassword.errorUppercase', 'Must contain at least one uppercase letter'));
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError(t('changePassword.errorLowercase', 'Must contain at least one lowercase letter'));
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError(t('changePassword.errorDigit', 'Must contain at least one digit'));
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      setError(t('changePassword.errorSpecial', 'Must contain at least one special character'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('changePassword.errorMismatch', 'Passwords do not match'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('accounts/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      authService.clearMustChangePassword();
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mustChange) {
    return (
      <Dialog open={true} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 1, mb: 1 }, pb: 0 }}>
          <LockResetIcon color="warning" /> {t('changePassword.title', 'Change Password Required')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { mr: 2, mb: 2 }, pt: '16px !important' }}>
          <Typography variant="body2" color="text.secondary">
            {t('changePassword.description', 'You must change your password before continuing.')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            ✅ {t('changePassword.requirements', 'At least 12 chars, Uppercase, Lowercase, Digit, Special char')}
          </Typography>
          {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}
          <TextField label={t('changePassword.newPassword', 'New Password')} type="password" size="small" fullWidth
            value={newPassword} onChange={e => setNewPassword(e.target.value)}
            autoFocus />
          <TextField label={t('changePassword.confirmPassword', 'Confirm Password')} type="password" size="small" fullWidth
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleChangePassword()} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { authService.logout(); window.location.href = '/login'; }}
            color="inherit">{t('nav.logout', 'Logout')}</Button>
          <Button variant="contained" onClick={handleChangePassword} disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LockResetIcon />}
            disableElevation sx={{ fontWeight: 700 }}>
            {t('changePassword.submit', 'Change Password')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return <>{children}</>;
};

function CatchAllRedirect() {
  return <Navigate to="/" replace />;
}

function ActivityTrackerWrapper() {
  const isAuth = localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuth) return null;
  return <ActivityTracker />;
}

function App() {
  const { i18n } = useTranslation();
  
  // Custom Vietnamese locale to use numeric months (e.g. Tháng 07) instead of words (Tháng Bảy)
  const customVi = {
    ...vi,
    localize: {
      ...vi.localize,
      month: (n: number, _options?: any) => `Tháng ${String(n + 1).padStart(2, '0')}`
    }
  };

  const currentLocale = i18n.language?.startsWith('vi') ? customVi : enUS;

  // Start token refresh timer if user is already logged in (e.g. page refresh)
  useEffect(() => {
    if (authService.isAuthenticated()) {
      startTokenRefreshTimer();
    }
    
    // Capacitor keyboard listeners — broadcast keyboard height as CSS variable
    // so scrollable containers (e.g. Filter Drawer) can add padding on APK
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    }).catch(() => {});

    Keyboard.addListener('keyboardDidHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      if (document.activeElement instanceof HTMLElement && 
         (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA')) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
    }).catch(() => {
      // Not running in Capacitor — Keyboard plugin not available on web
    });
  }, []);

  return (
    <ThemeProvider theme={lightTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={currentLocale}>
        <ApkUpdatePrompt />
        <CssBaseline />
        <BrowserRouter basename={import.meta.env.VITE_BASE_PATH === '/' ? undefined : import.meta.env.VITE_BASE_PATH?.replace(/\/$/, '') || undefined}>
          <ToastProvider>
        <ActivityTrackerWrapper />
        <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Main Page — App Launcher (no Layout, standalone) */}
          <Route path="/" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <MainPage />
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* Admin page — accessible directly from MainPage */}
          <Route path="/admin" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <AdminGuard><AdminPage /></AdminGuard>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* Tracking Dashboard — admin only */}
          <Route path="/tracking" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <TrackingGuard><Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}><TrackingDashboard /></Suspense></TrackingGuard>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* Finish Goods Warehouse app — lazy loaded, own layout */}
          <Route path="/fgswh/*" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}>
                  <FgsWhApp />
                </Suspense>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* IT Inventory app — lazy loaded, own layout */}
          <Route path="/it-inventory/*" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}>
                  <ITInventoryApp />
                </Suspense>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* Fabric Warehouse app — lazy loaded, own layout */}
          <Route path="/fabricwh/*" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}>
                  <FabricWHApp />
                </Suspense>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* F2S Delivery app — lazy loaded, own layout */}
          <Route path="/f2s-delivery/*" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}>
                  <F2SDeliveryApp />
                </Suspense>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* R&D Material Library app — lazy loaded, own layout */}
          <Route path="/rd-material/*" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}>
                  <RDMaterialApp />
                </Suspense>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* QC Fabric WH app — lazy loaded, own layout */}
          <Route path="/qcfb-wh/*" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}>
                  <QCFBApp />
                </Suspense>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* Accessory WH app */}
          <Route path="/acc-wh/*" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}>
                  <AccessoryWHApp />
                </Suspense>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* TCC Template Request app */}
          <Route path="/tcc-template/*" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}>
                  <TccTemplateApp />
                </Suspense>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* Clinic Management app */}
          <Route path="/clinic/*" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}>
                  <ClinicApp />
                </Suspense>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* COO app */}
          <Route path="/coo/*" element={
            <PrivateRoute>
              <ChangePasswordGuard>
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', mt: 10 }} />}>
                  <CooApp />
                </Suspense>
              </ChangePasswordGuard>
            </PrivateRoute>
          } />

          {/* Catch-all: redirect unknown routes to home */}
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
        </ErrorBoundary>
      </ToastProvider>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
