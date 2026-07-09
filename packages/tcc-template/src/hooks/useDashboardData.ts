import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { tccService, type TccAnalytics, type TccRequest } from '../services/tccService';

export const useDashboardData = () => {
  const [data, setData] = useState<TccAnalytics | null>(null);
  const [requests, setRequests] = useState<TccRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const [analytics, allRequests] = await Promise.all([
        tccService.getAnalytics(),
        tccService.getRequests()
      ]);
      setData(analytics);
      setRequests(allRequests);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // WebSocket / STOMP Client for real-time triggers
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
        client.subscribe('/topic/tcc-updates', () => {
          fetchDataRef.current(true); // Silent reload
        });
      },
      onDisconnect: () => {}
    });
    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  return {
    data,
    requests,
    loading,
    error,
    refreshing,
    refetch: fetchData
  };
};
