import { useEffect, useMemo, useState } from 'react';
import Nav from './components/Nav';
import Preloader from './components/Preloader';
import ScrubHero, { StaticHero } from './components/ScrubHero';
import { Categories, Footer, HowItWorks } from './components/Sections';
import JoinForm from './components/JoinForm';
import { createStore, loadSequence } from './lib/frames';
import { useReducedMotion } from './lib/useReducedMotion';

export default function App() {
  const reduced = useReducedMotion();
  const store = useMemo(createStore, []);
  const [prog, setProg] = useState({ settled: 0, total: 1 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const stop = loadSequence(store, {
      onGateProgress: (settled, total) => setProg({ settled, total }),
      onGateDone: () => setReady(true),
      onAllDone: (loaded, failed) => console.info(`[frames] ${loaded} decoded, ${failed} failed`),
    });
    return stop;
  }, [store, reduced]);

  // hold the page at the top while the preloader is up
  useEffect(() => {
    const lock = !reduced && !ready;
    document.documentElement.classList.toggle('is-loading', lock);
    if (lock) window.scrollTo(0, 0);
  }, [ready, reduced]);

  return (
    <>
      {!reduced && <Preloader settled={prog.settled} total={prog.total} done={ready} failed={store.failed.size} onSkip={() => setReady(true)} />}
      <Nav />
      <main>
        {reduced ? <StaticHero /> : <ScrubHero store={store} active={ready} />}
        <Categories />
        <HowItWorks />
        <JoinForm />
      </main>
      <Footer />
    </>
  );
}
