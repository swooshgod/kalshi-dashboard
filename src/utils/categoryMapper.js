// Configurable ticker → category mapping
const PREFIX_MAP = [
  { prefixes: ['KXCPI','KXUNRATE','KXGDP','KXFED','KXNFP','KXMORTGAGERATE','KXINFLATION','KXPCE'],   category: 'Economics' },
  { prefixes: ['KXHIGH','KXLOW','KXHURR','KXSNOW','KXRAIN','KXTEMP'],                                  category: 'Weather'   },
  { prefixes: ['KXPRES','KXSENATE','KXHOUSE','KXELECT','KXGOV','KXMAY'],                               category: 'Politics'  },
  { prefixes: ['KXTSLA','KXNFLX','KXAAPL','KXGOOG','KXMSFT','KXAMZN','KXMETA'],                       category: 'Earnings'  },
  { prefixes: ['KXOSCAR','KXGRAMMY','KXBB100','KXEMMY','KXBILLBOARD'],                                 category: 'Entertainment' },
  { prefixes: ['KXNFL','KXNBA','KXNHL','KXMLB','KXMLS','KXNBAGAME','KXNHLGAME','KXMLBGAME','KXMLSGAME','KXNFLGAME'], category: 'Sports' },
];

export function getCategory(ticker = '') {
  const t = ticker.toUpperCase();
  for (const { prefixes, category } of PREFIX_MAP) {
    if (prefixes.some(p => t.startsWith(p))) return category;
  }
  return 'Other';
}

export function addCategoryMapping(prefix, category) {
  PREFIX_MAP.push({ prefixes: [prefix.toUpperCase()], category });
}
