import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

export function useWebSocket(topic: string, onMessage: () => void) {
  const onMessageRef = useRef(onMessage);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const getWsUrl = () => {
      const apiBase = (import.meta as any).env.VITE_API_BASE_URL || '/api';
      if (apiBase.startsWith('https://')) {
        const wsBase = apiBase.replace(/^https/, 'wss');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else if (apiBase.startsWith('http://')) {
        const wsBase = apiBase.replace(/^http/, 'ws');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPath = apiBase.replace(/\/api\/?$/, '');
        return `${protocol}//${window.location.host}${wsPath}/ws-qc`;
      }
    };

    const client = new Client({
      brokerURL: getWsUrl(),
      onConnect: () => {
        client.subscribe(topic, () => {
          onMessageRef.current();
        });
      },
      onDisconnect: () => {}
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [topic]);
}
