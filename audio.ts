// Tiny procedural sound engine: ambient wind, birds, footsteps and interaction
// sounds are synthesised with the WebAudio API so there are no audio assets.

export type SoundName = "break" | "place" | "step" | "click" | "craft" | "chime" | "splash" | "thunder";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private birdTimer: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;

  enable(on: boolean) {
    this.enabled = on;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(on ? 0.7 : 0, this.ctx.currentTime, 0.15);
    }
    if (!on && this.rainGain && this.ctx) this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    if (on) this.start();
  }

  start() {
    if (!this.enabled) return;
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoise();
      this.startAmbient();
      this.scheduleBirds();
    } catch {
      this.enabled = false;
    }
  }

  private createNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const length = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  private startAmbient() {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 640;
    filter.Q.value = 0.4;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.055;
    // gentle LFO breathes through the wind
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.022;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    lfo.start();
  }

  private scheduleBirds() {
    if (this.birdTimer) window.clearTimeout(this.birdTimer);
    this.birdTimer = window.setTimeout(() => {
      if (this.enabled) this.bird();
      this.scheduleBirds();
    }, 3500 + Math.random() * 8000);
  }

  private bird() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const base = 1800 + Math.random() * 1400;
      const t = now + i * 0.09 + Math.random() * 0.04;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * (1.15 + Math.random() * 0.4), t + 0.06);
      osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.12);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.018, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  }

  setRain(level: number) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    if (!this.rainGain) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 700;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
      this.rainGain = gain;
      this.rainFilter = filter;
    }
    const target = Math.max(0, Math.min(1, level)) * 0.12;
    this.rainGain.gain.setTargetAtTime(this.enabled ? target : 0, this.ctx.currentTime, 0.6);
    if (this.rainFilter) this.rainFilter.frequency.setTargetAtTime(700 + level * 700, this.ctx.currentTime, 0.5);
  }

  play(name: SoundName) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (name === "click" || name === "chime") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(name === "chime" ? 880 : 520, t);
      osc.frequency.exponentialRampToValueAtTime(name === "chime" ? 1320 : 420, t + 0.09);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(name === "chime" ? 0.06 : 0.035, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (name === "chime" ? 0.5 : 0.12));
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.55);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    const gain = ctx.createGain();
    if (name === "break") {
      filter.frequency.setValueAtTime(1600, t);
      filter.frequency.exponentialRampToValueAtTime(240, t + 0.22);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      src.playbackRate.value = 1.4;
    } else if (name === "place") {
      filter.frequency.setValueAtTime(420, t);
      filter.frequency.exponentialRampToValueAtTime(140, t + 0.16);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      src.playbackRate.value = 0.8;
    } else if (name === "step") {
      filter.frequency.setValueAtTime(300, t);
      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      src.playbackRate.value = 1.1;
    } else if (name === "splash") {
      filter.frequency.setValueAtTime(2200, t);
      filter.frequency.exponentialRampToValueAtTime(500, t + 0.4);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    } else {
      filter.frequency.setValueAtTime(900, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    }
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    if (name === "thunder") {
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(260, t);
      filter.frequency.exponentialRampToValueAtTime(70, t + 1.6);
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      src.playbackRate.value = 0.45;
      src.start(t);
      src.stop(t + 2.4);
    } else {
      src.start(t, Math.random() * 1.5);
      src.stop(t + 0.5);
    }
  }

  dispose() {
    if (this.birdTimer) window.clearTimeout(this.birdTimer);
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}
