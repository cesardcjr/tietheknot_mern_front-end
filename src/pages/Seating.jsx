import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import CircleProgress from '../components/CircleProgress';
import Modal from '../components/Modal';
import Swal from 'sweetalert2';
import * as api from '../api';

export default function Seating() {
  const { eventData, setEventData } = useApp();
  const [tableModal, setTableModal] = useState(null); // {type, num}
  const [acSearch, setAcSearch] = useState('');

  if (!eventData) return <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading…</div>;

  const { seatingSettings = {}, seating = {}, presidentialSettings = {}, presidentialSeating = {}, guests = [] } = eventData;

  const patchData = (updates) => setEventData(prev => ({ ...prev, ...updates }));
  const guestFor = (reference) => guests.find(g => String(g._id) === String(reference) || g.name === reference);
  const guestsFor = (references = []) => references.map(guestFor).filter(Boolean);
  const guestPax = (guest) => guest.rsvpStatus === 'Accepted' ? Number(guest.attendingPax || guest.pax || 1) : Number(guest.pax || 1);
  const occupiedPax = (tableGuests = []) => tableGuests.reduce((total, guest) => total + guestPax(guest), 0);
  const applySeatingResponse = (data) => patchData({
    seating: data.seating,
    presidentialSeating: data.presidentialSeating,
    seatingSettings: data.seatingSettings,
    presidentialSettings: data.presidentialSettings,
    guests: data.guests,
  });

  const saveSeatingSettings = async () => {
    const tc = parseInt(document.getElementById('tableCount')?.value);
    const mp = parseInt(document.getElementById('maxPerTable')?.value);
    if (!tc || tc < 1 || !mp || mp < 1) return Swal.fire({ icon: 'warning', title: 'Invalid', text: 'Enter valid numbers.', confirmButtonColor: '#226b45' });
    const settings = { tableCount: tc, maxPerTable: mp, initialized: true };
    await api.updateSeatingSettings(settings);
    patchData({ seatingSettings: settings });
  };

  if (!seatingSettings.initialized) return (
    <div className="setup-card">
      <i className="fa fa-chair setup-icon" />
      <h3>Configure Tables</h3>
      <p>Set the number of regular tables and maximum guests per table.</p>
      <div className="form-grid" style={{ maxWidth: 400, margin: '1.5rem auto 0' }}>
        <div className="form-group"><label>Number of Tables</label><input id="tableCount" type="number" min="1" /></div>
        <div className="form-group"><label>Max Guests Per Table</label><input id="maxPerTable" type="number" min="1" /></div>
      </div>
      <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={saveSeatingSettings}>Confirm Setup</button>
    </div>
  );

  const totalTables = seatingSettings.tableCount || 0;
  const maxPer = seatingSettings.maxPerTable || 10;
  const presTableCount = presidentialSettings.tableCount || 0;
  const maxPres = presidentialSettings.maxPerTable || 10;
  const paxForStatus = (status) => guests.filter(g => g.status === status).reduce((total, guest) => total + guestPax(guest), 0);
  const seatedCount = paxForStatus('Seated');
  const notSeatedCount = paxForStatus('Not Seated');
  const tablesUsed = Object.keys(seating).filter(k => seating[k]?.length > 0).length;
  const presUsed = Object.keys(presidentialSeating).filter(k => presidentialSeating[k]?.length > 0).length;
  const allTables = totalTables + presTableCount;
  const allUsed = tablesUsed + presUsed;
  const seatingPct = allTables > 0 ? Math.round((allUsed / allTables) * 100) : 0;

  const resetSeating = async () => {
    const result = await Swal.fire({ icon: 'warning', title: 'Reset Seating Config?', text: 'This will clear all seating assignments.', showCancelButton: true, confirmButtonColor: '#226b45' });
    if (!result.isConfirmed) return;
    const res = await api.resetSeatingPlan();
    applySeatingResponse(res.data);
  };

  const addTable = async (type) => {
    if (type === 'regular') {
      const ss = { ...seatingSettings, tableCount: (seatingSettings.tableCount || 0) + 1 };
      await api.updateSeatingSettings(ss);
      patchData({ seatingSettings: ss });
    } else {
      if (!presTableCount) {
        const result = await Swal.fire({ title: 'Add Presidential Table', html: '<div class="form-group"><label style="font-size:.85rem">Max Guests per Presidential Table</label><input id="presMax" type="number" min="1" value="10" class="swal2-input" /></div>', showCancelButton: true, confirmButtonColor: '#8b5cf6', confirmButtonText: 'Add Table', preConfirm: () => { const v = parseInt(document.getElementById('presMax')?.value); if (!v || v < 1) { Swal.showValidationMessage('Enter valid number'); return false; } return v; } });
        if (result.isConfirmed) { const ps = { tableCount: 1, maxPerTable: result.value }; await api.updatePresidentialSettings(ps); patchData({ presidentialSettings: ps }); }
      } else {
        const ps = { ...presidentialSettings, tableCount: presTableCount + 1 };
        await api.updatePresidentialSettings(ps);
        patchData({ presidentialSettings: ps });
      }
    }
  };

  const deleteTable = async (type, tableNum) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Delete Table?', text: 'Guests will be returned to Not Seated.', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!result.isConfirmed) return;
    const res = await api.deleteSeatingTable(type, tableNum);
    applySeatingResponse(res.data);
  };

  const addToTable = async (type, tableNum, guest) => {
    try {
      const res = await api.assignSeat({ type, tableNumber: tableNum, guestId: guest._id });
      applySeatingResponse(res.data);
      setAcSearch('');
      setTableModal({ type, num: tableNum });
      Swal.fire({ icon: 'success', title: 'Added to Table', text: `${guest.name} has been seated.`, timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'warning', title: 'Unable to Seat Guest', text: err.response?.data?.message || 'Please try again.', confirmButtonColor: '#226b45' });
    }
  };

  const removeFromTable = async (guest) => {
    const res = await api.removeSeat({ guestId: guest._id });
    applySeatingResponse(res.data);
  };

  const availableGuests = tableModal ? guests.filter(g => g.status !== 'Seated' && (!acSearch || g.name.toLowerCase().includes(acSearch.toLowerCase()))).slice(0, 10) : [];
  const currentTableGuests = tableModal ? guestsFor((tableModal.type === 'regular' ? seating[tableModal.num] : presidentialSeating[tableModal.num]) || []) : [];
  const currentMax = tableModal ? (tableModal.type === 'regular' ? maxPer : maxPres) : 0;
  const currentPax = occupiedPax(currentTableGuests);

  return (
    <div>
      <div className="page-header-row">
        <h2 className="page-title">Seating Plan</h2>
        <button className="btn-outline btn-danger-outline" onClick={resetSeating}><i className="fa fa-rotate-left" /> Reset Tables</button>
      </div>

      <div className="stats-panel">
        <div className="stats-panel-inner">
          <div className="stats-ring-col"><CircleProgress pct={seatingPct} size={110} stroke={10} color="#2d8c5a" /><div className="ring-label">Tables Filled</div></div>
          <div className="stats-numbers-col">
            <div className="stat-box"><div className="stat-num">{allUsed}/{allTables}</div><div className="stat-label">Tables Used</div></div>
            <div className="stat-box"><div className="stat-num">{seatedCount}</div><div className="stat-label">Seated</div></div>
            <div className="stat-box" style={{ background: 'var(--red-soft)' }}><div className="stat-num" style={{ color: 'var(--red)' }}>{notSeatedCount}</div><div className="stat-label">Not Seated</div></div>
            <div className="stat-box"><div className="stat-num">{presTableCount}</div><div className="stat-label">Presidential</div></div>
          </div>
        </div>
      </div>

      <div className="seating-section-title"><i className="fa fa-crown" /> Presidential Tables <span className="section-badge badge badge-pres">{presTableCount}</span></div>
      <div className="table-cards-grid">
        {Array.from({ length: presTableCount }, (_, i) => i + 1).map(tNum => {
          const tGuests = guestsFor(presidentialSeating[tNum] || []);
          const tablePax = occupiedPax(tGuests);
          const full = tablePax >= maxPres;
          return (
            <div key={tNum} className={`table-card table-presidential${full ? ' table-full' : ''}`}>
              <div className="table-card-header">
                <button type="button" className="table-num" onClick={() => setTableModal({ type: 'presidential', num: tNum })}>Pres. {tNum}</button>
                <span className={`table-count${full ? ' full' : ''}`}>{tablePax}/{maxPres} pax</span>
                <button type="button" aria-label={`Delete Presidential Table ${tNum}`} className="btn-icon-sm danger table-del-btn" onClick={() => deleteTable('presidential', tNum)}><i className="fa fa-trash" /></button>
              </div>
              <button type="button" className="table-guest-list-button" onClick={() => setTableModal({ type: 'presidential', num: tNum })}>
              <span className="table-guest-list">
                {tGuests.length ? tGuests.slice(0, 4).map(g => <span key={g._id}><i className="fa fa-circle-dot" /> {g.name}</span>) : <span className="empty-small">Click to add guests</span>}
                {tGuests.length > 4 && <span className="table-more">+{tGuests.length - 4} more</span>}
              </span>
              </button>
            </div>
          );
        })}
        <button type="button" className="table-add-card" onClick={() => addTable('presidential')} style={{ borderColor: 'rgba(139,92,246,0.4)' }}>
          <div className="table-add-inner" style={{ color: '#8b5cf6' }}><i className="fa fa-plus-circle" /><span>Add Presidential</span></div>
        </button>
      </div>

      <div className="seating-section-title" style={{ marginTop: '1.8rem' }}><i className="fa fa-chair" /> Regular Tables <span className="section-badge badge badge-cat">{totalTables}</span></div>
      <div className="table-cards-grid">
        {Array.from({ length: totalTables }, (_, i) => i + 1).map(tNum => {
          const tGuests = guestsFor(seating[tNum] || []);
          const tablePax = occupiedPax(tGuests);
          const full = tablePax >= maxPer;
          return (
            <div key={tNum} className={`table-card${full ? ' table-full' : ''}`}>
              <div className="table-card-header">
                <button type="button" className="table-num" onClick={() => setTableModal({ type: 'regular', num: tNum })}>Table {tNum}</button>
                <span className={`table-count${full ? ' full' : ''}`}>{tablePax}/{maxPer} pax</span>
                <button type="button" aria-label={`Delete Table ${tNum}`} className="btn-icon-sm danger table-del-btn" onClick={() => deleteTable('regular', tNum)}><i className="fa fa-trash" /></button>
              </div>
              <button type="button" className="table-guest-list-button" onClick={() => setTableModal({ type: 'regular', num: tNum })}>
              <span className="table-guest-list">
                {tGuests.length ? tGuests.slice(0, 4).map(g => <span key={g._id}><i className="fa fa-circle-dot" /> {g.name}</span>) : <span className="empty-small">Click to add guests</span>}
                {tGuests.length > 4 && <span className="table-more">+{tGuests.length - 4} more</span>}
              </span>
              </button>
            </div>
          );
        })}
        <button type="button" className="table-add-card" onClick={() => addTable('regular')}>
          <div className="table-add-inner"><i className="fa fa-plus-circle" /><span>Add Table</span></div>
        </button>
      </div>

      {tableModal && (
        <Modal title={`${tableModal.type === 'regular' ? 'Table' : 'Presidential Table'} ${tableModal.num} — Guests`} onClose={() => { setTableModal(null); setAcSearch(''); }}>
          <p className="modal-meta">Capacity: <strong>{currentPax}/{currentMax} pax</strong> &nbsp;|&nbsp; Entries: <strong>{currentTableGuests.length}</strong></p>
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Add Guest from List</label>
            <input placeholder="Type guest name..." value={acSearch} onChange={e => setAcSearch(e.target.value)} autoComplete="off" />
            {acSearch && availableGuests.length > 0 && (
              <div className="autocomplete-dropdown">
                {availableGuests.map(g => (
                  <button type="button" key={g._id} className="ac-item" onClick={() => addToTable(tableModal.type, tableModal.num, g)}>
                    {g.name} <span className="ac-meta">{g.category} · {guestPax(g)} pax</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <ul className="seating-guest-ul">
            {currentTableGuests.map(guest => (
              <li key={guest._id}><span>{guest.name} <small>({guestPax(guest)} pax)</small></span><button type="button" aria-label={`Remove ${guest.name} from table`} className="btn-del-inline" onClick={() => removeFromTable(guest)}><i className="fa fa-times" /></button></li>
            ))}
          </ul>
          <div className="modal-footer"><button className="btn-outline" onClick={() => { setTableModal(null); setAcSearch(''); }}>Close</button></div>
        </Modal>
      )}
    </div>
  );
}
