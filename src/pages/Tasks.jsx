import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import CircleProgress from '../components/CircleProgress';
import Modal from '../components/Modal';
import Swal from 'sweetalert2';
import * as api from '../api';
import { today, isOverdue } from '../utils/helpers';

const STATUSES = ['Not Started', 'In-Progress', 'Completed', 'Cancelled'];
const emptyForm = { title: '', details: '', dueDate: today(), status: 'Not Started' };

export default function Tasks() {
  const { eventData, setEventData } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  if (!eventData) return <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading…</div>;

  const { tasks = [] } = eventData;
  const patchData = (tasks) => setEventData(prev => ({ ...prev, tasks }));

  const activeTasks = tasks.filter(t => t.status !== 'Cancelled');
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const pct = activeTasks.length ? Math.round((completedTasks / activeTasks.length) * 100) : 0;
  const byStatus = (s) => tasks.filter(t => t.status === s).length;
  const sorted = [...tasks].sort((a, b) => new Date(a.dueDate || today()) - new Date(b.dueDate || today()));

  const openAdd = () => { setForm(emptyForm); setModal({ mode: 'add' }); };
  const openEdit = (t) => { setForm({ title: t.title, details: t.details || '', dueDate: t.dueDate || today(), status: t.status }); setModal({ mode: 'edit', task: t }); };

  const saveTask = async () => {
    if (!form.title.trim()) return Swal.fire({ icon: 'warning', title: 'Title required', confirmButtonColor: '#226b45' });
    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        const res = await api.updateTask(modal.task._id, form);
        patchData(tasks.map(t => t._id === modal.task._id ? res.data : t));
      } else {
        const res = await api.addTask(form);
        patchData([...tasks, res.data]);
      }
      setModal(null);
    } catch { Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save.', confirmButtonColor: '#226b45' }); }
    setSaving(false);
  };

  const deleteTask = async (t) => {
    const r = await Swal.fire({ icon: 'warning', title: 'Delete Task?', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!r.isConfirmed) return;
    await api.deleteTask(t._id);
    patchData(tasks.filter(x => x._id !== t._id));
  };

  const quickUpdate = async (t, status) => {
    const res = await api.updateTask(t._id, { ...t, status });
    patchData(tasks.map(x => x._id === t._id ? res.data : x));
  };

  const resetAll = async () => {
    const r = await Swal.fire({ icon: 'warning', title: 'Reset all tasks?', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!r.isConfirmed) return;
    await api.resetTasks();
    patchData([]);
  };

  return (
    <div>
      <div className="page-header-row">
        <h2 className="page-title">To-Do Tasks</h2>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={openAdd}><i className="fa fa-plus" /> Add Task</button>
          <button className="btn-outline btn-danger-outline" onClick={resetAll}><i className="fa fa-rotate-left" /> Reset</button>
        </div>
      </div>

      <div className="stats-panel">
        <div className="stats-panel-inner">
          <div className="stats-ring-col"><CircleProgress pct={pct} size={110} stroke={10} color="#2b6cb0" /><div className="ring-label">Completed<br /><span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>(excl. cancelled)</span></div></div>
          <div className="stats-numbers-col">
            {STATUSES.map(s => <div key={s} className="stat-box"><div className="stat-num">{byStatus(s)}</div><div className="stat-label">{s}</div></div>)}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Title</th><th style={{ textAlign: 'center' }}>Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
          <tbody>
            {sorted.length ? sorted.map(t => (
              <tr key={t._id} className={isOverdue(t.dueDate, t.status) ? 'row-overdue' : ''}>
                <td><strong>{t.title}</strong>{t.dueDate && <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{t.dueDate}</div>}</td>
                <td style={{ textAlign: 'center' }}>
                  <select className={`status-select status-${(t.status || '').replace(/[\s-]+/g, '-').toLowerCase()}`} value={t.status} onChange={e => quickUpdate(t, e.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn-icon-sm" onClick={() => openEdit(t)}><i className="fa fa-edit" /></button>
                  <button className="btn-icon-sm danger" onClick={() => deleteTask(t)}><i className="fa fa-trash" /></button>
                </td>
              </tr>
            )) : <tr><td colSpan="3" className="empty-row">No tasks yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit Task' : 'Add Task'} onClose={() => setModal(null)}>
          <div className="form-grid">
            <div className="form-group full"><label>Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-group full"><label>Details</label><textarea rows="3" value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} /></div>
            <div className="form-group"><label>Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="modal-footer">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveTask} disabled={saving}>{saving ? 'Saving…' : 'Save Task'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
