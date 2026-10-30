import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your username or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">📦</div>
          <h1 className="login-title">Smart Inventory</h1>
          <p className="login-subtitle">Sign in to manage stock and view reports</p>
        </div>

        {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">
              Username or Email <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. admin or staff_john"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Password <span className="required">*</span>
            </label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.65rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-credentials">
          <div className="demo-credentials-title">Quick Demo Login (Evaluator Shortcuts)</div>
          <div className="demo-btn-group">
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleFillDemo('admin', 'admin123')}
            >
              👑 Admin (admin / admin123)
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleFillDemo('staff_john', 'user123')}
            >
              👤 Staff (staff_john / user123)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
