export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.audioBuffer = null;

        this.isPlaying = false;
        this.startTime = 0;
        this.pausedAt = 0;

        this.fftSize = 2048;
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

        if (!this.analyser) {
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
        }

        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        const offset = this.pausedAt;
        const safeOffset = Math.min(offset, this.audioBuffer.duration);

        this.source.start(0, safeOffset);
        this.startTime = this.audioContext.currentTime - safeOffset;

        this.isPlaying = true;
    }

    pause() {
        if (!this.isPlaying || !this.source) return;

        try {
            this.source.stop();
        } catch (e) { }

        this.pausedAt = this.audioContext.currentTime - this.startTime;
        this.isPlaying = false;
        this.source = null;
    }

    seek(time) {
        if (!this.audioBuffer) return;

        time = Math.max(0, Math.min(time, this.audioBuffer.duration));

        this.pausedAt = time;

        if (this.isPlaying) {
            this.source.stop();
            this.source = null;
            this.isPlaying = false;
            this.play();
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
        if (!this.analyser) return new Uint8Array(this.fftSize / 2);

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }

    getEnergy() {
        const data = this.getFrequencyData();
        if (!data || data.length === 0) return { bass: 0, mid: 0, high: 0 };

        const binCount = data.length;

        const getAverage = (start, end) => {
            let sum = 0;
            const count = end - start;
            if (count <= 0) return 0;
            for (let i = start; i < end; i++) {
                sum += data[i];
            }
            return (sum / count) / 255;
        };

        const bassEnd = Math.floor(binCount * 0.05);
        const midEnd = Math.floor(binCount * 0.25);

        const bass = getAverage(0, bassEnd);
        const mid = getAverage(bassEnd, midEnd);
        const high = getAverage(midEnd, binCount);

        return { bass, mid, high };
    }
}
