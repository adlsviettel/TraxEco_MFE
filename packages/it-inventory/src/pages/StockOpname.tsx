import { useState } from 'react';
import { RefreshCw, Send, FileText } from 'lucide-react';
import Header from '../components/Header.tsx';

interface StockOpnameProps {
  category?: 'machinery' | 'auxiliary' | 'wip' | 'finished' | 'scrap';
}

const CATEGORY_NAMES = {
  machinery: 'Machinery And Equipment',
  auxiliary: 'Auxiliary Materials',
  wip: 'Work-in-Process',
  finished: 'Finished Goods',
  scrap: 'Rejects and Scrap'
};

export default function StockOpname({ category }: StockOpnameProps) {
  const [loadingERP, setLoadingERP] = useState(false);
  const [pushingINSW, setPushingINSW] = useState(false);

  const title = category ? CATEGORY_NAMES[category] : 'Stock Opname';

  const handleCallERP = () => {
    setLoadingERP(true);
    setTimeout(() => {
      setLoadingERP(false);
    }, 1500);
  };

  const handlePushINSW = () => {
    setPushingINSW(true);
    setTimeout(() => {
      setPushingINSW(false);
    }, 1500);
  };

  return (
    <div className="page">
      <Header title={title} />
      <div className="page-body">
        <div className="card">
          <div className="card-header responsive-header">
            <div className="header-left-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ margin: 0 }}>Stocktaking Data Management</h3>
              </div>
            </div>
            <div className="header-actions">
              <button 
                className="btn-secondary" 
                onClick={handleCallERP}
                disabled={loadingERP || pushingINSW}
                style={{ fontSize: 13, padding: '6px 14px' }}
              >
                {loadingERP ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />} 
                {loadingERP ? 'Syncing...' : 'Sync with ERP'}
              </button>
              
              <button 
                className="btn-primary" 
                onClick={handlePushINSW}
                disabled={loadingERP || pushingINSW}
                style={{ fontSize: 13, padding: '6px 14px' }}
              >
                {pushingINSW ? <Send size={14} className="spin" /> : <Send size={14} />} 
                Push to INSW
              </button>
            </div>
          </div>
          
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <FileText size={48} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '1.2rem', fontWeight: 500, margin: 0, color: '#555' }}>No Data Available</p>
            <p style={{ margin: 0 }}>Click "Sync with ERP" to fetch {title.toLowerCase()} records.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
