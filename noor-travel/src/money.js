'use strict';
// All amounts are stored as integer halalas (1 SAR = 100 halalas) to avoid
// floating point drift. Customer-facing prices in KSA are VAT-inclusive.

const config = require('./config');

const toHalalas = (sar) => Math.round(Number(sar) * 100);
const toSar = (halalas) => (halalas / 100).toFixed(2);

/** VAT portion contained in a VAT-inclusive amount. */
function vatFromInclusive(total, rate = config.vatRate) {
  return Math.round((total * rate) / (100 + rate));
}

function format(halalas, currency = 'SAR') {
  const n = (halalas / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${n}`;
}

module.exports = { toHalalas, toSar, vatFromInclusive, format };
