import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import Swal from 'sweetalert2';
import * as api from '../api';
import { fmt } from '../utils/helpers';

const CATS = ['Catering','Styling','Photo-Video','HMUA','Host & Coordinators','Logistics','Souvenirs','Lights & Sounds','Rentals','Clothing','Others'];
const emptyForm = { supplierName: '', categoryType: 'Catering', quotedPrice: '', contactPerson: '', contactNum: '', location: '', links: '', quoteDetails: '' };

export default function Suppliers() {
  const { eventData, setEventData } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterCat, setFilterCat] = useState('');
  const [saving, setSaving] = useState(false);

  if (!eventData) return <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading…</div>;

  const { suppliers = [] } = eventData;
  const patchData = (suppliers) => setEventData(prev => ({ ...prev, suppliers }));
  const filtered = filterCat ? suppliers.filter(s => s.categoryType === filterCat) : suppliers;

  const openAdd = () => { setForm(emptyForm); setModal({ mode: 'add' }); };
  const openEdit = (s) => { setForm({ supplierName: s.supplierName, categoryType: s.categoryType, quotedPrice: s.quotedPrice || '', contactPerson: s.contactPerson || '', contactNum: s.contactNum || '', location: s.location || '', links: s.links || '', quoteDetails: s.quoteDetails || '' }); setModal({ mode: 'edit', supplier: s }); };

  const saveSupplier = async () => {
    if (!form.supplierName.trim()) return Swal.fire({ icon: 'warning', title: 'Supplier name required', confirmButtonColor: '#226b45' });
    const data = { ...form, quotedPrice: parseFloat(form.quotedPrice) || 0 };
    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        const res = await api.updateSupplier(modal.supplier._id, data);
        patchData(suppliers.map(s => s._id === modal.supplier._id ? res.data : s));
      } else {
        const res = await api.addSupplier(data);
        patchData([...suppliers, res.data]);
      }
      setModal(null);
    } catch { Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save.', confirmButtonColor: '#226b45' }); }
    setSaving(false);
  };

  const deleteSupplier = async (s) => {
    const r = await Swal.fire({ icon: 'warning', title: 'Delete Supplier?', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!r.isConfirmed) return;
    await api.deleteSupplier(s._id);
    patchData(suppliers.filter(x => x._id !== s._id));
  };

  const resetAll = async () => {
    const r = await Swal.fire({ icon: 'warning', title: 'Reset all suppliers?', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!r.isConfirmed) return;
    await api.resetSuppliers();
    patchData([]);
  };

  return (
    <div>
      <div className="page-header-row">
        <h2 className="page-title">Supplier Details</h2>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={openAdd}><i className="fa fa-plus" /> Add Supplier</button>
          <button className="btn-outline btn-danger-outline" onClick={resetAll}><i className="fa fa-rotate-left" /> Reset</button>
        </div>
      </div>

      <div className="filter-bar">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="supplier-grid">
        {filtered.length ? filtered.map(s => (
          <div key={s._id} className="supplier-card">
            <div className="supplier-card-header">
              <span className="badge badge-cat">{s.categoryType}</span>
              <div className="supplier-card-actions">
                <button className="btn-icon-sm" onClick={() => openEdit(s)}><i className="fa fa-edit" /></button>
                <button className="btn-icon-sm danger" onClick={() => deleteSupplier(s)}><i className="fa fa-trash" /></button>
              </div>
            </div>
            <h4 className="supplier-name">{s.supplierName}</h4>
            <div className="supplier-detail"><i className="fa fa-peso-sign" />₱{fmt(s.quotedPrice)}</div>
            <div className="supplier-detail"><i className="fa fa-user" />{s.contactPerson || '—'}</div>
            <div className="supplier-detail"><i className="fa fa-phone" />{s.contactNum || '—'}</div>
            <div className="supplier-detail"><i className="fa fa-location-dot" />{s.location || '—'}</div>
            {s.links && <div className="supplier-detail"><i className="fa fa-link" /> <a href={s.links} target="_blank" rel="noreferrer">View Link</a></div>}
            {s.quoteDetails && <div className="supplier-quote">{s.quoteDetails}</div>}
          </div>
        )) : <div className="empty-row" style={{ padding: '2rem' }}>No suppliers listed.</div>}
      </div>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit Supplier' : 'Add Supplier'} onClose={() => setModal(null)} wide>
          <div className="form-grid">
            <div className="form-group full"><label>Supplier Name *</label><input value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} /></div>
            <div className="form-group"><label>Category Type</label><select value={form.categoryType} onChange={e => setForm(f => ({ ...f, categoryType: e.target.value }))}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="form-group"><label>Quoted Price (₱)</label><input type="number" min="0" value={form.quotedPrice} onChange={e => setForm(f => ({ ...f, quotedPrice: e.target.value }))} /></div>
            <div className="form-group"><label>Contact Person</label><input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} /></div>
            <div className="form-group"><label>Contact Number</label><input value={form.contactNum} onChange={e => setForm(f => ({ ...f, contactNum: e.target.value }))} /></div>
            <div className="form-group"><label>Location</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
            <div className="form-group full"><label>Links</label><input value={form.links} placeholder="https://..." onChange={e => setForm(f => ({ ...f, links: e.target.value }))} /></div>
            <div className="form-group full"><label>Quote Details</label><textarea rows="3" value={form.quoteDetails} onChange={e => setForm(f => ({ ...f, quoteDetails: e.target.value }))} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveSupplier} disabled={saving}>{saving ? 'Saving…' : 'Save Supplier'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
