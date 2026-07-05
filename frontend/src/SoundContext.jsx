import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const SoundContext = createContext();

export function useGlobalSound() {
  return useContext(SoundContext);
}

export function SoundProvider({ children }) {
  const ctxRef = useRef(null);
  const srcRef = useRef(null);
  const gainRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initAudio = useCallback(() => {
    if (ctxRef.current) return;
    
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;

    // Brown noise = wind through trees
    const rate = ctx.sampleRate;
    const buf = ctx.createBuffer(2, rate * 6, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * w) / 1.02;
        last = data[i];
        data[i] *= 3.8;
      }
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    srcRef.current = src;

    // Low-pass → softer wind rustle
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    lp.Q.value = 0.5;

    // Very gentle high-pass to remove sub-bass rumble
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 120;

    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    gainRef.current = gain;

    src.connect(lp);
    lp.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    
    src.start();
    setIsInitialized(true);
    setSoundOn(true);
  }, []);

  const toggleSound = useCallback(() => {
    if (!isInitialized) {
      initAudio();
      return;
    }
    
    if (ctxRef.current) {
      if (soundOn) {
        ctxRef.current.suspend();
        setSoundOn(false);
      } else {
        ctxRef.current.resume();
        setSoundOn(true);
      }
    }
  }, [soundOn, isInitialized, initAudio]);

  const startSound = useCallback(() => {
    if (!isInitialized) {
      initAudio();
    } else if (ctxRef.current && ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
      setSoundOn(true);
    }
  }, [isInitialized, initAudio]);

  useEffect(() => {
    return () => {
      if (srcRef.current) srcRef.current.stop();
      if (ctxRef.current) ctxRef.current.close();
    };
  }, []);

  return (
    <SoundContext.Provider value={{ soundOn, toggleSound, startSound }}>
      {children}
    </SoundContext.Provider>
  );
}
