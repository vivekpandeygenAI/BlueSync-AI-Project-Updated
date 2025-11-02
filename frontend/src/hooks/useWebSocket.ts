import { useState, useEffect } from 'react';

export const useWebSocket = (url: string) => {
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    // Mock WebSocket implementation
    const interval = setInterval(() => {
      setLastMessage({
        type: 'status_update',
        data: {
          fileId: 'mock_file',
          status: 'processing',
          progress: Math.floor(Math.random() * 100),
          message: 'Processing...'
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [url]);

  return { lastMessage };
};