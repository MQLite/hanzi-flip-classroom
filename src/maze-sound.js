const cues = {
  // Each note is [delay, duration, start pitch, end pitch, wave, peak gain].
  bomb: [[0, .34, 155, 58, 'sine', .045], [.02, .16, 275, 110, 'triangle', .014]],
  hedgehog: [[0, .14, 390, 220, 'triangle', .027], [.2, .17, 330, 180, 'triangle', .025]],
  butterfly: [[0, .21, 523, 659, 'sine', .023], [.14, .22, 659, 784, 'sine', .021], [.29, .29, 784, 988, 'sine', .018]],
};

export function createMazeAudio() {
  let context, enabled = true, generation = 0;
  const playing = new Set();

  function prepare() {
    if (!enabled || document.hidden) return;
    try {
      const Audio = window.AudioContext ?? window.webkitAudioContext;
      if (!Audio) return;
      context ??= new Audio();
      return context.state === 'running' ? Promise.resolve() : context.resume();
    } catch { /* The visual cue still works on devices without audio. */ }
  }

  function stop() {
    generation++;
    for (const node of playing) {
      try { node.stop(); } catch { /* The note may already have ended. */ }
      node.disconnect();
    }
    playing.clear();
  }

  async function play(kind) {
    stop();
    const token = generation;
    if (!enabled || document.hidden || !context) return;
    try {
      await prepare();
      if (token !== generation || !enabled || document.hidden || context.state !== 'running') return;
      const start = context.currentTime + .02;
      for (const [delay, duration, from, to, type, peak] of cues[kind]) {
        const begins = start + delay, ends = begins + duration;
        const note = context.createOscillator(), gain = context.createGain();
        note.type = type;
        note.frequency.setValueAtTime(from, begins);
        note.frequency.exponentialRampToValueAtTime(to, ends);
        gain.gain.setValueAtTime(.0001, begins);
        gain.gain.exponentialRampToValueAtTime(peak, begins + .035);
        gain.gain.exponentialRampToValueAtTime(.0001, ends);
        note.connect(gain);
        gain.connect(context.destination);
        note.onended = () => { playing.delete(note); note.disconnect(); gain.disconnect(); };
        playing.add(note);
        note.start(begins);
        note.stop(ends);
      }
    } catch { /* Never interrupt the game for audio. */ }
  }

  return {
    prepare: () => { prepare()?.catch(() => {}); },
    play,
    stop,
    setEnabled(value) {
      enabled = value;
      if (!enabled) stop();
    },
    dispose() {
      stop();
      context?.close().catch(() => {});
    },
  };
}
