import './style.css';
import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.gardener = null;
        this.vegetables = null;
        this.squirrels = null;
        this.raccoons = null;
        this.waterSpray = null;
        this.cursors = null;
        this.spaceKey = null;
        this.pauseKey = null;
        this.score = 0;
        this.round = 1;
        this.timeLeft = 60;
        this.vegetablesLeft = 0;
        this.squirrelSpawnRate = 3000; // milliseconds
        this.raccoonSpawnRate = 8000; // Less frequent than squirrels
        this.lastSquirrelSpawn = 0;
        this.lastRaccoonSpawn = 0;
        this.gameTimer = null;
        this.roundActive = false; // Start as false until game is started
        this.gamePaused = false;
        this.gameStarted = false; // New property to track if game has been started
        this.gardenerAngle = 0; // Track gardener's rotation angle
        this.audioContext = null; // For sound effects
        this.musicGainNode = null; // For background music
        this.musicPlaying = false;
        this.waterTap = null; // Water tap object
        this.waterEnabled = true; // Whether water spray is available
        this.lastSprayTime = 0; // Track timing for continuous spray
    }

    preload() {
        // Create colored rectangles as sprites for our game objects
        this.load.image('grass', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
        
        // Create simple colored shapes for our game objects
        this.createSprites();
    }

    createSprites() {
        // Create realistic garden background with grass texture
        const grassGraphics = this.add.graphics();
        // Base green color
        grassGraphics.fillStyle(0x228B22);
        grassGraphics.fillRect(0, 0, 32, 32);
        
        // Add darker grass blades for texture
        grassGraphics.fillStyle(0x1e7b1e);
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * 32;
            const y = Math.random() * 32;
            grassGraphics.fillRect(x, y, 1, Math.random() * 8 + 4);
        }
        
        // Add lighter grass highlights
        grassGraphics.fillStyle(0x32cd32);
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * 32;
            const y = Math.random() * 32;
            grassGraphics.fillRect(x, y, 1, Math.random() * 6 + 2);
        }
        
        grassGraphics.generateTexture('grass', 32, 32);
        grassGraphics.destroy();

        // Create realistic gardener sprite (body only, arms and legs separate)
        const gardenerGraphics = this.add.graphics();
        
        // Body (brown shirt)
        gardenerGraphics.fillStyle(0x8B4513);
        gardenerGraphics.fillRect(10, 12, 12, 16);
        
        // Head (skin tone)
        gardenerGraphics.fillStyle(0xFFDBAE);
        gardenerGraphics.fillCircle(16, 8, 6);
        
        // Hat (green)
        gardenerGraphics.fillStyle(0x228B22);
        gardenerGraphics.fillRect(11, 2, 10, 4);
        gardenerGraphics.fillCircle(16, 4, 5);
        
        // Hair (brown showing under hat)
        gardenerGraphics.fillStyle(0x654321);
        gardenerGraphics.fillRect(12, 6, 8, 2);
        
        // Eyes
        gardenerGraphics.fillStyle(0x000000);
        gardenerGraphics.fillCircle(14, 7, 1);
        gardenerGraphics.fillCircle(18, 7, 1);
        
        // Nose
        gardenerGraphics.fillStyle(0xFFB86C);
        gardenerGraphics.fillCircle(16, 9, 1);
        
        // Hose (blue, indicating direction)
        gardenerGraphics.fillStyle(0x1E90FF);
        gardenerGraphics.fillRect(24, 16, 6, 2);
        gardenerGraphics.fillCircle(30, 17, 2);
        
        gardenerGraphics.generateTexture('gardener', 32, 28);
        gardenerGraphics.destroy();

        // Create gardener arm sprite (for animation)
        const armGraphics = this.add.graphics();
        
        // Arm (skin tone)
        armGraphics.fillStyle(0xFFDBAE);
        armGraphics.fillRect(0, 0, 4, 12);  // Arm
        
        // Hand
        armGraphics.fillStyle(0xFFDBAE);
        armGraphics.fillCircle(2, 12, 2);
        
        armGraphics.generateTexture('gardener-arm', 4, 16);
        armGraphics.destroy();

        // Create gardener leg sprite (for animation)
        const legGraphics = this.add.graphics();
        
        // Leg (blue jeans)
        legGraphics.fillStyle(0x4169E1);
        legGraphics.fillRect(0, 0, 4, 12);  // Leg
        
        // Boot (brown)
        legGraphics.fillStyle(0x654321);
        legGraphics.fillRect(-1, 12, 6, 4);  // Boot
        
        legGraphics.generateTexture('gardener-leg', 6, 16);
        legGraphics.destroy();

        // Create realistic squirrel sprite
        const squirrelGraphics = this.add.graphics();
        
        // Body (brown)
        squirrelGraphics.fillStyle(0x8B4513);
        squirrelGraphics.fillCircle(12, 14, 8);
        
        // Head (lighter brown)
        squirrelGraphics.fillStyle(0xCD853F);
        squirrelGraphics.fillCircle(12, 8, 6);
        
        // Ears (brown with pink inside)
        squirrelGraphics.fillStyle(0x8B4513);
        squirrelGraphics.fillCircle(8, 4, 3);
        squirrelGraphics.fillCircle(16, 4, 3);
        squirrelGraphics.fillStyle(0xFFB6C1);
        squirrelGraphics.fillCircle(8, 4, 1);
        squirrelGraphics.fillCircle(16, 4, 1);
        
        // Eyes (black with white highlights)
        squirrelGraphics.fillStyle(0x000000);
        squirrelGraphics.fillCircle(9, 7, 2);
        squirrelGraphics.fillCircle(15, 7, 2);
        squirrelGraphics.fillStyle(0xFFFFFF);
        squirrelGraphics.fillCircle(9, 6, 1);
        squirrelGraphics.fillCircle(15, 6, 1);
        
        // Nose (black)
        squirrelGraphics.fillStyle(0x000000);
        squirrelGraphics.fillCircle(12, 9, 1);
        
        // Tail (bushy, reddish-brown)
        squirrelGraphics.fillStyle(0xA0522D);
        squirrelGraphics.fillCircle(18, 12, 5);
        squirrelGraphics.fillCircle(20, 8, 4);
        squirrelGraphics.fillCircle(22, 5, 3);
        
        // Paws
        squirrelGraphics.fillStyle(0x654321);
        squirrelGraphics.fillCircle(7, 18, 2);   // Front left
        squirrelGraphics.fillCircle(17, 18, 2);  // Front right
        squirrelGraphics.fillCircle(8, 20, 2);   // Back left
        squirrelGraphics.fillCircle(16, 20, 2);  // Back right
        
        squirrelGraphics.generateTexture('squirrel', 24, 24);
        squirrelGraphics.destroy();

        // Create realistic raccoon sprite
        const raccoonGraphics = this.add.graphics();
        
        // Body (gray)
        raccoonGraphics.fillStyle(0x696969);
        raccoonGraphics.fillCircle(16, 20, 10);
        
        // Head (lighter gray)
        raccoonGraphics.fillStyle(0x808080);
        raccoonGraphics.fillCircle(16, 10, 8);
        
        // Distinctive raccoon mask (black around eyes)
        raccoonGraphics.fillStyle(0x000000);
        raccoonGraphics.fillRect(8, 7, 16, 6);
        
        // Face area inside mask (light gray)
        raccoonGraphics.fillStyle(0xD3D3D3);
        raccoonGraphics.fillRect(10, 8, 12, 4);
        
        // Eyes (black with white highlights)
        raccoonGraphics.fillStyle(0x000000);
        raccoonGraphics.fillCircle(12, 9, 2);
        raccoonGraphics.fillCircle(20, 9, 2);
        raccoonGraphics.fillStyle(0xFFFFFF);
        raccoonGraphics.fillCircle(12, 8, 1);
        raccoonGraphics.fillCircle(20, 8, 1);
        
        // Nose (black)
        raccoonGraphics.fillStyle(0x000000);
        raccoonGraphics.fillCircle(16, 12, 1);
        
        // Ears (gray with pink inside)
        raccoonGraphics.fillStyle(0x696969);
        raccoonGraphics.fillCircle(10, 4, 3);
        raccoonGraphics.fillCircle(22, 4, 3);
        raccoonGraphics.fillStyle(0xFFB6C1);
        raccoonGraphics.fillCircle(10, 4, 1);
        raccoonGraphics.fillCircle(22, 4, 1);
        
        // Tail with rings (characteristic raccoon stripes)
        raccoonGraphics.fillStyle(0x696969);
        raccoonGraphics.fillCircle(28, 18, 4);
        raccoonGraphics.fillCircle(30, 14, 3);
        raccoonGraphics.fillCircle(31, 10, 2);
        
        // Dark rings on tail
        raccoonGraphics.fillStyle(0x2F2F2F);
        raccoonGraphics.fillRect(26, 16, 4, 2);
        raccoonGraphics.fillRect(28, 12, 3, 2);
        raccoonGraphics.fillRect(29, 8, 2, 2);
        
        // Paws (dark gray)
        raccoonGraphics.fillStyle(0x2F2F2F);
        raccoonGraphics.fillCircle(8, 26, 3);   // Front left
        raccoonGraphics.fillCircle(24, 26, 3);  // Front right
        raccoonGraphics.fillCircle(10, 28, 3);  // Back left
        raccoonGraphics.fillCircle(22, 28, 3);  // Back right
        
        raccoonGraphics.generateTexture('raccoon', 32, 32);
        raccoonGraphics.destroy();

        // Create realistic carrot sprite
        const carrotGraphics = this.add.graphics();
        
        // Carrot body (orange gradient effect)
        carrotGraphics.fillStyle(0xFF8C00);
        carrotGraphics.fillRect(6, 4, 4, 12);
        carrotGraphics.fillStyle(0xFF7F00);
        carrotGraphics.fillRect(5, 6, 6, 8);
        carrotGraphics.fillStyle(0xFFA500);
        carrotGraphics.fillRect(4, 8, 8, 4);
        
        // Carrot lines (texture)
        carrotGraphics.fillStyle(0xE6700A);
        carrotGraphics.fillRect(4, 9, 8, 1);
        carrotGraphics.fillRect(5, 11, 6, 1);
        carrotGraphics.fillRect(6, 13, 4, 1);
        
        // Carrot top (green leaves)
        carrotGraphics.fillStyle(0x228B22);
        carrotGraphics.fillRect(6, 0, 2, 6);
        carrotGraphics.fillRect(8, 1, 2, 5);
        carrotGraphics.fillRect(4, 2, 2, 4);
        carrotGraphics.fillStyle(0x32CD32);
        carrotGraphics.fillRect(5, 0, 1, 4);
        carrotGraphics.fillRect(7, 1, 1, 4);
        carrotGraphics.fillRect(9, 2, 1, 3);
        
        carrotGraphics.generateTexture('carrot', 16, 16);
        carrotGraphics.destroy();

        // Create realistic tomato sprite
        const tomatoGraphics = this.add.graphics();
        
        // Tomato body (red with shading)
        tomatoGraphics.fillStyle(0xFF6347);
        tomatoGraphics.fillCircle(8, 10, 6);
        tomatoGraphics.fillStyle(0xFF4500);
        tomatoGraphics.fillCircle(6, 8, 2);  // Shadow
        tomatoGraphics.fillStyle(0xFF7F7F);
        tomatoGraphics.fillCircle(10, 12, 2); // Highlight
        
        // Tomato segments (realistic lines)
        tomatoGraphics.fillStyle(0xDC143C);
        tomatoGraphics.fillRect(8, 4, 1, 12);
        tomatoGraphics.fillRect(5, 8, 6, 1);
        tomatoGraphics.fillRect(6, 6, 4, 1);
        tomatoGraphics.fillRect(6, 12, 4, 1);
        
        // Stem (green)
        tomatoGraphics.fillStyle(0x228B22);
        tomatoGraphics.fillRect(6, 2, 4, 3);
        tomatoGraphics.fillStyle(0x32CD32);
        tomatoGraphics.fillRect(5, 1, 2, 2);
        tomatoGraphics.fillRect(9, 1, 2, 2);
        tomatoGraphics.fillRect(7, 0, 2, 2);
        
        tomatoGraphics.generateTexture('tomato', 16, 16);
        tomatoGraphics.destroy();

        // Create realistic lettuce sprite
        const lettuceGraphics = this.add.graphics();
        
        // Lettuce base (light green)
        lettuceGraphics.fillStyle(0x90EE90);
        lettuceGraphics.fillCircle(8, 10, 6);
        
        // Lettuce leaves (layered for depth)
        lettuceGraphics.fillStyle(0x228B22);
        lettuceGraphics.fillCircle(6, 8, 4);
        lettuceGraphics.fillCircle(10, 8, 4);
        lettuceGraphics.fillCircle(8, 6, 3);
        lettuceGraphics.fillCircle(8, 12, 4);
        
        // Leaf veins (darker green)
        lettuceGraphics.fillStyle(0x006400);
        lettuceGraphics.fillRect(8, 4, 1, 8);
        lettuceGraphics.fillRect(5, 8, 6, 1);
        lettuceGraphics.fillRect(6, 6, 4, 1);
        lettuceGraphics.fillRect(6, 10, 4, 1);
        
        // Highlights (lighter green)
        lettuceGraphics.fillStyle(0x98FB98);
        lettuceGraphics.fillCircle(6, 7, 2);
        lettuceGraphics.fillCircle(10, 9, 2);
        lettuceGraphics.fillCircle(8, 11, 1);
        
        lettuceGraphics.generateTexture('lettuce', 16, 16);
        lettuceGraphics.destroy();

        // Create realistic water spray sprite
        const waterGraphics = this.add.graphics();
        
        // Main water droplet (blue with transparency effect)
        waterGraphics.fillStyle(0x00BFFF);
        waterGraphics.fillCircle(4, 4, 3);
        
        // Water highlights (lighter blue)
        waterGraphics.fillStyle(0x87CEEB);
        waterGraphics.fillCircle(3, 3, 1);
        waterGraphics.fillCircle(5, 5, 1);
        
        // Water shadow (darker blue)
        waterGraphics.fillStyle(0x4682B4);
        waterGraphics.fillCircle(5, 5, 1);
        
        waterGraphics.generateTexture('water', 8, 8);
        waterGraphics.destroy();

        // Create realistic water tap sprite (ON)
        const tapGraphics = this.add.graphics();
        
        // Tap base (metallic gray)
        tapGraphics.fillStyle(0x708090);
        tapGraphics.fillRect(4, 8, 16, 20);
        
        // Tap pipe (darker metal)
        tapGraphics.fillStyle(0x2F4F4F);
        tapGraphics.fillRect(8, 4, 8, 24);
        
        // Pipe opening
        tapGraphics.fillStyle(0x000000);
        tapGraphics.fillCircle(12, 28, 2);
        
        // Handle base (green when on) - larger with black outline
        tapGraphics.fillStyle(0x000000); // Black outline
        tapGraphics.fillCircle(12, 8, 7);
        tapGraphics.fillStyle(0x32CD32);
        tapGraphics.fillCircle(12, 8, 5);
        
        // Handle lever (horizontal when on - green, thicker and longer) - with black outline
        tapGraphics.fillStyle(0x000000); // Black outline
        tapGraphics.fillRect(2, 5, 20, 6);
        tapGraphics.fillCircle(2, 8, 3);
        tapGraphics.fillCircle(22, 8, 3);
        
        tapGraphics.fillStyle(0x228B22);
        tapGraphics.fillRect(3, 6, 18, 4);
        tapGraphics.fillCircle(3, 8, 2);
        tapGraphics.fillCircle(21, 8, 2);
        
        // Metallic highlights
        tapGraphics.fillStyle(0xC0C0C0);
        tapGraphics.fillRect(5, 9, 2, 18);
        tapGraphics.fillRect(9, 5, 2, 22);
        
        // Water drip (when on)
        tapGraphics.fillStyle(0x00BFFF);
        tapGraphics.fillCircle(12, 30, 1);
        
        tapGraphics.generateTexture('tap-on', 24, 32);
        tapGraphics.destroy();

        // Create realistic water tap sprite (OFF)
        const tapOffGraphics = this.add.graphics();
        
        // Tap base (metallic gray)
        tapOffGraphics.fillStyle(0x708090);
        tapOffGraphics.fillRect(4, 8, 16, 20);
        
        // Tap pipe (darker metal)
        tapOffGraphics.fillStyle(0x2F4F4F);
        tapOffGraphics.fillRect(8, 4, 8, 24);
        
        // Pipe opening
        tapOffGraphics.fillStyle(0x000000);
        tapOffGraphics.fillCircle(12, 28, 2);
        
        // Handle base (red when off) - larger with black outline
        tapOffGraphics.fillStyle(0x000000); // Black outline
        tapOffGraphics.fillCircle(12, 8, 7);
        tapOffGraphics.fillStyle(0xFF4500);
        tapOffGraphics.fillCircle(12, 8, 5);
        
        // Handle lever (vertical when off - red) - thicker with black outline
        tapOffGraphics.fillStyle(0x000000); // Black outline
        tapOffGraphics.fillRect(9, 0, 6, 16);
        tapOffGraphics.fillCircle(12, 0, 3);
        tapOffGraphics.fillCircle(12, 16, 3);
        
        tapOffGraphics.fillStyle(0xDC143C);
        tapOffGraphics.fillRect(10, 1, 4, 14);
        tapOffGraphics.fillCircle(12, 1, 2);
        tapOffGraphics.fillCircle(12, 15, 2);
        
        // Metallic highlights
        tapOffGraphics.fillStyle(0xC0C0C0);
        tapOffGraphics.fillRect(5, 9, 2, 18);
        tapOffGraphics.fillRect(9, 5, 2, 22);
        
        tapOffGraphics.generateTexture('tap-off', 24, 32);
        tapOffGraphics.destroy();
    }

    initAudio() {
        // Initialize Web Audio API context
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context created, state:', this.audioContext.state);
            
            // Create gain node for background music
            this.musicGainNode = this.audioContext.createGain();
            this.musicGainNode.connect(this.audioContext.destination);
            this.musicGainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            
            // Try to resume the context immediately
            if (this.audioContext.state === 'suspended') {
                console.log('Audio context suspended, will resume on user interaction');
            }
            
        } catch (e) {
            console.log('Web Audio API not supported:', e);
        }
    }

    startBackgroundMusic() {
        if (!this.audioContext || this.musicPlaying) return;
        
        this.musicPlaying = true;
        this.playMelodyLoop();
    }

    stopBackgroundMusic() {
        this.musicPlaying = false;
        
        // Stop the current music gain node to immediately silence music
        if (this.musicGainNode) {
            this.musicGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        }
    }

    toggleMusic() {
        if (this.musicPlaying) {
            this.stopBackgroundMusic();
            document.getElementById('music-toggle').textContent = '🔇 Music: OFF';
        } else {
            // Restore music volume and restart
            if (this.musicGainNode) {
                this.musicGainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            }
            this.startBackgroundMusic();
            document.getElementById('music-toggle').textContent = '🎵 Music: ON';
        }
    }

    playMelodyLoop() {
        if (!this.musicPlaying || !this.audioContext) return;
        
        // Simple melody progression in C major
        const melody = [
            { note: 523.25, duration: 0.5 }, // C5
            { note: 587.33, duration: 0.5 }, // D5
            { note: 659.25, duration: 0.5 }, // E5
            { note: 698.46, duration: 0.5 }, // F5
            { note: 783.99, duration: 1.0 }, // G5
            { note: 659.25, duration: 0.5 }, // E5
            { note: 523.25, duration: 1.0 }, // C5
            { note: 587.33, duration: 0.5 }, // D5
            { note: 659.25, duration: 1.5 }, // E5
        ];
        
        let currentTime = this.audioContext.currentTime;
        
        melody.forEach((noteData, index) => {
            this.playMusicNote(noteData.note, currentTime, noteData.duration);
            currentTime += noteData.duration;
        });
        
        // Schedule the next loop
        const totalDuration = melody.reduce((sum, note) => sum + note.duration, 0);
        setTimeout(() => {
            this.playMelodyLoop();
        }, totalDuration * 1000);
    }

    playMusicNote(frequency, startTime, duration) {
        if (!this.audioContext || !this.musicGainNode) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const noteGain = this.audioContext.createGain();
            
            oscillator.connect(noteGain);
            noteGain.connect(this.musicGainNode);
            
            oscillator.frequency.setValueAtTime(frequency, startTime);
            oscillator.type = 'sine';
            
            // Create a gentle envelope for each note
            noteGain.gain.setValueAtTime(0, startTime);
            noteGain.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
            noteGain.gain.linearRampToValueAtTime(0.08, startTime + duration - 0.1);
            noteGain.gain.linearRampToValueAtTime(0, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        } catch (error) {
            console.log('Error playing music note:', error);
        }
    }

    playSound(frequency, duration, type = 'sine', volume = 0.1) {
        if (!this.audioContext) {
            console.log('Audio context not available');
            return;
        }
        
        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                this.createAndPlaySound(frequency, duration, type, volume);
            });
        } else {
            this.createAndPlaySound(frequency, duration, type, volume);
        }
    }

    createAndPlaySound(frequency, duration, type, volume) {
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
            
            console.log(`Playing sound: ${frequency}Hz for ${duration}s`);
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    }

    playWaterSpraySound() {
        // Create a water spray sound effect
        this.playSound(800, 0.1, 'sawtooth', 0.15);
        setTimeout(() => this.playSound(600, 0.1, 'sawtooth', 0.1), 50);
        setTimeout(() => this.playSound(500, 0.1, 'sawtooth', 0.08), 100);
    }

    playSquirrelHitSound() {
        // Create a squirrel hit sound effect (high pitched squeak)
        this.playSound(1200, 0.2, 'square', 0.2);
        setTimeout(() => this.playSound(800, 0.1, 'square', 0.15), 100);
    }

    playVegetableGrabSound() {
        // Create a vegetable grab sound effect (low thump)
        this.playSound(150, 0.3, 'sine', 0.3);
        setTimeout(() => this.playSound(120, 0.2, 'sine', 0.2), 150);
    }

    playSquirrelEscapeSound() {
        // Create a sad sound for when squirrel escapes with vegetable
        this.playSound(400, 0.4, 'triangle', 0.2);
        setTimeout(() => this.playSound(300, 0.3, 'triangle', 0.15), 200);
        setTimeout(() => this.playSound(200, 0.4, 'triangle', 0.1), 400);
    }

    playRoundEndSound() {
        // Create a round completion sound
        this.playSound(523, 0.2, 'sine', 0.3); // C
        setTimeout(() => this.playSound(659, 0.2, 'sine', 0.3), 200); // E
        setTimeout(() => this.playSound(784, 0.4, 'sine', 0.3), 400); // G
    }

    playTapSound() {
        // Create a tap turn sound effect
        this.playSound(300, 0.2, 'square', 0.2);
        setTimeout(() => this.playSound(400, 0.1, 'square', 0.15), 100);
    }

    create() {
        // Initialize audio context for sound effects
        this.initAudio();

        // Don't start background music yet - wait for user interaction

        // Create tiled background
        for (let x = 0; x < 800; x += 32) {
            for (let y = 0; y < 600; y += 32) {
                this.add.image(x + 16, y + 16, 'grass');
            }
        }

        // Create garden border
        const border = this.add.graphics();
        border.lineStyle(4, 0x2d4a2b);
        border.strokeRect(20, 20, 760, 560);

        // Create groups for game objects
        this.vegetables = this.physics.add.group();
        this.squirrels = this.physics.add.group();
        this.raccoons = this.physics.add.group();
        this.waterSpray = this.physics.add.group();

        // Create gardener
        this.gardener = this.physics.add.sprite(400, 300, 'gardener');
        this.gardener.setCollideWorldBounds(true);
        this.gardenerAngle = 0; // Initialize facing right
        this.gardener.setData('animationTimer', 0); // For movement animation
        
        // Create gardener limbs for animation
        this.gardenerLeftArm = this.add.sprite(400, 300, 'gardener-arm');
        this.gardenerRightArm = this.add.sprite(400, 300, 'gardener-arm');
        this.gardenerLeftLeg = this.add.sprite(400, 300, 'gardener-leg');
        this.gardenerRightLeg = this.add.sprite(400, 300, 'gardener-leg');
        
        // Set limb depths - legs behind body, arms in front
        this.gardenerLeftLeg.setDepth(0);
        this.gardenerRightLeg.setDepth(0);
        this.gardener.setDepth(1); // Main body above legs
        this.gardenerLeftArm.setDepth(2);
        this.gardenerRightArm.setDepth(2);
        
        // Create spray direction indicator (small arrow that rotates)
        this.sprayIndicator = this.add.graphics();
        this.sprayIndicator.fillStyle(0xFF4444); // Bright red color
        this.sprayIndicator.fillTriangle(0, -6, 16, 0, 0, 6); // Arrow pointing right
        this.sprayIndicator.fillStyle(0xFFFFFF); // White outline
        this.sprayIndicator.lineStyle(1, 0xFF0000);
        this.sprayIndicator.strokeTriangle(0, -6, 16, 0, 0, 6);
        this.sprayIndicator.generateTexture('spray-arrow', 16, 12);
        this.sprayIndicator.destroy();
        
        // Add the spray indicator as a separate sprite
        this.sprayArrow = this.add.sprite(400, 300, 'spray-arrow');
        this.sprayArrow.setVisible(false); // Initially hidden
        this.sprayArrow.setDepth(10); // Ensure it appears above other sprites

        // Create water tap in a corner
        this.waterTap = this.physics.add.sprite(100, 100, 'tap-on');
        this.waterTap.setImmovable(true);
        this.waterTap.setData('isOn', true);

        // Set up input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Set up collisions
        this.physics.add.overlap(this.waterSpray, this.squirrels, this.hitSquirrel, null, this);
        this.physics.add.overlap(this.waterSpray, this.raccoons, this.hitRaccoon, null, this);
        this.physics.add.overlap(this.squirrels, this.vegetables, this.squirrelGrabVegetable, null, this);
        this.physics.add.overlap(this.raccoons, this.vegetables, this.raccoonGrabVegetable, null, this);
        this.physics.add.overlap(this.squirrels, this.waterTap, this.squirrelUseTap, null, this);
        this.physics.add.overlap(this.gardener, this.waterTap, this.gardenerUseTap, null, this);

        // Set up start game button
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        // Set up music toggle button
        document.getElementById('music-toggle').addEventListener('click', () => {
            this.toggleMusic();
        });

        // Set up quit game button
        document.getElementById('quit-game-btn').addEventListener('click', () => {
            this.quitGame();
        });

        // Update UI (but don't start the game yet)
        this.updateUI();
    }

    startGame() {
        if (this.gameStarted) return; // Prevent multiple starts
        
        this.gameStarted = true;
        
        // Ensure audio context is properly initialized and resumed (required for modern browsers)
        if (this.audioContext) {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('Audio context resumed');
                    // Start background music after audio context is ready
                    this.startBackgroundMusic();
                });
            } else {
                console.log('Audio context already running, starting music');
                this.startBackgroundMusic();
            }
            console.log('Audio context state:', this.audioContext.state);
        } else {
            // Re-initialize audio if it wasn't created properly
            this.initAudio();
            this.startBackgroundMusic();
        }
        
        // Hide start screen and show game UI
        document.body.classList.add('game-started');
        
        // Reset game state
        this.score = 0;
        this.round = 1;
        this.roundActive = true;
        this.gamePaused = false;
        
        // Set up timer
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
        
        // Start the first round
        this.startRound();
        
        // Play start game sound with a slight delay to ensure audio context is ready
        setTimeout(() => {
            this.playSound(523, 0.3, 'sine', 0.3); // C note
            setTimeout(() => this.playSound(659, 0.3, 'sine', 0.3), 150); // E note
            setTimeout(() => this.playSound(784, 0.5, 'sine', 0.3), 300); // G note
        }, 100);
    }

    startRound() {
        this.roundActive = true;
        this.timeLeft = 60;
        this.squirrelSpawnRate = Math.max(1000, 3000 - (this.round - 1) * 200);
        this.raccoonSpawnRate = Math.max(4000, 8000 - (this.round - 1) * 300);
        
        // Clear existing objects
        this.vegetables.clear(true, true);
        this.squirrels.clear(true, true);
        this.raccoons.clear(true, true);
        
        // Reset water tap
        this.waterEnabled = true;
        this.waterTap.setTexture('tap-on');
        this.waterTap.setData('isOn', true);
        
        // Create vegetables in center
        const vegetableTypes = ['carrot', 'tomato', 'lettuce'];
        const numVegetables = 5 + this.round;
        this.vegetablesLeft = numVegetables;
        
        for (let i = 0; i < numVegetables; i++) {
            const angle = (i / numVegetables) * Math.PI * 2;
            const radius = 80 + Math.random() * 40;
            const x = 400 + Math.cos(angle) * radius;
            const y = 300 + Math.sin(angle) * radius;
            
            const vegetableType = vegetableTypes[Math.floor(Math.random() * vegetableTypes.length)];
            const vegetable = this.physics.add.sprite(x, y, vegetableType);
            vegetable.setData('inPlay', true);
            this.vegetables.add(vegetable);
        }
        
        this.updateUI();
    }

    togglePause() {
        this.gamePaused = !this.gamePaused;
        
        if (this.gamePaused) {
            // Pause all physics
            this.physics.pause();
            
            // Pause background music
            if (this.musicPlaying && this.musicGainNode) {
                this.musicGainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            }
            
            // Play pause sound
            this.playSound(400, 0.2, 'sine', 0.2);
        } else {
            // Resume physics
            this.physics.resume();
            
            // Resume background music
            if (this.musicPlaying && this.musicGainNode) {
                this.musicGainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            }
            
            // Play resume sound
            this.playSound(600, 0.2, 'sine', 0.2);
        }
        
        this.updateUI();
    }

    update(time, delta) {
        // Don't update anything if game hasn't started
        if (!this.gameStarted) return;
        
        // Handle pause toggle
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
        }

        // Handle quit game
        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            this.quitGame();
            return; // Exit early since we've quit
        }

        // Always stop gardener movement and reset limbs when round is not active
        if (!this.roundActive || this.gamePaused) {
            this.gardener.setVelocity(0);
            
            // Reset limbs to rest position when round ends
            const bodyX = this.gardener.x;
            const bodyY = this.gardener.y;
            
            // Arms at rest position
            this.gardenerLeftArm.setPosition(bodyX - 6, bodyY + 2);
            this.gardenerRightArm.setPosition(bodyX + 6, bodyY + 2);
            this.gardenerLeftArm.setOrigin(0.5, 0.1);
            this.gardenerRightArm.setOrigin(0.5, 0.1);
            
            // Legs at rest position
            this.gardenerLeftLeg.setPosition(bodyX - 3, bodyY + 12);
            this.gardenerRightLeg.setPosition(bodyX + 3, bodyY + 12);
            this.gardenerLeftLeg.setOrigin(0.5, 0.1);
            this.gardenerRightLeg.setOrigin(0.5, 0.1);
            
            // Reset rotations to neutral
            this.gardenerLeftArm.setRotation(0);
            this.gardenerRightArm.setRotation(0);
            this.gardenerLeftLeg.setRotation(0);
            this.gardenerRightLeg.setRotation(0);
            
            // Make limbs visible
            this.gardenerLeftArm.setVisible(true);
            this.gardenerRightArm.setVisible(true);
            this.gardenerLeftLeg.setVisible(true);
            this.gardenerRightLeg.setVisible(true);
            
            // Reset animation timer
            this.gardener.setData('animationTimer', 0);
            
            return;
        }

        // Gardener movement (directional with arrow keys)
        this.gardener.setVelocity(0);
        let isMoving = false;
        
        // Check if player is currently spraying water
        const isSpraying = this.spaceKey.isDown;
        
        // Update spray indicator visibility and position
        this.sprayArrow.setPosition(this.gardener.x, this.gardener.y);
        this.sprayArrow.setVisible(isSpraying);
        
        if (isSpraying) {
            // When spraying, left/right arrows rotate spray direction
            if (this.cursors.left.isDown) {
                this.gardenerAngle -= 3; // degrees per frame
                this.sprayArrow.setRotation(Phaser.Math.DegToRad(this.gardenerAngle));
            } else if (this.cursors.right.isDown) {
                this.gardenerAngle += 3; // degrees per frame
                this.sprayArrow.setRotation(Phaser.Math.DegToRad(this.gardenerAngle));
            }
            
            // Up/down still move forward/backward when spraying
            if (this.cursors.up.isDown) {
                const velocityX = Math.cos(Phaser.Math.DegToRad(this.gardenerAngle)) * 150;
                const velocityY = Math.sin(Phaser.Math.DegToRad(this.gardenerAngle)) * 150;
                this.gardener.setVelocity(velocityX, velocityY);
                isMoving = true;
            } else if (this.cursors.down.isDown) {
                const velocityX = Math.cos(Phaser.Math.DegToRad(this.gardenerAngle)) * -120;
                const velocityY = Math.sin(Phaser.Math.DegToRad(this.gardenerAngle)) * -120;
                this.gardener.setVelocity(velocityX, velocityY);
                isMoving = true;
            }
        } else {
            // When not spraying, arrows move in their respective directions
            let velocityX = 0;
            let velocityY = 0;
            
            if (this.cursors.left.isDown) {
                velocityX = -200;
                this.gardenerAngle = 180; // Face left for spray direction
                isMoving = true;
            } else if (this.cursors.right.isDown) {
                velocityX = 200;
                this.gardenerAngle = 0; // Face right for spray direction
                isMoving = true;
            }
            
            if (this.cursors.up.isDown) {
                velocityY = -200;
                this.gardenerAngle = -90; // Face up for spray direction
                isMoving = true;
            } else if (this.cursors.down.isDown) {
                velocityY = 200;
                this.gardenerAngle = 90; // Face down for spray direction
                isMoving = true;
            }
            
            // Handle diagonal movement
            if ((this.cursors.left.isDown || this.cursors.right.isDown) && 
                (this.cursors.up.isDown || this.cursors.down.isDown)) {
                // Reduce velocity for diagonal movement to maintain consistent speed
                velocityX *= 0.707; // 1/√2
                velocityY *= 0.707;
                
                // Set angle for diagonal directions
                if (this.cursors.left.isDown && this.cursors.up.isDown) {
                    this.gardenerAngle = -135; // Up-left
                } else if (this.cursors.right.isDown && this.cursors.up.isDown) {
                    this.gardenerAngle = -45; // Up-right
                } else if (this.cursors.left.isDown && this.cursors.down.isDown) {
                    this.gardenerAngle = 135; // Down-left
                } else if (this.cursors.right.isDown && this.cursors.down.isDown) {
                    this.gardenerAngle = 45; // Down-right
                }
            }
            
            this.gardener.setVelocity(velocityX, velocityY);
            
            // Keep gardener sprite always upright (no rotation)
            this.gardener.setRotation(0);
        }

        // Animate gardener when moving
        if (isMoving) {
            // Arm and leg movement animation
            const animTimer = this.gardener.getData('animationTimer') + delta;
            this.gardener.setData('animationTimer', animTimer);
            
            // Calculate swing angles for walking animation
            const swingSpeed = 0.012; // Increased speed for more responsive animation
            const walkCycle = Math.sin(animTimer * swingSpeed);
            const armSwingAngle = walkCycle * 25; // Increased arm swing
            const legSwingAngle = walkCycle * 15; // More subtle leg swing
            
            // Position limbs relative to gardener body
            const bodyX = this.gardener.x;
            const bodyY = this.gardener.y;
            
            // Determine movement direction for animation adjustments
            const velocity = this.gardener.body.velocity;
            const isMovingHorizontally = Math.abs(velocity.x) > Math.abs(velocity.y);
            const movingRight = velocity.x > 0;
            const movingUp = velocity.y < 0;
            
            // Arms - positioned at shoulder level with natural swing
            const armYOffset = 2; // Shoulder height
            this.gardenerLeftArm.setPosition(bodyX - 6, bodyY + armYOffset);
            this.gardenerRightArm.setPosition(bodyX + 6, bodyY + armYOffset);
            
            // Set arm rotation origins to shoulder position
            this.gardenerLeftArm.setOrigin(0.5, 0.1); // Rotate from top of arm (shoulder)
            this.gardenerRightArm.setOrigin(0.5, 0.1);
            
            // Arms swing opposite to legs for natural walking
            this.gardenerLeftArm.setRotation(Phaser.Math.DegToRad(-armSwingAngle));
            this.gardenerRightArm.setRotation(Phaser.Math.DegToRad(armSwingAngle));
            
            // Legs - positioned at hip level with walking motion
            const legYOffset = 12; // Hip height
            this.gardenerLeftLeg.setPosition(bodyX - 3, bodyY + legYOffset);
            this.gardenerRightLeg.setPosition(bodyX + 3, bodyY + legYOffset);
            
            // Set leg rotation origins to hip position
            this.gardenerLeftLeg.setOrigin(0.5, 0.1); // Rotate from top of leg (hip)
            this.gardenerRightLeg.setOrigin(0.5, 0.1);
            
            // Legs swing opposite to arms
            this.gardenerLeftLeg.setRotation(Phaser.Math.DegToRad(legSwingAngle));
            this.gardenerRightLeg.setRotation(Phaser.Math.DegToRad(-legSwingAngle));
            
            // Add direction-specific adjustments
            if (isMovingHorizontally) {
                // When moving horizontally, arms swing more forward/back
                const directionMultiplier = movingRight ? 1 : -1;
                this.gardenerLeftArm.setRotation(Phaser.Math.DegToRad(-armSwingAngle * directionMultiplier));
                this.gardenerRightArm.setRotation(Phaser.Math.DegToRad(armSwingAngle * directionMultiplier));
            }
            
            // Make limbs visible
            this.gardenerLeftArm.setVisible(true);
            this.gardenerRightArm.setVisible(true);
            this.gardenerLeftLeg.setVisible(true);
            this.gardenerRightLeg.setVisible(true);
        } else {
            // Reset animation when not moving
            this.gardener.setData('animationTimer', 0);
            
            // Position limbs at rest
            const bodyX = this.gardener.x;
            const bodyY = this.gardener.y;
            
            // Arms at rest position
            this.gardenerLeftArm.setPosition(bodyX - 6, bodyY + 2);
            this.gardenerRightArm.setPosition(bodyX + 6, bodyY + 2);
            this.gardenerLeftArm.setOrigin(0.5, 0.1);
            this.gardenerRightArm.setOrigin(0.5, 0.1);
            
            // Legs at rest position
            this.gardenerLeftLeg.setPosition(bodyX - 3, bodyY + 12);
            this.gardenerRightLeg.setPosition(bodyX + 3, bodyY + 12);
            this.gardenerLeftLeg.setOrigin(0.5, 0.1);
            this.gardenerRightLeg.setOrigin(0.5, 0.1);
            
            // Reset rotations to neutral
            this.gardenerLeftArm.setRotation(0);
            this.gardenerRightArm.setRotation(0);
            this.gardenerLeftLeg.setRotation(0);
            this.gardenerRightLeg.setRotation(0);
            
            // Make limbs visible
            this.gardenerLeftArm.setVisible(true);
            this.gardenerRightArm.setVisible(true);
            this.gardenerLeftLeg.setVisible(true);
            this.gardenerRightLeg.setVisible(true);
        }

        // Water spray
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            // First check if we're trying to turn on the tap
            const tapInteractionHandled = this.checkGardenerTapInteraction();
            
            if (!tapInteractionHandled) {
                // If tap interaction wasn't handled, try to spray water
                if (this.waterEnabled) {
                    this.sprayWater();
                } else {
                    // Play a "no water" sound or visual indicator
                    this.playSound(200, 0.3, 'square', 0.1);
                }
            }
        }
        
        // Continuous water spray while holding spacebar
        if (this.spaceKey.isDown && this.waterEnabled) {
            // Add a small delay between spray bursts for performance
            if (!this.lastSprayTime || time - this.lastSprayTime > 150) {
                this.sprayWater();
                this.lastSprayTime = time;
            }
        }

        // Spawn squirrels
        if (time - this.lastSquirrelSpawn > this.squirrelSpawnRate) {
            this.spawnSquirrel();
            this.lastSquirrelSpawn = time;
        }

        // Spawn raccoons (less frequently)
        if (time - this.lastRaccoonSpawn > this.raccoonSpawnRate) {
            this.spawnRaccoon();
            this.lastRaccoonSpawn = time;
        }

        // Update squirrels
        this.squirrels.children.entries.forEach(squirrel => {
            this.updateSquirrel(squirrel);
        });

        // Update raccoons
        this.raccoons.children.entries.forEach(raccoon => {
            this.updateRaccoon(raccoon);
        });

        // Check win/lose conditions
        if (this.vegetablesLeft <= 0 || this.timeLeft <= 0) {
            this.endRound();
        }
    }

    sprayWater() {
        // Create a stream of water droplets that project outward
        const streamLength = 8; // Number of water droplets in the stream
        const dropletSpacing = 20; // Distance between droplets along the stream
        const baseDistance = 40; // Starting distance from gardener
        
        for (let i = 0; i < streamLength; i++) {
            // Calculate the position along the stream for this droplet
            const distanceFromGardener = baseDistance + (i * dropletSpacing);
            const sprayX = this.gardener.x + Math.cos(Phaser.Math.DegToRad(this.gardenerAngle)) * distanceFromGardener;
            const sprayY = this.gardener.y + Math.sin(Phaser.Math.DegToRad(this.gardenerAngle)) * distanceFromGardener;
            
            // Delay each droplet to create the stream effect
            this.time.delayedCall(i * 30, () => {
                // Create water droplet at the calculated position
                const water = this.physics.add.sprite(sprayX, sprayY, 'water');
                
                // Set velocity to continue moving in the same direction
                const velocityX = Math.cos(Phaser.Math.DegToRad(this.gardenerAngle)) * 350;
                const velocityY = Math.sin(Phaser.Math.DegToRad(this.gardenerAngle)) * 350;
                water.setVelocity(velocityX, velocityY);
                
                this.waterSpray.add(water);

                // Remove water after traveling further
                this.time.delayedCall(600, () => {
                    if (water.active) {
                        water.destroy();
                    }
                });
            });
        }
        
        // Play water spray sound effect
        this.playWaterSpraySound();
    }

    spawnSquirrel() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch (side) {
            case 0: // top
                x = Math.random() * 800;
                y = -24;
                break;
            case 1: // right
                x = 824;
                y = Math.random() * 600;
                break;
            case 2: // bottom
                x = Math.random() * 800;
                y = 624;
                break;
            case 3: // left
                x = -24;
                y = Math.random() * 600;
                break;
        }

        const squirrel = this.physics.add.sprite(x, y, 'squirrel');
        squirrel.setData('hasVegetable', false);
        squirrel.setData('targetVegetable', null);
        squirrel.setData('state', 'seeking'); // seeking, carrying, fleeing, goingToTap
        squirrel.setData('tapCooldown', 0); // Prevent immediate tap usage
        squirrel.setData('animationTimer', 0); // For movement animation
        this.squirrels.add(squirrel);
    }

    spawnRaccoon() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch (side) {
            case 0: // top
                x = Math.random() * 800;
                y = -32;
                break;
            case 1: // right
                x = 832;
                y = Math.random() * 600;
                break;
            case 2: // bottom
                x = Math.random() * 800;
                y = 632;
                break;
            case 3: // left
                x = -32;
                y = Math.random() * 600;
                break;
        }

        const raccoon = this.physics.add.sprite(x, y, 'raccoon');
        raccoon.setData('vegetablesCarried', 0); // Can carry up to 2
        raccoon.setData('carriedVegetables', []); // Array of vegetable objects
        raccoon.setData('targetVegetable', null);
        raccoon.setData('state', 'seeking'); // seeking, carrying, fleeing
        raccoon.setData('animationTimer', 0); // For movement animation
        this.raccoons.add(raccoon);
    }

    updateSquirrel(squirrel) {
        const state = squirrel.getData('state');
        let isMoving = false;
        
        // Decrease tap cooldown
        const tapCooldown = squirrel.getData('tapCooldown');
        if (tapCooldown > 0) {
            squirrel.setData('tapCooldown', tapCooldown - 1);
        }
        
        // Random chance for squirrel to go to tap if it's on and not in cooldown
        if (state === 'seeking' && this.waterEnabled && tapCooldown <= 0 && Math.random() < 0.002) {
            squirrel.setData('state', 'goingToTap');
            squirrel.setData('tapCooldown', 300); // 5 second cooldown
        }
        
        if (state === 'seeking') {
            // Find nearest vegetable
            let nearestVegetable = null;
            let nearestDistance = Infinity;
            
            this.vegetables.children.entries.forEach(vegetable => {
                if (vegetable.getData('inPlay')) {
                    const distance = Phaser.Math.Distance.Between(
                        squirrel.x, squirrel.y, vegetable.x, vegetable.y
                    );
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestVegetable = vegetable;
                    }
                }
            });

            if (nearestVegetable) {
                squirrel.setData('targetVegetable', nearestVegetable);
                this.physics.moveToObject(squirrel, nearestVegetable, 100);
                isMoving = true;
            }
        } else if (state === 'goingToTap') {
            // Move towards water tap
            this.physics.moveToObject(squirrel, this.waterTap, 120);
            isMoving = true;
            
            // Check if close enough to tap
            const distance = Phaser.Math.Distance.Between(
                squirrel.x, squirrel.y, this.waterTap.x, this.waterTap.y
            );
            
            if (distance < 30) {
                if (this.waterTap.getData('isOn')) {
                    // Turn off the tap
                    this.waterEnabled = false;
                    this.waterTap.setTexture('tap-off');
                    this.waterTap.setData('isOn', false);
                    
                    // Squirrel runs away after turning off tap
                    squirrel.setData('state', 'fleeing');
                    squirrel.setData('targetVegetable', null);
                    
                    // Play tap sound
                    this.playTapSound();
                } else {
                    // Tap is already off, so squirrel gives up and goes back to seeking vegetables
                    squirrel.setData('state', 'seeking');
                    squirrel.setData('targetVegetable', null);
                }
            }
            
            // Also check if tap was turned off while squirrel was approaching
            if (!this.waterEnabled || !this.waterTap.getData('isOn')) {
                // Water is no longer available, give up and go back to seeking
                squirrel.setData('state', 'seeking');
                squirrel.setData('targetVegetable', null);
            }
        } else if (state === 'carrying') {
            // Move towards nearest edge
            const centerX = 400, centerY = 300;
            const dirX = squirrel.x - centerX;
            const dirY = squirrel.y - centerY;
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            
            if (length > 0) {
                squirrel.setVelocity((dirX / length) * 80, (dirY / length) * 80);
                isMoving = true;
            }

            // Move vegetable with squirrel (with small offset so it's visible)
            const vegetable = squirrel.getData('targetVegetable');
            if (vegetable && vegetable.active) {
                vegetable.x = squirrel.x + 8; // Small offset to the right
                vegetable.y = squirrel.y - 8; // Small offset upward
            }

            // Check if squirrel reached edge
            if (squirrel.x < 0 || squirrel.x > 800 || squirrel.y < 0 || squirrel.y > 600) {
                this.squirrelEscape(squirrel);
            }
        } else if (state === 'fleeing') {
            // Run away from center
            const centerX = 400, centerY = 300;
            const dirX = squirrel.x - centerX;
            const dirY = squirrel.y - centerY;
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            
            if (length > 0) {
                squirrel.setVelocity((dirX / length) * 150, (dirY / length) * 150);
                isMoving = true;
            }

            // Remove when off screen
            if (squirrel.x < -50 || squirrel.x > 850 || squirrel.y < -50 || squirrel.y > 650) {
                squirrel.destroy();
            }
        }
        
        // Animate squirrel when moving
        if (isMoving) {
            const animTimer = squirrel.getData('animationTimer') + 16; // Assume ~60fps
            squirrel.setData('animationTimer', animTimer);
            const bobOffset = Math.sin(animTimer * 0.015) * 1.5; // Faster, smaller movement for squirrels
            squirrel.setDisplayOrigin(squirrel.width / 2, squirrel.height / 2 - bobOffset);
        } else {
            // Reset animation when not moving
            squirrel.setData('animationTimer', 0);
            squirrel.setDisplayOrigin(squirrel.width / 2, squirrel.height / 2);
        }
    }

    updateRaccoon(raccoon) {
        const state = raccoon.getData('state');
        const carriedVegetables = raccoon.getData('carriedVegetables');
        let isMoving = false;
        
        if (state === 'seeking') {
            // Move any currently carried vegetables with raccoon while seeking more
            carriedVegetables.forEach((vegetable, index) => {
                if (vegetable && vegetable.active) {
                    const offsetX = index === 0 ? -8 : 8;
                    vegetable.x = raccoon.x + offsetX;
                    vegetable.y = raccoon.y;
                }
            });
            
            // If raccoon has space for more vegetables (less than 2), continue seeking
            if (carriedVegetables.length < 2) {
                let nearestVegetable = null;
                let nearestDistance = Infinity;
                
                this.vegetables.children.entries.forEach(vegetable => {
                    if (vegetable.getData('inPlay')) {
                        const distance = Phaser.Math.Distance.Between(
                            raccoon.x, raccoon.y, vegetable.x, vegetable.y
                        );
                        if (distance < nearestDistance) {
                            nearestDistance = distance;
                            nearestVegetable = vegetable;
                        }
                    }
                });

                if (nearestVegetable) {
                    raccoon.setData('targetVegetable', nearestVegetable);
                    this.physics.moveToObject(raccoon, nearestVegetable, 80);
                    isMoving = true;
                } else if (carriedVegetables.length > 0) {
                    // No more vegetables to find, but we have some - start carrying them away
                    raccoon.setData('state', 'carrying');
                    raccoon.setData('targetVegetable', null);
                }
            } else {
                // If raccoon has 2 vegetables, start carrying them away
                raccoon.setData('state', 'carrying');
                raccoon.setData('targetVegetable', null);
            }
            
            // Check if raccoon reached edge while seeking (carrying vegetables)
            if (carriedVegetables.length > 0 && 
                (raccoon.x < 0 || raccoon.x > 800 || raccoon.y < 0 || raccoon.y > 600)) {
                this.raccoonEscape(raccoon);
            }
        } else if (state === 'carrying') {
            // Move towards nearest edge
            const centerX = 400, centerY = 300;
            const dirX = raccoon.x - centerX;
            const dirY = raccoon.y - centerY;
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            
            if (length > 0) {
                raccoon.setVelocity((dirX / length) * 80, (dirY / length) * 80);
                isMoving = true;
            }

            // Move vegetables with raccoon
            carriedVegetables.forEach((vegetable, index) => {
                if (vegetable && vegetable.active) {
                    // Offset vegetables slightly so they're visible
                    const offsetX = index === 0 ? -8 : 8;
                    vegetable.x = raccoon.x + offsetX;
                    vegetable.y = raccoon.y;
                }
            });

            // Check if raccoon reached edge
            if (raccoon.x < 0 || raccoon.x > 800 || raccoon.y < 0 || raccoon.y > 600) {
                this.raccoonEscape(raccoon);
            }
        } else if (state === 'fleeing') {
            // Run away from center
            const centerX = 400, centerY = 300;
            const dirX = raccoon.x - centerX;
            const dirY = raccoon.y - centerY;
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            
            if (length > 0) {
                raccoon.setVelocity((dirX / length) * 150, (dirY / length) * 150);
                isMoving = true;
            }

            // Remove when off screen
            if (raccoon.x < -50 || raccoon.x > 850 || raccoon.y < -50 || raccoon.y > 650) {
                this.raccoonEscape(raccoon);
            }
        }
        
        // Animate raccoon when moving
        if (isMoving) {
            const animTimer = raccoon.getData('animationTimer') + 16; // Assume ~60fps
            raccoon.setData('animationTimer', animTimer);
            const bobOffset = Math.sin(animTimer * 0.012) * 1.8; // Slower, slightly larger movement for raccoons
            raccoon.setDisplayOrigin(raccoon.width / 2, raccoon.height / 2 - bobOffset);
        } else {
            // Reset animation when not moving
            raccoon.setData('animationTimer', 0);
            raccoon.setDisplayOrigin(raccoon.width / 2, raccoon.height / 2);
        }
    }

    squirrelUseTap(squirrel, tap) {
        // Only turn off tap if it's currently on and squirrel is in the right state
        if (squirrel.getData('state') === 'goingToTap' && tap.getData('isOn')) {
            this.waterEnabled = false;
            tap.setTexture('tap-off');
            tap.setData('isOn', false);
            
            // Squirrel runs away after turning off tap
            squirrel.setData('state', 'fleeing');
            squirrel.setData('targetVegetable', null);
            
            // Play tap sound
            this.playTapSound();
        }
    }

    gardenerUseTap(gardener, tap) {
        // Only allow turning on tap if it's off and player presses spacebar
        if (!tap.getData('isOn') && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.waterEnabled = true;
            tap.setTexture('tap-on');
            tap.setData('isOn', true);
            
            // Play tap sound
            this.playTapSound();
        }
    }

    checkGardenerTapInteraction() {
        // Check if gardener is close enough to tap
        const distance = Phaser.Math.Distance.Between(
            this.gardener.x, this.gardener.y, this.waterTap.x, this.waterTap.y
        );
        
        // If close to tap and tap is off and spacebar pressed
        if (distance < 40 && !this.waterTap.getData('isOn') && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.waterEnabled = true;
            this.waterTap.setTexture('tap-on');
            this.waterTap.setData('isOn', true);
            
            // Play tap sound
            this.playTapSound();
            return true; // Consumed the spacebar press
        }
        return false; // Didn't consume spacebar
    }

    squirrelGrabVegetable(squirrel, vegetable) {
        if (squirrel.getData('state') === 'seeking' && vegetable.getData('inPlay')) {
            squirrel.setData('state', 'carrying');
            squirrel.setData('hasVegetable', true);
            squirrel.setData('targetVegetable', vegetable);
            vegetable.setData('inPlay', false);
            
            // Play vegetable grab sound
            this.playVegetableGrabSound();
        }
    }

    raccoonGrabVegetable(raccoon, vegetable) {
        if (raccoon.getData('state') === 'seeking' && vegetable.getData('inPlay')) {
            const carriedVegetables = raccoon.getData('carriedVegetables');
            
            // Can only carry 2 vegetables
            if (carriedVegetables.length < 2) {
                vegetable.setData('inPlay', false);
                
                // Add vegetable to raccoon's carried vegetables
                carriedVegetables.push(vegetable);
                raccoon.setData('carriedVegetables', carriedVegetables);
                raccoon.setData('vegetablesCarried', carriedVegetables.length);
                
                // Only change to carrying state when raccoon has 2 vegetables
                if (carriedVegetables.length >= 2) {
                    raccoon.setData('state', 'carrying');
                    raccoon.setData('targetVegetable', null);
                }
                // If raccoon only has 1 vegetable, keep seeking for another one
                
                // Play vegetable grab sound
                this.playVegetableGrabSound();
            }
        }
    }

    hitSquirrel(water, squirrel) {
        water.destroy();
        
        // Drop vegetable if carrying one
        const vegetable = squirrel.getData('targetVegetable');
        if (vegetable && vegetable.active) {
            vegetable.setData('inPlay', true);
        }
        
        squirrel.setData('state', 'fleeing');
        squirrel.setData('hasVegetable', false);
        squirrel.setData('targetVegetable', null);

        // Play squirrel hit sound effect
        this.playSquirrelHitSound();
    }

    hitRaccoon(water, raccoon) {
        water.destroy();
        
        // Drop all vegetables if carrying
        const carriedVegetables = raccoon.getData('carriedVegetables');
        carriedVegetables.forEach(vegetable => {
            if (vegetable && vegetable.active) {
                vegetable.setData('inPlay', true);
            }
        });
        
        raccoon.setData('state', 'fleeing');
        raccoon.setData('targetVegetable', null);
        raccoon.setData('carriedVegetables', []);
        raccoon.setData('vegetablesCarried', 0);

        // Play raccoon hit sound effect
        this.playSquirrelHitSound();
    }

    squirrelEscape(squirrel) {
        const vegetable = squirrel.getData('targetVegetable');
        if (vegetable && vegetable.active) {
            vegetable.destroy();
            this.vegetablesLeft--;
            this.updateUI();
            
            // Play sad sound when squirrel escapes with vegetable
            this.playSquirrelEscapeSound();
        }
        squirrel.destroy();
    }

    raccoonEscape(raccoon) {
        const carriedVegetables = raccoon.getData('carriedVegetables');
        const vegetablesCarried = raccoon.getData('vegetablesCarried');
        
        // Destroy all carried vegetables and decrease count
        carriedVegetables.forEach(vegetable => {
            if (vegetable && vegetable.active) {
                vegetable.destroy();
                this.vegetablesLeft--;
            }
        });
        
        if (vegetablesCarried > 0) {
            this.updateUI();
            // Play sad sound when raccoon escapes with vegetables
            this.playSquirrelEscapeSound();
        }
        
        raccoon.destroy();
    }

    quitGame() {
        if (!this.gameStarted) return; // Can't quit if game hasn't started
        
        // Reset game state
        this.gameStarted = false;
        this.roundActive = false;
        this.gamePaused = false;
        this.score = 0;
        this.round = 1;
        this.timeLeft = 60;
        this.vegetablesLeft = 0; // Reset vegetables count
        
        // Stop the game timer
        if (this.gameTimer) {
            this.gameTimer.destroy();
            this.gameTimer = null;
        }
        
        // Clear all game objects
        this.vegetables.clear(true, true);
        this.squirrels.clear(true, true);
        this.raccoons.clear(true, true);
        this.waterSpray.clear(true, true);
        
        // Reset gardener position and animation
        this.gardener.setPosition(400, 300);
        this.gardener.setVelocity(0, 0);
        this.gardenerAngle = 0;
        this.gardener.setRotation(0);
        this.gardener.setData('animationTimer', 0); // Reset animation timer
        
        // Reset gardener limbs to default rest position
        this.gardenerLeftArm.setPosition(400 - 6, 300 + 2);
        this.gardenerRightArm.setPosition(400 + 6, 300 + 2);
        this.gardenerLeftLeg.setPosition(400 - 3, 300 + 12);
        this.gardenerRightLeg.setPosition(400 + 3, 300 + 12);
        this.gardenerLeftArm.setOrigin(0.5, 0.1);
        this.gardenerRightArm.setOrigin(0.5, 0.1);
        this.gardenerLeftLeg.setOrigin(0.5, 0.1);
        this.gardenerRightLeg.setOrigin(0.5, 0.1);
        this.gardenerLeftArm.setRotation(0);
        this.gardenerRightArm.setRotation(0);
        this.gardenerLeftLeg.setRotation(0);
        this.gardenerRightLeg.setRotation(0);
        this.gardenerLeftArm.setVisible(true);
        this.gardenerRightArm.setVisible(true);
        this.gardenerLeftLeg.setVisible(true);
        this.gardenerRightLeg.setVisible(true);
        
        // Reset spray arrow
        this.sprayArrow.setPosition(400, 300);
        this.sprayArrow.setRotation(0);
        this.sprayArrow.setVisible(false);
        
        // Reset water tap
        this.waterEnabled = true;
        this.waterTap.setTexture('tap-on');
        this.waterTap.setData('isOn', true);
        
        // Stop background music
        this.stopBackgroundMusic();
        
        // Reset music toggle button text
        document.getElementById('music-toggle').textContent = '🎵 Music: ON';
        
        // Resume physics if paused
        if (this.physics.world.isPaused) {
            this.physics.resume();
        }
        
        // Show start screen and hide game UI
        document.body.classList.remove('game-started');
        
        // Reset UI
        this.updateUI();
        
        // Play quit sound
        this.playSound(400, 0.2, 'triangle', 0.2);
        setTimeout(() => this.playSound(300, 0.2, 'triangle', 0.15), 100);
        setTimeout(() => this.playSound(200, 0.3, 'triangle', 0.1), 200);
    }

    updateTimer() {
        if (this.gameStarted && this.roundActive && !this.gamePaused) {
            this.timeLeft--;
            this.updateUI();
        }
    }

    endRound() {
        this.roundActive = false;
        
        // Count remaining vegetables and add to score
        // Use the maintained vegetablesLeft count for accuracy
        this.score += this.vegetablesLeft;
        
        // Determine why the round ended
        const roundEndedByTime = this.timeLeft <= 0;
        const roundEndedByVegetables = this.vegetablesLeft <= 0;
        
        console.log(`Round ${this.round} ended:`, 
            roundEndedByTime ? 'Time expired' : 'All vegetables saved/taken', 
            `Score gained: ${this.vegetablesLeft}`);
        
        this.round++;
        
        // Play round end sound
        this.playRoundEndSound();
        
        // Show round summary and start next round
        this.time.delayedCall(2000, () => {
            this.startRound();
        });
        
        this.updateUI();
    }

    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('round').textContent = `Round: ${this.round}`;
        document.getElementById('timer').textContent = `Time: ${this.timeLeft}`;
        
        // Use the maintained vegetablesLeft property instead of recalculating
        document.getElementById('vegetables-left').textContent = `Vegetables: ${this.vegetablesLeft}`;
        
        // Update pause status
        const pauseStatus = document.getElementById('pause-status');
        if (this.gamePaused) {
            pauseStatus.textContent = '⏸️ PAUSED - Press P to Resume';
            pauseStatus.classList.add('visible');
        } else {
            pauseStatus.classList.remove('visible');
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: GameScene
};

new Phaser.Game(config);
