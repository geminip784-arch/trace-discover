// Debug panel: shows the score of each stroke. Only shown when the URL ends with ?debug=1.
// It ignores touches, so the whole screen stays writable underneath it.

const fmt = (v) => (v === Infinity ? '∞' : typeof v === 'number' ? v.toFixed(3) : String(v));

export function createDebugPanel(strokeCount) {
  const panel = document.createElement('pre');
  panel.style.cssText = [
    'position: fixed', 'top: 8px', 'right: 8px', 'margin: 0', 'padding: 8px 10px',
    'font: 13px/1.4 monospace', 'color: #e8ecff', 'background: rgba(0, 0, 0, 0.55)',
    'border-radius: 6px', 'pointer-events: none', 'user-select: none', 'z-index: 10',
  ].join(';');
  document.body.appendChild(panel);

  const last = new Array(strokeCount).fill(null);
  let next = 0;

  function render() {
    const rows = last.map((r, i) => {
      const mark = i === next ? '>' : ' ';
      if (!r) return `${mark} stroke ${i + 1}: -`;
      return `${mark} stroke ${i + 1}: ${r.ok ? 'ok' : 'not ok'}  reason=${r.reason ?? '-'}\n` +
        `    startOk=${r.startOk} directionOk=${r.directionOk} shapeOk=${r.shapeOk} error=${fmt(r.error)}`;
    });
    panel.textContent = rows.join('\n');
  }

  render();
  return {
    // index: which reference stroke was scored; nextIndex: the stroke she must draw next.
    show(index, result, nextIndex) {
      last[index] = result;
      next = nextIndex;
      render();
    },
  };
}
