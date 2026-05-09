import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../redux/slices/authSlice';

export const useAuth = () => {
  const { user, token, loading, error } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    logout: () => dispatch(logoutUser()),
  };
};
