import { useEffect } from 'react';
import SocketService from '../services/SocketService';

export function useSocket(autoConnect = false) {
  useEffect(() => {
    if (!autoConnect) {
      return;
    }

    SocketService.connect();
  }, [autoConnect]);

  return SocketService;
}
