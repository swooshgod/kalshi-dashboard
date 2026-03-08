import { useState, useEffect, useRef, useCallback } from 'react';
import { createKalshiWebSocket } from '../api/kalshiWebSocket.js';

export function useWebSocket(tickers = []) {
  const [prices,  setPrices]  = useState({});
  const [flashes, setFlashes] = useState({});
  const wsRef = useRef(null);

  const onPriceUpdate = useCallback((msg) => {
    const ticker = msg.market_ticker || msg.ticker;
    const bid    = msg.yes_bid;
    if (!ticker || bid === undefined) return;

    setPrices(prev => {
      const oldBid = prev[ticker]?.bid;
      const dir    = bid > oldBid ? 'up' : bid < oldBid ? 'down' : null;
      if (dir) {
        setFlashes(f => ({ ...f, [ticker]: dir }));
        setTimeout(() => setFlashes(f => { const n = {...f}; delete n[ticker]; return n; }), 1200);
      }
      return { ...prev, [ticker]: { bid, ts: Date.now() } };
    });
  }, []);

  useEffect(() => {
    if (!tickers.length) return;
    wsRef.current = createKalshiWebSocket({ onPriceUpdate });
    wsRef.current?.subscribe(tickers);
    return () => wsRef.current?.disconnect();
  }, [tickers.join(',')]);

  return { prices, flashes };
}
