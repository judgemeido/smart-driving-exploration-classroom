/** A short, optional confirmation cue generated locally; no media downloads. */
export function createArcadeSound(): { play(): void; dispose(): void } {
  let context: AudioContext | null = null;
  return {
    play() {
      if (typeof AudioContext === 'undefined') return;
      try {
        context ??= new AudioContext();
        void context.resume();
        const start = context.currentTime;
        for (const [index, frequency] of [523.25, 659.25].entries()) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0, start + index * 0.075);
          gain.gain.linearRampToValueAtTime(0.06, start + index * 0.075 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, start + index * 0.075 + 0.12);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
          oscillator.start(start + index * 0.075);
          oscillator.stop(start + index * 0.075 + 0.13);
        }
      } catch {
        /* Audio is an enhancement; visual evidence remains authoritative. */
      }
    },
    dispose() {
      if (context) {
        void context.close();
        context = null;
      }
    },
  };
}
