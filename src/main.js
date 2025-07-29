import './style.css';
import Phaser from 'phaser';
// Using real Firebase - switched from mock implementation
import { FirebaseManager } from './firebase.js';

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
        this.timeLeft = 20;
        this.vegetablesLeft = 0;
        this.squirrelSpawnRate = 3000; // milliseconds
        this.raccoonSpawnRate = 8000; // Less frequent than squirrels
        this.lastSquirrelSpawn = 0;
        this.lastRaccoonSpawn = 0;
        this.gameTimer = null;
        this.lastTimerUpdate = 0; // For manual timer handling
        this.roundActive = false; // Start as false until game is started
        this.gamePaused = false;
        this.gameStarted = false; // New property to track if game has been started
        this.roundEnding = false; // Flag to prevent multiple simultaneous round ends
        this.roundStarting = false; // Flag to prevent multiple simultaneous round starts
        this.vegetablesDropped = false; // Flag to prevent multiple vegetable drops per round
        this.gardenerAngle = 0; // Track gardener's rotation angle in radians for perfect precision
        this.audioContext = null; // For sound effects
        this.musicGainNode = null; // For background music
        this.musicPlaying = false;
        this.soundsEnabled = true; // Track if sound effects are enabled
        this.waterTapBody = null; // Water tap body object
        this.waterTapHandle = null; // Water tap handle object
        this.waterEnabled = true; // Whether water spray is available
        this.lastSprayTime = 0; // Track timing for continuous spray
        this.lastSprayAngle = null; // Track last spray angle for adaptive timing
        
        // Movement tracking variables to preserve spray rotation
        this.wasMovingLeft = false;
        this.wasMovingRight = false;
        this.wasMovingUp = false;
        this.wasMovingDown = false;
        
        // Mobile controls - now joystick based
        this.mobileControls = {
            up: false,
            down: false,
            left: false,
            right: false,
            spray: false,
            sprayJustPressed: false  // Track if spray was just pressed this frame
        };
        
        // Virtual joystick properties
        this.joystick = {
            isDragging: false,
            knob: null,
            base: null,
            centerX: 0,
            centerY: 0,
            maxDistance: 35, // Maximum distance from center
            deadZone: 0.2,   // Minimum threshold for movement
            currentX: 0,
            currentY: 0,
            normalizedX: 0,  // -1 to 1
            normalizedY: 0   // -1 to 1
        };
        this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 900;
        this.isAndroid = /Android/i.test(navigator.userAgent);
        this.isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        this.isLandscape = window.innerWidth > window.innerHeight;
        this.isPortrait = window.innerHeight > window.innerWidth;
        this.waterTapBody = null; // Water tap body object
        this.waterTapHandle = null; // Water tap handle object
        this.waterEnabled = true; // Whether water spray is available
        this.lastSprayTime = 0; // Track timing for continuous spray
        this.lastSprayAngle = null; // Track last spray angle for adaptive timing
        
        // Firebase integration
        this.firebaseManager = null; // Will be initialized in create()
        this.autoSaveEnabled = true; // Auto-save game state
        this.topScores = []; // Cache for top 3 scores
        this.lastSaveTime = 0; // Track when we last saved
    }

    preload() {
        // Create colored rectangles as sprites for our game objects
        // Check if texture already exists to prevent duplicate loading
        if (!this.textures.exists('grass')) {
            this.load.image('grass', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
        }
        
        // Create simple colored shapes for our game objects
        this.createSprites();
    }

    createSprites() {
        // Only create textures if they don't already exist
        if (!this.textures.exists('grass')) {
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
        }

        if (!this.textures.exists('gardener')) {
            // Create realistic gardener sprite (body only, arms and legs separate) - 50% larger
            const gardenerGraphics = this.add.graphics();
            
            // Body (brown shirt)
            gardenerGraphics.fillStyle(0x8B4513);
            gardenerGraphics.fillRect(15, 18, 18, 24); // Scaled by 1.5: 10*1.5=15, 12*1.5=18, 12*1.5=18, 16*1.5=24
            
            // Head (skin tone)
            gardenerGraphics.fillStyle(0xFFDBAE);
            gardenerGraphics.fillCircle(24, 12, 9); // Scaled by 1.5: 16*1.5=24, 8*1.5=12, 6*1.5=9
            
            // Hat (yellow)
            gardenerGraphics.fillStyle(0xFFD700);
            gardenerGraphics.fillRect(16.5, 3, 15, 6); // Scaled by 1.5: 11*1.5=16.5, 2*1.5=3, 10*1.5=15, 4*1.5=6
            gardenerGraphics.fillCircle(24, 6, 7.5); // Scaled by 1.5: 16*1.5=24, 4*1.5=6, 5*1.5=7.5
            
            // Hair (brown showing under hat)
            gardenerGraphics.fillStyle(0x654321);
            gardenerGraphics.fillRect(18, 9, 12, 3); // Scaled by 1.5: 12*1.5=18, 6*1.5=9, 8*1.5=12, 2*1.5=3
            
            // Eyes
            gardenerGraphics.fillStyle(0x000000);
            gardenerGraphics.fillCircle(21, 10.5, 1.5); // Scaled by 1.5: 14*1.5=21, 7*1.5=10.5, 1*1.5=1.5
            gardenerGraphics.fillCircle(27, 10.5, 1.5); // Scaled by 1.5: 18*1.5=27, 7*1.5=10.5, 1*1.5=1.5
            
            // Nose
            gardenerGraphics.fillStyle(0xFFB86C);
            gardenerGraphics.fillCircle(24, 13.5, 1.5); // Scaled by 1.5: 16*1.5=24, 9*1.5=13.5, 1*1.5=1.5
            
            // Hose (blue, indicating direction)
            gardenerGraphics.fillStyle(0x1E90FF);
            gardenerGraphics.fillRect(36, 24, 9, 3); // Scaled by 1.5: 24*1.5=36, 16*1.5=24, 6*1.5=9, 2*1.5=3
            gardenerGraphics.fillCircle(45, 25.5, 3); // Scaled by 1.5: 30*1.5=45, 17*1.5=25.5, 2*1.5=3
            
            gardenerGraphics.generateTexture('gardener', 48, 42); // Increased by 50%: 32*1.5=48, 28*1.5=42
            gardenerGraphics.destroy();
        }

        if (!this.textures.exists('gardener-arm')) {
            // Create gardener arm sprite (for animation) - 50% larger
            const armGraphics = this.add.graphics();
            
            // Arm (skin tone)
            armGraphics.fillStyle(0xFFDBAE);
            armGraphics.fillRect(0, 0, 6, 18);  // Scaled by 1.5: 4*1.5=6, 12*1.5=18
            
            // Hand
            armGraphics.fillStyle(0xFFDBAE);
            armGraphics.fillCircle(3, 18, 3); // Scaled by 1.5: 2*1.5=3, 12*1.5=18, 2*1.5=3
            
            armGraphics.generateTexture('gardener-arm', 6, 24); // Increased by 50%: 4*1.5=6, 16*1.5=24
            armGraphics.destroy();
        }

        if (!this.textures.exists('gardener-leg')) {
            // Create gardener leg sprite (for animation) - 50% larger
            const legGraphics = this.add.graphics();
            
            // Leg (blue jeans)
            legGraphics.fillStyle(0x4169E1);
            legGraphics.fillRect(0, 0, 6, 18);  // Scaled by 1.5: 4*1.5=6, 12*1.5=18
            
            // Boot (brown)
            legGraphics.fillStyle(0x654321);
            legGraphics.fillRect(-1.5, 18, 9, 6);  // Scaled by 1.5: -1*1.5=-1.5, 12*1.5=18, 6*1.5=9, 4*1.5=6
            
            legGraphics.generateTexture('gardener-leg', 9, 24); // Increased by 50%: 6*1.5=9, 16*1.5=24
            legGraphics.destroy();
        }

        if (!this.textures.exists('squirrel')) {
            // Create realistic squirrel sprite - 50% larger
            const squirrelGraphics = this.add.graphics();
        
        // Body (brown)
        squirrelGraphics.fillStyle(0x8B4513);
        squirrelGraphics.fillCircle(18, 21, 12); // Scaled by 1.5: 12*1.5=18, 14*1.5=21, 8*1.5=12
        
        // Head (lighter brown)
        squirrelGraphics.fillStyle(0xCD853F);
        squirrelGraphics.fillCircle(18, 12, 9); // Scaled by 1.5: 12*1.5=18, 8*1.5=12, 6*1.5=9
        
        // Ears (brown with pink inside)
        squirrelGraphics.fillStyle(0x8B4513);
        squirrelGraphics.fillCircle(12, 6, 4.5); // Scaled by 1.5: 8*1.5=12, 4*1.5=6, 3*1.5=4.5
        squirrelGraphics.fillCircle(24, 6, 4.5); // Scaled by 1.5: 16*1.5=24, 4*1.5=6, 3*1.5=4.5
        squirrelGraphics.fillStyle(0xFFB6C1);
        squirrelGraphics.fillCircle(12, 6, 1.5); // Scaled by 1.5: 8*1.5=12, 4*1.5=6, 1*1.5=1.5
        squirrelGraphics.fillCircle(24, 6, 1.5); // Scaled by 1.5: 16*1.5=24, 4*1.5=6, 1*1.5=1.5
        
        // Eyes (black with white highlights)
        squirrelGraphics.fillStyle(0x000000);
        squirrelGraphics.fillCircle(13.5, 10.5, 3); // Scaled by 1.5: 9*1.5=13.5, 7*1.5=10.5, 2*1.5=3
        squirrelGraphics.fillCircle(22.5, 10.5, 3); // Scaled by 1.5: 15*1.5=22.5, 7*1.5=10.5, 2*1.5=3
        squirrelGraphics.fillStyle(0xFFFFFF);
        squirrelGraphics.fillCircle(13.5, 9, 1.5); // Scaled by 1.5: 9*1.5=13.5, 6*1.5=9, 1*1.5=1.5
        squirrelGraphics.fillCircle(22.5, 9, 1.5); // Scaled by 1.5: 15*1.5=22.5, 6*1.5=9, 1*1.5=1.5
        
        // Nose (black)
        squirrelGraphics.fillStyle(0x000000);
        squirrelGraphics.fillCircle(18, 13.5, 1.5); // Scaled by 1.5: 12*1.5=18, 9*1.5=13.5, 1*1.5=1.5
        
        // Tail (bushy, reddish-brown)
        squirrelGraphics.fillStyle(0xA0522D);
        squirrelGraphics.fillCircle(27, 18, 7.5); // Scaled by 1.5: 18*1.5=27, 12*1.5=18, 5*1.5=7.5
        squirrelGraphics.fillCircle(30, 12, 6); // Scaled by 1.5: 20*1.5=30, 8*1.5=12, 4*1.5=6
        squirrelGraphics.fillCircle(33, 7.5, 4.5); // Scaled by 1.5: 22*1.5=33, 5*1.5=7.5, 3*1.5=4.5
        
        // Paws
        squirrelGraphics.fillStyle(0x654321);
        squirrelGraphics.fillCircle(10.5, 27, 3); // Scaled by 1.5: 7*1.5=10.5, 18*1.5=27, 2*1.5=3
        squirrelGraphics.fillCircle(25.5, 27, 3); // Scaled by 1.5: 17*1.5=25.5, 18*1.5=27, 2*1.5=3
        squirrelGraphics.fillCircle(12, 30, 3); // Scaled by 1.5: 8*1.5=12, 20*1.5=30, 2*1.5=3
        squirrelGraphics.fillCircle(24, 30, 3); // Scaled by 1.5: 16*1.5=24, 20*1.5=30, 2*1.5=3
        
            squirrelGraphics.generateTexture('squirrel', 36, 36); // Increased by 50%: 24*1.5=36
            squirrelGraphics.destroy();
        }

        if (!this.textures.exists('raccoon')) {
            // Create realistic raccoon sprite - 50% larger
            const raccoonGraphics = this.add.graphics();
        
        // Body (gray)
        raccoonGraphics.fillStyle(0x696969);
        raccoonGraphics.fillCircle(24, 30, 15); // Scaled by 1.5: 16*1.5=24, 20*1.5=30, 10*1.5=15
        
        // Head (lighter gray)
        raccoonGraphics.fillStyle(0x808080);
        raccoonGraphics.fillCircle(24, 15, 12); // Scaled by 1.5: 16*1.5=24, 10*1.5=15, 8*1.5=12
        
        // Distinctive raccoon mask (black around eyes)
        raccoonGraphics.fillStyle(0x000000);
        raccoonGraphics.fillRect(12, 10.5, 24, 9); // Scaled by 1.5: 8*1.5=12, 7*1.5=10.5, 16*1.5=24, 6*1.5=9
        
        // Face area inside mask (light gray)
        raccoonGraphics.fillStyle(0xD3D3D3);
        raccoonGraphics.fillRect(15, 12, 18, 6); // Scaled by 1.5: 10*1.5=15, 8*1.5=12, 12*1.5=18, 4*1.5=6
        
        // Eyes (black with white highlights)
        raccoonGraphics.fillStyle(0x000000);
        raccoonGraphics.fillCircle(18, 13.5, 3); // Scaled by 1.5: 12*1.5=18, 9*1.5=13.5, 2*1.5=3
        raccoonGraphics.fillCircle(30, 13.5, 3); // Scaled by 1.5: 20*1.5=30, 9*1.5=13.5, 2*1.5=3
        raccoonGraphics.fillStyle(0xFFFFFF);
        raccoonGraphics.fillCircle(18, 12, 1.5); // Scaled by 1.5: 12*1.5=18, 8*1.5=12, 1*1.5=1.5
        raccoonGraphics.fillCircle(30, 12, 1.5); // Scaled by 1.5: 20*1.5=30, 8*1.5=12, 1*1.5=1.5
        
        // Nose (black)
        raccoonGraphics.fillStyle(0x000000);
        raccoonGraphics.fillCircle(24, 18, 1.5); // Scaled by 1.5: 16*1.5=24, 12*1.5=18, 1*1.5=1.5
        
        // Ears (gray with pink inside)
        raccoonGraphics.fillStyle(0x696969);
        raccoonGraphics.fillCircle(15, 6, 4.5); // Scaled by 1.5: 10*1.5=15, 4*1.5=6, 3*1.5=4.5
        raccoonGraphics.fillCircle(33, 6, 4.5); // Scaled by 1.5: 22*1.5=33, 4*1.5=6, 3*1.5=4.5
        raccoonGraphics.fillStyle(0xFFB6C1);
        raccoonGraphics.fillCircle(15, 6, 1.5); // Scaled by 1.5: 10*1.5=15, 4*1.5=6, 1*1.5=1.5
        raccoonGraphics.fillCircle(33, 6, 1.5); // Scaled by 1.5: 22*1.5=33, 4*1.5=6, 1*1.5=1.5
        
        // Tail with rings (characteristic raccoon stripes)
        raccoonGraphics.fillStyle(0x696969);
        raccoonGraphics.fillCircle(42, 27, 6); // Scaled by 1.5: 28*1.5=42, 18*1.5=27, 4*1.5=6
        raccoonGraphics.fillCircle(45, 21, 4.5); // Scaled by 1.5: 30*1.5=45, 14*1.5=21, 3*1.5=4.5
        raccoonGraphics.fillCircle(46.5, 15, 3); // Scaled by 1.5: 31*1.5=46.5, 10*1.5=15, 2*1.5=3
        
        // Dark rings on tail
        raccoonGraphics.fillStyle(0x2F2F2F);
        raccoonGraphics.fillRect(39, 24, 6, 3); // Scaled by 1.5: 26*1.5=39, 16*1.5=24, 4*1.5=6, 2*1.5=3
        raccoonGraphics.fillRect(42, 18, 4.5, 3); // Scaled by 1.5: 28*1.5=42, 12*1.5=18, 3*1.5=4.5, 2*1.5=3
        raccoonGraphics.fillRect(43.5, 12, 3, 3); // Scaled by 1.5: 29*1.5=43.5, 8*1.5=12, 2*1.5=3, 2*1.5=3
        
        // Paws (dark gray)
        raccoonGraphics.fillStyle(0x2F2F2F);
        raccoonGraphics.fillCircle(12, 39, 4.5); // Scaled by 1.5: 8*1.5=12, 26*1.5=39, 3*1.5=4.5
        raccoonGraphics.fillCircle(36, 39, 4.5); // Scaled by 1.5: 24*1.5=36, 26*1.5=39, 3*1.5=4.5
        raccoonGraphics.fillCircle(15, 42, 4.5); // Scaled by 1.5: 10*1.5=15, 28*1.5=42, 3*1.5=4.5
        raccoonGraphics.fillCircle(33, 42, 4.5); // Scaled by 1.5: 22*1.5=33, 28*1.5=42, 3*1.5=4.5
        
            raccoonGraphics.generateTexture('raccoon', 48, 48); // Increased by 50%: 32*1.5=48
            raccoonGraphics.destroy();
        }

        if (!this.textures.exists('carrot')) {
            // Create realistic carrot sprite
            const carrotGraphics = this.add.graphics();
        
        // Carrot body (orange gradient effect)
        carrotGraphics.fillStyle(0xFF8C00);
        carrotGraphics.fillRect(9, 6, 6, 18);
        carrotGraphics.fillStyle(0xFF7F00);
        carrotGraphics.fillRect(7.5, 9, 9, 12);
        carrotGraphics.fillStyle(0xFFA500);
        carrotGraphics.fillRect(6, 12, 12, 6);
        
        // Carrot lines (texture)
        carrotGraphics.fillStyle(0xE6700A);
        carrotGraphics.fillRect(6, 13.5, 12, 1.5);
        carrotGraphics.fillRect(7.5, 16.5, 9, 1.5);
        carrotGraphics.fillRect(9, 19.5, 6, 1.5);
        
        // Carrot top (green leaves)
        carrotGraphics.fillStyle(0x228B22);
        carrotGraphics.fillRect(9, 0, 3, 9);
        carrotGraphics.fillRect(12, 1.5, 3, 7.5);
        carrotGraphics.fillRect(6, 3, 3, 6);
        carrotGraphics.fillStyle(0x32CD32);
        carrotGraphics.fillRect(7.5, 0, 1.5, 6);
        carrotGraphics.fillRect(10.5, 1.5, 1.5, 6);
        carrotGraphics.fillRect(13.5, 3, 1.5, 4.5);
        
            carrotGraphics.generateTexture('carrot', 24, 24); // Increased by 50%: 16*1.5=24
            carrotGraphics.destroy();
        }

        if (!this.textures.exists('tomato')) {
            // Create realistic tomato sprite
            const tomatoGraphics = this.add.graphics();
        
        // Tomato body (red with shading)
        tomatoGraphics.fillStyle(0xFF6347);
        tomatoGraphics.fillCircle(12, 15, 9);
        tomatoGraphics.fillStyle(0xFF4500);
        tomatoGraphics.fillCircle(9, 12, 3);  // Shadow
        tomatoGraphics.fillStyle(0xFF7F7F);
        tomatoGraphics.fillCircle(15, 18, 3); // Highlight
        
        // Tomato segments (realistic lines)
        tomatoGraphics.fillStyle(0xDC143C);
        tomatoGraphics.fillRect(12, 6, 1.5, 18);
        tomatoGraphics.fillRect(7.5, 12, 9, 1.5);
        tomatoGraphics.fillRect(9, 9, 6, 1.5);
        tomatoGraphics.fillRect(9, 18, 6, 1.5);
        
        // Stem (green)
        tomatoGraphics.fillStyle(0x228B22);
        tomatoGraphics.fillRect(9, 3, 6, 4.5);
        tomatoGraphics.fillStyle(0x32CD32);
        tomatoGraphics.fillRect(7.5, 1.5, 3, 3);
        tomatoGraphics.fillRect(13.5, 1.5, 3, 3);
        tomatoGraphics.fillRect(10.5, 0, 3, 3);
        
            tomatoGraphics.generateTexture('tomato', 24, 24); // Increased by 50%: 16*1.5=24
            tomatoGraphics.destroy();
        }

        if (!this.textures.exists('lettuce')) {
            // Create realistic lettuce sprite
            const lettuceGraphics = this.add.graphics();
        
        // Lettuce base (light green)
        lettuceGraphics.fillStyle(0x90EE90);
        lettuceGraphics.fillCircle(12, 15, 9);
        
        // Lettuce leaves (layered for depth)
        lettuceGraphics.fillStyle(0x228B22);
        lettuceGraphics.fillCircle(9, 12, 6);
        lettuceGraphics.fillCircle(15, 12, 6);
        lettuceGraphics.fillCircle(12, 9, 4.5);
        lettuceGraphics.fillCircle(12, 18, 6);
        
        // Leaf veins (darker green)
        lettuceGraphics.fillStyle(0x006400);
        lettuceGraphics.fillRect(12, 6, 1.5, 12);
        lettuceGraphics.fillRect(7.5, 12, 9, 1.5);
        lettuceGraphics.fillRect(9, 9, 6, 1.5);
        lettuceGraphics.fillRect(9, 15, 6, 1.5);
        
        // Highlights (lighter green)
        lettuceGraphics.fillStyle(0x98FB98);
        lettuceGraphics.fillCircle(9, 10.5, 3);
        lettuceGraphics.fillCircle(15, 13.5, 3);
        lettuceGraphics.fillCircle(12, 16.5, 1.5);
        
            lettuceGraphics.generateTexture('lettuce', 24, 24); // Increased by 50%: 16*1.5=24
            lettuceGraphics.destroy();
        }

        if (!this.textures.exists('water')) {
            // Create realistic water spray sprite
            const waterGraphics = this.add.graphics();
        
        // Main water droplet (blue with transparency effect)
        waterGraphics.fillStyle(0x00BFFF);
        waterGraphics.fillCircle(6, 6, 4.5);
        
        // Water highlights (lighter blue)
        waterGraphics.fillStyle(0x87CEEB);
        waterGraphics.fillCircle(4.5, 4.5, 1.5);
        waterGraphics.fillCircle(7.5, 7.5, 1.5);
        
        // Water shadow (darker blue)
        waterGraphics.fillStyle(0x4682B4);
        waterGraphics.fillCircle(7.5, 7.5, 1.5);
        
            waterGraphics.generateTexture('water', 12, 12);
            waterGraphics.destroy();
        }

        if (!this.textures.exists('tap-body-on')) {
            // Create tap body (shared between ON and OFF states)
            const tapBodyGraphics = this.add.graphics();
        
        // Tap base (metallic gray)
        tapBodyGraphics.fillStyle(0x708090);
        tapBodyGraphics.fillRect(6, 12, 24, 30);
        
        // Tap pipe (darker metal)
        tapBodyGraphics.fillStyle(0x2F4F4F);
        tapBodyGraphics.fillRect(12, 6, 12, 36);
        
        // Pipe opening
        tapBodyGraphics.fillStyle(0x000000);
        tapBodyGraphics.fillCircle(18, 42, 3);
        
        // Metallic highlights
        tapBodyGraphics.fillStyle(0xC0C0C0);
        tapBodyGraphics.fillRect(7.5, 13.5, 3, 27);
        tapBodyGraphics.fillRect(13.5, 7.5, 3, 33);
        
        // Water drip (when on)
        tapBodyGraphics.fillStyle(0x00BFFF);
        tapBodyGraphics.fillCircle(18, 45, 1.5);
        
            tapBodyGraphics.generateTexture('tap-body-on', 36, 48);
            tapBodyGraphics.destroy();
        }

        if (!this.textures.exists('tap-handle-on')) {
            // Create tap handle ON state (green, horizontal)
            const tapHandleOnGraphics = this.add.graphics();
        
        // Handle base (green when on) - larger with black outline
        tapHandleOnGraphics.fillStyle(0x000000); // Black outline
        tapHandleOnGraphics.fillCircle(18, 12, 10.5);
        tapHandleOnGraphics.fillStyle(0x32CD32);
        tapHandleOnGraphics.fillCircle(18, 12, 7.5);
        
        // Handle lever (horizontal when on - green, thicker and longer) - with black outline
        tapHandleOnGraphics.fillStyle(0x000000); // Black outline
        tapHandleOnGraphics.fillRect(3, 7.5, 30, 9);
        tapHandleOnGraphics.fillCircle(3, 12, 4.5);
        tapHandleOnGraphics.fillCircle(33, 12, 4.5);
        
        tapHandleOnGraphics.fillStyle(0x228B22);
        tapHandleOnGraphics.fillRect(4.5, 9, 27, 6);
        tapHandleOnGraphics.fillCircle(4.5, 12, 3);
        tapHandleOnGraphics.fillCircle(31.5, 12, 3);
        
            tapHandleOnGraphics.generateTexture('tap-handle-on', 36, 48);
            tapHandleOnGraphics.destroy();
        }

        if (!this.textures.exists('tap-body-off')) {
            // Create tap body OFF state (no water drip)
            const tapBodyOffGraphics = this.add.graphics();
        
        // Tap base (metallic gray)
        tapBodyOffGraphics.fillStyle(0x708090);
        tapBodyOffGraphics.fillRect(6, 12, 24, 30);
        
        // Tap pipe (darker metal)
        tapBodyOffGraphics.fillStyle(0x2F4F4F);
        tapBodyOffGraphics.fillRect(12, 6, 12, 36);
        
        // Pipe opening
        tapBodyOffGraphics.fillStyle(0x000000);
        tapBodyOffGraphics.fillCircle(18, 42, 3);
        
        // Metallic highlights
        tapBodyOffGraphics.fillStyle(0xC0C0C0);
        tapBodyOffGraphics.fillRect(7.5, 13.5, 3, 27);
        tapBodyOffGraphics.fillRect(13.5, 7.5, 3, 33);
        
            tapBodyOffGraphics.generateTexture('tap-body-off', 36, 48);
            tapBodyOffGraphics.destroy();
        }

        if (!this.textures.exists('tap-handle-off')) {
            // Create tap handle OFF state (red, vertical)
            const tapHandleOffGraphics = this.add.graphics();
        
        // Handle base (red when off) - larger with black outline
        tapHandleOffGraphics.fillStyle(0x000000); // Black outline
        tapHandleOffGraphics.fillCircle(18, 12, 10.5);
        tapHandleOffGraphics.fillStyle(0xFF4500);
        tapHandleOffGraphics.fillCircle(18, 12, 7.5);
        
        // Handle lever (vertical when off - red) - thicker with black outline, moved higher
        tapHandleOffGraphics.fillStyle(0x000000); // Black outline
        tapHandleOffGraphics.fillRect(13.5, -6, 9, 24); // Moved up by 4 pixels (was 0, now -4)
        tapHandleOffGraphics.fillCircle(18, -6, 4.5); // Moved up by 4 pixels (was 0, now -4)
        tapHandleOffGraphics.fillCircle(18, 18, 4.5); // Moved up by 4 pixels (was 16, now 12)
        
        tapHandleOffGraphics.fillStyle(0xDC143C);
        tapHandleOffGraphics.fillRect(15, -4.5, 6, 21); // Moved up by 4 pixels (was 1, now -3)
        tapHandleOffGraphics.fillCircle(18, -4.5, 3); // Moved up by 4 pixels (was 1, now -3)
        tapHandleOffGraphics.fillCircle(18, 16.5, 3); // Moved up by 4 pixels (was 15, now 11)
        
            tapHandleOffGraphics.generateTexture('tap-handle-off', 36, 48);
            tapHandleOffGraphics.destroy();
        }
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
            document.getElementById('music-toggle').textContent = '🔇 Music OFF';
        } else {
            // Restore music volume and restart
            if (this.musicGainNode) {
                this.musicGainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            }
            this.startBackgroundMusic();
            document.getElementById('music-toggle').textContent = '🎵 Music ON ';
        }
    }

    toggleSounds() {
        this.soundsEnabled = !this.soundsEnabled;
        
        if (this.soundsEnabled) {
            document.getElementById('sound-toggle').textContent = '🔊 Sounds ON ';
        } else {
            document.getElementById('sound-toggle').textContent = '🔇 Sounds OFF';
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
        if (!this.audioContext || !this.soundsEnabled) {
            if (!this.audioContext) {
                console.log('Audio context not available');
            }
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

    // Firebase integration methods
    async loadTopScores() {
        try {
            this.topScores = await this.firebaseManager.getTopHighScores(3);
            this.updateHighScoreDisplay();
        } catch (error) {
            console.error('Error loading top scores:', error);
            this.topScores = [];
        }
    }

    async saveGameState(saveName = null) {
        if (!this.autoSaveEnabled || !this.gameStarted) return false;
        
        // If no save name provided, prompt for one
        if (saveName === null) {
            saveName = await this.showSaveNameDialog();
            if (!saveName) return false; // User cancelled
        }
        
        const gameState = {
            score: this.score,
            round: this.round,
            timeLeft: this.timeLeft,
            vegetablesLeft: this.vegetablesLeft,
            gameStarted: this.gameStarted,
            roundActive: this.roundActive,
            // Save vegetable positions
            vegetables: this.vegetables.children.entries.map(veg => ({
                x: veg.x,
                y: veg.y,
                texture: veg.texture.key,
                inPlay: veg.getData('inPlay')
            })),
            // Save gardener position
            gardenerX: this.gardener.x,
            gardenerY: this.gardener.y,
            gardenerAngle: this.gardenerAngle,
            waterEnabled: this.waterEnabled
        };

        try {
            const success = await this.firebaseManager.saveGameState(gameState, saveName);
            if (success) {
                this.lastSaveTime = Date.now();
                // Only show notification for manual saves, not autosaves
                if (saveName !== 'autosave') {
                    this.showSaveSuccessMessage(saveName);
                }
                // Update load game button state since we have a new save
                this.updateLoadGameButtonState();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error saving game state:', error);
            return false;
        }
    }

    async loadGameState(saveName = null) {
        console.log('loadGameState called');
        
        // If no save name provided, show save selection dialog
        if (saveName === null) {
            saveName = await this.showLoadGameDialog();
            if (!saveName) return false; // User cancelled
        }
        
        try {
            console.log('Calling firebaseManager.loadGameState()...');
            const savedState = await this.firebaseManager.loadGameState(saveName);
            console.log('Received saved state:', savedState);
            
            if (savedState && savedState.gameStarted && !savedState.cleared) {
                console.log('Valid saved state found, restoring...');
                // Restore game state
                this.score = savedState.score || 0;
                this.round = savedState.round || 1;
                this.timeLeft = savedState.timeLeft || 60;
                this.vegetablesLeft = savedState.vegetablesLeft || 0;
                this.gardenerAngle = savedState.gardenerAngle || 0;
                this.waterEnabled = savedState.waterEnabled !== undefined ? savedState.waterEnabled : true;
                
                console.log('Restored basic state:', {
                    score: this.score,
                    round: this.round,
                    timeLeft: this.timeLeft,
                    vegetablesLeft: this.vegetablesLeft
                });
                
                // Restore gardener position
                if (savedState.gardenerX && savedState.gardenerY) {
                    this.gardener.setPosition(savedState.gardenerX, savedState.gardenerY);
                    console.log('Restored gardener position:', savedState.gardenerX, savedState.gardenerY);
                }
                
                // Restore vegetables
                if (savedState.vegetables && savedState.vegetables.length > 0) {
                    this.vegetables.clear(true, true);
                    savedState.vegetables.forEach(vegData => {
                        if (vegData.inPlay) {
                            const vegetable = this.physics.add.sprite(vegData.x, vegData.y, vegData.texture);
                            vegetable.setData('inPlay', vegData.inPlay);
                            this.vegetables.add(vegetable);
                        }
                    });
                    console.log('Restored vegetables:', savedState.vegetables.length);
                }
                
                // Update water tap state
                if (this.waterEnabled) {
                    this.waterTapBody.setTexture('tap-body-on');
                    this.waterTapHandle.setTexture('tap-handle-on');
                    this.waterTapBody.setData('isOn', true);
                } else {
                    this.waterTapBody.setTexture('tap-body-off');
                    this.waterTapHandle.setTexture('tap-handle-off');
                    this.waterTapBody.setData('isOn', false);
                }
                
                console.log('Game state loaded successfully');
                return true;
            } else {
                console.log('No valid saved state found or game was cleared');
            }
        } catch (error) {
            console.error('Error loading game state:', error);
        }
        return false;
    }

    async updateLoadGameButtonState() {
        try {
            const loadGameBtn = document.getElementById('load-game-start-btn');
            if (!loadGameBtn) {
                console.log('Load game button not found');
                return;
            }
            
            // Check if there are any saved games available
            console.log('Checking for saved games...');
            const savedGames = await this.firebaseManager.getSavedGames();
            console.log('Found saved games:', savedGames.length, savedGames);
            
            if (savedGames && savedGames.length > 0) {
                // Enable the button if there are saved games
                loadGameBtn.disabled = false;
                loadGameBtn.textContent = '📁 Load Saved Game';
                loadGameBtn.title = `Load one of ${savedGames.length} saved game${savedGames.length > 1 ? 's' : ''}`;
                console.log('Button enabled: Load Saved Game');
            } else {
                // Disable the button if no saved games
                loadGameBtn.disabled = true;
                loadGameBtn.textContent = '📁 No Saved Games';
                loadGameBtn.title = 'No saved games available';
                console.log('Button disabled: No Saved Games');
            }
        } catch (error) {
            console.error('Error updating load game button state:', error);
            // Disable button on error
            const loadGameBtn = document.getElementById('load-game-start-btn');
            if (loadGameBtn) {
                loadGameBtn.disabled = true;
                loadGameBtn.textContent = '📁 Load Unavailable';
                loadGameBtn.title = 'Error checking saved games';
            }
        }
    }

    async initializeFirebaseAndUI() {
        try {
            console.log('Waiting for Firebase to initialize...');
            
            // Wait for Firebase initialization to complete
            const success = await this.firebaseManager.waitForInitialization();
            
            if (success && this.firebaseManager.isInitialized) {
                console.log('Firebase initialized successfully, updating UI...');
                // Now that Firebase is ready, update the load game button state
                this.updateLoadGameButtonState();
            } else {
                console.error('Firebase initialization failed');
                // Set button to error state
                const loadGameBtn = document.getElementById('load-game-start-btn');
                if (loadGameBtn) {
                    loadGameBtn.disabled = true;
                    loadGameBtn.textContent = '📁 Connection Error';
                    loadGameBtn.title = 'Unable to connect to Firebase';
                }
            }
        } catch (error) {
            console.error('Error during Firebase initialization:', error);
            // Set button to error state
            const loadGameBtn = document.getElementById('load-game-start-btn');
            if (loadGameBtn) {
                loadGameBtn.disabled = true;
                loadGameBtn.textContent = '📁 Connection Error';
                loadGameBtn.title = 'Firebase connection failed';
            }
        }
    }

    async checkAndSaveHighScore() {
        if (this.score <= 0) return;
        
        try {
            const isTopScore = await this.firebaseManager.isTopScore(this.score);
            if (isTopScore) {
                // Show name entry dialog for top 3 scores
                const playerName = await this.showNameEntryDialog();
                await this.firebaseManager.saveHighScore(this.score, this.round, playerName);
                await this.loadTopScores(); // Refresh the leaderboard
                this.showNewHighScoreMessage(playerName);
            }
        } catch (error) {
            console.error('Error checking/saving high score:', error);
        }
    }

    async showNameEntryDialog() {
        return new Promise((resolve) => {
            // Create modal backdrop
            const backdrop = document.createElement('div');
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            `;

            // Create dialog container
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: linear-gradient(135deg, rgba(45, 74, 43, 0.95), rgba(74, 124, 89, 0.95));
                border: 3px solid #4a6741;
                border-radius: 15px;
                padding: 30px;
                text-align: center;
                color: white;
                font-family: Arial, sans-serif;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                max-width: 400px;
                width: 90%;
            `;

            dialog.innerHTML = `
                <h2 style="margin-top: 0; color: #90ee90; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);">
                    🎉 NEW HIGH SCORE! 🎉
                </h2>
                <p style="font-size: 18px; margin: 20px 0;">
                    Score: <strong>${this.score}</strong> | Round: <strong>${this.round}</strong>
                </p>
                <p style="margin: 20px 0;">Enter your name for the leaderboard:</p>
                <input type="text" id="player-name-input" maxlength="15" 
                       style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #4a6741; 
                              border-radius: 8px; margin: 10px 0; box-sizing: border-box;
                              background: rgba(255, 255, 255, 0.9);" 
                       placeholder="Enter your name"
                       autocomplete="off"
                       spellcheck="false" />
                <div style="margin-top: 20px;">
                    <button id="save-name-btn" 
                            style="background: linear-gradient(45deg, #32cd32, #228b22); 
                                   color: white; border: none; padding: 12px 20px; 
                                   font-size: 16px; font-weight: bold; border-radius: 8px; 
                                   cursor: pointer; margin-right: 10px;
                                   box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);">
                        Save Score
                    </button>
                    <button id="skip-name-btn" 
                            style="background: linear-gradient(45deg, #666, #444); 
                                   color: white; border: none; padding: 12px 20px; 
                                   font-size: 16px; font-weight: bold; border-radius: 8px; 
                                   cursor: pointer;
                                   box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);">
                        Skip
                    </button>
                </div>
            `;

            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);

            const nameInput = dialog.querySelector('#player-name-input');
            const saveBtn = dialog.querySelector('#save-name-btn');
            const skipBtn = dialog.querySelector('#skip-name-btn');

            // Disable Phaser keyboard input while dialog is open
            if (this.input && this.input.keyboard) {
                this.input.keyboard.enabled = false;
            }

            // Add explicit keyboard event handling to allow spaces
            const handleKeydown = (e) => {
                // Allow all keyboard input to reach the input field
                e.stopPropagation();
            };
            
            const handleKeypress = (e) => {
                // Allow all keyboard input to reach the input field  
                e.stopPropagation();
            };

            // Attach keyboard event listeners to prevent Phaser interference
            nameInput.addEventListener('keydown', handleKeydown, true);
            nameInput.addEventListener('keypress', handleKeypress, true);

            // Focus on input
            setTimeout(() => nameInput.focus(), 100);

            // Function to close dialog and return name
            const closeDialog = (name) => {
                // Remove keyboard event listeners
                nameInput.removeEventListener('keydown', handleKeydown, true);
                nameInput.removeEventListener('keypress', handleKeypress, true);
                
                // Re-enable Phaser keyboard input when dialog closes
                if (this.input && this.input.keyboard) {
                    this.input.keyboard.enabled = true;
                }
                document.body.removeChild(backdrop);
                resolve(name || 'Anonymous');
            };

            // Event listeners
            saveBtn.addEventListener('click', () => {
                const name = nameInput.value.trim();
                closeDialog(name || 'Anonymous');
            });

            skipBtn.addEventListener('click', () => {
                closeDialog('Anonymous');
            });

            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const name = nameInput.value.trim();
                    closeDialog(name || 'Anonymous');
                }
            });

            // Add hover effects
            saveBtn.addEventListener('mouseenter', () => {
                saveBtn.style.background = 'linear-gradient(45deg, #228b22, #006400)';
                saveBtn.style.transform = 'translateY(-2px)';
            });
            saveBtn.addEventListener('mouseleave', () => {
                saveBtn.style.background = 'linear-gradient(45deg, #32cd32, #228b22)';
                saveBtn.style.transform = 'translateY(0)';
            });

            skipBtn.addEventListener('mouseenter', () => {
                skipBtn.style.background = 'linear-gradient(45deg, #555, #333)';
                skipBtn.style.transform = 'translateY(-2px)';
            });
            skipBtn.addEventListener('mouseleave', () => {
                skipBtn.style.background = 'linear-gradient(45deg, #666, #444)';
                skipBtn.style.transform = 'translateY(0)';
            });
        });
    }

    showNewHighScoreMessage(playerName = 'Player') {
        // Add visual feedback for new high score
        const message = document.createElement('div');
        message.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">🎉 NEW HIGH SCORE! 🎉</div>
            <div style="font-size: 18px;">Congratulations, ${playerName}!</div>
            <div style="font-size: 16px; margin-top: 8px;">Score: ${this.score} - Round ${this.round}</div>
        `;
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #FFD700, #FFA500);
            color: #000;
            padding: 25px 40px;
            border-radius: 15px;
            font-weight: bold;
            z-index: 2000;
            box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5);
            text-align: center;
            border: 3px solid #B8860B;
        `;
        
        document.body.appendChild(message);
        
        // Remove after 4 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 4000);
    }

    updateHighScoreDisplay() {
        // Update the permanent top scores display
        const topScoresDisplay = document.getElementById('top-scores-content');
        if (topScoresDisplay) {
            for (let i = 0; i < 3; i++) {
                const scoreElement = document.getElementById(`score-${i + 1}`);
                const scoreInfoElement = scoreElement.querySelector('.score-info');
                
                if (this.topScores[i]) {
                    const score = this.topScores[i];
                    const playerName = score.playerName || 'Anonymous';
                    const displayName = playerName.length > 8 ? playerName.substring(0, 8) + '...' : playerName;
                    
                    scoreInfoElement.textContent = `${displayName}: ${score.score}`;
                    scoreInfoElement.classList.remove('no-score');
                } else {
                    scoreInfoElement.textContent = 'No scores yet';
                    scoreInfoElement.classList.add('no-score');
                }
            }
        }
    }

    showMessage(message, duration = 3000) {
        console.log('showMessage called with:', message, 'duration:', duration);
        // Create or update message element
        let messageElement = document.getElementById('game-message');
        if (!messageElement) {
            console.log('Creating new message element');
            messageElement = document.createElement('div');
            messageElement.id = 'game-message';
            messageElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 20px;
                border-radius: 10px;
                font-size: 18px;
                font-weight: bold;
                text-align: center;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(messageElement);
        } else {
            console.log('Using existing message element');
        }
        
        messageElement.innerHTML = message.replace(/\n/g, '<br>');
        messageElement.style.display = 'block';
        console.log('Message element updated and shown');
        
        // Hide after duration
        setTimeout(() => {
            messageElement.style.display = 'none';
            console.log('Message hidden after', duration, 'ms');
        }, duration);
    }

    async showSaveNameDialog() {
        return new Promise((resolve) => {
            // Create modal backdrop
            const backdrop = document.createElement('div');
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            `;

            // Create dialog container
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: linear-gradient(135deg, rgba(45, 74, 43, 0.95), rgba(74, 124, 89, 0.95));
                border: 3px solid #4a6741;
                border-radius: 15px;
                padding: 30px;
                text-align: center;
                color: white;
                font-family: Arial, sans-serif;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                max-width: 400px;
                width: 90%;
            `;

            dialog.innerHTML = `
                <h2 style="margin-top: 0; color: #90ee90; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);">
                    💾 Save Game
                </h2>
                <p style="margin: 20px 0;">Enter a name for your saved game:</p>
                <input type="text" id="save-name-input" maxlength="20" placeholder="My Save Game"
                       style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #4a6741; 
                              border-radius: 8px; margin: 10px 0; box-sizing: border-box;
                              background: rgba(255, 255, 255, 0.9);"
                       autocomplete="off"
                       spellcheck="false">
                <div style="margin-top: 20px;">
                    <button id="save-confirm-btn" style="background: linear-gradient(45deg, #32cd32, #228b22); 
                           color: white; border: none; padding: 12px 24px; margin: 0 5px; 
                           border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;">
                        💾 Save
                    </button>
                    <button id="save-cancel-btn" style="background: linear-gradient(45deg, #666, #444); 
                           color: white; border: none; padding: 12px 24px; margin: 0 5px; 
                           border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            `;

            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);

            const nameInput = dialog.querySelector('#save-name-input');
            const saveBtn = dialog.querySelector('#save-confirm-btn');
            const cancelBtn = dialog.querySelector('#save-cancel-btn');

            // Disable Phaser keyboard input while dialog is open
            if (this.input && this.input.keyboard) {
                this.input.keyboard.enabled = false;
            }

            // Add explicit keyboard event handling to allow spaces
            const handleKeydown = (e) => {
                // Allow all keyboard input to reach the input field
                e.stopPropagation();
            };
            
            const handleKeypress = (e) => {
                // Allow all keyboard input to reach the input field  
                e.stopPropagation();
            };

            // Attach keyboard event listeners to prevent Phaser interference
            nameInput.addEventListener('keydown', handleKeydown, true);
            nameInput.addEventListener('keypress', handleKeypress, true);

            // Focus the input
            setTimeout(() => nameInput.focus(), 100);

            const closeDialog = (saveName) => {
                // Remove keyboard event listeners
                nameInput.removeEventListener('keydown', handleKeydown, true);
                nameInput.removeEventListener('keypress', handleKeypress, true);
                
                // Re-enable Phaser keyboard input when dialog closes
                if (this.input && this.input.keyboard) {
                    this.input.keyboard.enabled = true;
                }
                document.body.removeChild(backdrop);
                resolve(saveName);
            };

            // Event listeners
            saveBtn.addEventListener('click', () => {
                const name = nameInput.value.trim();
                if (name) {
                    closeDialog(name);
                } else {
                    nameInput.style.borderColor = '#ff4444';
                    nameInput.placeholder = 'Please enter a name';
                }
            });

            cancelBtn.addEventListener('click', () => {
                closeDialog(null);
            });

            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const name = nameInput.value.trim();
                    if (name) {
                        closeDialog(name);
                    }
                }
            });

            nameInput.addEventListener('input', (e) => {
                nameInput.style.borderColor = '#4a6741';
            });
        });
    }

    async showLoadGameDialog() {
        return new Promise(async (resolve) => {
            try {
                const savedGames = await this.firebaseManager.getSavedGames();
                
                if (savedGames.length === 0) {
                    this.showMessage('No saved games found!', 2000);
                    resolve(null);
                    return;
                }

                // Create modal backdrop
                const backdrop = document.createElement('div');
                backdrop.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                `;

                // Create dialog container
                const dialog = document.createElement('div');
                dialog.style.cssText = `
                    background: linear-gradient(135deg, rgba(45, 74, 43, 0.95), rgba(74, 124, 89, 0.95));
                    border: 3px solid #4a6741;
                    border-radius: 15px;
                    padding: 30px;
                    text-align: center;
                    color: white;
                    font-family: Arial, sans-serif;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    max-width: 500px;
                    width: 90%;
                    max-height: 70vh;
                    overflow-y: auto;
                `;

                let dialogHTML = `
                    <h2 style="margin-top: 0; color: #90ee90; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);">
                        📁 Load Game
                    </h2>
                    <p style="margin: 20px 0;">Select a saved game to load:</p>
                    <div style="max-height: 300px; overflow-y: auto; margin: 20px 0;">
                `;

                savedGames.forEach((save, index) => {
                    const date = new Date(save.timestamp).toLocaleDateString();
                    const time = new Date(save.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    dialogHTML += `
                        <div class="save-item" data-save-name="${save.name}" style="
                            background: rgba(0, 0, 0, 0.3);
                            border: 2px solid #4a6741;
                            border-radius: 8px;
                            padding: 15px;
                            margin: 10px 0;
                            cursor: pointer;
                            transition: all 0.3s;
                            text-align: left;
                            position: relative;
                        ">
                            <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${save.name}</div>
                            <div style="font-size: 14px; color: #ccc;">
                                Score: ${save.score} | Round: ${save.round} | Time: ${save.timeLeft}s
                            </div>
                            <div style="font-size: 12px; color: #aaa;">
                                Saved: ${date} at ${time}
                            </div>
                            <button class="delete-save-btn" data-save-name="${save.name}" style="
                                position: absolute;
                                right: 10px;
                                top: 10px;
                                background: #ff4444;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                padding: 5px 8px;
                                font-size: 12px;
                                cursor: pointer;
                            ">🗑️</button>
                        </div>
                    `;
                });

                dialogHTML += `
                    </div>
                    <div style="margin-top: 20px;">
                        <button id="load-cancel-btn" style="background: linear-gradient(45deg, #666, #444); 
                               color: white; border: none; padding: 12px 24px; margin: 0 5px; 
                               border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;">
                            Cancel
                        </button>
                    </div>
                `;

                dialog.innerHTML = dialogHTML;
                backdrop.appendChild(dialog);
                document.body.appendChild(backdrop);

                const closeDialog = (saveName) => {
                    document.body.removeChild(backdrop);
                    resolve(saveName);
                };

                // Event listeners for save items
                dialog.querySelectorAll('.save-item').forEach(item => {
                    item.addEventListener('mouseenter', () => {
                        item.style.borderColor = '#90ee90';
                        item.style.background = 'rgba(0, 0, 0, 0.5)';
                    });
                    
                    item.addEventListener('mouseleave', () => {
                        item.style.borderColor = '#4a6741';
                        item.style.background = 'rgba(0, 0, 0, 0.3)';
                    });
                    
                    item.addEventListener('click', (e) => {
                        if (!e.target.classList.contains('delete-save-btn')) {
                            closeDialog(item.dataset.saveName);
                        }
                    });
                });

                // Event listeners for delete buttons
                dialog.querySelectorAll('.delete-save-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm(`Delete save "${btn.dataset.saveName}"?`)) {
                            await this.firebaseManager.deleteSavedGame(btn.dataset.saveName);
                            // Remove the item from UI
                            btn.closest('.save-item').remove();
                            // Update load game button state since we deleted a save
                            this.updateLoadGameButtonState();
                            // Check if no saves left
                            if (dialog.querySelectorAll('.save-item').length === 0) {
                                closeDialog(null);
                            }
                        }
                    });
                });

                // Cancel button
                dialog.querySelector('#load-cancel-btn').addEventListener('click', () => {
                    closeDialog(null);
                });

            } catch (error) {
                console.error('Error showing load dialog:', error);
                resolve(null);
            }
        });
    }

    showSaveSuccessMessage(saveName) {
        this.showMessage(`Game saved as "${saveName}"!`, 2000);
    }

    async clearSavedGame() {
        try {
            await this.firebaseManager.clearGameState();
        } catch (error) {
            console.error('Error clearing saved game:', error);
        }
    }

    create() {
        // Initialize Firebase
        if (!this.firebaseManager) {
            this.firebaseManager = new FirebaseManager();
        }
        
        // Wait for Firebase to initialize before updating button state
        this.initializeFirebaseAndUI();
        
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
        this.gardenerAngle = 0; // Initialize facing right in radians
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

        // Create water tap with layered graphics
        this.waterTapBody = this.physics.add.sprite(100, 100, 'tap-body-on');
        this.waterTapBody.setImmovable(true);
        this.waterTapBody.setData('isOn', true);
        
        this.waterTapHandle = this.add.sprite(100, 100, 'tap-handle-on');
        this.waterTapHandle.setDepth(0.5); // Handle behind characters but above background

        // Set up input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Set up collisions
        this.physics.add.overlap(this.waterSpray, this.squirrels, this.hitSquirrel, null, this);
        this.physics.add.overlap(this.waterSpray, this.raccoons, this.hitRaccoon, null, this);
        // Store references to animal-vegetable collisions so we can disable them when needed
        this.squirrelVegetableCollision = this.physics.add.overlap(this.squirrels, this.vegetables, this.squirrelGrabVegetable, null, this);
        this.raccoonVegetableCollision = this.physics.add.overlap(this.raccoons, this.vegetables, this.raccoonGrabVegetable, null, this);
        this.physics.add.overlap(this.squirrels, this.waterTapBody, this.squirrelUseTap, null, this);
        this.physics.add.overlap(this.gardener, this.waterTapBody, this.gardenerUseTap, null, this);

        // Set up start game button
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame(true); // Pass true to indicate this is a new game
        });

        // Set up start new game button (for game over screen)
        document.getElementById('start-new-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });

        // Set up load game button on start screen
        document.getElementById('load-game-start-btn').addEventListener('click', async () => {
            try {
                console.log('Load game from start screen button clicked');
                
                // Use the same flow as the regular load button
                const gameStateLoaded = await this.loadGameState(); // This will show save selection dialog
                console.log('Load result:', gameStateLoaded);
                
                if (gameStateLoaded) {
                    console.log('Game state loaded successfully');
                    this.showMessage('Game loaded successfully!', 1000);
                    
                    // Start the game with the loaded state (same as regular load button)
                    this.gameStarted = true;
                    this.roundActive = true;
                    document.body.classList.add('game-started');
                    // Update UI to reflect loaded state
                    this.updateUI();
                    console.log('Game loaded successfully and UI updated');
                } else {
                    console.log('No save selected or dialog cancelled');
                }
            } catch (error) {
                console.error('Error loading saved game:', error);
                this.showMessage('Error loading saved game!', 3000);
            }
        });

        // Set up music toggle button with touch support
        const musicToggleBtn = document.getElementById('music-toggle');
        musicToggleBtn.addEventListener('click', () => {
            this.toggleMusic();
        });
        // Add touch event for better mobile support
        musicToggleBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.toggleMusic();
        });

        // Set up sound toggle button with touch support
        const soundToggleBtn = document.getElementById('sound-toggle');
        soundToggleBtn.addEventListener('click', () => {
            this.toggleSounds();
        });
        // Add touch event for better mobile support
        soundToggleBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.toggleSounds();
        });

        // Set up quit game button with touch support
        const setupQuitButton = () => {
            const quitGameBtn = document.getElementById('quit-game-btn');
            console.log('Quit button element found:', !!quitGameBtn);
            
            if (quitGameBtn) {
                // Store reference to game scene for use in event handlers
                const gameScene = this;
                
                // Remove any existing listeners first
                quitGameBtn.onclick = null;
                
                // Add multiple event types for maximum compatibility
                quitGameBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Quit button clicked via addEventListener');
                    gameScene.quitGame();
                });
                
                quitGameBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    console.log('Quit button touched via addEventListener');
                    gameScene.quitGame();
                });
                
                // Also add onclick as backup with proper context
                quitGameBtn.onclick = (e) => {
                    e.preventDefault();
                    console.log('Quit button clicked via onclick');
                    gameScene.quitGame();
                };
                
                console.log('Quit button event listeners added with proper context');
            } else {
                console.error('Quit button not found!');
                // Try again after a short delay
                setTimeout(setupQuitButton, 100);
            }
        };

        // Firebase button listeners
        const saveGameBtn = document.getElementById('save-game-btn');
        const loadGameBtn = document.getElementById('load-game-btn');

        if (saveGameBtn) {
            saveGameBtn.addEventListener('click', async () => {
                console.log('Save game button clicked');
                console.log('Game started:', this.gameStarted);
                console.log('Firebase manager:', !!this.firebaseManager);
                console.log('Firebase initialized:', this.firebaseManager?.isInitialized);
                
                if (this.gameStarted && this.firebaseManager && this.firebaseManager.isInitialized) {
                    console.log('Attempting to save game state...');
                    const saveSuccess = await this.saveGameState(); // This will prompt for save name
                    console.log('Save result:', saveSuccess);
                    
                    if (!saveSuccess) {
                        this.showMessage('Save cancelled or failed', 2000);
                    }
                } else if (!this.gameStarted) {
                    this.showMessage('Start a game first!', 2000);
                    console.log('Cannot save: game not started');
                } else {
                    this.showMessage('Firebase not ready yet', 2000);
                    console.log('Cannot save: Firebase not ready');
                }
            });
        }

        if (loadGameBtn) {
            loadGameBtn.addEventListener('click', async () => {
                console.log('Load game button clicked');
                console.log('Game started state:', this.gameStarted);
                
                // Always allow loading a game - if one is in progress, the new save will replace it
                console.log('Attempting to load game state...');
                const gameStateLoaded = await this.loadGameState(); // This will show save selection dialog
                console.log('Load result:', gameStateLoaded);
                
                if (gameStateLoaded) {
                    this.showMessage('Game loaded!', 1000);
                    // Set game as started and hide start screen
                    this.gameStarted = true;
                    this.roundActive = true;
                    document.body.classList.add('game-started');
                    // Update UI to reflect loaded state
                    this.updateUI();
                    console.log('Game loaded successfully and UI updated');
                } else {
                    console.log('No saved game selected or load failed');
                }
            });
        }
        
        setupQuitButton();

        // Set up mobile controls
        this.setupMobileControls();

        // Load Firebase data
        this.loadTopScores();

        // Update UI (but don't start the game yet)
        this.updateUI();
    }

    setupMobileControls() {
        // Helper function for haptic feedback on supported devices
        const hapticFeedback = () => {
            if (navigator.vibrate) {
                navigator.vibrate(10); // Short vibration
            }
        };
        
        // Handle orientation changes
        const handleOrientationChange = () => {
            this.isLandscape = window.innerWidth > window.innerHeight;
            this.isPortrait = window.innerHeight > window.innerWidth;
            // No longer showing rotation prompts - users can use any orientation
        };
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(handleOrientationChange, 500); // Delay to allow orientation to settle
        });
        window.addEventListener('resize', handleOrientationChange);
        
        // Initial orientation check
        handleOrientationChange();
        
        // Add fullscreen capabilities for mobile
        this.setupFullscreenMobile();
        
        // Virtual Joystick Setup
        this.setupVirtualJoystick();
        
        // Action buttons (spray and pause)
        const sprayBtn = document.getElementById('spray-btn');
        const pauseBtn = document.getElementById('pause-btn');

        if (sprayBtn) {
            sprayBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                hapticFeedback();
                if (!this.mobileControls.spray) {
                    this.mobileControls.sprayJustPressed = true;
                }
                this.mobileControls.spray = true;
                sprayBtn.classList.add('pressed');
            });
            sprayBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.mobileControls.spray = false;
                sprayBtn.classList.remove('pressed');
            });
            sprayBtn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.mobileControls.spray = false;
                sprayBtn.classList.remove('pressed');
            });
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                hapticFeedback();
                pauseBtn.classList.add('pressed');
            });
            pauseBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                pauseBtn.classList.remove('pressed');
                this.togglePause();
            });
            pauseBtn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                pauseBtn.classList.remove('pressed');
            });
            pauseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePause();
            });
        }
    }

    setupVirtualJoystick() {
        const joystickBase = document.getElementById('joystick-base');
        const joystickKnob = document.getElementById('joystick-knob');
        
        if (!joystickBase || !joystickKnob) return;
        
        this.joystick.base = joystickBase;
        this.joystick.knob = joystickKnob;
        
        // Get the center position of the joystick base
        const updateJoystickCenter = () => {
            const baseRect = joystickBase.getBoundingClientRect();
            this.joystick.centerX = baseRect.left + baseRect.width / 2;
            this.joystick.centerY = baseRect.top + baseRect.height / 2;
            this.joystick.maxDistance = Math.min(baseRect.width, baseRect.height) / 2 - 25; // Account for knob size
        };
        
        // Update center on resize/orientation change
        window.addEventListener('resize', updateJoystickCenter);
        updateJoystickCenter();
        
        // Helper function to update joystick position and mobile controls
        const updateJoystickPosition = (clientX, clientY) => {
            // Calculate precise delta from center
            const deltaX = clientX - this.joystick.centerX;
            const deltaY = clientY - this.joystick.centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Constrain to max distance while preserving direction precisely
            let constrainedX = deltaX;
            let constrainedY = deltaY;
            
            if (distance > this.joystick.maxDistance) {
                // Maintain exact direction when constraining to circle boundary
                const ratio = this.joystick.maxDistance / distance;
                constrainedX = deltaX * ratio;
                constrainedY = deltaY * ratio;
            }
            
            // Update knob position with sub-pixel precision
            this.joystick.knob.style.transform = `translate(-50%, -50%) translate(${constrainedX.toFixed(2)}px, ${constrainedY.toFixed(2)}px)`;
            
            // Add visual feedback for movement
            if (distance > this.joystick.deadZone * this.joystick.maxDistance) {
                if (!this.joystick.knob.classList.contains('moving')) {
                    // Haptic feedback when starting movement
                    if (navigator.vibrate) navigator.vibrate(5);
                }
                this.joystick.knob.classList.add('moving');
                this.joystick.base.classList.add('active');
            } else {
                this.joystick.knob.classList.remove('moving');
                this.joystick.base.classList.remove('active');
            }
            
            // Calculate normalized values (-1 to 1) with perfect circular precision
            // Ensure perfect circular motion by normalizing to unit circle when outside dead zone
            const deadZoneDistance = this.joystick.deadZone * this.joystick.maxDistance;
            
            if (distance > deadZoneDistance) {
                // For perfect angular precision, normalize to unit circle regardless of actual distance
                // This eliminates any quantization effects from pixel-level coordinates
                this.joystick.normalizedX = deltaX / distance; // Pure unit vector X
                this.joystick.normalizedY = deltaY / distance; // Pure unit vector Y
                
                // Scale by actual distance ratio for movement magnitude
                const distanceRatio = Math.min(distance, this.joystick.maxDistance) / this.joystick.maxDistance;
                this.joystick.movementX = this.joystick.normalizedX * distanceRatio;
                this.joystick.movementY = this.joystick.normalizedY * distanceRatio;
            } else {
                // In dead zone, set to zero
                this.joystick.normalizedX = 0;
                this.joystick.normalizedY = 0;
                this.joystick.movementX = 0;
                this.joystick.movementY = 0;
            }
            
            // Update mobile controls based on joystick position with dead zone
            const deadZone = this.joystick.deadZone;
            
            this.mobileControls.left = this.joystick.normalizedX < -deadZone;
            this.mobileControls.right = this.joystick.normalizedX > deadZone;
            this.mobileControls.up = this.joystick.normalizedY < -deadZone; // Moving joystick up = negative Y
            this.mobileControls.down = this.joystick.normalizedY > deadZone; // Moving joystick down = positive Y
            
            // Store current position
            this.joystick.currentX = constrainedX;
            this.joystick.currentY = constrainedY;
        };
        
        // Reset joystick to center
        const resetJoystick = () => {
            this.joystick.knob.style.transform = 'translate(-50%, -50%)';
            this.joystick.normalizedX = 0;
            this.joystick.normalizedY = 0;
            this.joystick.currentX = 0;
            this.joystick.currentY = 0;
            this.joystick.isDragging = false;
            
            // Clear all movement controls
            this.mobileControls.left = false;
            this.mobileControls.right = false;
            this.mobileControls.up = false;
            this.mobileControls.down = false;
            
            // Remove visual feedback classes
            this.joystick.knob.classList.remove('dragging', 'moving');
            this.joystick.base.classList.remove('active');
        };
        
        // Check if a touch point is within the joystick area
        const isTouchInJoystickArea = (clientX, clientY) => {
            const baseRect = joystickBase.getBoundingClientRect();
            const centerX = baseRect.left + baseRect.width / 2;
            const centerY = baseRect.top + baseRect.height / 2;
            const maxRadius = Math.min(baseRect.width, baseRect.height) / 2;
            
            const deltaX = clientX - centerX;
            const deltaY = clientY - centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            return distance <= maxRadius;
        };
        
        // Touch events for mobile
        joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (navigator.vibrate) navigator.vibrate(10);
            
            this.joystick.isDragging = true;
            this.joystick.knob.classList.add('dragging');
            
            const touch = e.touches[0];
            updateJoystickCenter(); // Update center position
            updateJoystickPosition(touch.clientX, touch.clientY);
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!this.joystick.isDragging) {
                // Check if any touch is within the joystick area and start tracking if so
                for (let i = 0; i < e.touches.length; i++) {
                    const touch = e.touches[i];
                    if (isTouchInJoystickArea(touch.clientX, touch.clientY)) {
                        this.joystick.isDragging = true;
                        this.joystick.knob.classList.add('dragging');
                        updateJoystickCenter();
                        updateJoystickPosition(touch.clientX, touch.clientY);
                        if (navigator.vibrate) navigator.vibrate(5);
                        break;
                    }
                }
                return;
            }
            
            e.preventDefault();
            
            // Find the touch that's controlling the joystick
            let controllingTouch = null;
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (isTouchInJoystickArea(touch.clientX, touch.clientY)) {
                    controllingTouch = touch;
                    break;
                }
            }
            
            if (controllingTouch) {
                updateJoystickPosition(controllingTouch.clientX, controllingTouch.clientY);
            } else {
                // No touch in joystick area, reset it
                resetJoystick();
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (!this.joystick.isDragging) return;
            
            // Check if there are still touches in the joystick area
            let stillTouchingJoystick = false;
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (isTouchInJoystickArea(touch.clientX, touch.clientY)) {
                    stillTouchingJoystick = true;
                    break;
                }
            }
            
            if (!stillTouchingJoystick) {
                e.preventDefault();
                resetJoystick();
            }
        });
        
        document.addEventListener('touchcancel', (e) => {
            if (!this.joystick.isDragging) return;
            e.preventDefault();
            resetJoystick();
        });
        
        // Mouse events for desktop testing
        joystickBase.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.joystick.isDragging = true;
            this.joystick.knob.classList.add('dragging');
            
            updateJoystickCenter(); // Update center position
            updateJoystickPosition(e.clientX, e.clientY);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.joystick.isDragging) return;
            e.preventDefault();
            updateJoystickPosition(e.clientX, e.clientY);
        });
        
        document.addEventListener('mouseup', (e) => {
            if (!this.joystick.isDragging) return;
            e.preventDefault();
            resetJoystick();
        });
        
        // Prevent context menu on joystick
        joystickBase.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    setupFullscreenMobile() {
        // Aggressive address bar hiding for mobile browsers
        const hideAddressBar = () => {
            if (this.isMobile) {
                // Multiple scroll attempts to ensure address bar is hidden
                const scrollToHide = () => {
                    window.scrollTo(0, 1);
                    setTimeout(() => window.scrollTo(0, 0), 50);
                    setTimeout(() => window.scrollTo(0, 1), 100);
                };
                
                scrollToHide();
                setTimeout(scrollToHide, 100);
                setTimeout(scrollToHide, 300);
                setTimeout(scrollToHide, 500);
                
                // Aggressive viewport height calculation
                const setViewportHeight = () => {
                    // Get actual viewport dimensions
                    const vh = window.innerHeight * 0.01;
                    const vw = window.innerWidth * 0.01;
                    
                    // Set CSS custom properties
                    document.documentElement.style.setProperty('--vh', `${vh}px`);
                    document.documentElement.style.setProperty('--vw', `${vw}px`);
                    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
                    document.documentElement.style.setProperty('--viewport-width', `${window.innerWidth}px`);
                    
                    // Force body height update
                    document.body.style.height = `${window.innerHeight}px`;
                    
                    // Chrome on Android specific
                    if (this.isAndroid) {
                        // Account for navigation bar
                        const actualHeight = window.screen?.height || window.innerHeight;
                        const visibleHeight = window.innerHeight;
                        const hasNavBar = actualHeight > visibleHeight;
                        
                        if (hasNavBar) {
                            document.documentElement.style.setProperty('--android-nav-height', `${actualHeight - visibleHeight}px`);
                        }
                    }
                    
                    // iOS Safari specific
                    if (this.isIOS) {
                        // Handle iOS safe areas and notches
                        const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0px';
                        const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0px';
                        
                        document.documentElement.style.setProperty('--ios-safe-top', safeAreaTop);
                        document.documentElement.style.setProperty('--ios-safe-bottom', safeAreaBottom);
                    }
                };
                
                setViewportHeight();
                
                // Multiple event listeners for different scenarios
                window.addEventListener('resize', () => {
                    setTimeout(setViewportHeight, 50);
                    setTimeout(setViewportHeight, 200);
                    setTimeout(scrollToHide, 100);
                });
                
                window.addEventListener('orientationchange', () => {
                    setTimeout(() => {
                        setViewportHeight();
                        scrollToHide();
                    }, 200);
                    setTimeout(() => {
                        setViewportHeight();
                        scrollToHide();
                    }, 500);
                    setTimeout(() => {
                        setViewportHeight();
                        scrollToHide();
                    }, 1000);
                });
                
                // Visual viewport API for better mobile support
                if ('visualViewport' in window) {
                    window.visualViewport.addEventListener('resize', () => {
                        const viewport = window.visualViewport;
                        document.documentElement.style.setProperty('--visual-viewport-height', `${viewport.height}px`);
                        document.documentElement.style.setProperty('--visual-viewport-width', `${viewport.width}px`);
                        setTimeout(scrollToHide, 50);
                    });
                }
                
                // Focus/blur events to handle keyboard/address bar changes
                window.addEventListener('focus', () => {
                    setTimeout(setViewportHeight, 100);
                    setTimeout(scrollToHide, 150);
                });
                
                window.addEventListener('blur', () => {
                    setTimeout(setViewportHeight, 100);
                });
            }
        };
        
        // Request fullscreen when game starts (if supported)
        const requestFullscreen = () => {
            const elem = document.documentElement;
            
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => {
                    console.log('Fullscreen request failed:', err);
                });
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            }
        };
        
        // Enhanced Android support with aggressive fullscreen
        const androidOptimizations = () => {
            if (this.isAndroid) {
                // Android-specific optimizations
                document.addEventListener('touchstart', function() {}, { passive: true });
                document.addEventListener('touchmove', function(e) {
                    e.preventDefault();
                }, { passive: false });
                
                // Prevent Android back button from closing the game
                window.addEventListener('beforeunload', (e) => {
                    if (this.gameStarted) {
                        e.preventDefault();
                        e.returnValue = '';
                        return '';
                    }
                });
                
                // Android keyboard handling and chrome UI hiding
                if ('visualViewport' in window) {
                    window.visualViewport.addEventListener('resize', () => {
                        const viewport = window.visualViewport;
                        document.documentElement.style.setProperty('--viewport-height', `${viewport.height}px`);
                        
                        // Force chrome to hide UI when keyboard is hidden
                        if (viewport.height > viewport.width * 0.6) {
                            setTimeout(() => {
                                window.scrollTo(0, 1);
                                window.scrollTo(0, 0);
                            }, 100);
                        }
                    });
                }
                
                // Chrome Android specific meta theme manipulation
                const chromeMetaTheme = document.querySelector('meta[name="theme-color"]');
                if (chromeMetaTheme) {
                    // Darker theme to encourage fullscreen mode
                    chromeMetaTheme.setAttribute('content', '#000000');
                }
                
                // Android Chrome immersive mode attempt
                if ('screen' in window && 'orientation' in window.screen) {
                    // Try to lock orientation to portrait and hide system UI
                    const lockOrientation = () => {
                        try {
                            window.screen.orientation.lock('portrait-primary').catch(() => {
                                console.log('Orientation lock not supported');
                            });
                        } catch (e) {
                            console.log('Screen orientation API not supported');
                        }
                    };
                    
                    // Attempt orientation lock after user interaction
                    document.addEventListener('touchstart', lockOrientation, { once: true });
                    document.addEventListener('click', lockOrientation, { once: true });
                }
                
                // Android system bar color (for devices that support it)
                try {
                    if ('setStatusBarStyle' in window) {
                        window.setStatusBarStyle('dark-content');
                    }
                    if ('setNavigationBarColor' in window) {
                        window.setNavigationBarColor('#000000');
                    }
                } catch (e) {
                    // Ignore if not available
                }
            }
        };
        
        // Add fullscreen button for mobile devices
        if (this.isMobile) {
            const fullscreenBtn = document.createElement('button');
            fullscreenBtn.innerHTML = this.isAndroid ? '📱' : '⛶';
            fullscreenBtn.id = 'fullscreen-btn';
            fullscreenBtn.title = this.isAndroid ? 'Enter Fullscreen' : 'Enter Fullscreen';
            fullscreenBtn.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 1000;
                background: rgba(74, 103, 65, 0.9);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px;
                font-size: 16px;
                cursor: pointer;
                display: none;
            `;
            
            fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    requestFullscreen();
                    if (this.isAndroid) {
                        // Additional Android fullscreen handling
                        setTimeout(() => {
                            window.screen?.orientation?.lock?.('portrait-primary').catch(() => {
                                console.log('Screen orientation lock not supported');
                            });
                        }, 100);
                    }
                    fullscreenBtn.style.display = 'none';
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    }
                }
            });
            
            document.body.appendChild(fullscreenBtn);
            
            // Show fullscreen button when game loads
            document.addEventListener('DOMContentLoaded', () => {
                if (this.isMobile) {
                    setTimeout(() => {
                        fullscreenBtn.style.display = 'block';
                    }, 1000);
                }
            });
        }
        
        // Handle PWA installation prompt with Android-specific messaging
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button with platform-specific text
            const installBtn = document.createElement('button');
            installBtn.innerHTML = this.isAndroid ? '📱 Add to Home Screen' : '📱 Install App';
            installBtn.id = 'install-btn';
            installBtn.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                z-index: 1000;
                background: rgba(65, 105, 225, 0.9);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                font-size: 12px;
                cursor: pointer;
            `;
            
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`User response to install prompt: ${outcome}`);
                    deferredPrompt = null;
                    installBtn.remove();
                }
            });
            
            document.body.appendChild(installBtn);
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                if (installBtn.parentNode) {
                    installBtn.remove();
                }
            }, 10000);
        });
        
        // Initialize optimizations
        androidOptimizations();
        hideAddressBar();
        
        // Continuous address bar hiding on interaction
        const continuousHide = () => {
            setTimeout(() => {
                window.scrollTo(0, 1);
                setTimeout(() => window.scrollTo(0, 0), 50);
            }, 100);
        };
        
        // Multiple triggers for address bar hiding
        document.addEventListener('click', continuousHide);
        document.addEventListener('touchstart', continuousHide);
        document.addEventListener('touchend', continuousHide);
        document.addEventListener('keydown', continuousHide);
        
        // Game-specific triggers
        this.input.on('pointerdown', continuousHide);
        this.input.on('pointerup', continuousHide);
        
        // Periodic aggressive hiding (every 2 seconds when game is active)
        if (this.isMobile) {
            setInterval(() => {
                if (this.gameStarted && !this.gamePaused) {
                    window.scrollTo(0, 1);
                    setTimeout(() => window.scrollTo(0, 0), 100);
                }
            }, 2000);
        }
    }

    startGame(isNewGame = false) {
        console.log('startGame called with isNewGame:', isNewGame);
        if (this.gameStarted) {
            console.log('startGame exiting early - gameStarted is true');
            return; // Prevent multiple starts
        }
        
        console.log('Starting game...');
        this.gameStarted = true;
        console.log('gameStarted set to:', this.gameStarted);
        
        // Check current button states to determine if music/sounds should be enabled
        const musicButton = document.getElementById('music-toggle');
        const soundButton = document.getElementById('sound-toggle');
        
        // Determine if music should be enabled based on button text
        const musicShouldBeOn = musicButton.textContent.includes('ON');
        
        // Determine if sounds should be enabled based on button text
        const soundsShouldBeOn = soundButton.textContent.includes('ON');
        this.soundsEnabled = soundsShouldBeOn;
        
        // Update sound button text to ensure consistent formatting
        if (this.soundsEnabled) {
            soundButton.textContent = '🔊 Sounds ON ';
        } else {
            soundButton.textContent = '🔇 Sounds OFF';
        }
        
        // Ensure audio context is properly initialized and resumed (required for modern browsers)
        if (this.audioContext) {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('Audio context resumed');
                    // Only start background music if button indicates it should be on
                    if (musicShouldBeOn) {
                        this.startBackgroundMusic();
                        musicButton.textContent = '🎵 Music ON ';
                    } else {
                        this.musicPlaying = false;
                        musicButton.textContent = '🔇 Music OFF';
                    }
                });
            } else {
                console.log('Audio context already running');
                // Only start background music if button indicates it should be on
                if (musicShouldBeOn) {
                    this.startBackgroundMusic();
                    musicButton.textContent = '🎵 Music ON ';
                } else {
                    this.musicPlaying = false;
                    musicButton.textContent = '🔇 Music OFF';
                }
            }
            console.log('Audio context state:', this.audioContext.state);
        } else {
            // Re-initialize audio if it wasn't created properly
            this.initAudio();
            // Only start background music if button indicates it should be on
            if (musicShouldBeOn) {
                this.startBackgroundMusic();
                musicButton.textContent = '🎵 Music ON ';
            } else {
                this.musicPlaying = false;
                musicButton.textContent = '🔇 Music OFF';
            }
        }
        
        // Hide start screen and show game UI
        document.body.classList.remove('start-screen-active');
        document.body.classList.add('game-started');
        
        // Only try to load saved game state if this is NOT a new game
        if (!isNewGame) {
            this.loadGameState();
        }
        
        // If no saved state was loaded or this is a new game, reset to defaults
        if (!this.gameStateLoaded || isNewGame) {
            // Reset game state
            this.score = 0;
            this.round = 1;
            this.roundActive = true; // For new games, start active immediately
            this.gamePaused = false;
        } else {
            // Game state was loaded, activate immediately for loaded games
            this.roundActive = true;
            this.gamePaused = false;
        }
        
        // Timer is now handled manually in update() method
        console.log('Using manual timer in update loop');
        
        // Immediately update UI to show starting time
        this.updateUI();
        
        // Start the first round
        console.log('About to call startRound()...');
        this.startRound();
        console.log('startRound() completed');
        
        // Play start game sound with a slight delay to ensure audio context is ready
        setTimeout(() => {
            this.playSound(523, 0.3, 'sine', 0.3); // C note
            setTimeout(() => this.playSound(659, 0.3, 'sine', 0.3), 150); // E note
            setTimeout(() => this.playSound(784, 0.5, 'sine', 0.3), 300); // G note
        }, 100);
    }

    startRound() {
        // Prevent multiple simultaneous calls
        if (this.roundStarting) {
            console.log('startRound() called but already in progress, ignoring');
            return;
        }
        
        this.roundStarting = true;
        this.vegetablesDropped = false; // Reset the vegetables dropped flag for new round
        console.log('Starting round', this.round);
        // All rounds now use the delay system
        this.roundActive = false; // Keep inactive until message disappears
        console.log('Setting roundActive to false for delay');
        
        this.timeLeft = 20;
        console.log('roundActive set to:', this.roundActive, 'timeLeft set to:', this.timeLeft);
        this.squirrelSpawnRate = Math.max(1000, 3000 - (this.round - 1) * 200);
        this.raccoonSpawnRate = Math.max(4000, 8000 - (this.round - 1) * 300);
        
        // Calculate dynamic speeds based on round - slower in early rounds
        const speedMultiplier = Math.min(1.0, 0.6 + (this.round - 1) * 0.08); // Start at 60% speed, increase 8% per round, cap at 100%
        this.squirrelSeekSpeed = Math.floor(100 * speedMultiplier);
        this.squirrelTapSpeed = Math.floor(120 * speedMultiplier);
        this.squirrelCarrySpeed = Math.floor(80 * speedMultiplier);
        this.squirrelFleeSpeed = Math.floor(150 * speedMultiplier);
        this.raccoonSeekSpeed = Math.floor(80 * speedMultiplier);
        this.raccoonCarrySpeed = Math.floor(80 * speedMultiplier);
        this.raccoonFleeSpeed = Math.floor(150 * speedMultiplier);
        
        // Calculate tap chance - disabled in round 1, then increases each round
        this.squirrelTapChance = this.round === 1 ? 0 : Math.min(0.002, 0.0005 + (this.round - 2) * 0.0003); // Start at 0% in round 1, 0.05% in round 2, increase 0.03% per round, cap at 0.2%
        
        // Clear existing enemies but preserve vegetables after round 1
        this.squirrels.clear(true, true);
        this.raccoons.clear(true, true);
        
        // Reset water tap
        this.waterEnabled = true;
        this.waterTapBody.setTexture('tap-body-on');
        this.waterTapHandle.setTexture('tap-handle-on');
        this.waterTapBody.setData('isOn', true);
        
        // Create vegetables only for the first round
        if (this.round === 1) {
            // First round: clear everything and create new vegetables
            this.vegetables.clear(true, true);
            const vegetableTypes = ['carrot', 'tomato', 'lettuce'];
            const numVegetables = 5; // Fixed number of vegetables per round
            
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
        } else {
            // For subsequent rounds, reactivate any existing vegetables that are still in the field
            let reactivatedCount = 0;
            this.vegetables.children.entries.forEach((vegetable, index) => {
                if (vegetable.active && vegetable.visible) {
                    const wasInPlay = vegetable.getData('inPlay');
                    vegetable.setData('inPlay', true);
                    reactivatedCount++;
                    console.log(`Reactivated vegetable ${index} at (${vegetable.x}, ${vegetable.y}) for round ${this.round} (was inPlay: ${wasInPlay})`);
                }
            });
            console.log(`Total vegetables reactivated: ${reactivatedCount}`);
        }
        
        // Count remaining vegetables (for all rounds)
        this.vegetablesLeft = 0;
        this.vegetables.children.entries.forEach(vegetable => {
            if (vegetable.getData('inPlay')) {
                this.vegetablesLeft++;
            }
        });
        
        console.log(`Round ${this.round}: Found ${this.vegetablesLeft} vegetables to protect`);
        
        this.updateUI();
        
        // Show round start notification and delay round activation
        let messageText;
        if (this.round === 1) {
            messageText = `🌱 Round ${this.round} - Let's Begin!\nDefend the vegetables!\n⏰ ${this.timeLeft} seconds`;
        } else {
            messageText = `🌱 Round ${this.round} - Here We Go!\n🥕 ${this.vegetablesLeft} vegetables to protect\n⏰ ${this.timeLeft} seconds`;
        }
        
        console.log('About to show message:', messageText);
        this.showMessage(messageText, 2000); // Show for 2 seconds
        console.log('showMessage called');
        
        // Only use delay system for subsequent rounds (not round 1)
        // Show "Get Ready!" message briefly before starting
        this.time.delayedCall(1500, () => {
            this.showMessage('🚀 Get Ready!', 800);
        });
        
        // Activate the round after all messages for all rounds
        this.time.delayedCall(2500, () => {
            this.roundActive = true;
            this.lastTimerUpdate = 0; // Reset timer when round becomes active
            this.roundStarting = false; // Round is now fully started
            
            // Re-enable animal-vegetable collision detection for new round
            this.squirrelVegetableCollision.active = true;
            this.raccoonVegetableCollision.active = true;
            
            console.log('Round activated! roundActive set to:', this.roundActive);
        });
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
        
        // Manual timer handling (more reliable than Phaser timer events)
        if (this.roundActive && !this.gamePaused) {
            if (!this.lastTimerUpdate) {
                this.lastTimerUpdate = time;
            }
            
            if (time - this.lastTimerUpdate >= 1000) { // 1 second passed
                this.timeLeft--;
                this.updateUI();
                this.lastTimerUpdate = time;
                
                console.log('Manual timer update - timeLeft:', this.timeLeft);
                
                // Don't immediately end round here - let the main round end logic handle it
                // This allows for proper vegetable dropping when timer expires
            }
        }
        
        // Handle pause toggle
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
        }

        // Handle quit game
        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            this.quitGame();
            return; // Exit early since we've quit
        }

        // Always stop gardener movement and reset limbs when paused, but allow movement during round start delay
        if (this.gamePaused) {
            this.gardener.setVelocity(0);
            
            // Reset limbs to rest position when paused
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
            
            // Reset mobile spray just pressed flag
            this.mobileControls.sprayJustPressed = false;
            
            return;
        }

        // Gardener movement (directional with arrow keys or mobile controls)
        this.gardener.setVelocity(0);
        let isMoving = false;
        
        // Get joystick analog values first to determine input mode
        // For movement: use movementX/Y which includes distance (variable speed)
        // For detection: use normalizedX/Y which are just direction unit vectors
        const joystickX = this.joystick && Math.abs(this.joystick.normalizedX) > this.joystick.deadZone ? this.joystick.normalizedX : 0;
        const joystickY = this.joystick && Math.abs(this.joystick.normalizedY) > this.joystick.deadZone ? this.joystick.normalizedY : 0;
        const isUsingJoystick = Math.abs(joystickX) > 0 || Math.abs(joystickY) > 0;
        
        // For movement with variable speed: use movementX/Y which include distance
        const joystickMovementX = this.joystick ? this.joystick.movementX : 0;
        const joystickMovementY = this.joystick ? this.joystick.movementY : 0;
        
        // For spray direction, use much more sensitive detection (ignore deadZone for spray precision)
        const joystickXForSpray = this.joystick ? this.joystick.normalizedX : 0;
        const joystickYForSpray = this.joystick ? this.joystick.normalizedY : 0;
        const isUsingJoystickForSpray = Math.abs(joystickXForSpray) > 0.05 || Math.abs(joystickYForSpray) > 0.05; // Much more sensitive (5% instead of 20%)
        
        // Combine keyboard and mobile controls (but not when joystick is providing analog input)
        const keyboardLeftPressed = this.cursors.left.isDown;
        const keyboardRightPressed = this.cursors.right.isDown;
        const keyboardUpPressed = this.cursors.up.isDown;
        const keyboardDownPressed = this.cursors.down.isDown;
        
        // Only use discrete mobile controls when joystick is not providing ANY input (including spray-sensitive input)
        const leftPressed = keyboardLeftPressed || (!isUsingJoystickForSpray && this.mobileControls.left);
        const rightPressed = keyboardRightPressed || (!isUsingJoystickForSpray && this.mobileControls.right);
        const upPressed = keyboardUpPressed || (!isUsingJoystickForSpray && this.mobileControls.up);
        const downPressed = keyboardDownPressed || (!isUsingJoystickForSpray && this.mobileControls.down);
        const sprayPressed = this.spaceKey.isDown || this.mobileControls.spray;
        
        // Check if player is currently spraying water
        const isSpraying = sprayPressed;
        
        // Track when spraying starts to determine initial facing direction
        if (isSpraying && !this.wasSpraying) {
            // Store the initial facing direction when spraying starts (convert to radians for comparison)
            this.initialFacingDown = this.gardenerAngle >= Phaser.Math.DegToRad(45) && this.gardenerAngle <= Phaser.Math.DegToRad(135);
        }
        this.wasSpraying = isSpraying;
        
        // Update spray indicator visibility and position
        this.sprayArrow.setPosition(this.gardener.x, this.gardener.y);
        this.sprayArrow.setVisible(isSpraying);
        
        if (isSpraying) {
            // When spraying with joystick, spray direction follows joystick direction directly
            if (isUsingJoystickForSpray) {
                // Calculate spray angle directly from joystick position with ultra-high precision
                // Use the spray-sensitive joystick values for perfect angle calculation
                // Store angle in radians for perfect precision (avoid degree conversion round-trip)
                const angleRad = Math.atan2(joystickYForSpray, joystickXForSpray);
                this.gardenerAngle = angleRad; // Store in radians for perfect precision
                
                // Set sprite rotation directly using the precise radian value
                this.sprayArrow.setRotation(angleRad);
                
                // Also move the character in the joystick direction while spraying (use variable speed)
                if (isUsingJoystick) {
                    const sprayMoveSpeed = 100; // Slower movement while spraying
                    // Use movement values for variable speed based on joystick distance
                    const velocityX = joystickMovementX * sprayMoveSpeed;
                    const velocityY = joystickMovementY * sprayMoveSpeed;
                    this.gardener.setVelocity(velocityX, velocityY);
                    isMoving = true;
                }
            } else {
                // Discrete button controls (original behavior for keyboard/d-pad)
                // Use the initial facing direction to determine rotation behavior
                const shouldReverseControls = this.initialFacingDown;
                
                let sprayVelocityX = 0;
                let sprayVelocityY = 0;
                
                if (leftPressed) {
                    if (shouldReverseControls) {
                        this.gardenerAngle += Phaser.Math.DegToRad(2); // Clockwise when initially facing down
                    } else {
                        this.gardenerAngle -= Phaser.Math.DegToRad(2); // Counter-clockwise otherwise
                    }
                    this.sprayArrow.setRotation(this.gardenerAngle); // Direct radian usage
                    
                    // Move left while spraying
                    sprayVelocityX = -150;
                    isMoving = true;
                }
                
                if (rightPressed) {
                    if (shouldReverseControls) {
                        this.gardenerAngle -= Phaser.Math.DegToRad(2); // Counter-clockwise when initially facing down
                    } else {
                        this.gardenerAngle += Phaser.Math.DegToRad(2); // Clockwise otherwise
                    }
                    this.sprayArrow.setRotation(this.gardenerAngle); // Direct radian usage
                    
                    // Move right while spraying
                    sprayVelocityX = 150;
                    isMoving = true;
                }
                
                if (upPressed) {
                    // Move up while spraying
                    sprayVelocityY = -150;
                    isMoving = true;
                }
                
                if (downPressed) {
                    // Move down while spraying
                    sprayVelocityY = 150;
                    isMoving = true;
                }
                
                // Apply the combined velocity for spraying movement
                if (isMoving) {
                    // Handle diagonal movement for spraying
                    if (sprayVelocityX !== 0 && sprayVelocityY !== 0) {
                        sprayVelocityX *= 0.707; // 1/√2 for consistent diagonal speed
                        sprayVelocityY *= 0.707;
                    }
                    this.gardener.setVelocity(sprayVelocityX, sprayVelocityY);
                }
            }
        } else {
            // When not spraying, use joystick for smooth movement or arrows for discrete movement
            let velocityX = 0;
            let velocityY = 0;
            
            if (isUsingJoystick) {
                // Smooth analog movement with joystick - speed varies with joystick distance
                const maxSpeed = 200;
                
                // Use movementX/Y which already include distance for variable speed
                // These values are scaled by how far the joystick is pushed (0 to 1)
                velocityX = joystickMovementX * maxSpeed;
                velocityY = joystickMovementY * maxSpeed;
                
                // Update gardener angle based on movement direction with high precision
                if (Math.abs(joystickMovementX) > 0 || Math.abs(joystickMovementY) > 0) {
                    // Store angle in radians for perfect precision (avoid degree conversion round-trip)
                    // Use normalized values for direction (not movement values which include distance)
                    this.gardenerAngle = Math.atan2(joystickY, joystickX);
                    isMoving = true;
                }
                
                // Reset movement tracking for discrete controls
                this.wasMovingLeft = false;
                this.wasMovingRight = false;
                this.wasMovingUp = false;
                this.wasMovingDown = false;
            } else {
                // Discrete movement with arrow keys/buttons (original behavior)
                // Only update gardener angle if we're starting a new movement (not if already moving in that direction)
                // This preserves the spray rotation angle when transitioning from spraying to movement
                if (leftPressed) {
                    velocityX = -200;
                    // Only set angle if we weren't already moving left or if this is a fresh movement
                    if (!this.wasMovingLeft) {
                        this.gardenerAngle = Math.PI; // Face left for spray direction (180° in radians)
                    }
                    this.wasMovingLeft = true;
                    isMoving = true;
                } else {
                    this.wasMovingLeft = false;
                }
                
                if (rightPressed) {
                    velocityX = 200;
                    // Only set angle if we weren't already moving right or if this is a fresh movement
                    if (!this.wasMovingRight) {
                        this.gardenerAngle = 0; // Face right for spray direction
                    }
                    this.wasMovingRight = true;
                    isMoving = true;
                } else {
                    this.wasMovingRight = false;
                }
                
                if (upPressed) {
                    velocityY = -200;
                    // Only set angle if we weren't already moving up or if this is a fresh movement
                    if (!this.wasMovingUp) {
                        this.gardenerAngle = -Math.PI/2; // Face up for spray direction (-90° in radians)
                    }
                    this.wasMovingUp = true;
                    isMoving = true;
                } else {
                    this.wasMovingUp = false;
                }
                
                if (downPressed) {
                    velocityY = 200;
                    // Only set angle if we weren't already moving down or if this is a fresh movement
                    if (!this.wasMovingDown) {
                        this.gardenerAngle = Math.PI/2; // Face down for spray direction (90° in radians)
                    }
                    this.wasMovingDown = true;
                    isMoving = true;
                } else {
                    this.wasMovingDown = false;
                }
                
                // Handle diagonal movement for discrete controls
                if ((leftPressed || rightPressed) && (upPressed || downPressed)) {
                    // Reduce velocity for diagonal movement to maintain consistent speed
                    velocityX *= 0.707; // 1/√2
                    velocityY *= 0.707;
                    
                    // Set angle for diagonal directions in radians
                    if (leftPressed && upPressed) {
                        this.gardenerAngle = -3*Math.PI/4; // Up-left (-135° in radians)
                    } else if (rightPressed && upPressed) {
                        this.gardenerAngle = -Math.PI/4; // Up-right (-45° in radians)
                    } else if (leftPressed && downPressed) {
                        this.gardenerAngle = 3*Math.PI/4; // Down-left (135° in radians)
                    } else if (rightPressed && downPressed) {
                        this.gardenerAngle = Math.PI/4; // Down-right (45° in radians)
                    }
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
        
        // Continuous water spray while holding spacebar/spray button
        const sprayHeld = this.spaceKey.isDown || this.mobileControls.spray;
        if (sprayHeld && this.waterEnabled) {
            // Different spray strategies for analog vs discrete input
            const currentAngle = this.gardenerAngle;
            let shouldSpray = false;
            
            // Always spray on first activation
            if (!this.lastSprayTime) {
                shouldSpray = true;
            } else {
                const timeSinceLastSpray = time - this.lastSprayTime;
                const minInterval = 60; // Even faster minimum interval for ultra-smooth spray
                
                if (timeSinceLastSpray >= minInterval) {
                    if (isUsingJoystickForSpray) {
                        // For analog joystick input: ultra-fine distribution with hybrid timing
                        if (this.lastSprayAngle !== null) {
                            // Calculate the shortest angular distance (handling wrap-around)
                            let angleDiff = Math.abs(currentAngle - this.lastSprayAngle);
                            if (angleDiff > Math.PI) {
                                angleDiff = 2 * Math.PI - angleDiff; // Take shorter path around circle
                            }
                            
                            // Ultra-fine angle threshold (2.5 degrees) for perfect distribution
                            const ultraFineAngleThreshold = Math.PI / 72; // 2.5 degrees in radians
                            shouldSpray = angleDiff >= ultraFineAngleThreshold;
                            
                            // Fallback: always spray after small time interval to guarantee coverage
                            if (!shouldSpray && timeSinceLastSpray >= 100) {
                                shouldSpray = true;
                            }
                        } else {
                            shouldSpray = true;
                        }
                    } else {
                        // For discrete controls: time-based spray with angle validation
                        // Use shorter time intervals to fill gaps between discrete angles
                        const discreteInterval = 110; // Shorter intervals for discrete controls
                        if (timeSinceLastSpray >= discreteInterval) {
                            shouldSpray = true;
                        } else if (this.lastSprayAngle !== null) {
                            // Also spray if angle changed (for direction changes)
                            let angleDiff = Math.abs(currentAngle - this.lastSprayAngle);
                            if (angleDiff > Math.PI) {
                                angleDiff = 2 * Math.PI - angleDiff;
                            }
                            // Any significant angle change for discrete controls
                            const discreteAngleThreshold = Math.PI / 12; // 15 degrees
                            shouldSpray = angleDiff >= discreteAngleThreshold;
                        }
                    }
                }
                
                // Ultra-aggressive fallback: maximum time for joystick is very short
                const maxInterval = isUsingJoystickForSpray ? 120 : 130; // Very short for joystick
                if (timeSinceLastSpray >= maxInterval) {
                    shouldSpray = true;
                }
            }
            
            if (shouldSpray) {
                this.sprayWater();
                this.lastSprayTime = time;
                this.lastSprayAngle = currentAngle;
            }
        }

        // Only spawn animals and run timer when round is actually active
        if (this.roundActive) {
            // Spawn squirrels
            if (time - this.lastSquirrelSpawn > this.squirrelSpawnRate) {
                this.spawnSquirrel();
                this.lastSquirrelSpawn = time;
            }

            // Spawn raccoons (less frequently and not in first round)
            if (this.round > 1 && time - this.lastRaccoonSpawn > this.raccoonSpawnRate) {
                this.spawnRaccoon();
                this.lastRaccoonSpawn = time;
            }
        }

        // Update squirrels (skip if stopped)
        this.squirrels.children.entries.forEach(squirrel => {
            if (squirrel.getData('state') !== 'stopped') {
                this.updateSquirrel(squirrel);
            }
        });

        // Update raccoons (skip if stopped)
        this.raccoons.children.entries.forEach(raccoon => {
            if (raccoon.getData('state') !== 'stopped') {
                this.updateRaccoon(raccoon);
            }
        });

        // Only check win/lose conditions when round is active
        if (this.roundActive) {
            // Check win/lose conditions
            // Count all vegetables still in play (either in field or being carried)
            const vegetablesInField = this.vegetables.children.entries.filter(veg => 
                veg.active && veg.getData('inPlay')
            ).length;
            const vegetablesBeingCarried = this.countVegetablesBeingCarried();
            const totalVegetablesInPlay = vegetablesInField + vegetablesBeingCarried;
            
            // Simple round end logic
            if (this.timeLeft <= 0) {
                // Time expired - always drop any carried vegetables first (but only once)
                if (vegetablesBeingCarried > 0 && !this.vegetablesDropped) {
                    console.log(`Time expired - dropping ${vegetablesBeingCarried} carried vegetables`);
                    this.vegetablesDropped = true; // Set flag to prevent multiple drops
                    
                    // Disable animal-vegetable collision detection to prevent re-grabbing
                    this.squirrelVegetableCollision.active = false;
                    this.raccoonVegetableCollision.active = false;
                    
                    // Stop all animal movement and collision detection before dropping vegetables
                    this.squirrels.children.entries.forEach(squirrel => {
                        squirrel.setVelocity(0);
                        squirrel.setData('state', 'stopped');
                    });
                    this.raccoons.children.entries.forEach(raccoon => {
                        raccoon.setVelocity(0);
                        raccoon.setData('state', 'stopped');
                    });
                    
                    this.dropAllCarriedVegetables();
                    
                    // Wait a moment for vegetables to be properly registered, then end round
                    this.time.delayedCall(100, () => {
                        console.log(`Time expired - ending round after dropping vegetables`);
                        this.endRound();
                    });
                } else if (vegetablesBeingCarried === 0 && !this.roundEnding) {
                    // No vegetables being carried or already dropped, end round
                    console.log(`Time expired - ending round`);
                    this.endRound();
                }
            } else if (totalVegetablesInPlay === 0) {
                // All vegetables gone before time expired
                console.log(`All vegetables gone - ending round`);
                this.endRound();
            }
        }
        
        // Reset mobile spray just pressed flag at end of frame
        this.mobileControls.sprayJustPressed = false;
    }

    countVegetablesBeingCarried() {
        let carriedCount = 0;
        
        // Count vegetables carried by squirrels
        this.squirrels.children.entries.forEach((squirrel, index) => {
            const targetVegetable = squirrel.getData('targetVegetable');
            if (targetVegetable && targetVegetable.active) {
                carriedCount++;
                console.log(`DEBUG: Squirrel ${index} carrying vegetable at (${targetVegetable.x}, ${targetVegetable.y}), squirrel at (${squirrel.x}, ${squirrel.y})`);
            }
        });
        
        // Count vegetables carried by raccoons
        this.raccoons.children.entries.forEach((raccoon, index) => {
            const carriedVegetables = raccoon.getData('carriedVegetables') || [];
            const activeCarried = carriedVegetables.filter(veg => veg && veg.active);
            carriedCount += activeCarried.length;
            if (activeCarried.length > 0) {
                console.log(`DEBUG: Raccoon ${index} carrying ${activeCarried.length} vegetables at (${raccoon.x}, ${raccoon.y})`);
            }
        });
        
        console.log(`DEBUG: countVegetablesBeingCarried() returning: ${carriedCount}`);
        return carriedCount;
    }

    dropAllCarriedVegetables() {
        let droppedCount = 0;
        let lostCount = 0;
        
        // Define play boundaries
        const playBounds = {
            left: 50,
            right: 750,
            top: 50,
            bottom: 550
        };
        
        // Drop vegetables carried by squirrels
        this.squirrels.children.entries.forEach(squirrel => {
            const targetVegetable = squirrel.getData('targetVegetable');
            if (targetVegetable && targetVegetable.active) {
                // Clear the squirrel's reference FIRST to prevent position updates
                squirrel.setData('targetVegetable', null);
                squirrel.setData('state', 'seeking');
                
                // Check if squirrel is outside play boundaries
                const isOutside = squirrel.x < playBounds.left || squirrel.x > playBounds.right || 
                                squirrel.y < playBounds.top || squirrel.y > playBounds.bottom;
                
                if (isOutside) {
                    // Animal is outside boundaries - vegetable is lost (out of play)
                    targetVegetable.setData('inPlay', false);
                    targetVegetable.setVisible(false);
                    targetVegetable.setActive(false);
                    lostCount++;
                    console.log(`Vegetable lost - squirrel at (${squirrel.x}, ${squirrel.y}) outside play boundaries, vegetable marked as out of play`);
                } else {
                    // Animal is within boundaries - drop vegetable normally
                    targetVegetable.x = Math.max(playBounds.left, Math.min(playBounds.right, squirrel.x));
                    targetVegetable.y = Math.max(playBounds.top, Math.min(playBounds.bottom, squirrel.y));
                    targetVegetable.setData('inPlay', true);
                    targetVegetable.setVisible(true);
                    targetVegetable.setActive(true);
                    targetVegetable.alpha = 1; // Ensure full opacity
                    
                    // Ensure it has a physics body and is enabled
                    if (targetVegetable.body) {
                        targetVegetable.body.enable = true;
                    }
                    
                    // Make sure it's part of the vegetables group
                    const wasInGroup = this.vegetables.contains(targetVegetable);
                    if (!wasInGroup) {
                        this.vegetables.add(targetVegetable);
                    }
                    
                    droppedCount++;
                    console.log(`Dropped squirrel vegetable at (${targetVegetable.x}, ${targetVegetable.y}) [was at squirrel position (${squirrel.x}, ${squirrel.y})], visible: ${targetVegetable.visible}, active: ${targetVegetable.active}, inPlay: ${targetVegetable.getData('inPlay')}, wasInGroup: ${wasInGroup}, nowInGroup: ${this.vegetables.contains(targetVegetable)}`);
                }
            }
        });
        
        // Drop vegetables carried by raccoons
        this.raccoons.children.entries.forEach(raccoon => {
            const carriedVegetables = raccoon.getData('carriedVegetables') || [];
            
            // Clear the raccoon's references FIRST to prevent position updates
            raccoon.setData('carriedVegetables', []);
            raccoon.setData('vegetablesCarried', 0);
            raccoon.setData('state', 'seeking');
            
            // Check if raccoon is outside play boundaries
            const isOutside = raccoon.x < playBounds.left || raccoon.x > playBounds.right || 
                            raccoon.y < playBounds.top || raccoon.y > playBounds.bottom;
            
            carriedVegetables.forEach(vegetable => {
                if (vegetable && vegetable.active) {
                    if (isOutside) {
                        // Animal is outside boundaries - vegetable is lost (out of play)
                        vegetable.setData('inPlay', false);
                        vegetable.setVisible(false);
                        vegetable.setActive(false);
                        lostCount++;
                        console.log(`Vegetable lost - raccoon at (${raccoon.x}, ${raccoon.y}) outside play boundaries, vegetable marked as out of play`);
                    } else {
                        // Animal is within boundaries - drop vegetable normally
                        vegetable.x = Math.max(playBounds.left, Math.min(playBounds.right, raccoon.x));
                        vegetable.y = Math.max(playBounds.top, Math.min(playBounds.bottom, raccoon.y));
                        vegetable.setData('inPlay', true);
                        vegetable.setVisible(true);
                        vegetable.setActive(true);
                        vegetable.alpha = 1; // Ensure full opacity
                        
                        // Ensure it has a physics body and is enabled
                        if (vegetable.body) {
                            vegetable.body.enable = true;
                        }
                        
                        // Make sure it's part of the vegetables group
                        const wasInGroup = this.vegetables.contains(vegetable);
                        if (!wasInGroup) {
                            this.vegetables.add(vegetable);
                        }
                        
                        droppedCount++;
                        console.log(`Dropped raccoon vegetable at (${vegetable.x}, ${vegetable.y}) [was at raccoon position (${raccoon.x}, ${raccoon.y})], visible: ${vegetable.visible}, active: ${vegetable.active}, inPlay: ${vegetable.getData('inPlay')}, wasInGroup: ${wasInGroup}, nowInGroup: ${this.vegetables.contains(vegetable)}`);
                    }
                }
            });
        });
        
        console.log(`Dropped ${droppedCount} vegetables back into the play field, ${lostCount} vegetables lost outside boundaries`);
        
        // Capture immediate post-drop positions for debugging
        console.log('=== IMMEDIATE POST-DROP POSITIONS ===');
        this.vegetables.children.entries.forEach((vegetable, index) => {
            if (vegetable.active && vegetable.getData('inPlay')) {
                console.log(`Post-drop V${index}: (${vegetable.x}, ${vegetable.y})`);
            }
        });
        
        // Update the vegetable count immediately
        this.updateVegetableCount();
        
        // Force a UI update to reflect the new vegetable count
        this.updateUI();
        
        // Add a small delay to check for any physics-induced position changes
        this.time.delayedCall(100, () => {
            console.log('=== POSITIONS AFTER 100ms (physics settle) ===');
            this.vegetables.children.entries.forEach((vegetable, index) => {
                if (vegetable.active && vegetable.getData('inPlay')) {
                    console.log(`After-physics V${index}: (${vegetable.x}, ${vegetable.y})`);
                }
            });
        });
    }
    
    updateVegetableCount() {
        this.vegetablesLeft = 0;
        let debugInfo = [];
        this.vegetables.children.entries.forEach((vegetable, index) => {
            const active = vegetable.active;
            const inPlay = vegetable.getData('inPlay');
            debugInfo.push(`V${index}: active=${active}, inPlay=${inPlay}`);
            if (active && inPlay) {
                this.vegetablesLeft++;
            }
        });
        console.log(`Updated vegetable count: ${this.vegetablesLeft} vegetables in play (${debugInfo.join(', ')})`);
    }

    sprayWater() {
        // Create a stream of water droplets that project outward
        const streamLength = 8; // Number of water droplets in the stream
        const dropletSpacing = 20; // Distance between droplets along the stream
        const baseDistance = 40; // Starting distance from gardener
        
        for (let i = 0; i < streamLength; i++) {
            // Calculate the position along the stream for this droplet
            const distanceFromGardener = baseDistance + (i * dropletSpacing);
            // Use the radian angle directly for perfect precision (no degree conversion round-trip)
            const sprayX = this.gardener.x + Math.cos(this.gardenerAngle) * distanceFromGardener;
            const sprayY = this.gardener.y + Math.sin(this.gardenerAngle) * distanceFromGardener;
            
            // Delay each droplet to create the stream effect
            this.time.delayedCall(i * 30, () => {
                // Create water droplet at the calculated position
                const water = this.physics.add.sprite(sprayX, sprayY, 'water');
                
                // Set velocity to continue moving in the same direction using precise radian angle
                const velocityX = Math.cos(this.gardenerAngle) * 350;
                const velocityY = Math.sin(this.gardenerAngle) * 350;
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
        
        // Random chance for squirrel to go to tap if it's on and not in cooldown (scaled by round)
        if (state === 'seeking' && this.waterEnabled && tapCooldown <= 0 && Math.random() < this.squirrelTapChance) {
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
                this.physics.moveToObject(squirrel, nearestVegetable, this.squirrelSeekSpeed);
                isMoving = true;
            }
        } else if (state === 'goingToTap') {
            // Move towards water tap
            this.physics.moveToObject(squirrel, this.waterTapBody, this.squirrelTapSpeed);
            isMoving = true;
            
            // Check if close enough to tap
            const distance = Phaser.Math.Distance.Between(
                squirrel.x, squirrel.y, this.waterTapBody.x, this.waterTapBody.y
            );
            
            if (distance < 30) {
                if (this.waterTapBody.getData('isOn')) {
                    // Turn off the tap
                    this.waterEnabled = false;
                    this.waterTapBody.setTexture('tap-body-off');
                    this.waterTapHandle.setTexture('tap-handle-off');
                    this.waterTapBody.setData('isOn', false);
                    
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
            if (!this.waterEnabled || !this.waterTapBody.getData('isOn')) {
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
                squirrel.setVelocity((dirX / length) * this.squirrelCarrySpeed, (dirY / length) * this.squirrelCarrySpeed);
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
                squirrel.setVelocity((dirX / length) * this.squirrelFleeSpeed, (dirY / length) * this.squirrelFleeSpeed);
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
                    this.physics.moveToObject(raccoon, nearestVegetable, this.raccoonSeekSpeed);
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
                raccoon.setVelocity((dirX / length) * this.raccoonCarrySpeed, (dirY / length) * this.raccoonCarrySpeed);
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
                raccoon.setVelocity((dirX / length) * this.raccoonFleeSpeed, (dirY / length) * this.raccoonFleeSpeed);
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
            this.waterTapBody.setTexture('tap-body-off');
            this.waterTapHandle.setTexture('tap-handle-off');
            tap.setData('isOn', false);
            
            // Squirrel runs away after turning off tap
            squirrel.setData('state', 'fleeing');
            squirrel.setData('targetVegetable', null);
            
            // Play tap sound
            this.playTapSound();
        }
    }

    gardenerUseTap(gardener, tap) {
        // Check for both keyboard and mobile spray input
        const sprayJustPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.mobileControls.sprayJustPressed;
        
        // Only allow turning on tap if it's off and player presses spacebar/spray button
        if (!tap.getData('isOn') && sprayJustPressed) {
            this.waterEnabled = true;
            this.waterTapBody.setTexture('tap-body-on');
            this.waterTapHandle.setTexture('tap-handle-on');
            tap.setData('isOn', true);
            
            // Play tap sound
            this.playTapSound();
        }
    }

    checkGardenerTapInteraction() {
        // Check if gardener is close enough to tap
        const distance = Phaser.Math.Distance.Between(
            this.gardener.x, this.gardener.y, this.waterTapBody.x, this.waterTapBody.y
        );
        
        // If close to tap and tap is off and spacebar/spray button pressed
        const sprayJustPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.mobileControls.sprayJustPressed;
        if (distance < 40 && !this.waterTap.getData('isOn') && sprayJustPressed) {
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
        // Don't grab vegetables if squirrel is stopped (round ending) or if round is ending
        if (squirrel.getData('state') === 'seeking' && vegetable.getData('inPlay') && !this.vegetablesDropped) {
            // Check actual distance to ensure squirrel is close enough
            const distance = Phaser.Math.Distance.Between(squirrel.x, squirrel.y, vegetable.x, vegetable.y);
            if (distance <= 25) { // Require closer proximity for grabbing
                squirrel.setData('state', 'carrying');
                squirrel.setData('hasVegetable', true);
                squirrel.setData('targetVegetable', vegetable);
                vegetable.setData('inPlay', false);
                
                // Decrement vegetables count when grabbed (not when escaped)
                this.vegetablesLeft--;
                this.updateUI();
                
                // Play vegetable grab sound
                this.playVegetableGrabSound();
            }
        }
    }

    raccoonGrabVegetable(raccoon, vegetable) {
        // Don't grab vegetables if raccoon is stopped (round ending) or if round is ending
        if (raccoon.getData('state') === 'seeking' && vegetable.getData('inPlay') && !this.vegetablesDropped) {
            // Check actual distance to ensure raccoon is close enough
            const distance = Phaser.Math.Distance.Between(raccoon.x, raccoon.y, vegetable.x, vegetable.y);
            if (distance <= 30) { // Require closer proximity for grabbing (raccoons slightly larger)
                const carriedVegetables = raccoon.getData('carriedVegetables');
                
                // Can only carry 2 vegetables
                if (carriedVegetables.length < 2) {
                    vegetable.setData('inPlay', false);
                    
                    // Decrement vegetables count when grabbed (not when escaped)
                    this.vegetablesLeft--;
                    this.updateUI();
                    
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
            this.updateUI();
            
            // Play sad sound when squirrel escapes with vegetable
            this.playSquirrelEscapeSound();
        }
        squirrel.destroy();
    }

    raccoonEscape(raccoon) {
        const carriedVegetables = raccoon.getData('carriedVegetables');
        const vegetablesCarried = raccoon.getData('vegetablesCarried');
        
        // Destroy all carried vegetables
        carriedVegetables.forEach(vegetable => {
            if (vegetable && vegetable.active) {
                vegetable.destroy();
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
        console.log('quitGame called, gameStarted:', this.gameStarted);
        
        // Always allow quitting, regardless of game state
        console.log('Quitting game...');
        
        // Reset game state
        this.gameStarted = false;
        this.roundActive = false;
        this.gamePaused = false;
        this.score = 0;
        this.round = 1;
        this.timeLeft = 20;
        this.lastTimerUpdate = 0; // Reset manual timer
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
        this.waterTapBody.setTexture('tap-body-on');
        this.waterTapHandle.setTexture('tap-handle-on');
        this.waterTapBody.setData('isOn', true);
        
        // Stop background music (but don't change button state)
        this.stopBackgroundMusic();
        
        // Don't reset button states - preserve user preferences
        
        // Resume physics if paused
        if (this.physics.world.isPaused) {
            this.physics.resume();
        }
        
        // Show start screen and hide game UI
        console.log('Removing game-started class');
        document.body.classList.remove('game-started');
        document.body.classList.remove('game-over');
        document.body.classList.add('start-screen-active');
        console.log('Class removed, body classes:', document.body.className);
        
        // Reset UI
        this.updateUI();
        console.log('UI updated after quit');
        
        // Play quit sound
        this.playSound(400, 0.2, 'triangle', 0.2);
        setTimeout(() => this.playSound(300, 0.2, 'triangle', 0.15), 100);
        setTimeout(() => this.playSound(200, 0.3, 'triangle', 0.1), 200);
    }

    updateTimer() {
        console.log('Timer called - gameStarted:', this.gameStarted, 'roundActive:', this.roundActive, 'gamePaused:', this.gamePaused);
        if (this.gameStarted && this.roundActive && !this.gamePaused) {
            this.timeLeft--;
            console.log('Timer decremented to:', this.timeLeft);
            this.updateUI();
            
            // Don't call endRound here - let the main update logic handle it
        }
    }

    endRound() {
        // Prevent multiple simultaneous calls
        if (this.roundEnding) {
            console.log('endRound() called but already in progress, ignoring');
            return;
        }
        
        this.roundEnding = true;
        this.roundActive = false;
        
        // First, make sure we have the most up-to-date vegetable count
        this.updateVegetableCount();
        
        // Count vegetables actually still in the field (not grabbed by animals)
        const vegetablesInField = this.vegetables.children.entries.filter(veg => 
            veg.active && veg.getData('inPlay')
        ).length;
        const pointsScored = vegetablesInField;
        this.score += pointsScored;
        
        // Store current round number before any modifications
        const currentRound = this.round;
        
        // Determine why the round ended
        const roundEndedByTime = this.timeLeft <= 0;
        const vegetablesBeingCarried = this.countVegetablesBeingCarried();
        const totalVegetablesInPlay = vegetablesInField + vegetablesBeingCarried;
        const roundEndedByVegetables = totalVegetablesInPlay === 0;
        
        console.log(`Round ${this.round} ended:`, 
            roundEndedByTime ? 'Time expired' : 'All vegetables saved/taken', 
            `VegetablesInField: ${vegetablesInField}, BeingCarried: ${vegetablesBeingCarried}, Total: ${totalVegetablesInPlay}, Score gained: ${pointsScored}`);
        
        // Debug: Check positions right before final status
        console.log('=== POSITIONS AT ROUND END ===');
        this.vegetables.children.entries.forEach((vegetable, index) => {
            if (vegetable.active && vegetable.getData('inPlay')) {
                console.log(`Round-end V${index}: (${vegetable.x}, ${vegetable.y})`);
            }
        });
        
        // Debug: List all vegetables and their states
        console.log('=== All vegetables status ===');
        this.vegetables.children.entries.forEach((veg, index) => {
            console.log(`Vegetable ${index}: active=${veg.active}, visible=${veg.visible}, inPlay=${veg.getData('inPlay')}, position=(${veg.x}, ${veg.y})`);
        });
        
        console.log(`DEBUG: About to create round end message - this.round=${this.round}, pointsScored=${pointsScored}`);
        
        // Show round end notification
        let roundEndMessage;
        if (roundEndedByTime) {
            roundEndMessage = `⏰ Time's Up!\nRound ${currentRound} Complete\n🥕 ${pointsScored} vegetables saved\n+${pointsScored} points`;
        } else {
            if (pointsScored > 0) {
                roundEndMessage = `🎉 Round ${currentRound} Complete!\n🥕 ${pointsScored} vegetables defended\n+${pointsScored} points`;
            } else {
                roundEndMessage = `� Round ${this.round} Failed!\nAll vegetables stolen!\n+0 points`;
            }
        }
        
        console.log(`DEBUG: Created round end message: "${roundEndMessage}"`);
        this.showMessage(roundEndMessage, 3000);
        
        // Check for game over: only if no vegetables saved AND no vegetables remain for next round AND time didn't expire
        if (pointsScored === 0 && totalVegetablesInPlay === 0 && this.timeLeft > 0) {
            console.log('=== GAME OVER: All vegetables stolen and none remain ===');
            this.gameOver();
            return;
        }
        
        this.round++;
        
        // Save game state automatically
        this.saveGameState('autosave');
        
        // Play round end sound
        this.playRoundEndSound();
        
        // Show round summary and start next round
        this.time.delayedCall(2000, () => {
            this.startRound();
        });
        
        this.updateUI();
        
        // Reset the flag after everything is done
        this.time.delayedCall(2100, () => {
            this.roundEnding = false;
        });
    }

    gameOver() {
        console.log('Game Over triggered');
        
        // Set game over state
        this.gameStarted = false;
        this.roundActive = false;
        this.roundEnding = false; // Reset the flag
        this.roundStarting = false; // Reset the flag
        this.vegetablesDropped = false; // Reset the flag
        this.gamePaused = false;
        
        // Check and save high score
        this.checkAndSaveHighScore();
        
        // Stop background music
        this.stopBackgroundMusic();
        
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
        this.gardener.setData('animationTimer', 0);
        
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
        this.waterTapBody.setTexture('tap-body-on');
        this.waterTapHandle.setTexture('tap-handle-on');
        this.waterTapBody.setData('isOn', true);
        
        // Resume physics if paused
        if (this.physics.world.isPaused) {
            this.physics.resume();
        }
        
        // Update final score display
        document.getElementById('final-score-display').textContent = `Final Score: ${this.score}`;
        document.getElementById('final-round-display').textContent = `Reached Round: ${this.round}`;
        
        // Show game over screen
        document.body.classList.remove('game-started');
        document.body.classList.add('game-over');
        
        // Play game over sound sequence
        this.playSound(200, 0.5, 'triangle', 0.3);
        setTimeout(() => this.playSound(150, 0.5, 'triangle', 0.25), 200);
        setTimeout(() => this.playSound(100, 0.8, 'triangle', 0.2), 400);
        
        console.log('Game Over screen shown');
    }

    startNewGame() {
        console.log('Starting new game from game over screen...');
        
        // Reset all game state including gameStarted flag
        this.gameStarted = false; // Reset this so startGame() doesn't exit early
        console.log('Reset gameStarted to:', this.gameStarted);
        this.score = 0;
        this.round = 1;
        this.timeLeft = 20;
        this.lastTimerUpdate = 0;
        this.vegetablesLeft = 0;
        
        // Hide game over screen and start screen, show game UI
        document.body.classList.remove('game-over');
        document.body.classList.remove('start-screen-active');
        document.body.classList.add('game-started');
        
        // Start the game normally but skip loading saved state
        console.log('About to call startGame(true)...');
        this.startGame(true); // Pass true to indicate this is a new game
        console.log('startGame(true) completed');
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
            pauseStatus.textContent = '⏸️ PAUSED';
            pauseStatus.classList.add('visible');
        } else {
            pauseStatus.classList.remove('visible');
        }
    }

    updateMobileControlStyling(isSpraying) {
        // Update virtual joystick styling to indicate spray mode
        const joystickBase = document.getElementById('joystick-base');
        const joystickKnob = document.getElementById('joystick-knob');
        
        if (joystickBase && joystickKnob) {
            if (isSpraying) {
                // Add spray styling to joystick when spraying
                if (!joystickBase.classList.contains('spraying')) {
                    // Haptic feedback when entering spray mode
                    if (navigator.vibrate) navigator.vibrate([15, 10, 15]);
                }
                joystickBase.classList.add('spraying');
                joystickKnob.classList.add('spraying');
            } else {
                // Remove spray styling when not spraying
                joystickBase.classList.remove('spraying');
                joystickKnob.classList.remove('spraying');
            }
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600,
        // Better mobile handling
        fullscreenTarget: 'game',
        expandParent: false
    },
    input: {
        keyboard: {
            capture: [] // Don't capture any keys globally, allowing DOM inputs to work
        }
    },
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
