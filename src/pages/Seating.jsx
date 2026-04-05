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
  const [saving, setSaving] = useState(false);

  if (!eventData) return <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading…</div>;

  const { seatingSettings = {}, seating = {}, presidentialSettings = {}, presidentialSeating = {}, guests = [] } = eventData;

  const patchData = (updates) => setEventData(prev => ({ ...prev, ...updates }));

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
  const seatedCount = guests.filter(g => g.status === 'Seated').length;
  const notSeatedCount = guests.filter(g => g.status === 'Not Seated').length;
  const tablesUsed = Object.keys(seating).filter(k => seating[k]?.length > 0).length;
  const presUsed = Object.keys(presidentialSeating).filter(k => presidentialSeating[k]?.length > 0).length;
  const allTables = totalTables + presTableCount;
  const allUsed = tablesUsed + presUsed;
  const seatingPct = allTables > 0 ? Math.round((allUsed / allTables) * 100) : 0;

  const resetSeating = async () => {
    const result = await Swal.fire({ icon: 'warning', title: 'Reset Seating Config?', text: 'This will clear all seating assignments.', showCancelButton: true, confirmButtonColor: '#226b45' });
    if (!result.isConfirmed) return;
    const settings = { tableCount: 0, maxPerTable: 10, initialized: false };
    await Promise.all([api.updateSeatingSettings(settings), api.updateSeating({}), api.updatePresidentialSettings({ tableCount: 0, maxPerTable: 10 }), api.updatePresidentialSeating({})]);
    patchData({ seatingSettings: settings, seating: {}, presidentialSettings: { tableCount: 0, maxPerTable: 10 }, presidentialSeating: {} });
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
    const isReg = type === 'regular';
    const src = isReg ? seating : presidentialSeating;
    const ss = isReg ? seatingSettings : presidentialSettings;
    const unseatedGuests = src[tableNum] || [];
    const newSeating = {};
    let idx = 1;
    for (let i = 1; i <= ss.tableCount; i++) {
      if (i === tableNum) continue;
      newSeating[idx] = src[i] || [];
      idx++;
    }
    const newSs = { ...ss, tableCount: ss.tableCount - 1 };
    const guestUpdates = unseatedGuests.map(name => { const g = guests.find(x => x.name === name); return g ? api.updateGuest(g._id, { status: 'Not Seated', tableNumber: null }) : Promise.resolve(); });
    const apiCalls = [
      ...guestUpdates,
      isReg ? api.updateSeating(newSeating) : api.updatePresidentialSeating(newSeating),
      isReg ? api.updateSeatingSettings(newSs) : api.updatePresidentialSettings(newSs),
    ];
    await Promise.all(apiCalls);
    const updatedGuests = guests.map(g => unseatedGuests.includes(g.name) ? { ...g, status: 'Not Seated', tableNumber: null } : g);
    patchData(isReg ? { seating: newSeating, seatingSettings: newSs, guests: updatedGuests } : { presidentialSeating: newSeating, presidentialSettings: newSs, guests: updatedGuests });
  };

  const addToTable = async (type, tableNum, guestName, guestId) => {
    const isReg = type === 'regular';
    const src = isReg ? { ...seating } : { ...presidentialSeating };
    const ss = isReg ? seatingSettings : presidentialSettings;
    const tGuests = src[tableNum] || [];
    if (tGuests.length >= ss.maxPerTable) return Swal.fire({ icon: 'warning', title: 'Table Full', confirmButtonColor: '#226b45' });
    if (tGuests.includes(guestName)) return;
    tGuests.push(guestName);
    src[tableNum] = tGuests;
    const tableLabel = isReg ? tableNum : `P${tableNum}`;
    await Promise.all([
      isReg ? api.updateSeating(src) : api.updatePresidentialSeating(src),
      api.updateGuest(guestId, { status: 'Seated', tableNumber: tableLabel }),
    ]);
    const updatedGuests = guests.map(g => g._id === guestId ? { ...g, status: 'Seated', tableNumber: tableLabel } : g);
    patchData(isReg ? { seating: src, guests: updatedGuests } : { presidentialSeating: src, guests: updatedGuests });
    setAcSearch('');
    setTableModal({ type, num: tableNum });
    Swal.fire({ icon: 'success', title: `Added to Table`, text: `${guestName} has been seated.`, timer: 1200, showConfirmButton: false });
  };

  const removeFromTable = async (type, tableNum, guestName) => {
    const isReg = type === 'regular';
    const src = isReg ? { ...seating } : { ...presidentialSeating };
    src[tableNum] = (src[tableNum] || []).filter(n => n !== guestName);
    const g = guests.find(x => x.name === guestName);
    await Promise.all([
      isReg ? api.updateSeating(src) : api.updatePresidentialSeating(src),
      g ? api.updateGuest(g._id, { status: 'Not Seated', tableNumber: null }) : Promise.resolve(),
    ]);
    const updatedGuests = guests.map(x => x.name === guestName ? { ...x, status: 'Not Seated', tableNumber: null } : x);
    patchData(isReg ? { seating: src, guests: updatedGuests } : { presidentialSeating: src, guests: updatedGuests });
  };

  const availableGuests = tableModal ? guests.filter(g => g.status !== 'Seated' && (!acSearch || g.name.toLowerCase().includes(acSearch.toLowerCase()))).slice(0, 10) : [];
  const currentTableGuests = tableModal ? (tableModal.type === 'regular' ? seating[tableModal.num] : presidentialSeating[tableModal.num]) || [] : [];
  const currentMax = tableModal ? (tableModal.type === 'regular' ? maxPer : maxPres) : 0;

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
          const tGuests = presidentialSeating[tNum] || [];
          const full = tGuests.length >= maxPres;
          return (
            <div key={tNum} className={`table-card table-presidential${full ? ' table-full' : ''}`}>
              <div className="table-card-header">
                <span className="table-num" onClick={() => setTableModal({ type: 'presidential', num: tNum })} style={{ cursor: 'pointer', flex: 1 }}>Pres. {tNum}</span>
                <span className={`table-count${full ? ' full' : ''}`}>{tGuests.length}/{maxPres}</span>
                <button className="btn-icon-sm danger table-del-btn" onClick={() => deleteTable('presidential', tNum)}><i className="fa fa-trash" /></button>
              </div>
              <ul className="table-guest-list" onClick={() => setTableModal({ type: 'presidential', num: tNum })} style={{ cursor: 'pointer', minHeight: 28 }}>
                {tGuests.length ? tGuests.map(g => <li key={g}><i className="fa fa-circle-dot" /> {g}</li>) : <li className="empty-small">Click to add guests</li>}
              </ul>
            </div>
          );
        })}
        <div className="table-add-card" onClick={() => addTable('presidential')} style={{ borderColor: 'rgba(139,92,246,0.4)' }}>
          <div className="table-add-inner" style={{ color: '#8b5cf6' }}><i className="fa fa-plus-circle" /><span>Add Presidential</span></div>
        </div>
      </div>

      <div className="seating-section-title" style={{ marginTop: '1.8rem' }}><i className="fa fa-chair" /> Regular Tables <span className="section-badge badge badge-cat">{totalTables}</span></div>
      <div className="table-cards-grid">
        {Array.from({ length: totalTables }, (_, i) => i + 1).map(tNum => {
          const tGuests = seating[tNum] || [];
          const full = tGuests.length >= maxPer;
          return (
            <div key={tNum} className={`table-card${full ? ' table-full' : ''}`}>
              <div className="table-card-header">
                <span className="table-num" onClick={() => setTableModal({ type: 'regular', num: tNum })} style={{ cursor: 'pointer', flex: 1 }}>Table {tNum}</span>
                <span className={`table-count${full ? ' full' : ''}`}>{tGuests.length}/{maxPer}</span>
                <button className="btn-icon-sm danger table-del-btn" onClick={() => deleteTable('regular', tNum)}><i className="fa fa-trash" /></button>
              </div>
              <ul className="table-guest-list" onClick={() => setTableModal({ type: 'regular', num: tNum })} style={{ cursor: 'pointer', minHeight: 28 }}>
                {tGuests.length ? tGuests.map(g => <li key={g}><i className="fa fa-circle-dot" /> {g}</li>) : <li className="empty-small">Click to add guests</li>}
              </ul>
            </div>
          );
        })}
        <div className="table-add-card" onClick={() => addTable('regular')}>
          <div className="table-add-inner"><i className="fa fa-plus-circle" /><span>Add Table</span></div>
        </div>
      </div>

      {tableModal && (
        <Modal title={`${tableModal.type === 'regular' ? 'Table' : 'Presidential Table'} ${tableModal.num} — Guests`} onClose={() => { setTableModal(null); setAcSearch(''); }}>
          <p className="modal-meta">Max: <strong>{currentMax}</strong> &nbsp;|&nbsp; Current: <strong>{currentTableGuests.length}</strong></p>
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Add Guest from List</label>
            <input placeholder="Type guest name..." value={acSearch} onChange={e => setAcSearch(e.target.value)} autoComplete="off" />
            {acSearch && availableGuests.length > 0 && (
              <div className="autocomplete-dropdown">
                {availableGuests.map(g => (
                  <div key={g._id} className="ac-item" onClick={() => addToTable(tableModal.type, tableModal.num, g.name, g._id)}>
                    {g.name} <span className="ac-meta">{g.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <ul className="seating-guest-ul">
            {currentTableGuests.map(gName => (
              <li key={gName}><span>{gName}</span><button className="btn-del-inline" onClick={() => removeFromTable(tableModal.type, tableModal.num, gName)}><i className="fa fa-times" /></button></li>
            ))}
          </ul>
          <div className="modal-footer"><button className="btn-outline" onClick={() => { setTableModal(null); setAcSearch(''); }}>Close</button></div>
        </Modal>
      )}
    </div>
  );
}
