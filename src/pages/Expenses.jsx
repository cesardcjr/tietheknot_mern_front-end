import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import Swal from 'sweetalert2';
import * as api from '../api';
import { fmt } from '../utils/helpers';

const TYPES = ['Catering','Styling','Photo-Video','HMUA','Host & Coordinators','Logistics','Souvenirs','Lights & Sounds','Rentals','Clothing','Others'];

const emptyForm = { supplierName: '', expenseType: 'Catering', cost: '', downpayment: '', contactPerson: '', contactNum: '', paymentStatus: 'Not Paid', paymentTracker: '' };

export default function Expenses() {
  const { eventData, setEventData } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState({ search: '', type: '' });
  const [saving, setSaving] = useState(false);

  if (!eventData) return <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading…</div>;

  const { expenseSettings = {}, expenses = [] } = eventData;
  const patchData = (updates) => setEventData(prev => ({ ...prev, ...updates }));

  const saveBudget = async () => {
    const val = parseFloat(document.getElementById('budgetInput')?.value);
    if (!val || val < 1) return Swal.fire({ icon: 'warning', title: 'Invalid budget', confirmButtonColor: '#226b45' });
    const settings = { budget: val, initialized: true };
    await api.updateExpenseSettings(settings);
    patchData({ expenseSettings: settings });
  };

  if (!expenseSettings.initialized) return (
    <div className="setup-card">
      <i className="fa fa-peso-sign setup-icon" />
      <h3>Set Event Budget</h3>
      <p>Enter your estimated total budget for the event.</p>
      <div className="setup-input-row">
        <input type="number" id="budgetInput" min="1" className="setup-input" />
        <button className="btn-primary" onClick={saveBudget}>Set Budget</button>
      </div>
    </div>
  );

  const budget = expenseSettings.budget || 0;
  const totalExp = expenses.reduce((a, e) => a + Number(e.cost || 0), 0);
  const remaining = budget - totalExp;
  const totalBalanceUnpaid = expenses.reduce((a, e) => e.paymentStatus === 'Paid' ? a : a + (Number(e.cost || 0) - Number(e.downpayment || 0)), 0);
  const expPct = budget > 0 ? Math.min(100, (totalExp / budget) * 100) : 0;

  let filtered = [...expenses];
  if (filter.search) filtered = filtered.filter(e => e.supplierName.toLowerCase().includes(filter.search.toLowerCase()));
  if (filter.type) filtered = filtered.filter(e => e.expenseType === filter.type);

  const editBudget = async () => {
    const result = await Swal.fire({ title: 'Edit Total Budget', input: 'number', inputValue: budget, inputAttributes: { min: 1, step: 1000 }, inputLabel: 'Total Budget (₱)', showCancelButton: true, confirmButtonColor: '#226b45', confirmButtonText: 'Update', preConfirm: (v) => { if (!v || v < 1) { Swal.showValidationMessage('Enter a valid amount'); return false; } return parseFloat(v); } });
    if (result.isConfirmed) { const settings = { budget: result.value, initialized: true }; await api.updateExpenseSettings(settings); patchData({ expenseSettings: settings }); }
  };

  const openAdd = () => { setForm(emptyForm); setModal({ mode: 'add' }); };
  const openEdit = (e) => { setForm({ supplierName: e.supplierName, expenseType: e.expenseType, cost: e.cost, downpayment: e.downpayment || '', contactPerson: e.contactPerson || '', contactNum: e.contactNum || '', paymentStatus: e.paymentStatus, paymentTracker: e.paymentTracker || '' }); setModal({ mode: 'edit', expense: e }); };

  const balance = () => {
    const c = parseFloat(form.cost) || 0, d = parseFloat(form.downpayment) || 0;
    if (d > c) return null;
    return c > 0 ? c - d : '';
  };

  const saveExpense = async () => {
    if (!form.supplierName.trim()) return Swal.fire({ icon: 'warning', title: 'Supplier name required', confirmButtonColor: '#226b45' });
    const cost = parseFloat(form.cost) || 0, down = parseFloat(form.downpayment) || 0;
    if (down > cost) return Swal.fire({ icon: 'error', title: 'Invalid Amount', text: 'Downpayment cannot exceed total cost.', confirmButtonColor: '#226b45' });
    let paymentStatus = form.paymentStatus;
    if (down > 0 && paymentStatus === 'Not Paid') paymentStatus = 'Incomplete';
    const data = { ...form, cost, downpayment: down, paymentStatus };
    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        const res = await api.updateExpense(modal.expense._id, data);
        patchData({ expenses: expenses.map(e => e._id === modal.expense._id ? res.data : e) });
      } else {
        const res = await api.addExpense(data);
        patchData({ expenses: [...expenses, res.data] });
      }
      setModal(null);
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save.', confirmButtonColor: '#226b45' }); }
    setSaving(false);
  };

  const deleteExpense = async (e) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Delete Expense?', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!result.isConfirmed) return;
    await api.deleteExpense(e._id);
    patchData({ expenses: expenses.filter(x => x._id !== e._id) });
  };

  const resetAll = async () => {
    const result = await Swal.fire({ icon: 'warning', title: 'Reset all expenses?', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!result.isConfirmed) return;
    await api.resetExpenses();
    patchData({ expenses: [] });
  };

  const b = balance();

  return (
    <div>
      <div className="page-header-row">
        <h2 className="page-title">Finance Tracker</h2>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={openAdd}><i className="fa fa-plus" /> Add Expense</button>
          <button className="btn-outline btn-danger-outline" onClick={resetAll}><i className="fa fa-rotate-left" /> Reset</button>
        </div>
      </div>

      <div className="budget-dashboard">
        <div className="budget-summary">
          <div className="budget-item"><span className="budget-label">Total Budget</span><div className="budget-edit-row"><span className="budget-val">₱{fmt(budget)}</span><button className="btn-edit-budget" onClick={editBudget}><i className="fa fa-pencil" /></button></div></div>
          <div className="budget-item"><span className="budget-label">Total Expenses</span><span className="budget-val spent">₱{fmt(totalExp)}</span></div>
          <div className="budget-item"><span className="budget-label">Remaining Budget</span><span className={`budget-val ${remaining < 0 ? 'over' : 'remain'}`}>₱{fmt(remaining)}{remaining < 0 && <i className="fa fa-triangle-exclamation" style={{ fontSize: '0.8em' }} />}</span></div>
          <div className="budget-item"><span className="budget-label">Total Balance Unpaid</span><span className="budget-val spent">₱{fmt(totalBalanceUnpaid)}</span></div>
        </div>
        <div className="budget-bar-wrap">
          <div className="budget-bar-track"><div className="budget-bar-fill" style={{ width: `${Math.min(100, expPct)}%`, background: expPct > 90 ? '#e74c3c' : '#226b45' }} /></div>
          <div className="budget-bar-labels"><span>0%</span><span>{Math.round(expPct)}% used</span><span>100%</span></div>
        </div>
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="Search supplier..." className="search-input" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table expense-table">
          <thead><tr><th>Supplier</th><th style={{ textAlign: 'center' }}>Type</th><th>Total Cost</th><th>Progress</th><th>Balance</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length ? filtered.map(e => {
              const bal = Number(e.cost || 0) - Number(e.downpayment || 0);
              const rowClass = e.paymentStatus === 'Paid' ? 'row-paid' : e.paymentStatus === 'Incomplete' ? 'row-incomplete' : 'row-notpaid';
              const pct = e.paymentStatus === 'Paid' ? 100 : e.cost > 0 ? Math.min(100, (Number(e.downpayment || 0) / Number(e.cost)) * 100) : 0;
              const barColor = e.paymentStatus === 'Paid' ? '#4caf50' : e.paymentStatus === 'Incomplete' ? '#ff9800' : '#f44336';
              return (
                <tr key={e._id} className={rowClass}>
                  <td><strong>{e.supplierName}</strong></td>
                  <td style={{ textAlign: 'center' }}><span className="badge badge-cat">{e.expenseType}</span></td>
                  <td>₱{fmt(e.cost)}</td>
                  <td><div style={{ width: '100%', height: 24, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: barColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 'bold' }}>{Math.round(pct)}%</div></div></td>
                  <td><strong>{e.paymentStatus === 'Paid' ? '—' : `₱${fmt(bal)}`}</strong></td>
                  <td>
                    <button className="btn-icon-sm" onClick={() => openEdit(e)}><i className="fa fa-edit" /></button>
                    <button className="btn-icon-sm danger" onClick={() => deleteExpense(e)}><i className="fa fa-trash" /></button>
                  </td>
                </tr>
              );
            }) : <tr><td colSpan="6" className="empty-row">No expenses recorded.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="expense-legend">
        <span className="legend-item"><span className="legend-dot" style={{ background: 'rgba(46,125,50,0.25)', border: '1.5px solid #2e7d32' }} />Paid</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: 'rgba(245,124,0,0.2)', border: '1.5px solid #f57c00' }} />Incomplete</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: 'rgba(198,40,40,0.18)', border: '1.5px solid #c62828' }} />Not Paid</span>
      </div>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit Expense' : 'Add Expense'} onClose={() => setModal(null)} wide>
          <div className="form-grid">
            <div className="form-group full"><label>Supplier Name *</label><input value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} /></div>
            <div className="form-group"><label>Expense Type</label><select value={form.expenseType} onChange={e => setForm(f => ({ ...f, expenseType: e.target.value }))}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label>Total Cost (₱) *</label><input type="number" min="0" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></div>
            <div className="form-group"><label>Contact Person</label><input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} /></div>
            <div className="form-group"><label>Contact Number</label><input value={form.contactNum} onChange={e => setForm(f => ({ ...f, contactNum: e.target.value }))} /></div>
            <div className="form-group"><label>Payment Status</label><select value={form.paymentStatus} onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value, downpayment: e.target.value === 'Paid' ? '' : f.downpayment }))}>{['Paid','Incomplete','Not Paid'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="form-group"><label>Downpayment (₱)</label><input type="number" min="0" value={form.downpayment} disabled={form.paymentStatus === 'Paid'} onChange={e => setForm(f => ({ ...f, downpayment: e.target.value }))} /></div>
            <div className="form-group"><label>Balance (₱)</label><input type="text" readOnly className="input-readonly" value={b === null ? '⚠ Downpayment exceeds cost' : b !== '' ? fmt(b) : ''} placeholder="Auto-computed" /></div>
            {b === null && <div className="balance-error" style={{ gridColumn: '1/-1' }}><i className="fa fa-triangle-exclamation" /> Downpayment cannot exceed total cost.</div>}
            <div className="form-group full"><label>Payment Tracker / Updates</label><div className="payment-tracker-wrap"><textarea rows="4" placeholder="• [Date] Downpayment sent via GCash" value={form.paymentTracker} onChange={e => setForm(f => ({ ...f, paymentTracker: e.target.value }))} /><div className="payment-tracker-hint">Use bullet points (•) to log payment updates with dates.</div></div></div>
          </div>
          <div className="modal-footer">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveExpense} disabled={saving || b === null}>{saving ? 'Saving…' : 'Save Expense'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
