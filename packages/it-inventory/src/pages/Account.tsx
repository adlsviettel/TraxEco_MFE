import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User as UserIcon, Shield, Key, Clock, LogOut, Save, CheckCircle, AlertCircle } from 'lucide-react';
import Header from '../components/Header.tsx';
import { authService, ConfirmDialog, defaultConfirmDialog } from '@traxeco/shared';
import type { ConfirmDialogState } from '@traxeco/shared';

export default function Account() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const employeeName = localStorage.getItem('employeeName') || 'User';
  const roleLabel = localStorage.getItem('roleLabel') || 'User';


  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);
  
  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Login timestamp
  const loginTime = localStorage.getItem('loginTime') || new Date().toISOString();

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);

    if (!currentPw) {
      setPwMessage({ type: 'error', text: t('account.errCurrentPw', 'Current password is required') });
      return;
    }
    if (newPw.length < 12) {
      setPwMessage({ type: 'error', text: t('account.errMinLength', 'Password must be at least 12 characters') });
      return;
    }
    if (!/[A-Z]/.test(newPw)) {
      setPwMessage({ type: 'error', text: t('changePassword.errorUppercase', 'Must have uppercase letter') });
      return;
    }
    if (!/[a-z]/.test(newPw)) {
      setPwMessage({ type: 'error', text: t('changePassword.errorLowercase', 'Must have lowercase letter') });
      return;
    }
    if (!/[0-9]/.test(newPw)) {
      setPwMessage({ type: 'error', text: t('changePassword.errorDigit', 'Must have a digit') });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMessage({ type: 'error', text: t('account.errNoMatch', 'Passwords do not match') });
      return;
    }

    setPwLoading(true);
    try {
      const token = authService.getToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api'}/accounts/change-password-with-old`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMessage({ type: 'error', text: data.error || 'Failed to change password' });
      } else {
        setPwMessage({ type: 'success', text: t('account.successPwChanged', 'Password changed successfully!') });
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
      }
    } catch {
      setPwMessage({ type: 'error', text: 'Server error. Please try again.' });
    } finally {
      setPwLoading(false);
    }
  }

  function handleLogout() {
    setConfirmDialog({
      open: true,
      title: t('nav.logout', 'Logout'),
      message: t('auth.logoutConfirm', 'Are you sure you want to log out?'),
      variant: 'info',
      confirmText: t('nav.logout', 'Logout'),
      cancelText: t('common.cancel', 'Cancel'),
      onConfirm: () => {
        authService.logout();
        navigate('/login');
      }
    });
  }

  const initials = employeeName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="page">
      <Header title={t('nav.account')} />
      <div className="page-body">
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Profile card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
              padding: '32px 24px', textAlign: 'center', color: '#fff',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', fontSize: 28, fontWeight: 700,
                border: '3px solid rgba(255,255,255,0.4)',
              }}>
                {initials}
              </div>
              <h2 style={{ margin: 0, fontSize: 20 }}>{employeeName}</h2>
              <span style={{
                display: 'inline-block', marginTop: 8,
                padding: '3px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: 'rgba(255,255,255,0.2)', color: '#fff',
              }}>
                {roleLabel}
              </span>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <UserIcon size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('account.username')}</div>
                    <div style={{ fontWeight: 600 }}>{employeeName}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Shield size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('account.role')}</div>
                    <div style={{ fontWeight: 600 }}>{roleLabel}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Clock size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('account.sessionStarted')}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{new Date(loginTime).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 8 }}>
                  <Shield size={16} style={{ color: '#d32f2f', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ width: '100%' }}>
                    <div style={{ fontSize: 11, color: '#d32f2f', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>DEBUG: Quyền trong LocalStorage</div>
                    <div style={{
                      fontFamily: 'monospace', fontSize: 11, background: '#fafafa', 
                      padding: '6px 10px', borderRadius: 4, overflowX: 'auto', whiteSpace: 'pre-wrap',
                      maxHeight: 120, border: '1px solid #e0e0e0', color: '#555', marginTop: 4
                    }}>
                      {localStorage.getItem('permissions') || '[] (Trống)'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change password */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={18} /> {t('account.changePassword')}
              </h3>
            </div>
            <form onSubmit={handlePasswordChange} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pwMessage && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: pwMessage.type === 'success' ? '#10b98118' : '#ef444418',
                  color: pwMessage.type === 'success' ? '#10b981' : '#ef4444',
                  border: `1px solid ${pwMessage.type === 'success' ? '#10b98133' : '#ef444433'}`,
                }}>
                  {pwMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {pwMessage.text}
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t('account.currentPassword')}</label>
                <input
                  type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  placeholder={t('account.currentPasswordPlaceholder')} required
                  style={{ padding: '8px 12px', fontSize: 13 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t('account.newPassword')}</label>
                <input
                  type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder={t('account.newPasswordPlaceholder')} required minLength={12}
                  style={{ padding: '8px 12px', fontSize: 13 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t('account.confirmPassword')}</label>
                <input
                  type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder={t('account.confirmPasswordPlaceholder')} required
                  style={{ padding: '8px 12px', fontSize: 13 }}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={pwLoading}
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, opacity: pwLoading ? 0.6 : 1 }}>
                <Save size={16} /> {t('account.savePassword')}
              </button>
            </form>
          </div>

          {/* Logout */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t('account.signOut')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('account.signOutDesc')}</div>
              </div>
              <button className="btn-secondary" onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}>
                <LogOut size={16} /> {t('account.logout')}
              </button>
            </div>
          </div>

        </div>
      </div>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(p => ({ ...p, open: false }))} />
    </div>
  );
}
