import { useAuth as useAuthContext } from '../contexts/AuthContext';

// Re-export the useAuth hook from context for convenience
export const useAuth = useAuthContext;

// Additional auth-related hooks can be added here
export function useAuthToken() {
  const { tokens } = useAuthContext();
  return tokens?.accessToken;
}

export function useUser() {
  const { user } = useAuthContext();
  return user;
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated;
}

export function useAuthLoading() {
  const { isLoading } = useAuthContext();
  return isLoading;
}
