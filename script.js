// Cymatics Visualizer - Clean Implementation

class CymaticsVisualizer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.audioElement = null;
        this.audioSource = null;
        this.dataArray = null;
        
        // Visualization state
        this.isPlaying = false;
        this.particles = [];
        this.time = 0;
        this.centerX = 0;
        this.centerY = 0;
        
        // DOM elements
        this.fileInput = document.getElementById('fileInput');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.playText = document.getElementById('playText');
        this.pauseText = document.getElementById('pauseText');
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.initializeParticles();
        this.animate();
    }
    
    setupCanvas() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.centerX = this.canvas.width / 2;
            this.centerY = this.canvas.height / 2;
            this.initializeParticles();
        };
        
        resize();
        window.addEventListener('resize', resize);
    }
    
    initializeParticles() {
        this.particles = [];
        const count = 12000;
        const maxDist = Math.sqrt(this.canvas.width ** 2 + this.canvas.height ** 2) / 2;
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * maxDist;
            this.particles.push({
                x: this.centerX + Math.cos(angle) * distance,
                y: this.centerY + Math.sin(angle) * distance,
                vx: 0,
                vy: 0,
                size: 0.3 + Math.random() * 2,
                baseSize: 0.3 + Math.random() * 2,
                form: Math.floor(Math.random() * 3),
                phase: Math.random() * Math.PI * 2
            });
        }
    }
    
    setupEventListeners() {
        // File input change handler
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Accept any file type (some browsers don't set audio/* MIME correctly)
                if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i)) {
                    this.loadAudio(file);
                } else {
                    alert('Please select an audio file (MP3, WAV, etc.)');
                }
            }
        });
        
        // Label click to trigger file input - ensure it works
        const fileLabel = document.querySelector('.file-label');
        if (fileLabel) {
            fileLabel.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.fileInput.click();
            });
        }
        
        // Also allow direct clicks on the file input label (HTML for attribute)
        // The label should already work, but ensure JavaScript doesn't interfere
        
        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        });
    }
    
    async loadAudio(file) {
        try {
            this.stop();
            
            const url = URL.createObjectURL(file);
            this.audioElement = new Audio(url);
            this.audioElement.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                this.audioElement.oncanplaythrough = resolve;
                this.audioElement.onerror = reject;
                this.audioElement.load();
            });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.audioSource.connect(this.analyser);
            this.audioSource.connect(this.audioContext.destination);
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            this.playPauseBtn.style.display = 'flex';
            await this.play();
            
        } catch (error) {
            console.error('Error loading audio:', error);
            alert('Error loading audio file. Please try a different file.');
        }
    }
    
    async play() {
        if (!this.audioElement) return;
        
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            await this.audioElement.play();
            this.isPlaying = true;
            this.playText.style.display = 'none';
            this.pauseText.style.display = 'block';
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    }
    
    pause() {
        if (!this.audioElement) return;
        this.audioElement.pause();
        this.isPlaying = false;
        this.playText.style.display = 'block';
        this.pauseText.style.display = 'none';
    }
    
    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement = null;
        }
        if (this.audioSource) {
            try {
                this.audioSource.disconnect();
            } catch (e) {}
            this.audioSource = null;
        }
        this.analyser = null;
        this.dataArray = null;
        this.isPlaying = false;
        this.playPauseBtn.style.display = 'none';
    }
    
    getAudioData() {
        if (!this.analyser || !this.dataArray || !this.audioElement || this.audioElement.paused) {
            return { amplitude: 0, frequency: 440 };
        }
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        let sum = 0;
        let maxValue = 0;
        let maxIndex = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const value = this.dataArray[i];
            sum += value;
            if (value > maxValue) {
                maxValue = value;
                maxIndex = i;
            }
        }
        
        const amplitude = sum / this.dataArray.length / 255;
        const sampleRate = this.audioContext.sampleRate;
        const nyquist = sampleRate / 2;
        const frequency = (maxIndex * nyquist) / this.dataArray.length;
        
        return { 
            amplitude, 
            frequency: frequency || 440
        };
    }
    
    getWaveDisplacement(x, y, frequency, amplitude, time) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        const maxDist = Math.sqrt(this.canvas.width ** 2 + this.canvas.height ** 2) / 2;
        const normalizedDist = distance / maxDist;
        
        const normalizedFreq = Math.min((frequency - 20) / 2000, 1);
        const radialNodes = 2 + normalizedFreq * 15;
        const angularNodes = 3 + normalizedFreq * 12;
        
        const radialWave = Math.sin(radialNodes * normalizedDist * Math.PI + time * 2);
        const angularWave = Math.sin(angularNodes * angle + time * 1.5);
        
        const harmonic2 = Math.sin(radialNodes * 1.5 * normalizedDist * Math.PI + time * 1.3) * 0.25;
        const harmonic3 = Math.sin(radialNodes * 0.7 * normalizedDist * Math.PI + time * 2.2) * 0.2;
        
        const displacement = ((radialWave + angularWave) / 2 + harmonic2 + harmonic3) * amplitude;
        return Math.abs(displacement);
    }
    
    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const audioData = this.getAudioData();
        const { amplitude, frequency } = audioData;
        
        this.time += 0.02;
        
        const intensity = amplitude > 0 ? Math.min(amplitude * 15, 1) : 0.25;
        const effectiveFreq = frequency > 0 ? frequency : 440;
        
        const baseMaxDist = Math.sqrt(this.canvas.width ** 2 + this.canvas.height ** 2) / 2;
        const maxRadius = baseMaxDist * (0.6 + intensity * 0.4);
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            const displacement = this.getWaveDisplacement(p.x, p.y, effectiveFreq, intensity, this.time);
            const nodeStrength = 1 - displacement;
            
            const eps = 2;
            const dispX1 = this.getWaveDisplacement(p.x + eps, p.y, effectiveFreq, intensity, this.time);
            const dispX2 = this.getWaveDisplacement(p.x - eps, p.y, effectiveFreq, intensity, this.time);
            const dispY1 = this.getWaveDisplacement(p.x, p.y + eps, effectiveFreq, intensity, this.time);
            const dispY2 = this.getWaveDisplacement(p.x, p.y - eps, effectiveFreq, intensity, this.time);
            
            const gradX = (Math.abs(dispX1) - Math.abs(dispX2)) / (2 * eps);
            const gradY = (Math.abs(dispY1) - Math.abs(dispY2)) / (2 * eps);
            
            const forceX = -gradX * 0.2;
            const forceY = -gradY * 0.2;
            
            const damping = amplitude > 0 ? 0.88 : 0.95;
            p.vx = p.vx * damping + forceX * (1 + intensity * 0.5);
            p.vy = p.vy * damping + forceY * (1 + intensity * 0.5);
            
            const maxVel = amplitude > 0 ? (1.5 + intensity * 2) : 1;
            const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (vel > maxVel) {
                p.vx = (p.vx / vel) * maxVel;
                p.vy = (p.vy / vel) * maxVel;
            }
            
            p.x += p.vx;
            p.y += p.vy;
            
            const dist = Math.sqrt((p.x - this.centerX) ** 2 + (p.y - this.centerY) ** 2);
            if (dist > maxRadius) {
                const angle = Math.atan2(p.y - this.centerY, p.x - this.centerX);
                p.x = this.centerX + Math.cos(angle) * maxRadius * 0.98;
                p.y = this.centerY + Math.sin(angle) * maxRadius * 0.98;
                p.vx *= -0.3;
                p.vy *= -0.3;
            }
            
            p.size = p.baseSize * (0.6 + nodeStrength * 0.6 + intensity * 0.3);
            
            const baseOpacity = nodeStrength * intensity;
            const opacity = Math.pow(baseOpacity, 0.7);
            
            if (opacity > 0.08) {
                this.ctx.save();
                this.ctx.globalAlpha = opacity;
                this.ctx.fillStyle = '#fff';
                
                switch(p.form) {
                    case 0:
                        this.ctx.beginPath();
                        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        this.ctx.fill();
                        break;
                    case 1:
                        this.ctx.save();
                        this.ctx.translate(p.x, p.y);
                        this.ctx.rotate(this.time * 0.1 + p.phase);
                        this.ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
                        this.ctx.restore();
                        break;
                    case 2:
                        this.ctx.beginPath();
                        this.ctx.moveTo(p.x, p.y - p.size);
                        this.ctx.lineTo(p.x + p.size, p.y);
                        this.ctx.lineTo(p.x, p.y + p.size);
                        this.ctx.lineTo(p.x - p.size, p.y);
                        this.ctx.closePath();
                        this.ctx.fill();
                        break;
                }
                
                this.ctx.restore();
            }
        }
    }
    
    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CymaticsVisualizer();
});
