import { useState, useEffect } from 'react';
import { usePageVisible } from '../hooks/usePageVisible.ts';
import { useTranslation } from 'react-i18next';
import { Globe, Lock, Key, Eye, EyeOff, Save, CheckCircle, Loader } from 'lucide-react';
import Header from '../components/Header.tsx';
import type { Language } from '../types/index.ts';
import { getInswApiConfig, updateInswApiConfig } from '../services/api.ts';

const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', label: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'km', label: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
];

type InswFormConfig = Record<string, string>;

const DEFAULT_CONFIG: InswFormConfig = {
  'x-inswkey': '',
  'x-unique-key': '',
  'api-url': '',
  'schedule-enabled': 'false',
  'schedule-time': '05:00',
};

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useState<InswFormConfig>(DEFAULT_CONFIG);
  const [showKey, setShowKey] = useState(false);
  const [showUnique, setShowUnique] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const username = JSON.parse(localStorage.getItem('user') || '{}').username || 'system';
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Load config from backend
  useEffect(() => {
    (async () => {
      try {
        const res = await getInswApiConfig();
        if (res.success && res.data) {
          setConfig(prev => ({
            ...prev,
            ...res.data,
          }));
        }
      } catch (err) {
        console.error('Failed to load INSW config:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-refresh config when navigating back
  usePageVisible('/settings', async () => {
    try {
      const res = await getInswApiConfig();
      if (res.success && res.data) setConfig(prev => ({ ...prev, ...res.data }));
    } catch {}
  });

  function changeLang(code: string): void {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      const res = await updateInswApiConfig(config, username);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <Header title={t('nav.settings')} />
      <div className="page-body">
        <div className="settings-grid">
          {/* Language */}
          <div className="settings-card">
            <div className="settings-card-header">
              <Globe size={20} />
              <h3>{t('language.select')}</h3>
            </div>
            <div className="lang-options">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  className={`lang-option-btn ${lang.code === i18n.language ? 'active' : ''}`}
                  onClick={() => changeLang(lang.code)}
                >
                  <span className="lang-flag">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {lang.code === i18n.language && <span className="lang-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Account */}
          <div className="settings-card">
            <div className="settings-card-header">
              <Lock size={20} />
              <h3>Account</h3>
            </div>
            <div className="account-info">
              <div className="account-avatar">{(user.username || 'U')[0].toUpperCase()}</div>
              <div>
                <p className="account-name">{user.username}</p>
                <p className="account-role">{user.role}</p>
              </div>
            </div>
          </div>

          {/* INSW API Config */}
          <div className="settings-card settings-card-full">
            <div className="settings-card-header">
              <Key size={20} />
              <h3>{t('settings.inswConfig')}</h3>
              {saved && (
                <span className="save-toast">
                  <CheckCircle size={14} /> {t('common.success')}!
                </span>
              )}
            </div>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader size={20} className="spin" /> {t('common.loading')}
              </div>
            ) : (
              <div className="api-config-body">
                <p className="api-config-desc">
                  {t('settings.inswConfigDesc')}
                </p>

                <div className="api-fields">
                  <div className="form-group">
                    <label htmlFor="insw-key">x-inswkey</label>
                    <div className="input-with-toggle">
                      <input
                        id="insw-key"
                        type={showKey ? 'text' : 'password'}
                        value={config['x-inswkey']}
                        onChange={e => setConfig(prev => ({ ...prev, 'x-inswkey': e.target.value }))}
                        placeholder="Enter x-inswkey value"
                        spellCheck={false}
                      />
                      <button className="toggle-visibility" type="button" onClick={() => setShowKey(!showKey)}>
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="insw-unique">x-unique-key</label>
                    <div className="input-with-toggle">
                      <input
                        id="insw-unique"
                        type={showUnique ? 'text' : 'password'}
                        value={config['x-unique-key']}
                        onChange={e => setConfig(prev => ({ ...prev, 'x-unique-key': e.target.value }))}
                        placeholder="Enter x-unique-key value"
                        spellCheck={false}
                      />
                      <button className="toggle-visibility" type="button" onClick={() => setShowUnique(!showUnique)}>
                        {showUnique ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 4 }}>
                  <label htmlFor="insw-url">API URL</label>
                  <input
                    id="insw-url"
                    type="text"
                    value={config['api-url']}
                    onChange={e => setConfig(prev => ({ ...prev, 'api-url': e.target.value }))}
                    placeholder="https://api.insw.go.id/..."
                    spellCheck={false}
                  />
                </div>

                <div className="api-config-actions">
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader size={14} className="spin" /> : <Save size={14} />}
                    {saving ? t('settings.saving') : t('settings.saveConfig')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Schedule section — separate card, always visible */}
          <div className="settings-card settings-card-full">
            <div className="settings-card-header">
              <span style={{ fontSize: 20 }}>⏰</span>
              <h3>{t('settings.scheduleTitle')}</h3>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p className="api-config-desc" style={{ marginBottom: 12 }}>
                {t('settings.scheduleDesc')}
              </p>

              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config['schedule-enabled'] === 'true'}
                    onChange={e => setConfig(prev => ({
                      ...prev,
                      'schedule-enabled': e.target.checked ? 'true' : 'false',
                    }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontWeight: 500 }}>{t('settings.scheduleEnable')}</span>
                </label>

                <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
                  <label htmlFor="schedule-time" style={{ fontSize: 13 }}>{t('settings.scheduleTime')}</label>
                  <input
                    id="schedule-time"
                    type="time"
                    value={config['schedule-time'] || '05:00'}
                    onChange={e => setConfig(prev => ({ ...prev, 'schedule-time': e.target.value }))}
                    style={{ padding: '6px 10px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  ⚠️ {t('settings.scheduleNote')}
                </p>
                <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ fontSize: 13, padding: '6px 14px' }}>
                  {saving ? <Loader size={14} className="spin" /> : <Save size={14} />}
                  {saving ? t('settings.saving') : t('settings.saveConfig')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
