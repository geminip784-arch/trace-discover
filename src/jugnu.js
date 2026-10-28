// Jugnu the firefly: an <img> floating on top of the writing area, with
// pointer-events: none so the whole screen stays writable underneath.
// Positions are in the character's line units; `toPx` turns them into area px.
// Every move runs on requestAnimationFrame and stop() ends it at once.

// Where Jugnu perches, relative to a start dot, so the dot stays visible.
export const PERCH = [-0.11, -0.13];
// Jugnu's size, in line units.
const SIZE = 0.32;
// The point of the picture that sits on the path: the glowing tail (jugnu.svg is 120 x 120).
const ANCHOR = [60 / 120, 82 / 120];
// How high a hop arcs, in line units.
const HOP_HEIGHT = 0.15;

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function createJugnu(img, toPx) {
  let pos = [0, 0];
  let unit = 1;
  let raf = 0;
  let run = 0; // bumped by stop(), so a running sequence knows to give up

  function place() {
    const [x, y] = toPx(pos);
    const w = SIZE * unit;
    img.style.width = `${w}px`;
    img.style.height = `${w}px`;
    img.style.transform = `translate(${x - ANCHOR[0] * w}px, ${y - ANCHOR[1] * w}px)`;
  }

  // Move along `points` (line units), starting from where Jugnu is now, over `ms`.
  // Resolves true when it arrives, false when stopped.
  function moveAlong(points, ms, myRun) {
    const path = [pos, ...points];
    const lengths = [0];
    for (let i = 1; i < path.length; i++) {
      lengths.push(lengths[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    }
    const total = lengths[lengths.length - 1];
    return new Promise((resolve) => {
      if (myRun !== run) return resolve(false);
      if (total === 0 || ms <= 0) {
        pos = path[path.length - 1];
        place();
        return resolve(true);
      }
      let start = null;
      const step = (now) => {
        if (myRun !== run) return resolve(false);
        start ??= now;
        const t = Math.min(1, (now - start) / ms);
        const d = easeInOut(t) * total;
        let i = 1;
        while (i < path.length - 1 && lengths[i] < d) i++;
        const seg = lengths[i] - lengths[i - 1];
        const f = seg > 0 ? (d - lengths[i - 1]) / seg : 1;
        const a = path[i - 1];
        const b = path[i];
        pos = [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])];
        place();
        if (t < 1) raf = requestAnimationFrame(step);
        else resolve(true);
      };
      raf = requestAnimationFrame(step);
    });
  }

  function hopPath(to) {
    const mid = [(pos[0] + to[0]) / 2, Math.min(pos[1], to[1]) - HOP_HEIGHT];
    return [mid, to];
  }

  const perchOf = (dot) => [dot[0] + PERCH[0], dot[1] + PERCH[1]];

  return {
    resize(newUnit) {
      unit = newUnit;
      place();
    },
    // Jump straight there, no animation.
    restAt(dot) {
      this.stop();
      pos = perchOf(dot);
      place();
    },
    placeAt(point) {
      this.stop();
      pos = point;
      place();
    },
    // A little arc onto the perch beside `dot`.
    hopTo(dot, ms) {
      const myRun = ++run;
      cancelAnimationFrame(raf);
      return moveAlong(hopPath(perchOf(dot)), ms, myRun);
    },
    // Fly along a stroke once (points in line units), then perch at its start dot.
    async demo(points, ms, hopMs) {
      const myRun = ++run;
      cancelAnimationFrame(raf);
      if (!(await moveAlong([points[0]], hopMs, myRun))) return false;
      if (!(await moveAlong(points.slice(1), ms, myRun))) return false;
      return moveAlong(hopPath(perchOf(points[0])), hopMs, myRun);
    },
    // Stop whatever Jugnu is doing, right where it is.
    stop() {
      run++;
      cancelAnimationFrame(raf);
    },
    sleep(point) {
      this.placeAt(point);
      img.classList.add('sleeping');
    },
  };
}
