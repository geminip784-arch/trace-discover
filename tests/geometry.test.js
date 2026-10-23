// Run: node --test tests/geometry.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resample, pathLength, scoreStroke, scoreDot, nearestOnPath, createLiveTracker,
} from '../src/geometry.js';

// Reference capital L in line units: stem from sky (y=0) to grass (y=1), then foot to the right.
const L_STEM = [[0.1, 0], [0.1, 1]];
const L_FOOT = [[0.1, 1], [0.65, 1]];

// Make a dense hand-drawn-looking stroke along a straight segment, with optional sideways wobble.
function drawLine(a, b, steps = 40, wobble = 0) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = a[0] + t * (b[0] - a[0]);
    const y = a[1] + t * (b[1] - a[1]);
    const w = i % 2 === 0 ? wobble : -wobble;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    pts.push([x + (-dy / len) * w, y + (dx / len) * w]);
  }
  return pts;
}

test('resample returns n points from start to end', () => {
  const r = resample(L_STEM, 32);
  assert.equal(r.length, 32);
  assert.deepEqual(r[0], [0.1, 0]);
  assert.ok(Math.abs(r[31][1] - 1) < 1e-9);
});

test('a clean stem passes at every stage', () => {
  const child = drawLine([0.1, 0], [0.1, 1]);
  for (const stage of [1, 2, 3]) {
    const s = scoreStroke(child, L_STEM, stage);
    assert.equal(s.ok, true, `stage ${stage}`);
    assert.equal(s.reason, null);
  }
});

test('a small wobble still passes at stage 1', () => {
  const child = drawLine([0.1, 0], [0.1, 1], 40, 0.05);
  assert.equal(scoreStroke(child, L_STEM, 1).ok, true);
});

test('drawing the stem bottom-to-top is wrong-direction', () => {
  const child = drawLine([0.1, 1], [0.1, 0]);
  const s = scoreStroke(child, L_STEM, 1);
  assert.equal(s.ok, false);
  assert.equal(s.reason, 'wrong-direction');
});

test('starting a quarter of the way down is wrong-start', () => {
  const child = drawLine([0.1, 0.25], [0.1, 1]);
  const s = scoreStroke(child, L_STEM, 1);
  assert.equal(s.ok, false);
  assert.equal(s.reason, 'wrong-start');
});

test('a stem drawn far to the side is off-path', () => {
  const child = drawLine([0.45, 0], [0.45, 1]);
  const s = scoreStroke(child, L_STEM, 1);
  assert.equal(s.ok, false);
  assert.equal(s.reason, 'off-path');
});

test('a tap is too-short for a line stroke', () => {
  const s = scoreStroke([[0.1, 0]], L_STEM, 1);
  assert.equal(s.ok, false);
  assert.equal(s.reason, 'too-short');
});

test('the foot is checked left-to-right', () => {
  assert.equal(scoreStroke(drawLine([0.1, 1], [0.65, 1]), L_FOOT, 2).ok, true);
  assert.equal(scoreStroke(drawLine([0.65, 1], [0.1, 1]), L_FOOT, 2).reason, 'wrong-direction');
});

test('Urdu right-to-left stroke: direction check works the same way', () => {
  const boatBase = [[0.9, 1], [0.2, 1]]; // simplified base of the boat body, written right to left
  assert.equal(scoreStroke(drawLine([0.9, 1], [0.2, 1]), boatBase, 1).ok, true);
  assert.equal(scoreStroke(drawLine([0.2, 1], [0.9, 1]), boatBase, 1).reason, 'wrong-direction');
});

test('a dot tap lands on target or misses', () => {
  assert.equal(scoreDot([[0.52, 0.62]], [0.5, 0.6], 1).ok, true);
  assert.equal(scoreDot([[0.9, 0.6]], [0.5, 0.6], 1).reason, 'off-target');
});

test('nearestOnPath reports distance and progress', () => {
  const r = nearestOnPath([0.1, 0.5], L_STEM);
  assert.ok(r.distance < 1e-9);
  assert.ok(Math.abs(r.progress - 0.5) < 1e-9);
  const off = nearestOnPath([0.4, 0.5], L_STEM);
  assert.ok(Math.abs(off.distance - 0.3) < 1e-9);
});

test('live tracker flags backtracking as wrong-way', () => {
  const live = createLiveTracker(L_STEM, 1);
  live.update([0.1, 0.1]);
  live.update([0.1, 0.6]);
  assert.equal(live.update([0.1, 0.62]).wrongWay, false);
  assert.equal(live.update([0.1, 0.3]).wrongWay, true);
});

test('pathLength of the L stem is 1 unit', () => {
  assert.equal(pathLength(L_STEM), 1);
});
