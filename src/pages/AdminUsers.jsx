import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { getUsers, updateUserStatus } from '../api';

function formattedDate(value) {
  return value
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—';
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getUsers();
      setUsers(response.data.users || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load user accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleStatus = async (account) => {
    const nextStatus = !account.isActive;
    const result = await Swal.fire({
      icon: 'question',
      title: `${nextStatus ? 'Activate' : 'Deactivate'} account?`,
      text: nextStatus
        ? `${account.fullName} will be able to sign in.`
        : `${account.fullName} will no longer be able to access the planner.`,
      showCancelButton: true,
      confirmButtonText: nextStatus ? 'Activate' : 'Deactivate',
      confirmButtonColor: nextStatus ? '#226b45' : '#b63b3b',
    });
    if (!result.isConfirmed) return;

    try {
      setSavingId(account._id);
      const response = await updateUserStatus(account._id, nextStatus);
      setUsers((current) => current.map((user) => (
        user._id === account._id ? { ...user, isActive: response.data.user.isActive } : user
      )));
      Swal.fire({
        icon: 'success',
        title: `Account ${nextStatus ? 'activated' : 'deactivated'}`,
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (requestError) {
      Swal.fire({
        icon: 'error',
        title: 'Status update failed',
        text: requestError.response?.data?.message || 'Please try again.',
        confirmButtonColor: '#226b45',
      });
    } finally {
      setSavingId('');
    }
  };

  return (
    <section className="admin-users-page">
      <div className="page-heading-row">
        <div>
          <h1>User Accounts</h1>
          <p>Review registrations and control who can access TieTheKnot PH.</p>
        </div>
        <button type="button" className="btn-outline" onClick={loadUsers} disabled={loading}>
          <i className="fa fa-rotate" /> Refresh
        </button>
      </div>

      {loading ? <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading user accounts…</div> : error ? (
        <div className="error-state" role="alert"><i className="fa fa-circle-exclamation" /><h2>We couldn't load user accounts</h2><p>{error}</p><button type="button" className="btn-primary" onClick={loadUsers}>Try Again</button></div>
      ) : (
        <div className="admin-users-card">
          <div className="admin-users-summary"><strong>{users.length}</strong> registered account{users.length === 1 ? '' : 's'} · <span>{users.filter((account) => !account.isActive).length} pending approval</span></div>
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead><tr><th>Full Name</th><th>Username</th><th>Date Registered</th><th>Account Status</th></tr></thead>
              <tbody>
                {users.map((account) => {
                  const isProtectedAdmin = account.isAdmin;
                  const isSaving = savingId === account._id;
                  return <tr key={account._id}>
                    <td data-label="Full Name"><strong>{account.fullName}</strong>{isProtectedAdmin && <small className="admin-badge">Administrator</small>}</td>
                    <td data-label="Username">@{account.username}</td>
                    <td data-label="Date Registered">{formattedDate(account.createdDate)}</td>
                    <td data-label="Account Status"><button type="button" className={`status-toggle ${account.isActive ? 'active' : 'inactive'}`} onClick={() => toggleStatus(account)} disabled={isSaving || isProtectedAdmin} title={isProtectedAdmin ? 'Administrator accounts are managed separately' : undefined} aria-pressed={account.isActive}><span className="status-toggle-knob" /><span>{isSaving ? 'Saving…' : account.isActive ? 'Active' : 'Inactive'}</span></button></td>
                  </tr>;
                })}
                {!users.length && <tr><td colSpan="4" className="admin-users-empty">No user accounts have been registered yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
