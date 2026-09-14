// Web Audio API 기반 오디오 합성 사운드 매니저
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.noteFrequencies = {
      '낮은 라': 220.00, // A3
      '낮은라': 220.00,
      '낮은 시': 246.94, // B3
      '낮은시': 246.94,
      '도': 261.63,     // C4
      '레': 293.66,     // D4
      '미': 329.63,     // E4
      '파': 349.23,     // F4
      '솔': 392.00,     // G4
      '라': 440.00,     // A4
      '시': 493.88,     // B4
      '높은도': 523.25,  // C5
      '높은 도': 523.25,  // C5
      '높은 레': 587.33, // D5
      '높은레': 587.33,
      '높은 미': 659.25, // E5
      '높은미': 659.25,
      '높은 파': 698.46, // F5
      '높은파': 698.46,
      '높은 솔': 783.99, // G5
      '높은솔': 783.99
    };
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 계이름 맑은 피아노 톤 재생
  playNote(noteName) {
    this.init();
    const freq = this.noteFrequencies[noteName];
    if (!freq) return;

    const now = this.ctx.currentTime;
    
    // 메인 오실레이터 (삼각파로 부드러운 오르간/피아노 배음)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    // 2차 배음 살짝 추가로 맑은 소리
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    // 엔벨로프 (피아노 어택 & 디케이)
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
  }

  // 오답 시 "삐빅!" 경고 부저음
  playWrong() {
    this.init();
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    // 불협화음 주파수 (150Hz & 140Hz)
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.setValueAtTime(110, now + 0.12);

    osc2.frequency.setValueAtTime(155, now);
    osc2.frequency.setValueAtTime(105, now + 0.12);

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  // 콤보 상승 효과음
  playCombo(comboCount) {
    this.init();
    const now = this.ctx.currentTime;
    const baseFreq = 500 + Math.min(comboCount * 35, 600);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 게임 종료 팡파레
  playFanfare() {
    this.init();
    const notes = [
      { f: 392.00, t: 0.0, d: 0.12 }, // G4
      { f: 523.25, t: 0.14, d: 0.12 }, // C5
      { f: 659.25, t: 0.28, d: 0.12 }, // E5
      { f: 783.99, t: 0.42, d: 0.35 }  // G5
    ];

    const now = this.ctx.currentTime;
    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0, now + n.t);
      gain.gain.linearRampToValueAtTime(0.3, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }
}

const sounds = new SoundEffects();
