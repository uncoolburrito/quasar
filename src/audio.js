export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.audioBuffer = null;

        this.isPlaying = false;
        this.startTime = 0;
        this.pausedAt = 0;

        // Config
        this.fftSize = 2048; // Higher resolution
        this.smoothingTimeConstant = 0.8;
    }

    setupAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    async loadAudioFile(file) {
        this.setupAudioContext();

        const arrayBuffer = await file.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        return {
            duration: this.audioBuffer.duration,
            channels: this.audioBuffer.numberOfChannels,
            sampleRate: this.audioBuffer.sampleRate
        };
    }

    play() {
        if (!this.audioBuffer) return;
        if (this.isPlaying) return;

        this.setupAudioContext();

        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;

        // Analyser Setup
        if (!this.analyser) {
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
        }

        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // Playback logic for pause/resume
        const offset = this.pausedAt;
        // Clamp offset to duration to prevent error
        const safeOffset = Math.min(offset, this.audioBuffer.duration);

        this.source.start(0, safeOffset);
        this.startTime = this.audioContext.currentTime - safeOffset;

        this.isPlaying = true;
    }

    pause() {
        if (!this.isPlaying || !this.source) return;

        try {
            this.source.stop();
        } catch (e) { /* ignore if already stopped */ }

        this.pausedAt = this.audioContext.currentTime - this.startTime;
        this.isPlaying = false;
        this.source = null;
    }

    seek(time) {
        if (!this.audioBuffer) return;

        // Clamp time
        time = Math.max(0, Math.min(time, this.audioBuffer.duration));

        this.pausedAt = time;

        if (this.isPlaying) {
            this.source.stop();
            this.source = null;
            this.isPlaying = false;
            this.play(); // Restart at new time
        }
    }

    getCurrentTime() {
        if (!this.audioBuffer) return 0;
        if (this.isPlaying) {
            return this.audioContext.currentTime - this.startTime;
        }
        return this.pausedAt;
    }

    getDuration() {
        return this.audioBuffer ? this.audioBuffer.duration : 0;
    }

    getFrequencyData() {
        if (!this.analyser) return new Uint8Array(this.fftSize / 2); // Return empty if not ready

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }

    /**
     * Returns normalized (0-1) energy for Low, Mid, High bands.
     */
    getEnergy() {
        const data = this.getFrequencyData();
        if (!data || data.length === 0) return { bass: 0, mid: 0, high: 0 };

        const binCount = data.length;
        // Simple band splitting (approximate for 44.1kHz)
        // Bass: 20-250Hz -> roughly lower 5% (depending on FFT size)
        // Mid: 250-2000Hz -> roughly 5%-40%
        // High: 2000Hz+ -> roughly 40%-100%

        // Helper to average a range
        const getAverage = (start, end) => {
            let sum = 0;
            const count = end - start;
            if (count <= 0) return 0;
            for (let i = start; i < end; i++) {
                sum += data[i];
            }
            return (sum / count) / 255; // Normalize 0-1
        };

        const bassEnd = Math.floor(binCount * 0.05);
        const midEnd = Math.floor(binCount * 0.25);

        const bass = getAverage(0, bassEnd);
        const mid = getAverage(bassEnd, midEnd);
        const high = getAverage(midEnd, binCount);

        return { bass, mid, high };
    }
}
