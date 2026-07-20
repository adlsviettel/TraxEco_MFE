import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Database, ArrowDownCircle, ArrowUpCircle,
  ClipboardCheck, SlidersHorizontal, Send, ClipboardList, Settings,
  Monitor, ChevronLeft, Menu as MenuIcon, Globe, Link, ChevronDown, ChevronRight
} from 'lucide-react';
import type { Language, NavItem } from '../types/index.ts';
import { useMobileSidebar } from '../contexts/MobileSidebarContext.tsx';
import { authService } from '@traxeco/shared';

const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', label: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'km', label: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
];

const BASE = '/it-inventory';

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('it_sidebar_collapsed');
    return saved !== null ? saved === 'true' : false;
  });

  const toggleCollapsed = (state: boolean) => {
    setCollapsed(state);
    localStorage.setItem('it_sidebar_collapsed', String(state));
  };
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const { isOpen: mobileOpen, close: closeMobile } = useMobileSidebar();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (to: string, e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigation if clicking on a parent that only expands
    setExpandedItems(prev => prev.includes(to) ? prev.filter(p => p !== to) : [...prev, to]);
  };

  const navItems: NavItem[] = [
    { to: `${BASE}/`, icon: LayoutDashboard, label: t('nav.dashboard'), pageCode: 'it_dashboard', end: true },
    { to: `${BASE}/master-data`, icon: Database, label: t('nav.masterData'), pageCode: 'it_master_data' },
    { to: `${BASE}/pemasukan`, icon: ArrowDownCircle, label: t('nav.pemasukan'), pageCode: 'it_inbound' },
    { to: `${BASE}/pengeluaran`, icon: ArrowUpCircle, label: t('nav.pengeluaran'), pageCode: 'it_outbound' },
    { 
      to: `${BASE}/stock-opname`, 
      icon: ClipboardCheck, 
      label: t('nav.stockOpname'), 
      pageCode: 'it_stock_opname',
      subItems: [
        { to: `${BASE}/stock-opname/machinery`, label: 'Machinery And Equipment' },
        { to: `${BASE}/stock-opname/auxiliary`, label: 'Auxiliary Materials' },
        { to: `${BASE}/stock-opname/wip`, label: 'Work-in-Process' },
        { to: `${BASE}/stock-opname/finished`, label: 'Finished Goods' },
        { to: `${BASE}/stock-opname/scrap`, label: 'Material Waste & Scrap Management' }
      ]
    },
    { to: `${BASE}/adjustment`, icon: SlidersHorizontal, label: t('nav.adjustment'), pageCode: 'it_adjustment' },
    { to: `${BASE}/insw-mapping`, icon: Link, label: 'INSW Mapping', pageCode: 'it_insw_mapping' },
    { to: `${BASE}/insw-push`, icon: Send, label: t('nav.inswPush'), pageCode: 'it_insw_push' },
    { to: `${BASE}/logs`, icon: ClipboardList, label: t('nav.logs'), pageCode: 'it_logs' },
  ];

  const allowedNavItems = navItems.filter(item => 
    !item.pageCode || authService.hasPageAccess(item.pageCode)
  );
  function changeLang(code: string): void {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
    setShowLangMenu(false);
  }

  const currentLang: Language = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo + collapse toggle */}
      <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : undefined }}>
        {collapsed ? (
          <button
            onClick={() => toggleCollapsed(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 6,
              color: '#555', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f0f0f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <MenuIcon size={20} />
          </button>
        ) : (
          <>
            <Monitor size={26} className="logo-icon" />
            <div className="logo-text" style={{ flex: 1 }}>
              <span className="logo-title">IT Inventory</span>
              <span className="logo-sub">Management System</span>
            </div>
            <button
              onClick={() => toggleCollapsed(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                color: '#888', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0f0f0'; e.currentTarget.style.color = '#333'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#888'; }}
            >
              <ChevronLeft size={18} />
            </button>
          </>
        )}
      </div>

      {/* Section label */}
      {!collapsed && <div className="nav-section-label">PUBLIC</div>}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {allowedNavItems.map(({ to, icon: Icon, label, end, subItems }) => {
          const isExpanded = expandedItems.includes(to);
          return (
            <div key={to} className="nav-item-group">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? label : undefined}
                onClick={(e) => {
                  if (subItems && subItems.length > 0) {
                    toggleExpand(to, e);
                  } else {
                    closeMobile();
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} />
                  {!collapsed && <span>{label}</span>}
                </div>
                {!collapsed && subItems && subItems.length > 0 && (
                  <div style={{ marginLeft: 'auto' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                )}
              </NavLink>
              
              {!collapsed && subItems && subItems.length > 0 && isExpanded && (
                <div className="nav-subitems" style={{ marginLeft: '28px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {subItems.map(sub => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      className={({ isActive }) => `nav-item sub-nav-item ${isActive ? 'active' : ''}`}
                      onClick={closeMobile}
                      style={{ fontSize: '0.9em', padding: '6px 12px' }}
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        {/* Language switcher */}
        <div className="lang-switcher">
          <button
            className="nav-item lang-btn-nav"
            onClick={() => setShowLangMenu(v => !v)}
            title={collapsed ? t('language.select') : undefined}
          >
            <Globe size={18} />
            {!collapsed && <span>{currentLang.flag} {currentLang.label}</span>}
          </button>
          {showLangMenu && (
            <div className={`lang-popup ${collapsed ? 'lang-popup-right' : ''}`}>
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  className={`lang-popup-item ${lang.code === i18n.language ? 'active' : ''}`}
                  onClick={() => changeLang(lang.code)}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        {authService.hasPageAccess('it_settings') && (
          <NavLink
            to={`${BASE}/settings`}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? t('nav.settings') : undefined}
          >
            <Settings size={18} />
            {!collapsed && <span>{t('nav.settings')}</span>}
          </NavLink>
        )}

      </div>
      </aside>
    </>
  );
}
