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
        this.lastTimerUpdate = 0; // For manual timer handling
        this.roundActive = false; // Start as false until game is started
        this.gamePaused = false;
        this.gameStarted = false; // New property to track if game has been started
        this.gardenerAngle = 0; // Track gardener's rotation angle
        this.audioContext = null; // For sound effects
        this.musicGainNode = null; // For background music
        this.musicPlaying = false;
        this.soundsEnabled = true; // Track if sound effects are enabled
        this.waterTapBody = null; // Water tap body object
        this.waterTapHandle = null; // Water tap handle object
        this.waterEnabled = true; // Whether water spray is available
        this.lastSprayTime = 0; // Track timing for continuous spray
        
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

        // Create realistic gardener sprite (body only, arms and legs separate) - 50% larger
        const gardenerGraphics = this.add.graphics();
        
        // Body (brown shirt)
        gardenerGraphics.fillStyle(0x8B4513);
        gardenerGraphics.fillRect(15, 18, 18, 24); // Scaled by 1.5: 10*1.5=15, 12*1.5=18, 12*1.5=18, 16*1.5=24
        
        // Head (skin tone)
        gardenerGraphics.fillStyle(0xFFDBAE);
        gardenerGraphics.fillCircle(24, 12, 9); // Scaled by 1.5: 16*1.5=24, 8*1.5=12, 6*1.5=9
        
        // Hat (green)
        gardenerGraphics.fillStyle(0x228B22);
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

        // Create water tap with layered graphics
        this.waterTapBody = this.physics.add.sprite(100, 100, 'tap-body-on');
        this.waterTapBody.setImmovable(true);
        this.waterTapBody.setData('isOn', true);
        
        this.waterTapHandle = this.add.sprite(100, 100, 'tap-handle-on');
        this.waterTapHandle.setDepth(this.waterTapBody.depth + 1); // Handle above body

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
        this.physics.add.overlap(this.squirrels, this.waterTapBody, this.squirrelUseTap, null, this);
        this.physics.add.overlap(this.gardener, this.waterTapBody, this.gardenerUseTap, null, this);

        // Set up start game button
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
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
        
        setupQuitButton();

        // Set up mobile controls
        this.setupMobileControls();

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
            const deltaX = clientX - this.joystick.centerX;
            const deltaY = clientY - this.joystick.centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Constrain to max distance
            let constrainedX = deltaX;
            let constrainedY = deltaY;
            
            if (distance > this.joystick.maxDistance) {
                const ratio = this.joystick.maxDistance / distance;
                constrainedX = deltaX * ratio;
                constrainedY = deltaY * ratio;
            }
            
            // Update knob position
            this.joystick.knob.style.transform = `translate(-50%, -50%) translate(${constrainedX}px, ${constrainedY}px)`;
            
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
            
            // Calculate normalized values (-1 to 1)
            this.joystick.normalizedX = constrainedX / this.joystick.maxDistance;
            this.joystick.normalizedY = constrainedY / this.joystick.maxDistance; // Keep Y as screen coordinates
            
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
            if (!this.joystick.isDragging) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            updateJoystickPosition(touch.clientX, touch.clientY);
        });
        
        document.addEventListener('touchend', (e) => {
            if (!this.joystick.isDragging) return;
            e.preventDefault();
            resetJoystick();
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

    startGame() {
        if (this.gameStarted) return; // Prevent multiple starts
        
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
        document.body.classList.add('game-started');
        
        // Reset game state
        this.score = 0;
        this.round = 1;
        this.roundActive = true;
        this.gamePaused = false;
        
        // Timer is now handled manually in update() method
        console.log('Using manual timer in update loop');
        
        // Immediately update UI to show starting time
        this.updateUI();
        
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
        console.log('Starting round', this.round);
        this.roundActive = true;
        this.timeLeft = 60;
        this.lastTimerUpdate = 0; // Reset timer
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
        
        // Clear existing objects
        this.vegetables.clear(true, true);
        this.squirrels.clear(true, true);
        this.raccoons.clear(true, true);
        
        // Reset water tap
        this.waterEnabled = true;
        this.waterTapBody.setTexture('tap-body-on');
        this.waterTapHandle.setTexture('tap-handle-on');
        this.waterTapBody.setData('isOn', true);
        
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
                
                if (this.timeLeft <= 0) {
                    this.endRound();
                }
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
            
            // Reset mobile spray just pressed flag
            this.mobileControls.sprayJustPressed = false;
            
            return;
        }

        // Gardener movement (directional with arrow keys or mobile controls)
        this.gardener.setVelocity(0);
        let isMoving = false;
        
        // Combine keyboard and mobile controls
        const leftPressed = this.cursors.left.isDown || this.mobileControls.left;
        const rightPressed = this.cursors.right.isDown || this.mobileControls.right;
        const upPressed = this.cursors.up.isDown || this.mobileControls.up;
        const downPressed = this.cursors.down.isDown || this.mobileControls.down;
        const sprayPressed = this.spaceKey.isDown || this.mobileControls.spray;
        
        // Get joystick analog values for smooth movement (only if joystick is being used)
        const joystickX = this.joystick && Math.abs(this.joystick.normalizedX) > this.joystick.deadZone ? this.joystick.normalizedX : 0;
        const joystickY = this.joystick && Math.abs(this.joystick.normalizedY) > this.joystick.deadZone ? this.joystick.normalizedY : 0;
        const isUsingJoystick = Math.abs(joystickX) > 0 || Math.abs(joystickY) > 0;
        
        // Check if player is currently spraying water
        const isSpraying = sprayPressed;
        
        // Track when spraying starts to determine initial facing direction
        if (isSpraying && !this.wasSpraying) {
            // Store the initial facing direction when spraying starts
            this.initialFacingDown = this.gardenerAngle >= 45 && this.gardenerAngle <= 135;
        }
        this.wasSpraying = isSpraying;
        
        // Update spray indicator visibility and position
        this.sprayArrow.setPosition(this.gardener.x, this.gardener.y);
        this.sprayArrow.setVisible(isSpraying);
        
        if (isSpraying) {
            // When spraying with joystick, spray direction follows joystick direction directly
            if (isUsingJoystick) {
                // Calculate spray angle directly from joystick position
                if (Math.abs(joystickX) > 0.1 || Math.abs(joystickY) > 0.1) {
                    // Use atan2 to get the angle from joystick direction
                    this.gardenerAngle = Phaser.Math.RadToDeg(Math.atan2(joystickY, joystickX));
                    this.sprayArrow.setRotation(Phaser.Math.DegToRad(this.gardenerAngle));
                    
                    // Also move the character in the joystick direction while spraying
                    const moveSpeed = 100; // Slower movement while spraying
                    const velocityX = joystickX * moveSpeed;
                    const velocityY = joystickY * moveSpeed;
                    this.gardener.setVelocity(velocityX, velocityY);
                    isMoving = true;
                }
            } else {
                // Discrete button controls (original behavior for keyboard/d-pad)
                // Use the initial facing direction to determine rotation behavior
                const shouldReverseControls = this.initialFacingDown;
                
                if (leftPressed) {
                    if (shouldReverseControls) {
                        this.gardenerAngle += 2; // Clockwise when initially facing down
                    } else {
                        this.gardenerAngle -= 2; // Counter-clockwise otherwise
                    }
                    this.sprayArrow.setRotation(Phaser.Math.DegToRad(this.gardenerAngle));
                } else if (rightPressed) {
                    if (shouldReverseControls) {
                        this.gardenerAngle -= 2; // Counter-clockwise when initially facing down
                    } else {
                        this.gardenerAngle += 2; // Clockwise otherwise
                    }
                    this.sprayArrow.setRotation(Phaser.Math.DegToRad(this.gardenerAngle));
                }
                
                // Up/down move forward/backward when spraying with discrete controls
                if (upPressed) {
                    const velocityX = Math.cos(Phaser.Math.DegToRad(this.gardenerAngle)) * 150;
                    const velocityY = Math.sin(Phaser.Math.DegToRad(this.gardenerAngle)) * 150;
                    this.gardener.setVelocity(velocityX, velocityY);
                    isMoving = true;
                } else if (downPressed) {
                    const velocityX = Math.cos(Phaser.Math.DegToRad(this.gardenerAngle)) * -120;
                    const velocityY = Math.sin(Phaser.Math.DegToRad(this.gardenerAngle)) * -120;
                    this.gardener.setVelocity(velocityX, velocityY);
                    isMoving = true;
                }
            }
        } else {
            // When not spraying, use joystick for smooth movement or arrows for discrete movement
            let velocityX = 0;
            let velocityY = 0;
            
            if (isUsingJoystick) {
                // Smooth analog movement with joystick
                const maxSpeed = 200;
                velocityX = joystickX * maxSpeed;
                velocityY = joystickY * maxSpeed;
                
                // Update gardener angle based on movement direction for spray direction
                if (Math.abs(joystickX) > 0.1 || Math.abs(joystickY) > 0.1) {
                    this.gardenerAngle = Phaser.Math.RadToDeg(Math.atan2(joystickY, joystickX));
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
                        this.gardenerAngle = 180; // Face left for spray direction
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
                        this.gardenerAngle = -90; // Face up for spray direction
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
                        this.gardenerAngle = 90; // Face down for spray direction
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
                    
                    // Set angle for diagonal directions
                    if (leftPressed && upPressed) {
                        this.gardenerAngle = -135; // Up-left
                    } else if (rightPressed && upPressed) {
                        this.gardenerAngle = -45; // Up-right
                    } else if (leftPressed && downPressed) {
                        this.gardenerAngle = 135; // Down-left
                    } else if (rightPressed && downPressed) {
                        this.gardenerAngle = 45; // Down-right
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

        // Spawn raccoons (less frequently and not in first round)
        if (this.round > 1 && time - this.lastRaccoonSpawn > this.raccoonSpawnRate) {
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
        
        // Reset mobile spray just pressed flag at end of frame
        this.mobileControls.sprayJustPressed = false;
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
        console.log('quitGame called, gameStarted:', this.gameStarted);
        
        // Always allow quitting, regardless of game state
        console.log('Quitting game...');
        
        // Reset game state
        this.gameStarted = false;
        this.roundActive = false;
        this.gamePaused = false;
        this.score = 0;
        this.round = 1;
        this.timeLeft = 60;
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
            
            // Check if time has run out
            if (this.timeLeft <= 0) {
                this.endRound();
            }
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
