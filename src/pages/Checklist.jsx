import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import CircleProgress from '../components/CircleProgress';
import Modal from '../components/Modal';
import Swal from 'sweetalert2';
import * as api from '../api';

export default function Checklist() {
  const { eventData, setEventData } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', details: '' });
  const [filter, setFilter] = useState({ search: '', done: '' });
  const [saving, setSaving] = useState(false);

  if (!eventData) return <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading…</div>;

  const { checklist = [] } = eventData;
  const patchData = (checklist) => setEventData(prev => ({ ...prev, checklist }));

  const checked = checklist.filter(i => i.checked).length;
  const pct = checklist.length ? Math.round((checked / checklist.length) * 100) : 0;

  let filtered = [...checklist];
  if (filter.search) filtered = filtered.filter(i => i.title.toLowerCase().includes(filter.search.toLowerCase()));
  if (filter.done === 'done') filtered = filtered.filter(i => i.checked);
  else if (filter.done === 'pending') filtered = filtered.filter(i => !i.checked);

  const openAdd = () => { setForm({ title: '', details: '' }); setModal({ mode: 'add' }); };
  const openEdit = (item) => { setForm({ title: item.title, details: item.details || '' }); setModal({ mode: 'edit', item }); };

  const saveItem = async () => {
    if (!form.title.trim()) return Swal.fire({ icon: 'warning', title: 'Title required', confirmButtonColor: '#226b45' });
    const dupe = checklist.find(i => i.title.toLowerCase() === form.title.toLowerCase() && i._id !== modal.item?._id);
    if (dupe) return Swal.fire({ icon: 'error', title: 'Duplicate Item', text: `"${form.title}" already exists.`, confirmButtonColor: '#226b45' });
    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        const res = await api.updateChecklistItem(modal.item._id, form);
        patchData(checklist.map(i => i._id === modal.item._id ? res.data : i));
      } else {
        const res = await api.addChecklistItem({ ...form, checked: false });
        patchData([...checklist, res.data]);
      }
      setModal(null);
    } catch { Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save.', confirmButtonColor: '#226b45' }); }
    setSaving(false);
  };

  const toggleItem = async (item, checked) => {
    const res = await api.updateChecklistItem(item._id, { ...item, checked });
    patchData(checklist.map(i => i._id === item._id ? res.data : i));
  };

  const deleteItem = async (item) => {
    const r = await Swal.fire({ icon: 'warning', title: 'Delete item?', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!r.isConfirmed) return;
    await api.deleteChecklistItem(item._id);
    patchData(checklist.filter(i => i._id !== item._id));
  };

  const resetAll = async () => {
    const r = await Swal.fire({ icon: 'warning', title: 'Reset checklist?', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!r.isConfirmed) return;
    await api.resetChecklist();
    patchData([]);
  };

  return (
    <div>
      <div className="page-header-row">
        <h2 className="page-title">Event Checklist</h2>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={openAdd}><i className="fa fa-plus" /> Add Item</button>
          <button className="btn-outline btn-danger-outline" onClick={resetAll}><i className="fa fa-rotate-left" /> Reset</button>
        </div>
      </div>

      <div className="stats-panel" style={{ marginBottom: '1.1rem' }}>
        <div className="stats-panel-inner">
          <div className="stats-ring-col"><CircleProgress pct={pct} size={110} stroke={10} color="#6b46c1" /><div className="ring-label">Completed</div></div>
          <div className="stats-numbers-col">
            <div className="stat-box"><div className="stat-num">{checked}</div><div className="stat-label">Done</div></div>
            <div className="stat-box" style={{ background: 'var(--yellow-soft)' }}><div className="stat-num" style={{ color: 'var(--yellow)' }}>{checklist.length - checked}</div><div className="stat-label">Remaining</div></div>
            <div className="stat-box"><div className="stat-num">{checklist.length}</div><div className="stat-label">Total</div></div>
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: '0.9rem' }}>
        <input type="text" placeholder="Search checklist..." className="search-input" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        <select value={filter.done} onChange={e => setFilter(f => ({ ...f, done: e.target.value }))}>
          <option value="">All Items</option>
          <option value="done">Completed</option>
          <option value="pending">Not Yet Done</option>
        </select>
      </div>

      <div className="checklist-list">
        {filtered.length ? filtered.map(item => (
          <div key={item._id} className={`checklist-item${item.checked ? ' checked' : ''}`}>
            <input type="checkbox" checked={item.checked} onChange={e => toggleItem(item, e.target.checked)} />
            <div className="checklist-text">
              <span className="checklist-title">{item.title}</span>
              {item.details && <span className="checklist-details">{item.details}</span>}
            </div>
            <div className="checklist-actions">
              <button className="btn-icon-sm" onClick={() => openEdit(item)}><i className="fa fa-edit" /></button>
              <button className="btn-icon-sm danger" onClick={() => deleteItem(item)}><i className="fa fa-trash" /></button>
            </div>
          </div>
        )) : <div className="empty-row">{filter.search || filter.done ? 'No items match your filter.' : 'No checklist items yet.'}</div>}
      </div>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit Item' : 'Add Checklist Item'} onClose={() => setModal(null)}>
          <div className="form-grid">
            <div className="form-group full"><label>Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-group full"><label>Details</label><textarea rows="2" value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveItem} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
