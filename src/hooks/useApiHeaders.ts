import { useSelector } from 'react-redux';
import { selectTokens } from '@/store/slices/authSlice';

export const useApiHeaders = () => {
  const tokens = useSelector(selectTokens);
  
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (tokens?.access_token) {
      headers['Authorization'] = `${tokens.token_type || 'Bearer'} ${tokens.access_token}`;
    }

    return headers;
  };

  return { getAuthHeaders };
};
