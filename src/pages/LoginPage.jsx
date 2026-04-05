import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Swal from 'sweetalert2';

export default function LoginPage() {
  const { loginUser, registerUser } = useApp();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', password: '', fullName: '', contactNumber: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      return Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please enter both username and password.', confirmButtonColor: '#226b45' });
    }
    try {
      setLoading(true);
      const user = await loginUser(form.username, form.password);
      await Swal.fire({ icon: 'success', title: `Welcome, ${user.fullName}!`, timer: 1400, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Login Failed', text: err.response?.data?.message || 'Invalid username or password.', confirmButtonColor: '#226b45' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const { username, password, fullName, contactNumber } = form;
    if (!username || !password || !fullName || !contactNumber) {
      return Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in all fields.', confirmButtonColor: '#226b45' });
    }
    if (password.length < 6) {
      return Swal.fire({ icon: 'warning', title: 'Weak Password', text: 'Password must be at least 6 characters.', confirmButtonColor: '#226b45' });
    }
    try {
      setLoading(true);
      const user = await registerUser({ username, password, fullName, contactNumber });
      await Swal.fire({ icon: 'success', title: `Account Created!`, text: `Welcome, ${user.fullName}!`, timer: 1600, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Registration Failed', text: err.response?.data?.message || 'Something went wrong.', confirmButtonColor: '#226b45' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleRegister(); };

  return (
    <div className="login-page">
      <div className="login-bg-deco" />
      <div className="login-card">
        <div className="login-logo"><i className="fa-solid fa-rings-wedding" /></div>
        <h1 className="login-title">TieTheKnot PH</h1>
        <p className="login-subtitle">Your Event Planning Companion</p>

        {/* Tab switcher */}
        <div className="login-tabs">
          <button className={`login-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign In</button>
          <button className={`login-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Register</button>
        </div>

        {mode === 'login' ? (
          <>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Username</label>
              <div className="input-icon-wrap">
                <i className="fa fa-user" />
                <input type="text" name="username" placeholder="Enter username" autoComplete="username"
                  value={form.username} onChange={handleChange} onKeyDown={handleKeyDown} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Password</label>
              <div className="input-icon-wrap">
                <i className="fa fa-lock" />
                <input type="password" name="password" placeholder="Enter password" autoComplete="current-password"
                  value={form.password} onChange={handleChange} onKeyDown={handleKeyDown} />
              </div>
            </div>
            <button className="btn-primary btn-full" onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text2)' }}>
              No account yet?{' '}
              <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                Register here
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label>Full Name *</label>
              <div className="input-icon-wrap">
                <i className="fa fa-id-card" />
                <input type="text" name="fullName" placeholder="Your full name"
                  value={form.fullName} onChange={handleChange} onKeyDown={handleKeyDown} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label>Username *</label>
              <div className="input-icon-wrap">
                <i className="fa fa-user" />
                <input type="text" name="username" placeholder="Choose a username"
                  value={form.username} onChange={handleChange} onKeyDown={handleKeyDown} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label>Password *</label>
              <div className="input-icon-wrap">
                <i className="fa fa-lock" />
                <input type="password" name="password" placeholder="At least 6 characters"
                  value={form.password} onChange={handleChange} onKeyDown={handleKeyDown} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Contact Number *</label>
              <div className="input-icon-wrap">
                <i className="fa fa-phone" />
                <input type="tel" name="contactNumber" placeholder="e.g. 09171234567"
                  value={form.contactNumber} onChange={handleChange} onKeyDown={handleKeyDown} />
              </div>
            </div>
            <button className="btn-primary btn-full" onClick={handleRegister} disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
            <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text2)' }}>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                Sign in
              </button>
            </p>
          </>
        )}
        <p className="login-footer">© 2025 TieTheKnot PH</p>
      </div>
    </div>
  );
}
