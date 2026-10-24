// Single-pointer tracking for the writing area.
// Follows only the first pointer that goes down inside `el` and ignores every
// other pointer (palm, second finger) until that one lifts.
// Callbacks get points in CSS px relative to the top-left of `el`.

export function trackSinglePointer(el, { onStart, onMove, onEnd }) {
  let activeId = null;
  let rect = null;

  const toPoint = (e) => ({ x: e.clientX - rect.left, y: e.clientY - rect.top });

  function finish(e) {
    if (e.pointerId !== activeId) return;
    activeId = null;
    onEnd();
  }

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (activeId !== null || e.button > 0) return;
    activeId = e.pointerId;
    rect = el.getBoundingClientRect();
    try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    onStart(toPoint(e));
  });

  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activeId) return;
    // Coalesced events carry every point the screen sampled since the last
    // event, so fast strokes stay smooth.
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    onMove((events.length ? events : [e]).map(toPoint));
  });

  el.addEventListener('pointerup', (e) => {
    if (e.pointerId === activeId) onMove([toPoint(e)]);
    finish(e);
  });
  el.addEventListener('pointercancel', finish);
  el.addEventListener('lostpointercapture', finish);
}
