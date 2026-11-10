'use client';
import { useEffect, useState } from 'react';
import { createStore, loadSequence } from '@/lib/frames';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import JoinForm from './JoinForm';
import Preloader from './Preloader';
import ScrubHero, { StaticHero } from './ScrubHero';
import { Categories, HowItWorks } from './Sections';

// Scroll-scrubbed homepage. No animation library: native scroll + requestAnimationFrame + canvas.
export default function HomePage() {
  const reduced = useReducedMotion();
  const [store] = useState(createStore);
  const [prog, setProg] = useState({ settled: 0, total: 1 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduced) return;
    return loadSequence(store, {
      onGateProgress: (settled, total) => setProg({ settled, total }),
      onGateDone: () => setReady(true),
      onAllDone: (loaded, failed) => console.info(`[frames] ${loaded} decoded, ${failed} failed`),
    });
  }, [store, reduced]);

  // hold the page at the top while the preloader is up
  useEffect(() => {
    const lock = !reduced && !ready;
    document.documentElement.classList.toggle('is-loading', lock);
    if (lock) window.scrollTo(0, 0);
    return () => document.documentElement.classList.remove('is-loading');
  }, [ready, reduced]);

  return (
    <>
      {!reduced && <Preloader settled={prog.settled} total={prog.total} done={ready} failed={store.failed.size} onSkip={() => setReady(true)} />}
      <main>
        {reduced ? <StaticHero /> : <ScrubHero store={store} active={ready} />}
        <Categories />
        <HowItWorks />
        <JoinForm />
      </main>
    </>
  );
}
