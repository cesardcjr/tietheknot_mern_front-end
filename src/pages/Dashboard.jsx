import React from 'react';
import { useApp } from '../context/AppContext';
import CircleProgress from '../components/CircleProgress';
import { fmt, parseTime } from '../utils/helpers';

export default function Dashboard({ onNavigate }) {
  const { eventData } = useApp();
  if (!eventData) return <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading…</div>;

  const { guestSettings, guests = [], seatingSettings, seating = {}, presidentialSettings, presidentialSeating = {},
    expenseSettings, expenses = [], tasks = [], checklist = [], program = [], suppliers = [] } = eventData;

  const expectedGuests = guestSettings?.expectedGuests || 0;
  const guestPct = expectedGuests > 0 ? Math.min(100, (guests.length / expectedGuests) * 100) : 0;

  const totalTables = seatingSettings?.tableCount || 0;
  const presTableCount = presidentialSettings?.tableCount || 0;
  const tablesUsed = Object.keys(seating).filter(t => seating[t]?.length > 0).length;
  const presUsed = Object.keys(presidentialSeating).filter(t => presidentialSeating[t]?.length > 0).length;
  const allTables = totalTables + presTableCount;
  const allUsed = tablesUsed + presUsed;
  const seatingPct = allTables > 0 ? Math.min(100, (allUsed / allTables) * 100) : 0;

  const budget = expenseSettings?.budget || 0;
  const totalExp = expenses.reduce((a, e) => a + Number(e.cost || 0), 0);
  const expPct = budget > 0 ? Math.min(100, (totalExp / budget) * 100) : 0;

  const activeTasks = tasks.filter(t => t.status !== 'Cancelled');
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const taskPct = activeTasks.length > 0 ? (completedTasks / activeTasks.length) * 100 : 0;

  const checkedItems = checklist.filter(c => c.checked).length;
  const checklistPct = checklist.length > 0 ? (checkedItems / checklist.length) * 100 : 0;

  const cards = [
    { page: 'guests', icon: 'fa-users', label: 'Guests', value: `${guests.length} / ${expectedGuests}`, pct: guestPct, color: '#226b45', ring: true },
    { page: 'seating', icon: 'fa-chair', label: 'Seating', value: `${allUsed} / ${allTables} tables`, pct: seatingPct, color: '#2d8c5a', ring: true },
    { page: 'expenses', icon: 'fa-peso-sign', label: 'Budget', value: `₱${fmt(totalExp)} / ₱${fmt(budget)}`, pct: expPct, color: '#c47d0a', ring: true },
    { page: 'tasks', icon: 'fa-list-check', label: 'Tasks', value: `${completedTasks} / ${activeTasks.length} active`, pct: taskPct, color: '#2b6cb0', ring: true },
    { page: 'checklist', icon: 'fa-clipboard-check', label: 'Checklist', value: `${checkedItems} / ${checklist.length} items`, pct: checklistPct, color: '#6b46c1', ring: true },
    { page: 'program', icon: 'fa-calendar-days', label: 'Program', value: `${program.length} activities`, pct: 0, color: '#226b45', ring: false },
    { page: 'suppliers', icon: 'fa-handshake', label: 'Suppliers', value: `${suppliers.length} listed`, pct: 0, color: '#226b45', ring: false },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <h2 className="page-title">Planning Overview</h2>
        <p className="page-subtitle">Track every detail of your perfect day</p>
      </div>
      <div className="dashboard-grid">
        {cards.map(c => (
          <div key={c.page} className="dash-card" onClick={() => onNavigate(c.page)} style={{ color: c.color, cursor: 'pointer' }}>
            <div className="dash-card-icon" style={{ color: c.color }}><i className={`fa ${c.icon}`} /></div>
            <div className="dash-card-info">
              <div className="dash-card-label">{c.label}</div>
              <div className="dash-card-value">{c.value}</div>
            </div>
            {c.ring
              ? <div className="dash-card-ring"><CircleProgress pct={c.pct} size={72} stroke={7} color={c.color} /></div>
              : <div className="dash-card-logo"><i className={`fa ${c.icon}`} style={{ fontSize: '2rem', opacity: 0.18, color: c.color }} /></div>
            }
            <div className="dash-card-arrow"><i className="fa fa-arrow-right" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
