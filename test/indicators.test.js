import test from 'node:test';
import assert from 'node:assert/strict';
import { sma, rsi, technicalSnapshot } from '../lib/indicators.js';
import { generateSampleHistory } from '../lib/stockData.js';
import { nextDayPrediction } from '../lib/prediction.js';

test('sma computes the latest average', () => {
  assert.equal(sma([1, 2, 3, 4, 5], 3), 4);
});

test('rsi returns a bounded value', () => {
  const value = rsi([1, 2, 3, 2, 4, 5, 6, 7, 6, 8, 9, 8, 10, 11, 12], 14);
  assert.ok(value >= 0 && value <= 100);
});

test('technicalSnapshot returns key indicators', () => {
  const history = generateSampleHistory('BURU', 90);
  const snap = technicalSnapshot(history);
  assert.ok(snap.last > 0);
  assert.ok(snap.atrPct > 0);
  assert.ok(Number.isFinite(snap.trendScore));
});

test('nextDayPrediction returns a logical range', () => {
  const history = generateSampleHistory('BURU', 90);
  const prediction = nextDayPrediction('BURU', history, []);
  assert.ok(prediction.predictedPrice > 0);
  assert.ok(prediction.rangeLow < prediction.rangeHigh);
  assert.ok(prediction.confidence >= 0 && prediction.confidence <= 100);
  assert.ok(prediction.reasoning.length >= 8);
});
