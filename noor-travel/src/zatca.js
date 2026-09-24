'use strict';
// ZATCA (Fatoora) simplified tax invoice QR payload: Base64 of TLV fields
// 1 seller name, 2 VAT number, 3 timestamp (ISO 8601), 4 total incl. VAT, 5 VAT.
// Phase 2 integration (cryptographic stamp + reporting API) is done through a
// ZATCA-certified EGS unit; this payload covers the Phase 1 QR requirement.

function tlv(tag, value) {
  const v = Buffer.from(String(value), 'utf8');
  if (v.length > 255) throw new Error(`TLV value too long for tag ${tag}`);
  return Buffer.concat([Buffer.from([tag, v.length]), v]);
}

function qrPayload({ sellerName, vatNumber, timestamp, total, vat }) {
  return Buffer.concat([
    tlv(1, sellerName),
    tlv(2, vatNumber),
    tlv(3, timestamp),
    tlv(4, total),
    tlv(5, vat),
  ]).toString('base64');
}

function decode(b64) {
  const buf = Buffer.from(b64, 'base64');
  const out = {};
  for (let i = 0; i < buf.length;) {
    const tag = buf[i];
    const len = buf[i + 1];
    out[tag] = buf.subarray(i + 2, i + 2 + len).toString('utf8');
    i += 2 + len;
  }
  return out;
}

module.exports = { qrPayload, decode };
