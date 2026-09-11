import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, AlertTriangle, CheckCircle, Clock, Copy, Check, Info, ShieldAlert,
  Package, Database
} from 'lucide-react';
import type { StockItem } from '../pages/StockOpname.tsx';

interface StatusDetailModalProps {
  open: boolean;
  onClose: () => void;
  item: StockItem | null;
  categoryTitle?: string;
}

export default function StatusDetailModal({
  open,
  onClose,
  item,
  categoryTitle = 'Stock Opname'
}: StatusDetailModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  if (!open || !item) return null;

  const isFailed = item.statusPush === 'failed';
  const isSuccess = item.statusPush === 'success';
  const isPending = item.statusPush === 'idle' || item.statusPush === 'pushing';

  const rawMessage = item.pushMessage || (isFailed ? 'HTTP 400 Bad Request: data barang tidak ada' : 'Successfully pushed to INSW (HTTP 200 OK)');

  const formatQuantity = (qty: number) => {
    if (qty === 0) return '0';
    if (Math.abs(qty) < 0.01) {
      return Number(qty.toFixed(6)).toString();
    }
    return qty.toLocaleString('en-US', { maximumFractionDigits: 4 });
  };

  const handleCopy = () => {
    const textToCopy = `[INSW Push Log]\nDoc No: ${item.nomorDokKegiatan}\nItem Code: ${item.kdBarang}\nDescription: ${item.uraianBarang}\nQty: ${formatQuantity(item.jumlah)} ${item.kdSatuan}\nWarehouse: ${item.kho}\nStatus: ${item.statusPush}\nResponse: ${rawMessage}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMasterDataMissing = rawMessage.toLowerCase().includes('tidak ada') || rawMessage.toLowerCase().includes('data barang');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 620,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with status gradient bar */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isFailed
              ? 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)'
              : isSuccess
              ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
              : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isFailed ? '#fee2e2' : isSuccess ? '#dcfce7' : '#e2e8f0',
                color: isFailed ? '#ef4444' : isSuccess ? '#16a34a' : '#64748b',
                boxShadow: isFailed ? '0 4px 12px rgba(239,68,68,0.2)' : 'none',
              }}
            >
              {isFailed && <ShieldAlert size={22} />}
              {isSuccess && <CheckCircle size={22} />}
              {isPending && <Clock size={22} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                {isFailed
                  ? t('statusDetail.titleFailed', 'INSW Push Failed (HTTP 400)')
                  : isSuccess
                  ? t('statusDetail.titleSuccess', 'INSW Push Success (HTTP 200)')
                  : t('statusDetail.titlePending', 'INSW Push Status')}
              </h3>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                {categoryTitle} • {item.nomorDokKegiatan}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              width: 34,
              height: 34,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Response Message Banner */}
          <div
            style={{
              padding: '16px',
              borderRadius: 12,
              backgroundColor: isFailed ? '#fef2f2' : isSuccess ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${isFailed ? '#fecaca' : isSuccess ? '#bbf7d0' : '#e2e8f0'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <div style={{ color: isFailed ? '#dc2626' : isSuccess ? '#16a34a' : '#475569', marginTop: 2 }}>
                {isFailed ? <AlertTriangle size={18} /> : <Info size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isFailed ? '#991b1b' : isSuccess ? '#166534' : '#1e293b' }}>
                  {isFailed
                    ? t('statusDetail.responseFailed', 'Indonesian Customs Portal (api.insw.go.id) Response:')
                    : t('statusDetail.responseSuccess', 'INSW Response Result:')}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: 'Consolas, Monaco, monospace',
                    color: isFailed ? '#b91c1c' : '#15803d',
                    marginTop: 6,
                    wordBreak: 'break-word',
                    background: isFailed ? '#fee2e2' : '#dcfce7',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  {rawMessage}
                </div>
              </div>
            </div>

            {/* Smart Explanation Badge */}
            {isMasterDataMissing && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  backgroundColor: '#ffffff',
                  borderRadius: 8,
                  border: '1px solid #fed7aa',
                  fontSize: 12,
                  color: '#9a3412',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Database size={15} style={{ flexShrink: 0, color: '#ea580c' }} />
                <span>
                  <b>{t('statusDetail.businessExplanation', 'Business Explanation:')}</b>{' '}
                  {t('statusDetail.masterDataMissingTip', 'Item code {{code}} is not registered in Indonesian Customs Master Data (PER-24/BC/2023). Once Customs synchronizes this item into Master Data, submissions will succeed (HTTP 200).', { code: item.kdBarang })}
                </span>
              </div>
            )}
          </div>

          {/* Item Details Grid Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '16px 20px',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={16} style={{ color: '#3ba55c' }} />
              <span>{t('statusDetail.docAndErpInfo', 'Document & ERP Item Details:')}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 20px' }}>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t('statusDetail.docNo', 'Doc No / Production Order:')}</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{item.nomorDokKegiatan}</div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t('statusDetail.actualTimestamp', 'ERP Recorded Time:')}</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>{item.thoiGianThucTe}</div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t('statusDetail.itemCode', 'Item Code (kdBarang):')}</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, color: '#0f172a' }}>{item.kdBarang}</code>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t('statusDetail.quantityAndUom', 'Quantity & UOM:')}</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                  {formatQuantity(item.jumlah)} {item.kdSatuan}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t('statusDetail.description', 'Item Description (uraianBarang):')}</span>
                <div style={{ fontSize: 13, color: '#334155', marginTop: 2, fontWeight: 500 }}>{item.uraianBarang}</div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t('statusDetail.warehouse', 'Warehouse (kho):')}</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 2 }}>{item.kho}</div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t('statusDetail.value', 'Value (nilai):')}</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>Rp {item.nilai.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            {copied ? <Check size={15} style={{ color: '#16a34a' }} /> : <Copy size={15} />}
            <span>{copied ? t('statusDetail.copied', 'Copied!') : t('statusDetail.copyLog', 'Copy Push Log')}</span>
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '8px 22px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#3ba55c',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: '0 4px 12px rgba(59, 165, 92, 0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2e8b4a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3ba55c';
            }}
          >
            {t('common.close', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
}
