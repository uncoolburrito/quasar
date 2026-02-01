import './style.css';
import { VisualizerScene } from './scene.js';
import { AudioManager } from './audio.js';

const scene = new VisualizerScene();
const audioManager = new AudioManager();

// UI Elements
const uploadInput = document.getElementById('audio-upload');
const playPauseBtn = document.getElementById('play-pause');
const trackNameDisplay = document.getElementById('track-name');
const progressBar = document.getElementById('progress-bar');
const timeDisplay = document.getElementById('time-display');

let isDragging = false;

function formatTime(seconds) {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function init() {
  scene.init();
  animate();

  window.addEventListener('resize', () => scene.onResize());

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      trackNameDisplay.textContent = `Loading: ${file.name}...`;
      playPauseBtn.disabled = true;
      if (progressBar) progressBar.disabled = true;

      try {
        const { duration } = await audioManager.loadAudioFile(file);

        trackNameDisplay.textContent = `Ready: ${file.name}`;
        playPauseBtn.disabled = false;
        playPauseBtn.textContent = 'Play';

        // Progress Bar Setup
        if (progressBar) {
          progressBar.disabled = false;
          progressBar.max = duration;

          // "Interesting Start" Logic: Start at 20%
          const startOffset = duration * 0.2;
          audioManager.seek(startOffset);
          progressBar.value = startOffset;
          if (timeDisplay) timeDisplay.textContent = `${formatTime(startOffset)} / ${formatTime(duration)}`;
        }

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

  // Progress Bar Listeners
  if (progressBar) {
    progressBar.addEventListener('input', () => {
      isDragging = true;
      const time = parseFloat(progressBar.value);
      if (timeDisplay) timeDisplay.textContent = `${formatTime(time)} / ${formatTime(audioManager.getDuration())}`;
    });

    progressBar.addEventListener('change', () => {
      isDragging = false;
      const time = parseFloat(progressBar.value);
      audioManager.seek(time);
      if (audioManager.isPlaying) {
        playPauseBtn.textContent = 'Pause';
      }
    });
  }
}

function animate() {
  requestAnimationFrame(animate);

  const audioData = audioManager.getEnergy();
  scene.update(audioData);

  // Update progress bar
  if (!isDragging && audioManager.isPlaying && progressBar) {
    const currentTime = audioManager.getCurrentTime();
    progressBar.value = currentTime;
    const duration = audioManager.getDuration();
    if (timeDisplay) timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;

    if (duration > 0 && currentTime >= duration - 0.1) {
      playPauseBtn.textContent = 'Play';
    }
  }
}

init();
