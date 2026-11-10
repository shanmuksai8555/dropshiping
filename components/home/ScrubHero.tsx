'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { CHAPTERS } from '@/lib/home-content';
import { FRAME_COUNT, FRAME_H, FRAME_W, HERO_FRAME, frameUrl, type FrameStore } from '@/lib/frames';

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const FADE = 9; // frames over which a chapter fades in/out

type Props = { store: FrameStore; active: boolean };

export default function ScrubHero({ store, active }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const introRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    let raf = 0;
    let lastFrame = -1;
    let lastImg: HTMLImageElement | null = null;
    let dirty = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      dirty = true;
      schedule();
    };

    const draw = (img: HTMLImageElement) => {
      const cw = canvas.width, ch = canvas.height;
      const cover = Math.max(cw / FRAME_W, ch / FRAME_H);
      const contain = Math.min(cw / FRAME_W, ch / FRAME_H);
      // Cover-fit, but never crop the central ~860px of the frame (the product) on tall
      // portrait screens; the frames fade to #060608 at the edges so letterboxing is seamless.
      const scale = Math.min(cover, Math.max(contain, cw / 860));
      const dw = FRAME_W * scale, dh = FRAME_H * scale;
      // On wide screens nudge the product right to leave room for the chapter copy on the left.
      const shift = cw / ch > 1.25 ? cw * 0.07 : 0;
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, cw, ch);
      ctx.imageSmoothingQuality = 'high';
      const dx = (cw - dw) / 2 + shift, dy = (ch - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      // Letterboxed (portrait): feather the frame's top/bottom edges into the background colour so
      // there is no visible seam where the frame ends.
      if (dy > 1) {
        const fh = dh * 0.16;
        const top = ctx.createLinearGradient(0, dy, 0, dy + fh);
        top.addColorStop(0, '#060608');
        top.addColorStop(1, 'rgba(6,6,8,0)');
        ctx.fillStyle = top;
        ctx.fillRect(0, dy - 1, cw, fh + 1);
        const bot = ctx.createLinearGradient(0, dy + dh - fh, 0, dy + dh);
        bot.addColorStop(0, 'rgba(6,6,8,0)');
        bot.addColorStop(1, '#060608');
        ctx.fillStyle = bot;
        ctx.fillRect(0, dy + dh - fh, cw, fh + 1);
      }
    };

    const tick = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const p = span > 0 ? clamp(-rect.top / span) : 0;
      const f = Math.round(p * (FRAME_COUNT - 1));
      const img = store.nearest(f);
      if (img && (dirty || f !== lastFrame || img !== lastImg)) {
        draw(img);
        if (!lastImg) canvas.classList.add('is-drawn');
        lastImg = img;
        dirty = false;
      }
      if (f !== lastFrame) {
        lastFrame = f;
        CHAPTERS.forEach((c, i) => {
          const el = chapterRefs.current[i];
          if (!el) return;
          const last = c.to >= FRAME_COUNT - 1;
          const o = smooth(c.from - FADE, c.from, f) * (last ? 1 : 1 - smooth(c.to, c.to + FADE, f));
          const y = f < c.from ? (1 - o) * 28 : -(1 - o) * 28;
          el.style.opacity = o.toFixed(3);
          el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
          el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
        });
        const io = 1 - smooth(6, 20, f);
        if (introRef.current) {
          introRef.current.style.opacity = io.toFixed(3);
          introRef.current.style.visibility = io < 0.01 ? 'hidden' : 'visible';
        }
        if (barRef.current) barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
        if (countRef.current) countRef.current.textContent = `${String(f + 1).padStart(3, '0')} / ${FRAME_COUNT}`;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const unlisten = store.listen(() => schedule());
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('scroll', schedule, { passive: true });
    resize();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', schedule);
      unlisten();
    };
  }, [store]);

  useEffect(() => {
    // first paint once the gate frames are in
    if (active) window.dispatchEvent(new Event('scroll'));
  }, [active]);

  return (
    <section className="scrub" ref={sectionRef} aria-label="Product films, four categories">
      <div className="scrub__stage">
        {/* LCP: the first frame is server-rendered as a priority image; the canvas fades in over it once it has drawn. */}
        <Image className="scrub__poster" src={frameUrl(HERO_FRAME)} alt="" width={FRAME_W} height={FRAME_H} preload fetchPriority="high" unoptimized />
        <canvas className="scrub__canvas" ref={canvasRef} aria-hidden="true" />
        <div className="scrub__shade" aria-hidden="true" />

        <div className="scrub__intro" ref={introRef}>
          <p className="eyebrow">Fashion · Electronics · Kitchenware · Daily Essentials</p>
          <h1>Things, considered.</h1>
          <p className="scrub__cue">Scroll to explore</p>
        </div>

        {CHAPTERS.map((c, i) => (
          <div
            key={c.n}
            className={`chapter${c.to >= FRAME_COUNT - 1 ? ' chapter--final' : ''}`}
            ref={(el) => {
              chapterRefs.current[i] = el;
            }}
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <span className="chapter__n">{c.n}</span>
            <h2>{c.title}</h2>
            <p>{c.body}</p>
            {c.to >= FRAME_COUNT - 1 && (
              <div className="chapter__ctas">
                <Link className="btn btn--gold" href="/shop">Shop the store</Link>
                <a className="btn btn--ghost" href="#join">Join on WhatsApp</a>
              </div>
            )}
          </div>
        ))}

        <div className="scrub__hud" aria-hidden="true">
          <span className="scrub__label">Imagery is illustrative</span>
          <span className="scrub__count" ref={countRef}>001 / {FRAME_COUNT}</span>
          <span className="scrub__track"><i ref={barRef} /></span>
        </div>
      </div>
    </section>
  );
}

/** prefers-reduced-motion: one static hero frame and the chapters stacked as plain content. */
export function StaticHero() {
  return (
    <section className="static-hero" aria-label="Lumen Market">
      <div className="static-hero__media">
        <Image src={frameUrl(HERO_FRAME)} width={FRAME_W} height={FRAME_H} alt="Illustrative studio image of a product from the Fashion category" preload unoptimized />
        <span className="scrub__label">Imagery is illustrative</span>
      </div>
      <div className="static-hero__copy">
        <p className="eyebrow">Fashion · Electronics · Kitchenware · Daily Essentials</p>
        <h1>Things, considered.</h1>
      </div>
      <ol className="static-hero__chapters">
        {CHAPTERS.map((c) => (
          <li key={c.n} className="chapter chapter--static">
            <span className="chapter__n">{c.n}</span>
            <h2>{c.title}</h2>
            <p>{c.body}</p>
          </li>
        ))}
      </ol>
      <div className="chapter__ctas static-hero__ctas">
        <Link className="btn btn--gold" href="/shop">Shop the store</Link>
        <a className="btn btn--ghost" href="#join">Join on WhatsApp</a>
      </div>
    </section>
  );
}
