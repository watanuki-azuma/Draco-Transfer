'use strict';
const assert = require('node:assert/strict');
const os = require('node:os');
const {performance} = require('node:perf_hooks');
const C = require('../prototypes/browser/codec.js');
const WARMUP = 2, RUNS = 7;
function dataFor(size) {
  let seed = 0x44524143;
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    data[i] = seed & 255;
  }
  return data;
}
function measure(fn, validate = () => {}) {
  for (let i = 0; i < WARMUP; i++) validate(fn());
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const result = fn();
    times.push(performance.now() - start);
    validate(result);
  }
  times.sort((a, b) => a - b);
  return {p50Ms: times[Math.ceil(RUNS * .5) - 1], p95Ms: times[Math.ceil(RUNS * .95) - 1]};
}
const rows = [];
for (const n of [96, 192, 256]) for (const b of [1, 2, 4]) {
  const data = dataFor(C.capacity(n, b));
  const packet = C.packet(data, Uint8Array.of(1,2,3,4,5,6,7,8), 0, 1, n, b);
  const cells = C.cells(packet, n, b), image = C.raster(cells, n, b, 3);
  const rect = C.bounds(image), check = result => assert.deepEqual(result.data, data);
  const bounds = measure(() => C.bounds(image));
  const sampleKnownMode = measure(() => C.sample(image, rect, n, b), result => assert.deepEqual(result, cells));
  const parseKnownCells = measure(() => C.parse(cells, n, b), check);
  const decodeAuto = measure(() => C.decode(image), check);
  rows.push({grid:n, colors:2**b, payloadBytes:data.length, imageWidth:image.width,
    imageHeight:image.height, bounds, sampleKnownMode, parseKnownCells, decodeAuto,
    syntheticPayloadKiBPerSecond:data.length / 1024 / (decodeAuto.p50Ms / 1000)});
}
const report = JSON.stringify({
  kind:'synthetic-codec-benchmark', measuredAt:new Date().toISOString(),
  node:process.version, platform:process.platform, architecture:process.arch,
  cpu:os.cpus()[0]?.model || 'unknown', warmup:WARMUP, runs:RUNS, scale:3,
  seed:'0x44524143', timingIncludes:'decoder only; input rendering and validation excluded',
  limitations:'No camera, no display timing, no frame loss, no file assembly or final SHA-256; KiB/s is not end-to-end transfer throughput.',
  rows
}, null, 2);
if (process.argv[2] === '--output' && process.argv[3]) {
  require('node:fs').writeFileSync(process.argv[3], report + '\n', 'utf8');
} else {
  console.log(report);
}
