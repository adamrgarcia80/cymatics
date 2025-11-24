// Cymatics Visualizer - Realistic sand particle visualization

class CymaticsVisualizer {
    constructor() {
        this.canvas = document.getElementById('cymaticCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.isRunning = false;
        this.animationId = null;
        this.isStarted = false;
        
        // Cymatic pattern parameters
        this.time = 0;
        this.centerX = 0;
        this.centerY = 0;
        
        // Particle system for sand
        this.particles = [];
        this.maxParticles = 12000; // More particles for detail
        this.soundThreshold = 0.02; // Lower threshold
        this.lastAmplitude = 0; // Track amplitude for dissolve effect
        this.dissolveAlpha = 1; // Current dissolve state - start visible
        this.isPaused = false; // Track pause state
        
        // Audio source
        this.audioSource = null;
        this.mediaStream = null;
        this.youtubePlayer = null;
        this.youtubeIframe = null;
        
        // DOM elements
        this.urlInputContainer = document.getElementById('urlInputContainer');
        this.youtubeUrlInput = document.getElementById('youtubeUrlInput');
        this.visualizeBtn = document.getElementById('visualizeBtn');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.playIcon = document.getElementById('playIcon');
        this.pauseIcon = document.getElementById('pauseIcon');
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.initializeParticles();
        this.drawInitialPattern();
        // Start animation loop immediately so particles are always visible
        this.animate();
    }
    
    setupCanvas() {
        const resizeCanvas = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.centerX = this.canvas.width / 2;
            this.centerY = this.canvas.height / 2;
            
            // Reinitialize particles on resize
            this.initializeParticles();
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('orientationchange', () => {
            setTimeout(resizeCanvas, 100);
        });
    }
    
    initializeParticles() {
        this.particles = [];
        const maxRadius = Math.min(this.canvas.width, this.canvas.height);
        
        // Initialize particles with more variation
        for (let i = 0; i < this.maxParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * maxRadius * 0.5;
            this.particles.push({
                x: this.centerX + Math.cos(angle) * distance,
                y: this.centerY + Math.sin(angle) * distance,
                vx: 0,
                vy: 0,
                size: 0.5 + Math.random() * 2.5, // More size variation
                baseSize: 0.5 + Math.random() * 2.5,
                opacity: 0,
                targetOpacity: 0,
                cluster: Math.random() < 0.3, // Some particles cluster more
                form: Math.floor(Math.random() * 3) // Different forms: 0=circle, 1=square, 2=diamond
            });
        }
    }
    
    setupEventListeners() {
        // Visualize button - loads video and starts visualization
        if (this.visualizeBtn) {
            this.visualizeBtn.addEventListener('click', () => {
                if (this.isStarted) {
                    this.stop();
                } else {
                    this.loadAndVisualize();
                }
            });
        }
        
        // Play/Pause button
        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => {
                this.togglePlayPause();
            });
        }
        
        // Enter key in input
        if (this.youtubeUrlInput) {
            this.youtubeUrlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (this.isStarted) {
                        this.stop();
                    } else {
                        this.loadAndVisualize();
                    }
                }
            });
        }
    }
    
    togglePlayPause() {
        if (!this.isStarted) return;
        
        this.isPaused = !this.isPaused;
        
        // Update icon
        if (this.playIcon && this.pauseIcon) {
            if (this.isPaused) {
                this.playIcon.style.display = 'block';
                this.pauseIcon.style.display = 'none';
            } else {
                this.playIcon.style.display = 'none';
                this.pauseIcon.style.display = 'block';
            }
        }
        
        // Pause/resume YouTube video
        if (this.youtubeIframe && this.youtubeIframe.contentWindow) {
            try {
                if (this.isPaused) {
                    this.youtubeIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                } else {
                    this.youtubeIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                }
            } catch (e) {
                console.warn('Could not control YouTube player:', e);
            }
        }
    }
    
    extractVideoId(url) {
        // Extract YouTube video ID from various URL formats
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    
    async loadAndVisualize() {
        const url = this.youtubeUrlInput.value.trim();
        if (!url) {
            alert('Please enter a YouTube URL');
            return;
        }
        
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            alert('Invalid YouTube URL. Please paste a valid YouTube link.');
            return;
        }
        
        // Keep URL input visible, just show loading state
        // Update button text
        if (this.visualizeBtn) {
            this.visualizeBtn.textContent = 'LOADING...';
            this.visualizeBtn.disabled = true;
        }
        
        // Hide play/pause button during loading
        if (this.playPauseBtn) {
            this.playPauseBtn.style.display = 'none';
        }
        
        // IMPORTANT: Request screen capture IMMEDIATELY while user gesture is still active
        // Safari requires getDisplayMedia to be called directly from user gesture handler
        // After this, load YouTube video - the screen capture will pick up its audio
        try {
            // Request screen capture first (while gesture context is active)
            await this.start();
            
            // Then load YouTube video - audio will be captured from it
            await this.loadYouTubeAudio(videoId);
        } catch (error) {
            console.error('Error loading audio:', error);
            
            // Clean up on error
            this.stop();
            
            if (this.visualizeBtn) {
                this.visualizeBtn.textContent = 'VISUALIZE';
                this.visualizeBtn.disabled = false;
            }
            
            let message = 'Unable to capture audio. ';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                message += 'Please allow screen/audio sharing. When prompted, select the browser window/tab and make sure "Share audio" is checked.';
            } else if (error.name === 'NotFoundError') {
                message += 'No audio source found.';
            } else {
                message += error.message || 'Unknown error occurred.';
            }
            
            alert(message);
        }
    }
    
    async loadYouTubeAudio(videoId) {
        // Embed YouTube video (hidden) - it will play audio
        if (this.youtubeIframe) {
            this.youtubeIframe.remove();
        }
        
        this.youtubeIframe = document.createElement('iframe');
        this.youtubeIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&controls=0&mute=0&origin=${window.location.origin}`;
        this.youtubeIframe.allow = 'autoplay; encrypted-media';
        this.youtubeIframe.style.cssText = `
            position: fixed;
            top: -9999px;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
        `;
        document.body.appendChild(this.youtubeIframe);
        
        // Wait a moment for video to start playing
        // The screen capture is already active, so it will pick up the audio
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Make sure screen capture is active
        if (!this.mediaStream || !this.analyser) {
            throw new Error('Screen capture was not started successfully');
        }
        
        // Now start the visualization
        this.isRunning = true;
        this.isStarted = true;
        this.isPaused = false;
        
        // Update button text
        if (this.visualizeBtn) {
            this.visualizeBtn.textContent = 'STOP';
            this.visualizeBtn.disabled = false;
        }
        
        // Show play/pause button next to visualize button
        if (this.playPauseBtn) {
            this.playPauseBtn.style.display = 'flex';
            if (this.pauseIcon) {
                this.pauseIcon.style.display = 'block';
            }
            if (this.playIcon) {
                this.playIcon.style.display = 'none';
            }
        }
        
        console.log('Visualization started - play/pause button should be visible');
        
        // Start animation if not already running
        if (!this.animationId) {
            this.animate();
        }
    }
    
    async start() {
        try {
            // Stop any existing capture
            if (this.isRunning) {
                this.stop();
            }
            
            // Clean up old audio nodes
            if (this.audioSource) {
                try {
                    this.audioSource.disconnect();
                } catch (e) {}
                this.audioSource = null;
            }
            
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            
            this.analyser = null;
            this.dataArray = null;
            
            // Request screen/audio capture IMMEDIATELY (must be from user gesture)
            // User selects the browser window/tab with the YouTube video
            this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'browser'
                },
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    suppressLocalAudioPlayback: false
                }
            });
            
            // Check if we got audio tracks
            const audioTracks = this.mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('No audio track found. Please select "Share audio" when sharing your screen.');
            }
            
            // Create or get audio context
            if (!this.audioContext || this.audioContext.state === 'closed') {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContextClass();
            }
            
            // Resume if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create analyser with better settings for responsiveness
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.3; // Lower = more responsive
            
            // Create audio source from media stream
            this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Create gain node to amplify signal if needed
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 1.5; // Boost audio signal
            
            // Connect: source -> gain -> analyser
            this.audioSource.connect(gainNode);
            gainNode.connect(this.analyser);
            
            // Create data array
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            console.log('Audio capture started:', {
                sampleRate: this.audioContext.sampleRate,
                bufferLength: bufferLength,
                audioTracks: audioTracks.length
            });
            
            // Handle stream ending (user stops sharing)
            audioTracks[0].onended = () => {
                this.stop();
            };
            
            // Don't start visualization yet - wait for YouTube video to load
            // isRunning will be set after YouTube video is loaded
            console.log('Screen capture started - waiting for YouTube video to load');
            
            // Return success - visualization will start after YouTube loads
            
        } catch (error) {
            console.error('Audio capture error:', error);
            
            let message = 'Unable to capture audio. ';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                message += 'Please allow screen/audio sharing. When prompted, select the browser window and make sure "Share audio" is checked.';
            } else if (error.name === 'NotFoundError') {
                message += 'No audio source found.';
            } else {
                message += error.message || 'Unknown error.';
            }
            
            alert(message);
            
            this.isStarted = false;
            this.isRunning = false;
            
            // Reset button text
            if (this.visualizeBtn) {
                this.visualizeBtn.textContent = 'VISUALIZE';
            }
        }
    }
    
    stop() {
        // Stop media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // Disconnect audio source
        if (this.audioSource) {
            try {
                this.audioSource.disconnect();
            } catch (e) {}
            this.audioSource = null;
        }
        
        // Don't cancel animation - let it continue for initial pattern
        this.isRunning = false;
        this.isStarted = false;
        this.isPaused = false;
        
        // Reset button text
        if (this.visualizeBtn) {
            this.visualizeBtn.textContent = 'VISUALIZE';
            this.visualizeBtn.disabled = false;
        }
        
        // Hide play/pause button
        if (this.playPauseBtn) {
            this.playPauseBtn.style.display = 'none';
        }
        
        // URL input stays visible - no need to show again
        this.drawInitialPattern();
    }
    
    getAudioData() {
        if (!this.analyser || !this.dataArray || !this.audioContext) {
            return { frequency: 0, amplitude: 0, spectrum: [] };
        }
        
        // Check if audio context is still running
        if (this.audioContext.state === 'closed' || this.audioContext.state === 'suspended') {
            return { frequency: 0, amplitude: 0, spectrum: [] };
        }
        
        try {
            // Get frequency data
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Also get time domain data for better amplitude detection
            const timeData = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteTimeDomainData(timeData);
            
        } catch (e) {
            console.warn('Error getting audio data:', e);
            return { frequency: 0, amplitude: 0, spectrum: [] };
        }
        
        // Safely iterate through data array
        const arrayLength = this.dataArray ? this.dataArray.length : 0;
        if (arrayLength === 0) {
            return { frequency: 0, amplitude: 0, spectrum: [] };
        }
        
        let maxIndex = 0;
        let maxValue = 0;
        
        // Find peak frequency
        for (let i = 0; i < arrayLength; i++) {
            const value = this.dataArray[i] || 0;
            if (value > maxValue) {
                maxValue = value;
                maxIndex = i;
            }
        }
        
        // Calculate frequency
        let sampleRate = 44100;
        try {
            sampleRate = this.audioContext.sampleRate || 44100;
        } catch (e) {
            console.warn('Could not read sampleRate:', e);
        }
        
        const nyquist = sampleRate / 2;
        const frequency = arrayLength > 0 ? (maxIndex * nyquist) / arrayLength : 0;
        
        // Calculate amplitude - use both frequency and time domain for accuracy
        let sum = 0;
        for (let i = 0; i < arrayLength; i++) {
            sum += this.dataArray[i] || 0;
        }
        const freqAmplitude = arrayLength > 0 ? sum / arrayLength / 255 : 0;
        
        // Also check time domain for better amplitude detection
        const timeSum = timeData.reduce((acc, val) => acc + Math.abs(val - 128), 0);
        const timeAmplitude = timeData.length > 0 ? timeSum / timeData.length / 128 : 0;
        
        // Use the higher of the two for better responsiveness
        const amplitude = Math.max(freqAmplitude, timeAmplitude * 1.5);
        
        return {
            frequency: frequency,
            amplitude: amplitude,
            spectrum: Array.from(this.dataArray)
        };
    }
    
    drawInitialPattern() {
        // Increment time for pulsing animation
        this.time += 0.02;
        
        // Clear to pure black
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw small pulsing light in center
        const pulseSize = 8 + Math.sin(this.time * 2) * 4; // Pulse between 4-12 pixels
        const pulseAlpha = 0.5 + Math.sin(this.time * 3) * 0.3; // Pulse opacity
        
        this.ctx.save();
        this.ctx.globalAlpha = pulseAlpha;
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, pulseSize, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    // Calculate wave displacement at a point (for cymatic patterns)
    getWaveDisplacement(x, y, frequency, amplitude, time) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Use current max radius for calculations
        const maxRadius = Math.min(this.canvas.width, this.canvas.height);
        if (distance > maxRadius) return 0;
        
        // Map frequency to pattern complexity
        const baseFrequency = Math.max(20, Math.min(frequency, 2000));
        const normalizedFreq = (baseFrequency - 20) / 1980;
        
        // Number of nodes (patterns) - more variation
        const radialNodes = 2 + normalizedFreq * 15;
        const angularNodes = 3 + normalizedFreq * 12;
        
        // Calculate wave interference pattern with more detail layers
        const radialWave = Math.sin(radialNodes * distance / maxRadius * Math.PI + time * 2);
        const angularWave = Math.sin(angularNodes * angle + time * 1.5);
        const combined = (radialWave + angularWave) / 2;
        
        // Multiple harmonics for more complex, detailed patterns
        const harmonic2 = Math.sin(radialNodes * 1.5 * distance / maxRadius * Math.PI + time * 1.3) * 0.25;
        const harmonic3 = Math.sin(radialNodes * 0.7 * distance / maxRadius * Math.PI + time * 2.2) * 0.2;
        const harmonic4 = Math.sin(angularNodes * 1.8 * angle + time * 0.8) * 0.15;
        const harmonic5 = Math.sin((radialNodes + angularNodes) * 0.6 * distance / maxRadius * Math.PI + time * 1.7) * 0.1;
        
        // Add spiral/rotational component for more form variation
        const spiral = Math.sin(angle * 3 + distance / maxRadius * 5 + time) * 0.1;
        
        const displacement = (combined + harmonic2 + harmonic3 + harmonic4 + harmonic5 + spiral) * amplitude;
        
        // Return displacement magnitude (0 = node where particles collect, 1 = antinode where particles are pushed away)
        return Math.abs(displacement);
    }
    
    drawCymaticPattern(audioData) {
        const { frequency, amplitude, spectrum } = audioData;
        
        // Update time
        this.time += 0.02;
        
        // Handle dissolve effect - gradually fade when sound stops
        const hasSound = amplitude >= this.soundThreshold;
        
        if (hasSound) {
            // Sound is active - fade in quickly
            this.dissolveAlpha = Math.min(this.dissolveAlpha + 0.08, 1);
            this.lastAmplitude = amplitude;
        } else {
            // No sound - slowly dissolve (lower fall off)
            this.dissolveAlpha = Math.max(this.dissolveAlpha - 0.004, 0); // Very slow dissolve
            amplitude = this.lastAmplitude * this.dissolveAlpha; // Use fading amplitude
        }
        
        // Clear to pure black
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Only draw particles when running
        if (!this.isRunning) {
            return; // Don't draw pattern when not running (pulsing light is drawn separately)
        }
        
        // Update particles based on wave pattern
        // In cymatics, particles are pushed away from antinodes (high displacement) 
        // and settle at nodes (low displacement)
        const intensity = Math.min(amplitude * 4, 1);
        const baseMaxRadius = Math.min(this.canvas.width, this.canvas.height);
        // At louder volumes, fill whole screen (up to full screen)
        const maxRadius = baseMaxRadius * (0.4 + intensity * 0.6 * this.dissolveAlpha);
        
        // Use default frequency if no sound detected
        const effectiveFreq = hasSound ? frequency : 440; // Default to A4 note
        const effectiveIntensity = hasSound ? intensity : 0.3; // Default intensity
        
        // Update each particle's position based on wave field
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Get wave displacement at particle location
            const displacement = this.getWaveDisplacement(p.x, p.y, effectiveFreq, effectiveIntensity, this.time);
            
            // Particles collect at nodes (low displacement areas)
            // In real cymatics, particles are pushed away from antinodes and settle at nodes
            const nodeStrength = 1 - Math.abs(displacement); // 1 = node, 0 = antinode
            
            // Calculate gradient to find direction toward nodes (low displacement)
            const eps = 2;
            const dispX1 = this.getWaveDisplacement(p.x + eps, p.y, effectiveFreq, effectiveIntensity, this.time);
            const dispX2 = this.getWaveDisplacement(p.x - eps, p.y, effectiveFreq, effectiveIntensity, this.time);
            const dispY1 = this.getWaveDisplacement(p.x, p.y + eps, effectiveFreq, effectiveIntensity, this.time);
            const dispY2 = this.getWaveDisplacement(p.x, p.y - eps, effectiveFreq, effectiveIntensity, this.time);
            
            // Calculate gradient of displacement magnitude (particles move toward lower displacement)
            const gradX = (Math.abs(dispX1) - Math.abs(dispX2)) / (2 * eps);
            const gradY = (Math.abs(dispY1) - Math.abs(dispY2)) / (2 * eps);
            
            // Particles are pushed away from antinodes (high displacement) 
            // and attracted to nodes (low displacement)
            const forceX = -gradX * 0.3; // Negative gradient = toward nodes
            const forceY = -gradY * 0.3;
            
            // Update velocity with lower damping (particles persist longer)
            const damping = hasSound ? 0.90 : 0.97; // Lower fall off - particles persist much longer
            p.vx = p.vx * damping + forceX * (hasSound ? 1 : 0.3);
            p.vy = p.vy * damping + forceY * (hasSound ? 1 : 0.3);
            
            // Limit velocity - increase at higher volumes
            const maxVel = hasSound ? (2 + intensity * 1.5) : 1;
            const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (vel > maxVel) {
                p.vx = (p.vx / vel) * maxVel;
                p.vy = (p.vy / vel) * maxVel;
            }
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Keep particles within bounds - scale with intensity
            const dist = Math.sqrt((p.x - this.centerX) ** 2 + (p.y - this.centerY) ** 2);
            if (dist > maxRadius) {
                const angle = Math.atan2(p.y - this.centerY, p.x - this.centerX);
                p.x = this.centerX + Math.cos(angle) * maxRadius * 0.98;
                p.y = this.centerY + Math.sin(angle) * maxRadius * 0.98;
                p.vx *= -0.3;
                p.vy *= -0.3;
            }
            
            // Dynamic size variation based on node strength and intensity
            p.size = p.baseSize * (0.7 + nodeStrength * 0.6 + effectiveIntensity * 0.3);
            
            // Update target opacity based on node strength
            // Show pattern even without sound, using a default frequency
            if (hasSound) {
                p.targetOpacity = nodeStrength > 0.15 ? 
                    Math.pow((nodeStrength - 0.15) / 0.85, 0.6) * intensity : 0;
            } else {
                // Default pattern when no sound - use a fixed frequency for visualization
                const defaultFreq = 440; // A4 note
                const defaultAmp = 0.3;
                const defaultDisp = this.getWaveDisplacement(p.x, p.y, defaultFreq, defaultAmp, this.time);
                const defaultNodeStrength = 1 - Math.abs(defaultDisp);
                p.targetOpacity = defaultNodeStrength > 0.15 ? 
                    Math.pow((defaultNodeStrength - 0.15) / 0.85, 0.6) * defaultAmp * 0.3 : 0;
            }
            
            // Smooth opacity transition - faster when starting from 0
            const transitionSpeed = p.opacity < 0.1 ? 0.25 : 0.15; // Faster when invisible
            p.opacity = p.opacity * (1 - transitionSpeed) + p.targetOpacity * transitionSpeed;
            
            // Apply dissolve effect
            const finalOpacity = p.opacity * this.dissolveAlpha;
            
            // Draw particles with variation
            if (finalOpacity > 0.05) {
                this.ctx.save();
                this.ctx.globalAlpha = finalOpacity;
                this.ctx.fillStyle = '#fff';
                
                // Different forms for variation
                switch(p.form) {
                    case 0: // Circle
                        this.ctx.beginPath();
                        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        this.ctx.fill();
                        break;
                    case 1: // Square (rotated)
                        this.ctx.translate(p.x, p.y);
                        this.ctx.rotate(this.time * 0.1 + p.x * 0.01);
                        this.ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
                        this.ctx.resetTransform();
                        break;
                    case 2: // Diamond
                        this.ctx.beginPath();
                        this.ctx.moveTo(p.x, p.y - p.size);
                        this.ctx.lineTo(p.x + p.size, p.y);
                        this.ctx.lineTo(p.x, p.y + p.size);
                        this.ctx.lineTo(p.x - p.size, p.y);
                        this.ctx.closePath();
                        this.ctx.fill();
                        break;
                }
                
                // Add clustering effect - draw smaller particles nearby
                if (p.cluster && finalOpacity > 0.3 && Math.random() < 0.1) {
                    this.ctx.beginPath();
                    const clusterX = p.x + (Math.random() - 0.5) * p.size * 2;
                    const clusterY = p.y + (Math.random() - 0.5) * p.size * 2;
                    this.ctx.arc(clusterX, clusterY, p.size * 0.4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
            }
        }
        
        // Update displays
        if (hasSound || this.dissolveAlpha > 0.1) {
        } else {
        }
    }
    
    animate() {
        // Always run animation, even without audio (for initial/default pattern)
        const audioData = this.getAudioData();
        
        // Always draw - show pulsing light when not running, full pattern when running
        if (this.isRunning) {
            this.drawCymaticPattern(audioData);
        } else {
            // Show small pulsing light when waiting
            this.drawInitialPattern();
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CymaticsVisualizer();
});