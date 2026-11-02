// Bộ tạo âm thanh môi trường bằng Web Audio API thuần (Không cần tải file âm thanh nặng, chạy offline 100%)

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private sounds: Map<string, { gain: GainNode; stop: () => void }> = new Map();

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. ÂM THANH MƯA RƠI (Pink noise + Lowpass filter)
  startRain(volume: number = 0.5) {
    this.stopSound('rain');
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Thuật toán Paul Kellet Pink Noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Bộ lọc tạo tiếng mưa rào nhẹ
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
    this.sounds.set('rain', {
      gain: gainNode,
      stop: () => { try { noise.stop(); } catch(e){} }
    });
  }

  // 2. ÂM THANH SÓNG BIỂN (Brown noise + LFO Filter sweep)
  startWaves(volume: number = 0.5) {
    this.stopSound('waves');
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // LFO quét tần số tạo cảm giác sóng dạt vào bờ rồi rút ra
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 450;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.18; // Chu kỳ sóng khoảng 5.5s
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 350;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
    this.sounds.set('waves', {
      gain: gainNode,
      stop: () => {
        try { noise.stop(); lfo.stop(); } catch(e){}
      }
    });
  }

  // 3. ÂM THANH LỬA TRẠI (Ấm áp, tí tách)
  startFireplace(volume: number = 0.5) {
    this.stopSound('fireplace');
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Tiếng rền trầm của than hồng
      const white = Math.random() * 2 - 1;
      let val = white * 0.05;
      // Tiếng nổ lách tách ngẫu nhiên
      if (Math.random() < 0.0015) {
        val += (Math.random() * 2 - 1) * 0.8;
      }
      data[i] = val;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.8;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
    this.sounds.set('fireplace', {
      gain: gainNode,
      stop: () => { try { noise.stop(); } catch(e){} }
    });
  }

  // 4. ÂM THANH TẬP TRUNG SÂU (Deep Pink Noise / Tiếng ồn trắng chặn tạp âm)
  startDeepFocus(volume: number = 0.5) {
    this.stopSound('focus');
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.015 * white)) / 1.015;
      lastOut = data[i];
      data[i] *= 2.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
    this.sounds.set('focus', {
      gain: gainNode,
      stop: () => { try { noise.stop(); } catch(e){} }
    });
  }

  // Chỉnh âm lượng của từng nguồn âm thanh (0 đến 1)
  setVolume(soundType: string, volume: number) {
    const s = this.sounds.get(soundType);
    if (s && this.ctx) {
      s.gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.1);
    }
  }

  // Dừng một âm thanh cụ thể
  stopSound(soundType: string) {
    const s = this.sounds.get(soundType);
    if (s) {
      s.stop();
      this.sounds.delete(soundType);
    }
  }

  // Dừng tất cả âm thanh
  stopAll() {
    this.sounds.forEach((s) => s.stop());
    this.sounds.clear();
  }

  // Phát chuông báo hết giờ Pomodoro
  playChime() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch(e) {}
  }
}

export const ambientAudio = new AmbientAudioEngine();
