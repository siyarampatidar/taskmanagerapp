import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

// Redirect unauthenticated users to /login
export const ProtectedRoute = ({ children }) => {
  const { token, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Subscription Gate: If company is inactive and user is not superadmin
  if (user && user.role !== 'superadmin' && user.companyActive === false) {
    // Only admins can select a plan, others just see the restriction
    if (location.pathname !== '/select-plan') {
       return <Navigate to="/select-plan" replace />;
    }
  }

  return children;
};

// Redirect authenticated users away from login/register
export const PublicRoute = ({ children }) => {
  const { token } = useSelector((state) => state.auth);
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Allow only specific roles
export const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useSelector((state) => state.auth);
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};
