import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, module }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const rawRole = localStorage.getItem('userRole');
  const userRole = rawRole ? rawRole.replace(/"/g, '') : 'Admin';
  const rawPerms = localStorage.getItem('userPermissions');
  const userPermissions = rawPerms ? JSON.parse(rawPerms) : {};

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If a module is specified, check for permission
  if (module && userRole !== 'Owner') {
    if (!userPermissions[module]) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
