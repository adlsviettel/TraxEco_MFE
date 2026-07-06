import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2, Plus, Trash2, Edit2, CheckCircle, X, Save, Loader } from 'lucide-react';
import type { InswCategoryMapping } from '../services/inswApi';

export default function InswMappingManager() {
  const { t } = useTranslation();
  const [mappings, setMappings] = useState<InswCategoryMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<InswCategoryMapping>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMappings();
  }, []);

  async function loadMappings() {
    setLoading(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${BASE_URL}/insw/mappings`);
      if (res.ok) {
        const data = await res.json();
        setMappings(data);
      }
    } catch (err) {
      console.error('Failed to load mappings', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editForm.keyword || !editForm.inswCode) {
      alert(t('insw_mapping.validateEmpty', 'Keyword và INSW Code không được để trống!'));
      return;
    }
    
    setSaving(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${BASE_URL}/insw/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const saved = await res.json();
        setMappings(prev => {
          if (editForm.id) return prev.map(m => m.id === saved.id ? saved : m);
          return [...prev, saved];
        });
        setIsEditing(null);
      }
    } catch (err) {
      alert(t('insw_mapping.saveError', 'Lỗi khi lưu mapping!'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('insw_mapping.confirmDelete', 'Bạn có chắc muốn xoá mapping này?'))) return;
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${BASE_URL}/insw/mappings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMappings(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      alert(t('insw_mapping.deleteError', 'Lỗi khi xoá mapping!'));
    }
  }

  return (
    <>
      <div className="toolbar" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 16 }}>
        <div className="toolbar-left">
          <Settings2 size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600 }}>{t('insw_mapping.title', 'Cấu hình Kategori INSW')}</span>
          <span className="text-muted" style={{ fontSize: 13 }}>
            — {mappings.length} items
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isEditing && (
            <button 
              className="btn-primary" 
              onClick={() => {
                setEditForm({ keyword: '', inswCode: '7', description: '' });
                setIsEditing(-1);
              }}
            >
              <Plus size={16} /> {t('common.add', 'Thêm Mới')}
            </button>
          )}
        </div>
      </div>

      {isEditing !== null && (
        <div className="card" style={{ padding: 16, marginBottom: 16, border: '1px solid var(--primary)', background: 'var(--primary)05' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>{isEditing === -1 ? t('insw_mapping.addNew', 'Thêm Keyword Mới') : t('insw_mapping.editKeyword', 'Sửa Keyword')}</h4>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, flex: 2, minWidth: 200 }}>
              <label style={{ fontSize: 12 }}>{t('insw_mapping.keyword', 'Keyword (Chữ trong PDF)')}</label>
              <input 
                type="text" 
                value={editForm.keyword || ''} 
                onChange={e => setEditForm(prev => ({...prev, keyword: e.target.value}))}
                placeholder="vd: hasil produksi"
              />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 150 }}>
              <label style={{ fontSize: 12 }}>{t('insw_mapping.inswCode', 'Mã INSW (1-8)')}</label>
              <select 
                value={editForm.inswCode || '7'} 
                onChange={e => setEditForm(prev => ({...prev, inswCode: e.target.value}))}
                style={{ padding: '8px 12px', width: '100%', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
              >
                <option value="1">1 - Bahan Baku</option>
                <option value="2">2 - Bahan Penolong</option>
                <option value="3">3 - Bahan Habis Pakai</option>
                <option value="4">4 - Barang Dagangan</option>
                <option value="5">5 - Mesin dan Peralatan</option>
                <option value="6">6 - Barang dalam proses</option>
                <option value="7">7 - Barang Jadi</option>
                <option value="8">8 - Barang Reject & Scrap</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, flex: 2, minWidth: 200 }}>
              <label style={{ fontSize: 12 }}>{t('insw_mapping.note', 'Ghi chú')}</label>
              <input 
                type="text" 
                value={editForm.description || ''} 
                onChange={e => setEditForm(prev => ({...prev, description: e.target.value}))}
                placeholder="Ghi chú thêm..."
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader size={14} className="spin" /> : <Save size={14} />} {t('insw_mapping.saveBtn', 'Lưu Mapping')}
            </button>
            <button className="btn-secondary" onClick={() => setIsEditing(null)}>
              {t('common.cancel', 'Hủy')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Loader size={32} className="spin" style={{ margin: '0 auto', display: 'block', color: 'var(--accent)' }} />
          <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>{t('common.loading', 'Đang tải dữ liệu...')}</p>
        </div>
      ) : (
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div className="table-scroll" style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th style={{ width: 250 }}>{t('insw_mapping.keyword', 'Keyword (PDF)')}</th>
                  <th style={{ width: 150 }}>{t('insw_mapping.inswCode', 'INSW Code')}</th>
                  <th>{t('insw_mapping.note', 'Ghi chú')}</th>
                  <th style={{ width: 100, textAlign: 'right' }}>{t('common.action', 'Thao tác')}</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map(m => (
                  <tr key={m.id}>
                    <td className="text-muted">#{m.id}</td>
                    <td style={{ fontWeight: 600 }}>{m.keyword}</td>
                    <td>
                      <span className="status-badge" style={{ background: 'var(--primary)15', color: 'var(--primary)' }}>
                        Code {m.inswCode}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{m.description}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-btn-sm" onClick={() => { setEditForm(m); setIsEditing(m.id); }} style={{ marginRight: 4 }} title={t('common.edit', 'Sửa')}>
                        <Edit2 size={14} />
                      </button>
                      <button className="icon-btn-sm danger" onClick={() => handleDelete(m.id)} title={t('common.delete', 'Xóa')}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {mappings.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      {t('insw_mapping.noData', 'Chưa có mapping nào được cấu hình')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
