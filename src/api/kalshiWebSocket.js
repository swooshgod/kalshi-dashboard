/**
 * kalshiWebSocket.js — WebSocket handler for live price updates.
 */

const WS_URL = 'wss://api.elections.kalshi.com/trade-api/ws/v2';

export function createKalshiWebSocket({ onPriceUpdate, onSettlement, onError }) {
  if (typeof window === 'undefined') return null;
  if (import.meta.env.VITE_USE_MOCK_DATA === 'true') return null;

  let ws;
  let reconnectTimer;
  let pingInterval;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[WS] Connected to Kalshi');
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat', cmd: 'subscribe', params: { channels: ['orderbook_delta', 'trade', 'fill'] } }));
        }
      }, 20_000);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'orderbook_delta' || msg.type === 'ticker') {
          onPriceUpdate?.(msg);
        } else if (msg.type === 'settlement') {
          onSettlement?.(msg);
        }
      } catch {}
    };

    ws.onerror = (err) => onError?.(err);

    ws.onclose = () => {
      clearInterval(pingInterval);
      reconnectTimer = setTimeout(connect, 3_000);
    };
  }

  connect();

  return {
    subscribe: (tickers = []) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          subscriptions: tickers.map(ticker => ({ channel: 'ticker', market_tickers: [ticker] })),
        }));
      }
    },
    disconnect: () => {
      clearTimeout(reconnectTimer);
      clearInterval(pingInterval);
      ws?.close();
    },
  };
}
