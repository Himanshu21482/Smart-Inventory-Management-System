import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <NavLink to="/dashboard" className="brand-logo">
            <span className="brand-icon">📦</span>
            <span className="brand-name">Smart Inventory</span>
          </NavLink>
        </div>

        <nav className="navbar-links">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Dashboard
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Products
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Categories
          </NavLink>
          <NavLink to="/suppliers" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Suppliers
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Stock Movements
          </NavLink>
          <NavLink to="/low-stock" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Low Stock
          </NavLink>
          {isAdmin && (
            <NavLink to="/reports" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              Reports
            </NavLink>
          )}
        </nav>

        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className={`role-badge ${isAdmin ? 'badge-admin' : 'badge-user'}`}>
              {user?.role}
            </span>
          </div>
          <button onClick={logout} className="btn btn-outline btn-sm" title="Log out of system">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
