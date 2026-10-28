// Debug panel: shows the score of each stroke. Only shown when the URL ends with ?debug=1.
// It ignores touches, so the whole screen stays writable underneath it.
// It sits left of the ear button so it never covers it.

const fmt = (v) => (v === Infinity ? '∞' : typeof v === 'number' ? v.toFixed(3) : String(v));

export function createDebugPanel(strokeCount) {
  const panel = document.createElement('pre');
  panel.style.cssText = [
    'position: fixed', 'top: 8px', 'right: 124px', 'margin: 0', 'padding: 8px 10px',
    'font: 13px/1.4 monospace', 'color: #e8ecff', 'background: rgba(0, 0, 0, 0.55)',
    'border-radius: 6px', 'pointer-events: none', 'user-select: none', 'z-index: 10',
  ].join(';');
  document.body.appendChild(panel);

  const last = new Array(strokeCount).fill(null);
  let next = 0;
  let info = '';

  function render() {
    const rows = last.map((r, i) => {
      const mark = i === next ? '>' : ' ';
      if (!r) return `${mark} stroke ${i + 1}: -`;
      return `${mark} stroke ${i + 1}: ${r.ok ? 'ok' : 'not ok'}  reason=${r.reason ?? '-'}  variant=${r.variant ?? '-'}\n` +
        `    startOk=${r.startOk} directionOk=${r.directionOk} shapeOk=${r.shapeOk} error=${fmt(r.error)}`;
    });
    panel.textContent = (info ? `${info}\n` : '') + rows.join('\n');
  }

  render();
  return {
    // index: which reference stroke was scored; nextIndex: the stroke she must draw next.
    // result may carry `variant` ('alone' or 'joined 1-2').
    show(index, result, nextIndex) {
      last[index] = result;
      next = nextIndex;
      render();
    },
    // A status line above the stroke rows (stage, streak).
    status(text, nextIndex = next) {
      info = text;
      next = nextIndex;
      render();
    },
    // A one-line note instead of the stroke rows (e.g. a missing character file).
    message(text) {
      panel.textContent = text;
    },
  };
}

// "Copy attempts": copies the attempt log as JSON and shows it in a text box.
export function createCopyAttemptsButton(getAttempts) {
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position: fixed', 'right: 8px', 'bottom: 8px', 'z-index: 10', 'display: flex',
    'flex-direction: column', 'align-items: flex-end', 'gap: 6px',
  ].join(';');
  const box = document.createElement('textarea');
  box.readOnly = true;
  box.style.cssText = 'display: none; width: 420px; height: 220px; font: 12px monospace; user-select: text; -webkit-user-select: text';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Copy attempts';
  button.style.cssText = 'font: 15px sans-serif; padding: 10px 14px; border-radius: 6px';
  button.addEventListener('click', async () => {
    const json = JSON.stringify(getAttempts(), null, 1);
    box.value = json;
    box.style.display = 'block';
    try {
      await navigator.clipboard.writeText(json);
      button.textContent = 'Copied';
    } catch {
      box.select();
      button.textContent = 'Copy from the box';
    }
  });
  wrap.append(box, button);
  document.body.appendChild(wrap);
}
