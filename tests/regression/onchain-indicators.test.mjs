import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const ONCHAIN_DIR = path.join(ROOT, 'public/data/onchain');

test('ETF AUM static onchain dataset is present and valid', () => {
  const file = path.join(ONCHAIN_DIR, 'etf.json');
  assert.ok(fs.existsSync(file), 'public/data/onchain/etf.json must exist');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(parsed.success, true);
  assert.ok(Array.isArray(parsed.data), 'etf data must be an array');
  assert.ok(parsed.data.length >= 600, 'etf data must have at least 600 points');
  const last = parsed.data[parsed.data.length - 1];
  assert.ok(last.time && typeof last.value === 'number', 'etf item must have time and numeric value');
  assert.ok(last.value > 100000, 'etf value must represent meaningful spot btc custody');
});

test('Crypto Total Market Cap static onchain dataset is present and valid', () => {
  const file = path.join(ONCHAIN_DIR, 'crypto-market-cap.json');
  assert.ok(fs.existsSync(file), 'public/data/onchain/crypto-market-cap.json must exist');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(parsed.success, true);
  assert.ok(Array.isArray(parsed.data), 'crypto-market-cap data must be an array');
  assert.ok(parsed.data.length >= 4000, 'crypto-market-cap must have >= 4000 historical daily points');
  const last = parsed.data[parsed.data.length - 1];
  assert.ok(last.time && typeof last.value === 'number', 'item must have time and value');
  assert.ok(last.value > 1e11, 'crypto total market cap must exceed $100B');
});

test('SSR static onchain dataset is present and valid', () => {
  const file = path.join(ONCHAIN_DIR, 'ssr.json');
  assert.ok(fs.existsSync(file), 'public/data/onchain/ssr.json must exist');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(parsed.success, true);
  assert.ok(Array.isArray(parsed.data), 'ssr data must be an array');
  assert.ok(parsed.data.length >= 1500, 'ssr data must have >= 1500 points');
  const last = parsed.data[parsed.data.length - 1];
  assert.ok(last.time && (typeof last.ssr === 'number' || typeof last.value === 'number'));
  assert.ok(Number(last.ssr ?? last.value) > 0, 'ssr ratio must be positive');
});

test('Stablecoin Supply static onchain dataset is present and valid', () => {
  const file = path.join(ONCHAIN_DIR, 'stablecoin-supply.json');
  assert.ok(fs.existsSync(file), 'public/data/onchain/stablecoin-supply.json must exist');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(parsed.success, true);
  assert.ok(Array.isArray(parsed.data), 'stablecoin-supply data must be an array');
  assert.ok(parsed.data.length >= 1500, 'stablecoin-supply must have >= 1500 points');
  const last = parsed.data[parsed.data.length - 1];
  assert.ok(last.time && typeof last.value === 'number');
  assert.ok(last.value > 1e10, 'stablecoin supply must exceed $10B');
});

test('SSR Oscillator static onchain dataset is present and computed via 200d Bollinger z-score', () => {
  const file = path.join(ONCHAIN_DIR, 'ssr-oscillator.json');
  assert.ok(fs.existsSync(file), 'public/data/onchain/ssr-oscillator.json must exist');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(parsed.success, true);
  assert.ok(Array.isArray(parsed.data), 'ssr-oscillator data must be an array');
  assert.ok(parsed.data.length >= 1500, 'ssr-oscillator must have >= 1500 points');
  const last = parsed.data[parsed.data.length - 1];
  assert.ok(last.time && typeof last.value === 'number', 'last item must have time and numeric value');
  assert.ok(last.value >= -6 && last.value <= 8, 'ssr-oscillator values must fall in statistical z-score bounds');
});
