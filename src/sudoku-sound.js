// Three softly staggered notes, with a combined peak below 0.07.
const NOTES = [
  {frequency: 523.25, offset: 0, duration: 0.28, volume: 0.026},
  {frequency: 659.25, offset: 0.13, duration: 0.32, volume: 0.022},
  {frequency: 783.99, offset: 0.26, duration: 0.42, volume: 0.019},
];

export function scheduleSudokuChime(context) {
  const start = context.currentTime + 0.015;
  let lastNote;
  for (const {frequency, offset, duration, volume} of NOTES) {
    const note = context.createOscillator();
    const envelope = context.createGain();
    const begins = start + offset;
    const ends = begins + duration;
    note.type = 'sine';
    note.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, begins);
    envelope.gain.linearRampToValueAtTime(volume, begins + 0.045);
    envelope.gain.exponentialRampToValueAtTime(0.0001, ends);
    note.connect(envelope);
    envelope.connect(context.destination);
    note.start(begins);
    note.stop(ends);
    lastNote = note;
  }
  return lastNote;
}

export function playSudokuChime() {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  if (!Audio || document.hidden) return;
  let context;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (context?.state !== 'closed') context?.close().catch(() => {});
  };
  const start = () => {
    if (stopped || document.hidden) {
      stop();
      return;
    }
    scheduleSudokuChime(context).onended = stop;
  };
  try {
    context = new Audio();
    if (context.state === 'running') start();
    else context.resume().then(start).catch(stop);
  } catch {
    stop();
  }
  return stop;
}
