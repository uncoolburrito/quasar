import './style.css';
import { VisualizerScene } from './scene.js';
import { AudioManager } from './audio.js';

const scene = new VisualizerScene();
const audioManager = new AudioManager();

// UI Elements
const uploadInput = document.getElementById('audio-upload');
const playPauseBtn = document.getElementById('play-pause');
const trackNameDisplay = document.getElementById('track-name');
const vignette = document.getElementById('vignette');

function init() {
  scene.init();
  animate();

  // Event Listeners
  window.addEventListener('resize', () => scene.onResize());

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      trackNameDisplay.textContent = `Loading: ${file.name}...`;
      playPauseBtn.disabled = true;

      try {
        await audioManager.loadAudioFile(file);
        trackNameDisplay.textContent = `Ready: ${file.name}`;
        playPauseBtn.disabled = false;
        playPauseBtn.textContent = 'Play';
      } catch (err) {
        console.error("Error loading file:", err);
        trackNameDisplay.textContent = "Error loading file";
      }
    }
  });

  playPauseBtn.addEventListener('click', () => {
    if (audioManager.isPlaying) {
      audioManager.pause();
      playPauseBtn.textContent = 'Play';
    } else {
      audioManager.play();
      playPauseBtn.textContent = 'Pause';
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  const audioData = audioManager.getEnergy();
  scene.update(audioData);

  // Vignette Reactivity (Bass controls glow intensity and color hint)
  if (vignette) {
    const bass = audioData ? audioData.bass : 0;
    const intensity = 50 + bass * 150; // 50px to 200px
    const opacity = 0.2 + bass * 0.5;

    // Dynamic color: dark blue normally, purple/pink on heavy bass
    // We can use box-shadow color for this.
    // Let's use RGB interpolation roughly or just HSL
    // Hue: 240 (Blue) -> 300 (Pink)
    const hue = 240 + bass * 60;

    vignette.style.boxShadow = `inset 0 0 ${intensity}px ${intensity / 2}px hsla(${hue}, 80%, 50%, ${opacity})`;
  }
}

init();
