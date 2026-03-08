export const EP = {
  balance:     '/portfolio/balance',
  positions:   '/portfolio/positions',
  settlements: '/portfolio/settlements',
  orders:      '/portfolio/orders',
  market:      (ticker) => `/markets/${ticker}`,
};
