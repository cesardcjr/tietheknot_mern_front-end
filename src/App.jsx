import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Guests from './pages/Guests';
import Seating from './pages/Seating';
import Expenses from './pages/Expenses';
import Tasks from './pages/Tasks';
import Checklist from './pages/Checklist';
import Program from './pages/Program';
import Suppliers from './pages/Suppliers';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const NAV_ITEMS = [
  { page: 'dashboard', icon: 'fa-home', label: 'Dashboard' },
  { page: 'guests', icon: 'fa-users', label: 'Guest List' },
  { page: 'seating', icon: 'fa-chair', label: 'Seating Plan' },
  { page: 'expenses', icon: 'fa-peso-sign', label: 'Finance Tracker' },
  { page: 'tasks', icon: 'fa-list-check', label: 'To-Do Tasks' },
  { page: 'checklist', icon: 'fa-clipboard-check', label: 'Event Checklist' },
  { page: 'program', icon: 'fa-calendar-days', label: 'Program Flow' },
  { page: 'suppliers', icon: 'fa-handshake', label: 'Supplier Details' },
];

const GUIDES = {
  dashboard: { title: 'Dashboard', steps: [{ bold: 'Overview cards', detail: 'Each card shows a summary of a planning section. Click any card to navigate directly to that section.' }, { bold: 'Progress rings', detail: 'The circular progress rings update in real time as you add and complete items.' }] },
  guests: { title: 'Guest List', steps: [{ bold: 'Set expected count', detail: 'The first time you open this page, enter how many guests you expect. You can adjust this later.' }, { bold: 'Add a guest', detail: 'Click + Add Guest. Fill in the name, category (Family, Friends, VIP, etc.), pax count, and confirmation status.' }, { bold: 'Principal & Secondary Sponsors', detail: 'Choose the "Principal" or "Secondary" category to list sponsors. They appear in the sponsor blocks below the table.' }, { bold: 'Filter and search', detail: 'Use the search bar and dropdowns to filter by category, status, table, or confirmation.' }, { bold: 'Pagination', detail: 'Results are paginated at 10 per page. Use the arrows to navigate.' }] },
  seating: { title: 'Seating Plan', steps: [{ bold: 'Configure tables', detail: 'On first use, enter the number of regular tables and max guests per table.' }, { bold: 'Add guests to a table', detail: 'Click a table card to open the seating modal. Type a guest name to search and add them.' }, { bold: 'Presidential tables', detail: 'Use "Add Presidential" for head/VIP tables. These are tracked separately.' }, { bold: 'Remove a guest', detail: 'Click the × button next to a guest name in the table modal to unseat them.' }, { bold: 'Delete a table', detail: 'Click the trash icon on a table card. Guests on that table revert to "Not Seated".' }] },
  expenses: { title: 'Finance Tracker', steps: [{ bold: 'Set budget', detail: 'On first use, enter your total event budget.' }, { bold: 'Add an expense', detail: 'Click + Add Expense. Enter the supplier name, type, total cost, payment status, and optional downpayment.' }, { bold: 'Payment progress bar', detail: 'Each row shows a color-coded progress bar: green = Paid, orange = Incomplete, red = Not Paid.' }, { bold: 'Balance auto-compute', detail: 'The balance field is automatically computed from total cost minus downpayment.' }] },
  tasks: { title: 'To-Do Tasks', steps: [{ bold: 'Add a task', detail: 'Click + Add Task. Enter a title, optional details, a due date, and an initial status.' }, { bold: 'Change status inline', detail: 'Use the status dropdown directly in the task row to update status without opening the modal.' }, { bold: 'Overdue highlight', detail: 'Tasks past their due date (not Completed or Cancelled) are highlighted red.' }] },
  checklist: { title: 'Event Checklist', steps: [{ bold: 'Add items', detail: 'Click + Add Item. Duplicate item names are not allowed.' }, { bold: 'Check off items', detail: 'Tick the checkbox on the left to mark an item as done. The row turns green when completed.' }, { bold: 'Filter', detail: 'Use the search box to find items, or filter by Completed / Not Yet Done.' }] },
  program: { title: 'Program Flow', steps: [{ bold: 'Add activities', detail: 'Click + Add Activity. Enter a title, start and end time, and optional details.' }, { bold: 'Auto-sorted by time', detail: 'Activities are automatically sorted chronologically by start time.' }, { bold: 'Time format', detail: 'Times display in 12-hour AM/PM format (e.g. 6:00 PM – 6:30 PM).' }] },
  suppliers: { title: 'Supplier Details', steps: [{ bold: 'Add a supplier', detail: 'Click + Add Supplier. Enter the name, category, quoted price, contact, location, and quote details.' }, { bold: 'Filter by category', detail: 'Use the category dropdown to view only suppliers of a specific type.' }, { bold: 'Edit & Delete', detail: 'Each supplier card has Edit and Delete buttons in the top-right corner.' }] },
};

function ReadMeModal({ page, onClose }) {
  const guide = GUIDES[page] || GUIDES['dashboard'];
  return (
    <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>📖 {guide.title} — How to Use</h3>
          <button className="modal-close" onClick={onClose}><i className="fa fa-times" /></button>
        </div>
        <div className="modal-body">
          <p className="readme-intro">Quick guide for the <strong>{guide.title}</strong> section.</p>
          <div className="readme-steps">
            {guide.steps.map((s, i) => (
              <div key={i} className="readme-step">
                <div className="readme-step-num">{i + 1}</div>
                <div className="readme-step-body"><span className="readme-bold">{s.bold}</span> — {s.detail}</div>
              </div>
            ))}
          </div>
          <div className="modal-footer"><button className="btn-primary" onClick={onClose}>Got it</button></div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, eventData, logoutUser, loading } = useApp();
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showReadMe, setShowReadMe] = useState(false);

  if (!user) return <LoginPage />;

  const isMobile = () => window.innerWidth <= 900;

  const navigate = (p) => {
    setPage(p);
    if (isMobile()) setSidebarOpen(false);
  };

  const toggleSidebar = () => {
    if (isMobile()) setSidebarOpen(o => !o);
    else setSidebarCollapsed(c => !c);
  };

  const handleLogout = async () => {
    const r = await Swal.fire({ icon: 'question', title: 'Sign Out?', showCancelButton: true, confirmButtonText: 'Yes, logout', confirmButtonColor: '#226b45' });
    if (r.isConfirmed) logoutUser();
  };

  const exportAllData = () => {
    if (!eventData) return;
    const { guests = [], expenses = [], tasks = [], checklist = [], program = [], suppliers = [] } = eventData;
    const wb = XLSX.utils.book_new();
    const date = new Date().toISOString().slice(0, 10);

    if (guests.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guests.map(g => ({ Name: g.name, Pax: g.pax, Category: g.category, Status: g.status, Table: g.tableNumber || '', Confirmed: g.confirmed ? 'Yes' : 'No', Remarks: g.remarks || '' }))), 'Guests');
    if (expenses.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenses.map(e => ({ Supplier: e.supplierName, Type: e.expenseType, Cost: e.cost, Downpayment: e.downpayment, Balance: (e.cost || 0) - (e.downpayment || 0), Contact: e.contactPerson || '', Number: e.contactNum || '', Payment: e.paymentStatus, Tracker: e.paymentTracker || '' }))), 'Expenses');
    if (tasks.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasks.map(t => ({ Title: t.title, Details: t.details || '', DueDate: t.dueDate || '', Status: t.status }))), 'Tasks');
    if (checklist.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(checklist.map(c => ({ Item: c.title, Details: c.details || '', Done: c.checked ? 'Yes' : 'No' }))), 'Checklist');
    if (program.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([...program].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map(p => ({ Activity: p.title, Start: p.startTime, End: p.endTime, Details: p.details || '' }))), 'Program');
    if (suppliers.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(suppliers.map(s => ({ Supplier: s.supplierName, Category: s.categoryType, QuotedPrice: s.quotedPrice, Contact: s.contactPerson || '', Number: s.contactNum || '', Location: s.location || '', Links: s.links || '', Details: s.quoteDetails || '' }))), 'Suppliers');

    if (!wb.SheetNames.length) return Swal.fire({ icon: 'info', title: 'No data to export yet.', confirmButtonColor: '#226b45' });
    XLSX.writeFile(wb, `TieTheKnot_${user.username}_${date}.xlsx`);
    Swal.fire({ icon: 'success', title: 'Export Complete', timer: 1600, showConfirmButton: false });
  };

  const PAGE_TITLES = { dashboard: 'Dashboard', guests: 'Guest List', seating: 'Seating Plan', expenses: 'Finance Tracker', tasks: 'To-Do Tasks', checklist: 'Event Checklist', program: 'Program Flow', suppliers: 'Supplier Details' };

  const PageComponent = { dashboard: Dashboard, guests: Guests, seating: Seating, expenses: Expenses, tasks: Tasks, checklist: Checklist, program: Program, suppliers: Suppliers }[page];

  return (
    <div className="app-shell">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="sidebar-overlay active" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-brand">
          <i className="fa-solid fa-rings-wedding" /><span>TieTheKnot PH</span>
        </div>
        <div className="sidebar-user">
          <div className="avatar"><i className="fa fa-user" /></div>
          <div className="user-info">
            <span className="user-name">{user.fullName}</span>
            <span className="user-role">Event Planner</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">Menu</div>
          {NAV_ITEMS.map(({ page: p, icon, label }) => (
            <a key={p} href="#" className={`nav-item${page === p ? ' active' : ''}`} onClick={e => { e.preventDefault(); navigate(p); }}>
              <i className={`fa ${icon}`} /><span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
            <i className="fa fa-sign-out-alt" /><span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <button className="sidebar-toggle" onClick={toggleSidebar}><i className="fa fa-bars" /></button>
          <div className="topbar-title">{PAGE_TITLES[page]}</div>
          <div className="topbar-actions">
            <button className="btn-icon btn-readme" onClick={() => setShowReadMe(true)} title="Read Me / Guide">
              <i className="fa fa-book-open" /><span className="btn-icon-label"> Read Me</span>
            </button>
            <button className="btn-icon" title="Export Data" onClick={exportAllData}>
              <i className="fa fa-file-arrow-down" /><span className="btn-icon-label"> Export</span>
            </button>
          </div>
        </div>

        <div className="page active">
          {loading && !eventData
            ? <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading your data…</div>
            : <PageComponent onNavigate={navigate} />
          }
        </div>
      </main>

      {showReadMe && <ReadMeModal page={page} onClose={() => setShowReadMe(false)} />}
    </div>
  );
}
