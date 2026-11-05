// hold.js — press and hold a button to act (the clear-all button on the paper).
// Holding for HOLD_MS fills a ring round the button, then acts once. Letting go
// sooner does nothing except a little wiggle (onShort). Times are passed in
// (performance.now() on the tablet), so tests can drive the clock.
// No DOM here.

export const HOLD_MS = 1000;

// onProgress(f): f from 0 (empty ring) to 1 (full). onDone(): held long enough.
// onShort(): let go too soon.
export function createHold({ ms = HOLD_MS, onProgress = () => {}, onDone = () => {}, onShort = () => {} } = {}) {
  let start = null; // when the press began, while holding

  const hold = {
    press(now) {
      start = now;
      onProgress(0);
    },
    // Call every frame while holding.
    tick(now) {
      if (start === null) return;
      const f = Math.min(1, Math.max(0, (now - start) / ms));
      onProgress(f);
      if (f < 1) return;
      start = null;
      onDone();
    },
    release(now) {
      if (start === null) return;
      hold.tick(now);
      if (start === null) return; // that last tick finished the hold
      start = null;
      onProgress(0);
      onShort();
    },
    // Stopped without acting and without a wiggle (the page paused or closed).
    cancel() {
      if (start === null) return;
      start = null;
      onProgress(0);
    },
    holding: () => start !== null,
  };
  return hold;
}
