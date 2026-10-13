import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeFrameIntervals,formatPerformanceSummary} from '../web/v5/performanceMetrics.js';

test('FPS diagnostics distinguish 60, 90 and 120 Hz rAF callback cadence',()=>{
 for(const expected of [60,90,120]){
  const intervals=Array(100).fill(1000/expected);
  const m=analyzeFrameIntervals(intervals);
  assert.ok(Math.abs(m.fps-expected)<.15);
  assert.ok(Math.abs(m.p95-1000/expected)<.15);
  assert.equal(m.estimatedHz,expected);
  assert.equal(m.skippedIntervals,0);
 }
});
test('FPS diagnostics detect slow frames and show p95 without claiming actual screen refresh',()=>{
 const m=analyzeFrameIntervals([...Array(94).fill(1000/120),...Array(6).fill(1000/30)]);
 assert.ok(m.fps<120);
 assert.ok(m.p95>=8);
 assert.equal(m.lateFrames,6);
 assert.ok(m.skippedIntervals>=12);
 const summary=formatPerformanceSummary(m,{elapsedSec:11,longTaskCount:2});
 assert.match(summary,/rAF estimate; not physical screen FPS/);
 assert.match(summary,/Long JS tasks >50ms: 2/);
});
test('FPS diagnostics tolerate missing, invalid and paused samples',()=>{
 const empty=analyzeFrameIntervals([]);
 assert.equal(empty.fps,0);
 const dirty=analyzeFrameIntervals([NaN,-2,Infinity,0,16,16,16,17]);
 assert.ok(dirty.fps>0);
 assert.equal(dirty.samples,4);
});
