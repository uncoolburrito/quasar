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
}

init();
