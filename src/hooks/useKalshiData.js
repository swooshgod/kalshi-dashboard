import { useState, useEffect, useCallback, useRef } from 'react';
import { kalshi }     from '../api/kalshiClient.js';
import { useMockData } from './useMockData.js';

const IS_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export function useKalshiData() {
  const mock = useMockData();

  const [data,    setData]    = useState({ settlements: [], positions: [], orders: [], balance: null, equityCurve: [] });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (IS_MOCK) {
      setData({ ...mock, orders: [] });
      setLoading(false);
      setLastUpdated(new Date());
      return;
    }

    try {
      setLoading(true);
      const [balanceRes, posRes, settleRes, ordersRes] = await Promise.allSettled([
        kalshi.getBalance(),
        kalshi.getPositions(),
        kalshi.getSettlements(200),
        kalshi.getOrders(200),
      ]);

      const balance     = balanceRes.value?.balance     || null;
      const positions   = posRes.value?.market_positions   || posRes.value?.positions   || [];
      const settlements = settleRes.value?.settlements || settleRes.value?.market_settlements || [];
      const orders      = ordersRes.value?.orders      || [];

      setData({ settlements, positions, orders, balance, equityCurve: [] });
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [mock]);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, 60_000); // refresh every 60s
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  return { ...data, loading, error, lastUpdated, refresh: fetchAll };
}
