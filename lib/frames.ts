// Frame sequence loader. No animation library: plain fetch-free <img> + img.decode().
//
// Loading strategy (documented in README):
//  1. "Gate" set = frame 1 plus every 4th frame (60 frames, ~1 MB). The preloader percentage is the
//     real count of gate frames that have finished downloading AND decoding (img.decode()).
//  2. When the gate settles the preloader fades out and the remaining 180 frames stream in the
//     background (low concurrency). Until a frame exists, the scrubber draws the nearest loaded one.
//  3. Failed frames count as "settled" so the preloader never hangs; they are simply skipped.
// HTMLImageElement is used instead of ImageBitmap on purpose: 240 decoded 1600x1000 bitmaps would pin
// ~1.5 GB of memory, while the browser can evict and re-decode <img> data under pressure.

export const FRAME_COUNT = 240;
export const FRAME_W = 1600;
export const FRAME_H = 1000;
export const HERO_FRAME = 0; // first chapter (fashion tote); also the preloaded frame

export const frameUrl = (i: number) =>
  `/frames/${String(i + 1).padStart(4, '0')}.webp`;

export type FrameStore = {
  images: (HTMLImageElement | null)[];
  failed: Set<number>;
  /** subscribe to successful decodes (the scrubber uses it to swap in a closer frame); returns unsubscribe */
  listen: (fn: (i: number) => void) => () => void;
  emit: (i: number) => void;
  /** nearest decoded frame to i (searches outward), or null if none yet */
  nearest: (i: number) => HTMLImageElement | null;
};

export function createStore(): FrameStore {
  const images: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
  const failed = new Set<number>();
  const listeners = new Set<(i: number) => void>();
  return {
    images,
    failed,
    listen(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    emit(i) {
      listeners.forEach((fn) => fn(i));
    },
    nearest(i) {
      if (images[i]) return images[i];
      for (let d = 1; d < FRAME_COUNT; d++) {
        const a = images[i - d];
        if (a) return a;
        const b = images[i + d];
        if (b) return b;
      }
      return null;
    },
  };
}

function loadOne(store: FrameStore, i: number): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = frameUrl(i);
    const done = () => resolve();
    img
      .decode()
      .then(() => {
        store.images[i] = img;
        store.emit(i);
      })
      .catch(() => {
        store.failed.add(i);
      })
      .finally(done);
  });
}

async function pool(indices: number[], concurrency: number, fn: (i: number) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, indices.length) }, async () => {
    while (next < indices.length) {
      const i = indices[next++];
      await fn(i);
    }
  });
  await Promise.all(workers);
}

export type LoadHandlers = {
  onGateProgress: (settled: number, total: number) => void;
  onGateDone: () => void;
  onAllDone?: (loaded: number, failed: number) => void;
};

export function loadSequence(store: FrameStore, h: LoadHandlers, opts: { gateOnly?: boolean } = {}) {
  const gate: number[] = [];
  for (let i = 0; i < FRAME_COUNT; i += 4) gate.push(i);
  if (!gate.includes(HERO_FRAME)) gate.push(HERO_FRAME);
  const rest = [...Array(FRAME_COUNT).keys()].filter((i) => !gate.includes(i));
  let settled = 0;
  h.onGateProgress(0, gate.length);
  let cancelled = false;
  (async () => {
    await pool(gate, 6, async (i) => {
      await loadOne(store, i);
      if (cancelled) return;
      settled++;
      h.onGateProgress(settled, gate.length);
    });
    if (cancelled) return;
    h.onGateDone();
    if (opts.gateOnly) return;
    await pool(rest, 4, (i) => (cancelled ? Promise.resolve() : loadOne(store, i)));
    if (!cancelled) h.onAllDone?.(store.images.filter(Boolean).length, store.failed.size);
  })();
  return () => {
    cancelled = true;
  };
}
