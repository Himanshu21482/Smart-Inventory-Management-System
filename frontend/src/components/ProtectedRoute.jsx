import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route wrapper that ensures the user is logged in, and optionally checks for Admin role.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="loading-spinner">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h3>Access Denied</h3>
          <p>You do not have administrative permissions to view this report or page.</p>
        </div>
      </div>
    );
  }

  return children;
}
