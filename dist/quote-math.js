/* Shared, dependency-free quote calculations for the website and mobile WebView. */
(function (root) {
  'use strict';

  const nonnegative = value => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(1e9, n)) : 0;
  };
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const quantity = value => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(999, Math.floor(n))) : 1;
  };
  const profitRate = value => Math.min(1000, nonnegative(value));
  const taxRate = value => Math.min(100, nonnegative(value));
  const customerRate = (baseRate, profit) => round(nonnegative(baseRate) * (1 + profitRate(profit) / 100));

  function calculate({ rows = [], prices = {}, profit = 0, installation = 0, rackQuantity = 1, discount = 0, tax = 0 } = {}) {
    const racks = quantity(rackQuantity);
    let missing = 0;
    let componentSubtotal = 0;
    let baseSubtotal = 0;
    let extraSubtotal = 0;
    const lines = rows.map(row => {
      const perRackQty = nonnegative(row.qty);
      const totalQty = round(perRackQty * (row.custom ? 1 : racks));
      const unpriced = prices[row.id] === undefined || prices[row.id] === null || prices[row.id] === '';
      const baseRate = unpriced ? null : nonnegative(prices[row.id]);
      const unitRate = unpriced ? null : row.custom ? round(baseRate) : customerRate(baseRate, profit);
      const amount = unpriced ? null : round(totalQty * unitRate);
      if (unpriced && totalQty > 0) missing += 1;
      if (!unpriced) {
        if(row.custom) extraSubtotal += amount;
        else { componentSubtotal += amount; baseSubtotal += round(totalQty * baseRate); }
      }
      return { ...row, perRackQty, totalQty, baseRate, unitRate, amount, unpriced };
    });
    componentSubtotal = round(componentSubtotal);
    baseSubtotal = round(baseSubtotal);
    const installationRate = nonnegative(installation);
    const installationTotal = round(installationRate * racks);
    extraSubtotal = round(extraSubtotal);
    const subtotal = round(componentSubtotal + installationTotal + extraSubtotal);
    const appliedDiscount = round(Math.min(subtotal, nonnegative(discount)));
    const taxable = round(subtotal - appliedDiscount);
    const taxAmount = round(taxable * taxRate(tax) / 100);
    return {
      lines, quantity: racks, componentSubtotal, baseSubtotal, extraSubtotal,
      markupIncluded: round(componentSubtotal - baseSubtotal),
      installationRate, installationTotal, subtotal,
      discount: appliedDiscount, tax: taxAmount, total: round(taxable + taxAmount), missing
    };
  }

  // Only the former 3 m / 9.84 ft entry is obsolete. Retain all other saved rates.
  const obsoleteStock = (id, label = '') => id === 'stock-3' || (String(id).startsWith('stock-') && /9\.84\s*ft/.test(label));
  function migrate(saved) {
    const state = {...saved};
    for (const key of ['prices','priceOrigins','priceSeeds','priceOverrides','stockCatalogue']) {
      state[key] = {...(state[key] || {})};
      for (const [id, entry] of Object.entries(state[key])) {
        if (obsoleteStock(id, entry?.label)) delete state[key][id];
      }
    }
    state.extra = Array.isArray(state.extra) ? state.extra : [];
    state.rackQuantity = quantity(state.rackQuantity);
    state.profit = profitRate(state.profit);
    state.installation = nonnegative(state.installation);
    return state;
  }
  const api = { calculate, customerRate, quantity, profitRate, taxRate, migrate, obsoleteStock };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RackQuoteMath = api;
})(typeof window !== 'undefined' ? window : globalThis);
