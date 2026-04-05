import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import CircleProgress from '../components/CircleProgress';
import Modal from '../components/Modal';
import Swal from 'sweetalert2';
import * as api from '../api';

const CATEGORIES = ['Principal', 'Secondary', 'Family', 'Friends', 'Sponsor +1', 'VIP', 'Others'];

export default function Guests() {
  const { eventData, setEventData } = useApp();
  const [modal, setModal] = useState(null); // null | {mode: 'add'|'edit', guest?: obj}
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ search: '', category: '', confirmed: '', status: '', tableNum: '' });
  const [form, setForm] = useState({ name: '', pax: 1, category: 'Family', confirmed: false, remarks: '' });
  const [saving, setSaving] = useState(false);

  if (!eventData) return <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading…</div>;

  const { guestSettings = {}, guests = [] } = eventData;
  const expected = guestSettings.expectedGuests || 0;
  const pct = expected > 0 ? Math.min(100, (guests.length / expected) * 100) : 0;
  const confirmedCount = guests.filter(g => g.confirmed).length;
  const seatedCount = guests.filter(g => g.status === 'Seated').length;
  const unseatedCount = guests.filter(g => g.status === 'Not Seated').length;
  const unconfirmedCount = guests.filter(g => !g.confirmed).length;
  const tableNums = [...new Set(guests.map(g => g.tableNumber).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const principalGuests = guests.filter(g => g.category === 'Principal');
  const secondaryGuests = guests.filter(g => g.category === 'Secondary');

  const patchData = (key, val) => setEventData(prev => ({ ...prev, [key]: val }));

  // ── Setup ──────────────────────────────────────────────────
  const saveGuestSettings = async () => {
    const val = parseInt(document.getElementById('expectedGuestInput')?.value);
    if (!val || val < 1) return Swal.fire({ icon: 'warning', title: 'Invalid', text: 'Enter a valid number.', confirmButtonColor: '#226b45' });
    const settings = { expectedGuests: val, initialized: true };
    await api.updateGuestSettings(settings);
    patchData('guestSettings', settings);
  };

  const editExpectedCount = async () => {
    const result = await Swal.fire({
      title: 'Adjust Expected Guest Count', input: 'number', inputValue: expected,
      inputAttributes: { min: 1 }, showCancelButton: true, confirmButtonColor: '#226b45', confirmButtonText: 'Update',
      preConfirm: (v) => { if (!v || v < 1) { Swal.showValidationMessage('Enter a valid number'); return false; } return parseInt(v); }
    });
    if (result.isConfirmed) {
      const settings = { expectedGuests: result.value, initialized: true };
      await api.updateGuestSettings(settings);
      patchData('guestSettings', settings);
    }
  };

  if (!guestSettings.initialized) return (
    <div className="setup-card">
      <i className="fa fa-users setup-icon" />
      <h3>Set Expected Guest Count</h3>
      <p>How many guests are you expecting for your event?</p>
      <div className="setup-input-row">
        <input type="number" id="expectedGuestInput" min="1" className="setup-input" />
        <button className="btn-primary" onClick={saveGuestSettings}>Confirm</button>
      </div>
    </div>
  );

  // ── Filter & Paginate ──────────────────────────────────────
  let filtered = [...guests];
  if (filter.search) filtered = filtered.filter(g => g.name.toLowerCase().includes(filter.search.toLowerCase()));
  if (filter.category) filtered = filtered.filter(g => g.category === filter.category);
  if (filter.confirmed !== '') filtered = filtered.filter(g => String(g.confirmed) === filter.confirmed);
  if (filter.status) filtered = filtered.filter(g => g.status === filter.status);
  if (filter.tableNum) filtered = filtered.filter(g => String(g.tableNumber) === filter.tableNum);
  filtered = filtered.slice().reverse();
  const totalPages = Math.ceil(filtered.length / 10) || 1;
  const paged = filtered.slice((page - 1) * 10, page * 10);

  // ── Modal Handlers ─────────────────────────────────────────
  const openAdd = () => { setForm({ name: '', pax: 1, category: 'Family', confirmed: false, remarks: '' }); setModal({ mode: 'add' }); };
  const openEdit = (g) => { setForm({ name: g.name, pax: g.pax, category: g.category, confirmed: g.confirmed, remarks: g.remarks || '' }); setModal({ mode: 'edit', guest: g }); };

  const saveGuest = async () => {
    if (!form.name.trim()) return Swal.fire({ icon: 'warning', title: 'Name required', confirmButtonColor: '#226b45' });
    const dupe = guests.find(g => g.name.toLowerCase() === form.name.toLowerCase() && g._id !== modal.guest?._id);
    if (dupe) return Swal.fire({ icon: 'error', title: 'Duplicate Entry', text: `"${form.name}" is already in the guest list.`, confirmButtonColor: '#226b45' });
    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        const res = await api.updateGuest(modal.guest._id, form);
        patchData('guests', guests.map(g => g._id === modal.guest._id ? res.data : g));
      } else {
        const res = await api.addGuest({ ...form, status: 'Not Seated' });
        patchData('guests', [...guests, res.data]);
      }
      setModal(null);
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to save.', confirmButtonColor: '#226b45' }); }
    setSaving(false);
  };

  const deleteGuest = async (g) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Delete Guest?', text: `"${g.name}" will be permanently removed.`, showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!result.isConfirmed) return;
    // Remove from seating
    const { seating = {}, presidentialSeating = {} } = eventData;
    const newSeating = Object.fromEntries(Object.entries(seating).map(([k, v]) => [k, (v || []).filter(n => n !== g.name)]));
    const newPresSeating = Object.fromEntries(Object.entries(presidentialSeating).map(([k, v]) => [k, (v || []).filter(n => n !== g.name)]));
    await Promise.all([api.deleteGuest(g._id), api.updateSeating(newSeating), api.updatePresidentialSeating(newPresSeating)]);
    setEventData(prev => ({ ...prev, guests: prev.guests.filter(x => x._id !== g._id), seating: newSeating, presidentialSeating: newPresSeating }));
  };

  const sortAlpha = async () => {
    const sorted = [...guests].sort((a, b) => a.name.localeCompare(b.name));
    await api.bulkSetGuests(sorted);
    patchData('guests', sorted);
    Swal.fire({ icon: 'success', title: 'Sorted A–Z', timer: 1100, showConfirmButton: false });
  };

  return (
    <div>
      <div className="page-header-row">
        <h2 className="page-title">Guest List</h2>
      </div>

      <div className="stats-panel">
        <div className="stats-panel-inner">
          <div className="stats-ring-col">
            <CircleProgress pct={pct} size={110} stroke={10} color="#226b45" />
            <div className="ring-label">Guests Entered</div>
          </div>
          <div className="stats-numbers-col">
            <div className="stat-box"><div className="stat-num">{guests.length}</div><div className="stat-label">Total Guests</div></div>
            <div className="stat-box" style={{ position: 'relative' }}>
              <div className="stat-num">{expected}</div>
              <div className="stat-label">Expected <button onClick={editExpectedCount} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.75rem', padding: '0 0 0 4px' }}><i className="fa fa-pencil" /></button></div>
            </div>
            <div className="stat-box"><div className="stat-num">{confirmedCount}</div><div className="stat-label">Confirmed</div></div>
            <div className="stat-box"><div className="stat-num">{seatedCount}</div><div className="stat-label">Seated</div></div>
            <div className="stat-box" style={{ background: 'var(--red-soft)' }}><div className="stat-num" style={{ color: 'var(--red)' }}>{unseatedCount}</div><div className="stat-label">Not Seated</div></div>
            <div className="stat-box" style={{ background: 'var(--yellow-soft)' }}><div className="stat-num" style={{ color: 'var(--yellow)' }}>{unconfirmedCount}</div><div className="stat-label">Unconfirmed</div></div>
          </div>
        </div>
      </div>

      <div className="guest-actions-bar">
        <button className="btn-outline" onClick={sortAlpha}><i className="fa fa-arrow-down-a-z" /> Sort A–Z</button>
        <button className="btn-primary" onClick={openAdd}><i className="fa fa-plus" /> Add Guest</button>
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="Search guest name..." className="search-input" value={filter.search} onChange={e => { setFilter(f => ({ ...f, search: e.target.value })); setPage(1); }} />
        <select value={filter.category} onChange={e => { setFilter(f => ({ ...f, category: e.target.value })); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c} Sponsors</option>)}
        </select>
        <select value={filter.status} onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1); }}>
          <option value="">All Status</option>
          <option value="Not Seated">Not Seated</option>
          <option value="Seated">Seated</option>
        </select>
        <select value={filter.tableNum} onChange={e => { setFilter(f => ({ ...f, tableNum: e.target.value })); setPage(1); }}>
          <option value="">All Tables</option>
          {tableNums.map(t => <option key={t} value={String(t)}>Table {t}</option>)}
        </select>
        <select value={filter.confirmed} onChange={e => { setFilter(f => ({ ...f, confirmed: e.target.value })); setPage(1); }}>
          <option value="">All Confirmations</option>
          <option value="true">Confirmed</option>
          <option value="false">Not Confirmed</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Category</th><th>Status</th><th>Table</th><th>Confirmed</th><th>Actions</th></tr></thead>
          <tbody>
            {paged.length ? paged.map(g => (
              <tr key={g._id}>
                <td><strong>{g.name}</strong></td>
                <td><span className={`badge ${g.category === 'Principal' ? 'badge-principal' : g.category === 'Secondary' ? 'badge-secondary' : 'badge-cat'}`}>{g.category}</span></td>
                <td><span className={`badge ${g.status === 'Seated' ? 'badge-green' : 'badge-gray'}`}>{g.status}</span></td>
                <td>{g.tableNumber || '—'}</td>
                <td>{g.confirmed ? <i className="fa fa-check-circle text-green" /> : <i className="fa fa-circle text-muted" />}</td>
                <td>
                  <button className="btn-icon-sm" onClick={() => openEdit(g)}><i className="fa fa-edit" /></button>
                  <button className="btn-icon-sm danger" onClick={() => deleteGuest(g)}><i className="fa fa-trash" /></button>
                </td>
              </tr>
            )) : <tr><td colSpan="6" className="empty-row">No guests found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}><i className="fa fa-chevron-left" /></button>
        <span>Page {page} of {totalPages} ({filtered.length} total)</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><i className="fa fa-chevron-right" /></button>
      </div>

      {/* Sponsor sections */}
      <div className="sponsor-section">
        {[{ label: 'Principal', list: principalGuests }, { label: 'Secondary', list: secondaryGuests }].map(({ label, list }) => (
          <div key={label} className="sponsor-block">
            <div className="sponsor-header"><h4>{label} Sponsors <span className="sponsor-count">{list.length}</span></h4></div>
            <ul className="sponsor-list">
              {list.length ? list.map(g => (
                <li key={g._id}>
                  <span className="sponsor-list-name">{g.name}</span>
                  <span className="sponsor-list-actions">
                    <button className="btn-icon-sm" onClick={() => openEdit(g)}><i className="fa fa-edit" /></button>
                    <button className="btn-icon-sm danger" onClick={() => deleteGuest(g)}><i className="fa fa-trash" /></button>
                  </span>
                </li>
              )) : <li className="empty-row">No {label.toLowerCase()} sponsors yet.</li>}
            </ul>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit Guest' : 'Add Guest'} onClose={() => setModal(null)}>
          <div className="form-grid">
            <div className="form-group full"><label>Guest Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></div>
            <div className="form-group"><label>No. of Pax</label><input type="number" min="1" value={form.pax} onChange={e => setForm(f => ({ ...f, pax: parseInt(e.target.value) || 1 })) } /></div>
            <div className="form-group"><label>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ alignItems: 'flex-start', paddingTop: '0.6rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.confirmed} onChange={e => setForm(f => ({ ...f, confirmed: e.target.checked }))} style={{ width: 'auto', margin: 0, accentColor: 'var(--accent)' }} /> Confirmed
              </label>
            </div>
            <div className="form-group full"><label>Remarks</label><textarea rows="2" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveGuest} disabled={saving}>{saving ? 'Saving…' : 'Save Guest'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
