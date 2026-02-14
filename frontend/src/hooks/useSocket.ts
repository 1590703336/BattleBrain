import { useEffect } from 'react';
import SocketService from '../services/SocketService';

export function useSocket(autoConnect = false) {
  useEffect(() => {
    if (!autoConnect) {
      return;
    }

    SocketService.connect();
    return () => {
      SocketService.disconnect();
    };
  }, [autoConnect]);

  return SocketService;
}
