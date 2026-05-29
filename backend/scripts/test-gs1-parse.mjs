/**
 * Быстрая проверка парсера GS1: node scripts/test-gs1-parse.mjs
 * (после npm run build в backend)
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseGs1Barcode, isIsoDateBeforeToday } = require('../dist/common/gs1-parse.js');
const { analyzeScannedBarcode } = require('../dist/common/scan-analyze.js');

const sample = '(01)08714729201953(17)261128(10)38145722';
const parsed = parseGs1Barcode(sample);
assert.equal(parsed.isGs1, true);
assert.equal(parsed.fields.gtin, '08714729201953');
assert.equal(parsed.fields.lot, '38145722');
assert.equal(parsed.fields.expiryDate, '2026-11-28');

const analysis = analyzeScannedBarcode(sample);
assert.equal(analysis.parsed.expiryDate, '2026-11-28');
assert.equal(analysis.parsed.lot, '38145722');

const trapezoid = analyzeScannedBarcode('(01)08714729296393(17)250612(10)34224556');
assert.equal(trapezoid.parsed.lot, '34224556');
assert.equal(trapezoid.parsed.expiryDate, undefined, 'просроченный срок не автозаполняем');
assert.equal(trapezoid.barcodeExpiryDate, '2025-06-12');
assert.ok(trapezoid.expiryWarning?.includes('штрих-коде'));

const expired = analyzeScannedBarcode('(01)08714729201953(17)200101(10)38145722');
assert.equal(expired.parsed.expiryDate, undefined);
assert.ok(expired.expiryWarning);

assert.equal(isIsoDateBeforeToday('2099-12-31'), false);

console.log('gs1-parse: ok');
