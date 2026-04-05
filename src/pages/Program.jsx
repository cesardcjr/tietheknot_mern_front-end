import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import Swal from 'sweetalert2';
import * as api from '../api';
import { parseTime, to12h } from '../utils/helpers';

export default function Program() {
  const { eventData, setEventData } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', _start: '', _end: '', details: '' });
  const [saving, setSaving] = useState(false);

  if (!eventData) return <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading…</div>;

  const { program = [] } = eventData;
  const patchData = (program) => setEventData(prev => ({ ...prev, program }));
  const sorted = [...program].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

  const openAdd = () => { setForm({ title: '', _start: '', _end: '', details: '' }); setModal({ mode: 'add' }); };
  const openEdit = (item) => { setForm({ title: item.title, _start: item._start || '', _end: item._end || '', details: item.details || '' }); setModal({ mode: 'edit', item }); };

  const saveItem = async () => {
    if (!form.title.trim()) return Swal.fire({ icon: 'warning', title: 'Title required', confirmButtonColor: '#226b45' });
    const data = { title: form.title, startTime: to12h(form._start), endTime: to12h(form._end), details: form.details, _start: form._start, _end: form._end };
    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        const res = await api.updateProgramItem(modal.item._id, data);
        patchData(program.map(p => p._id === modal.item._id ? res.data : p));
      } else {
        const res = await api.addProgramItem(data);
        patchData([...program, res.data]);
      }
      setModal(null);
    } catch { Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save.', confirmButtonColor: '#226b45' }); }
    setSaving(false);
  };

  const deleteItem = async (item) => {
    const r = await Swal.fire({ icon: 'warning', title: 'Delete activity?', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!r.isConfirmed) return;
    await api.deleteProgramItem(item._id);
    patchData(program.filter(p => p._id !== item._id));
  };

  const resetAll = async () => {
    const r = await Swal.fire({ icon: 'warning', title: 'Reset program?', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (!r.isConfirmed) return;
    await api.resetProgram();
    patchData([]);
  };

  return (
    <div>
      <div className="page-header-row">
        <h2 className="page-title">Program Flow</h2>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={openAdd}><i className="fa fa-plus" /> Add Activity</button>
          <button className="btn-outline btn-danger-outline" onClick={resetAll}><i className="fa fa-rotate-left" /> Reset</button>
        </div>
      </div>

      <div className="program-timeline">
        {sorted.length ? sorted.map(item => (
          <div key={item._id} className="timeline-item">
            <div className="timeline-time">
              <span>{item.startTime}</span>
              <span className="time-dash">—</span>
              <span>{item.endTime}</span>
            </div>
            <div className="timeline-dot" />
            <div className="timeline-content">
              <div className="timeline-title">{item.title}</div>
              {item.details && <div className="timeline-details">{item.details}</div>}
            </div>
            <div className="timeline-actions">
              <button className="btn-icon-sm" onClick={() => openEdit(item)}><i className="fa fa-edit" /></button>
              <button className="btn-icon-sm danger" onClick={() => deleteItem(item)}><i className="fa fa-trash" /></button>
            </div>
          </div>
        )) : <div className="empty-row">No activities yet.</div>}
      </div>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit Activity' : 'Add Activity'} onClose={() => setModal(null)}>
          <div className="form-grid">
            <div className="form-group full"><label>Activity Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-group"><label>Start Time</label><input type="time" value={form._start} onChange={e => setForm(f => ({ ...f, _start: e.target.value }))} /></div>
            <div className="form-group"><label>End Time</label><input type="time" value={form._end} onChange={e => setForm(f => ({ ...f, _end: e.target.value }))} /></div>
            <div className="form-group full"><label>Details</label><textarea rows="3" value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveItem} disabled={saving}>{saving ? 'Saving…' : 'Save Activity'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
