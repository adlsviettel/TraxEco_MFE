// Sound utility mapped to original Xamarin audio files

const playAudioFile = (filename: string) => {
  try {
    // Construct the URL securely respecting Vite's base path
    const baseUrl = import.meta.env.BASE_URL || '/';
    const audioUrl = `${baseUrl}sounds/${filename}`.replace('//', '/');
    const audio = new Audio(audioUrl);
    
    // Play the audio and catch any browser auto-play policy rejections
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Audio play prevented:", error);
      });
    }
  } catch (err) {
    console.error("Failed to map audio file:", err);
  }
};

/**
 * Normal fast beep for successful scan
 */
export const playScanSound = () => {
  // Uses the native short barcode beep "ShBeep.wav"
  playAudioFile('ShBeep.wav');
};

/**
 * Noticeable alert/notification sound for QA/Final Inspection
 */
export const playQASound = () => {
  // Uses "PickedCTN.mp3" or "Beep.ogg" for positive/QA notification
  playAudioFile('PickedCTN.mp3');
};

/**
 * Error voice/tone when scanning wrong or failing
 */
export const playErrorSound = () => {
  // Uses "WrCodeReScan.mp3" (Wrong Code ReScan)
  playAudioFile('WrCodeReScan.mp3');
};

/**
 * Warning sound when duplicates or missing locations happen
 */
export const playWarningSound = () => {
  // Uses "PickLocFirst.mp3" (Pick Location First / Warning) or "alert.wav"
  playAudioFile('alert.wav');
};

/**
 * Arcade "Uh-Oh" Error Sound (Lively, noticeable, but not harsh)
 */
export const playFactoryMismatchSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      playAudioFile('alert.wav');
      return;
    }
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Sóng vuông (Square) kết hợp âm lượng vừa phải giúp xuyên thấu tiếng ồn kho xưởng
    osc.type = 'square';
    
    // Nhịp 1: Nốt bíp ở tần số 400Hz "Tít"
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime); // Âm lượng tương đối lớn
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    // Ngắt nhịp
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.16);
    
    // Nhịp 2: Báo lỗi "Tòe" (Rớt tần số thẳng tuột từ 300Hz xuống 150Hz)
    osc.frequency.setValueAtTime(300, ctx.currentTime + 0.18);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.5); // Trượt âm mượt mà
    gain.gain.setValueAtTime(0.4, ctx.currentTime + 0.18);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    playAudioFile('alert.wav');
  }
};

/**
 * Extra utility exported for specific custom triggers
 */
export const playCustomSound = (filename: string) => {
  playAudioFile(filename);
};
