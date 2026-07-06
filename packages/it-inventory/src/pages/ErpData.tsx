import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Database } from 'lucide-react';
import Header from '../components/Header.tsx';
import type { ErpRow } from '../types/index.ts';

const MOCK_ERP: ErpRow[] = [
  { id: 'ERP-001', ref: 'PO-2026-001', type: 'Purchase Order', items: 5, amount: 12500.00, syncDate: '2026-03-05 08:00', status: 'synced' },
  { id: 'ERP-002', ref: 'SO-2026-003', type: 'Sales Order', items: 3, amount: 8750.00, syncDate: '2026-03-05 08:00', status: 'synced' },
  { id: 'ERP-003', ref: 'PO-2026-002', type: 'Purchase Order', items: 8, amount: 24000.00, syncDate: '2026-03-04 17:00', status: 'synced' },
  { id: 'ERP-004', ref: 'TR-2026-001', type: 'Transfer', items: 2, amount: 3200.00, syncDate: '2026-03-04 14:30', status: 'pending' },
];

export default function ErpData() {
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('2026-03-05 08:00');
  const [data] = useState<ErpRow[]>(MOCK_ERP);

  function handleSync(): void {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync(new Date().toISOString().slice(0, 16).replace('T', ' '));
    }, 2000);
  }

  return (
    <div className="page">
      <Header title={t('nav.erpData')} />
      <div className="page-body">
        <div className="page-top-bar">
          <div className="sync-info">
            <Database size={16} className="text-muted" />
            <span className="text-muted">{t('erpData.lastSync')}: <strong>{lastSync}</strong></span>
          </div>
          <button className={`btn-primary ${syncing ? 'btn-loading' : ''}`} onClick={handleSync} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'spin' : ''} />
            {syncing ? t('erpData.syncing') : t('erpData.sync')}
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>{t('erpData.title')}</h3>
            <span className="record-count">{data.length} {t('common.total').toLowerCase()}</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Reference</th>
                <th>Type</th>
                <th>Items</th>
                <th>Amount (USD)</th>
                <th>Sync Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  <td><code>{row.id}</code></td>
                  <td><strong>{row.ref}</strong></td>
                  <td>{row.type}</td>
                  <td>{row.items}</td>
                  <td>${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="text-muted">{row.syncDate}</td>
                  <td><span className={`status-badge ${row.status === 'synced' ? 'processed' : 'pending'}`}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="info-banner">
          <Database size={20} />
          <div>
            <strong>ERP Integration</strong>
            <p>This module will connect to your ERP system via API to fetch purchase orders, sales orders, and transfer data. API configuration will be available after backend integration.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
