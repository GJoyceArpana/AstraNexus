import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

type PipeType = "STRAIGHT" | "CORNER" | "T_JUNCTION";

interface PipeTileData {
    col: number;
    row: number;
    type: PipeType;
    rot: number; // 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°
    isPowered: boolean;
    container: Phaser.GameObjects.Container;
    pipeGraphics: Phaser.GameObjects.Graphics;
    waterGraphics: Phaser.GameObjects.Graphics;
    glowGraphic: Phaser.GameObjects.Graphics;
}

export class Sol1DirtFortressScene extends SolChallengeBaseScene {
    // 3x3 Irrigation Grid
    private readonly GRID_COLS = 3;
    private readonly GRID_ROWS = 3;
    private readonly TILE_SIZE = 84;
    private readonly TILE_GAP = 12;

    private grid: PipeTileData[][] = [];
    private isWaterFlowingToGarden = false;
    private isRotating = false;

    // Among Us style Task Console UI elements
    private taskProgressBarFill!: Phaser.GameObjects.Graphics;
    private taskProgressLabel!: Phaser.GameObjects.Text;
    private taskStatusLed!: Phaser.GameObjects.Arc;
    private tankWaterLevel!: Phaser.GameObjects.Graphics;
    private gardenTubesGraphic!: Phaser.GameObjects.Graphics;

    // Space-Tomato Pods
    private tomatoPods: Phaser.GameObjects.Container[] = [];
    private tomatoSprites: Phaser.GameObjects.Container[] = [];
    private taskCompleteStamp!: Phaser.GameObjects.Container;

    constructor() {
        super("Sol1DirtFortressScene", {
            solNumber: 1,
            title: "SOL 1: SPACE-TOMATO GREENHOUSE",
            codename: "CRYO-WATER IRRIGATION PUZZLE",
            hazardBadge: "HYDROPONIC CROP STARVATION RISK",
            briefing: "Astronauts need fresh food! Underground glacial ice has been melted, but the greenhouse irrigation pipes are disconnected. Snap and rotate the pipe tiles to channel the melted water directly into the empty plant pods to sprout giant Martian space-tomatoes.",
            nasaFact: "NASA’s Veggie and Advanced Plant Habitat (APH) aboard the ISS have grown fresh salads and dwarf tomatoes in microgravity using capillary water delivery.",
            primaryTarget: "Connect irrigation grid and deliver melted ice water to hydroponic plant pods.",
            unit: "%",
            targetVal: 100,
            initialVal: 0
        });
    }

    protected createChallengeContent() {
        // Deep atmospheric Martian greenhouse backdrop
        this.createMartianSurfaceBase(0x180D1A, 0x48A060, 0x5C2418);

        // Hydroponic Greenhouse Dome silhouette in background
        const domeG = this.add.graphics().setDepth(-22);
        domeG.fillStyle(0x0C2B1E, 0.6);
        domeG.fillEllipse(640, 390, 1100, 480);
        domeG.lineStyle(2, 0x00E5FF, 0.4);
        domeG.strokeEllipse(640, 390, 1100, 480);

        // Greenhouse structural rib trusses
        for (let x = 200; x <= 1080; x += 110) {
            domeG.lineStyle(1.5, 0x1E5C42, 0.5);
            domeG.lineBetween(x, 260, x, 520);
        }

        // -----------------------------------------------------------------
        // AMONG US STYLE INDUSTRIAL TASK CONSOLE
        // Centered at (640, 365), width: 920, height: 500
        // -----------------------------------------------------------------
        const consoleX = 640;
        const consoleY = 365;
        const consoleW = 920;
        const consoleH = 500;

        const consoleG = this.add.graphics().setDepth(10);

        // 1. Heavy Outer Slate Bezel with Among Us style black outline
        consoleG.fillStyle(0x1B1F2A, 1);
        consoleG.fillRoundedRect(consoleX - consoleW / 2, consoleY - consoleH / 2, consoleW, consoleH, 16);
        consoleG.lineStyle(5, 0x0E1118, 1);
        consoleG.strokeRoundedRect(consoleX - consoleW / 2, consoleY - consoleH / 2, consoleW, consoleH, 16);

        // Subtle inner metallic bevel
        consoleG.lineStyle(2, 0x364056, 1);
        consoleG.strokeRoundedRect(consoleX - consoleW / 2 + 6, consoleY - consoleH / 2 + 6, consoleW - 12, consoleH - 12, 12);

        // Heavy industrial corner bolts
        const boltOffsets = [
            [-consoleW / 2 + 18, -consoleH / 2 + 18],
            [consoleW / 2 - 18, -consoleH / 2 + 18],
            [-consoleW / 2 + 18, consoleH / 2 - 18],
            [consoleW / 2 - 18, consoleH / 2 - 18]
        ];
        consoleG.fillStyle(0x4C5975, 1);
        for (const [bx, by] of boltOffsets) {
            consoleG.fillCircle(consoleX + bx, consoleY + by, 6);
            consoleG.lineStyle(1.5, 0x1A212E, 1);
            consoleG.lineBetween(consoleX + bx - 4, consoleY + by, consoleX + bx + 4, consoleY + by);
        }

        // 2. Top Task Header Bar (Among Us Yellow/Green task banner)
        this.createConsoleHeader(consoleX, consoleY - consoleH / 2 + 35, consoleW - 40);

        // 3. Left Section: Subterranean Melted Ice Tank (x = 280, y = 385)
        this.createWaterTank(280, 385);

        // 4. Center Section: 3x3 Pipe Grid (x = 580, y = 385)
        this.createPipeGrid(580, 385);

        // 5. Right Section: Hydroponic Space-Tomato Pods (x = 880, y = 385)
        this.createTomatoPods(880, 385);

        // 6. Connecting Inflow & Outflow Gantry Tubes
        this.gardenTubesGraphic = this.add.graphics().setDepth(12);
        this.drawManifoldTubes(false);

        // 7. Initial Water Flow Evaluation
        this.evaluateWaterFlow(false);
    }

    /**
     * Among Us Style Top Task Header & Progress Bar
     */
    private createConsoleHeader(cx: number, cy: number, w: number) {
        const hG = this.add.graphics().setDepth(14);

        // Header Background plate
        hG.fillStyle(0x131720, 1);
        hG.fillRoundedRect(cx - w / 2, cy - 22, w, 44, 8);
        hG.lineStyle(1.5, 0x2A3345, 1);
        hG.strokeRoundedRect(cx - w / 2, cy - 22, w, 44, 8);

        // Left Tag: Sector Label
        this.add.text(cx - w / 2 + 18, cy, "HYDRO-BAY // SECTOR 01", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0, 0.5).setDepth(15);

        // Center Task Progress Bar (Iconic Among Us Green/Grey Task Meter)
        const barW = 340;
        const barH = 18;
        const barX = cx - barW / 2 + 20;

        hG.fillStyle(0x090D14, 1);
        hG.fillRoundedRect(barX, cy - barH / 2, barW, barH, 4);
        hG.lineStyle(1.5, 0x3E4B66, 1);
        hG.strokeRoundedRect(barX, cy - barH / 2, barW, barH, 4);

        this.taskProgressBarFill = this.add.graphics().setDepth(15);

        this.taskProgressLabel = this.add.text(cx + 20, cy, "TASK: IRRIGATE GREENHOUSE PODS (0%)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(16);

        // Right Status Indicator LED
        this.taskStatusLed = this.add.circle(cx + w / 2 - 30, cy, 6, UITheme.colors.emergencyRed).setDepth(15);
        this.tweens.add({
            targets: this.taskStatusLed,
            alpha: 0.3,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.updateTaskProgressBar(0);

        this.add.text(cx + w / 2 - 45, cy, "FLOW:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.textSecondary,
            fontStyle: "bold"
        }).setOrigin(1, 0.5).setDepth(15);
    }

    /**
     * Left Section: Melted Ice Cryo-Water Tank with Bubbles & Dial
     */
    private createWaterTank(x: number, y: number) {
        const c = this.add.container(x, y).setDepth(13);

        const tankW = 120;
        const tankH = 300;

        const g = this.add.graphics();

        // Tank Frame & Glass Cylinder
        g.fillStyle(0x0C121D, 0.95);
        g.fillRoundedRect(-tankW / 2, -tankH / 2, tankW, tankH, 12);
        g.lineStyle(3, 0x243248, 1);
        g.strokeRoundedRect(-tankW / 2, -tankH / 2, tankW, tankH, 12);

        // Water Fluid Fill (Electric Cyan Water)
        this.tankWaterLevel = this.add.graphics();
        this.tankWaterLevel.fillStyle(0x00B0FF, 0.7);
        this.tankWaterLevel.fillRoundedRect(-tankW / 2 + 8, -tankH / 2 + 30, tankW - 16, tankH - 60, 8);
        this.tankWaterLevel.lineStyle(1.5, 0x80D8FF, 0.9);
        this.tankWaterLevel.strokeRoundedRect(-tankW / 2 + 8, -tankH / 2 + 30, tankW - 16, tankH - 60, 8);
        c.add(this.tankWaterLevel);

        // Rising Ambient Water Bubbles
        for (let i = 0; i < 6; i++) {
            const b = this.add.circle(
                Phaser.Math.Between(-tankW / 2 + 20, tankW / 2 - 20),
                Phaser.Math.Between(-tankH / 2 + 40, tankH / 2 - 40),
                Phaser.Math.Between(3, 6),
                0xFFFFFF,
                0.7
            );
            c.add(b);
            this.tweens.add({
                targets: b,
                y: -tankH / 2 + 35,
                alpha: 0.1,
                duration: Phaser.Math.Between(1600, 2600),
                repeat: -1,
                delay: i * 350
            });
        }

        // Top & Bottom Reinforced Metal Collars
        g.fillStyle(0x2A364C, 1);
        g.fillRoundedRect(-tankW / 2 - 6, -tankH / 2 - 8, tankW + 12, 28, 6);
        g.fillRoundedRect(-tankW / 2 - 6, tankH / 2 - 20, tankW + 12, 28, 6);

        // Pressure Dial
        g.fillStyle(0x1B2332, 1);
        g.fillCircle(0, -tankH / 2 + 65, 22);
        g.lineStyle(2, 0x00E5FF, 1);
        g.strokeCircle(0, -tankH / 2 + 65, 22);

        // Pressure needle pointing to green sector
        g.lineStyle(2, 0x00E676, 1);
        g.lineBetween(0, -tankH / 2 + 65, 12, -tankH / 2 + 55);

        c.add(g);

        // Labels
        const lbl1 = this.add.text(0, -tankH / 2 + 105, "MELTED ICE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const lbl2 = this.add.text(0, -tankH / 2 + 120, "CRYO-H2O (100%)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Outlet Nozzle on Right edge of tank feeding into Grid Row 1
        const nozzle = this.add.graphics();
        nozzle.fillStyle(0x3B4A63, 1);
        nozzle.fillRoundedRect(tankW / 2 - 2, -12, 24, 24, 4);
        nozzle.lineStyle(2, 0x00E5FF, 1);
        nozzle.strokeRoundedRect(tankW / 2 - 2, -12, 24, 24, 4);
        c.add([lbl1, lbl2, nozzle]);

        // Outlet Flow Arrow
        const arrow = this.add.text(tankW / 2 + 8, 0, "▶", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add(arrow);
        this.tweens.add({
            targets: arrow,
            x: tankW / 2 + 14,
            duration: 400,
            yoyo: true,
            repeat: -1
        });
    }

    /**
     * Center Section: 3x3 Interactive Pipe Grid
     */
    private createPipeGrid(startX: number, startY: number) {
        // Preset scrambled configuration with guaranteed solutions
        // Input is at (col: 0, row: 1). Output is at (col: 2, row: 1).
        const initialSetup: { type: PipeType; rot: number }[][] = [
            [
                { type: "CORNER", rot: 1 },     // (0, 0): Corner
                { type: "STRAIGHT", rot: 1 },   // (1, 0): Vertical straight
                { type: "CORNER", rot: 0 }      // (2, 0): Corner
            ],
            [
                { type: "T_JUNCTION", rot: 3 }, // (0, 1): Entrance (pointing Down/Left initially)
                { type: "T_JUNCTION", rot: 1 }, // (1, 1): Crossways T
                { type: "T_JUNCTION", rot: 2 }  // (2, 1): Exit (pointing Down/Left initially)
            ],
            [
                { type: "CORNER", rot: 0 },     // (0, 2): Corner
                { type: "STRAIGHT", rot: 1 },   // (1, 2): Straight
                { type: "CORNER", rot: 3 }      // (2, 2): Corner
            ]
        ];

        this.grid = [];

        for (let r = 0; r < this.GRID_ROWS; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.GRID_COLS; c++) {
                const cellX = startX + (c - 1) * (this.TILE_SIZE + this.TILE_GAP);
                const cellY = startY + (r - 1) * (this.TILE_SIZE + this.TILE_GAP);
                const setup = initialSetup[r][c];

                const container = this.add.container(cellX, cellY).setDepth(15);

                // Base Socket Tray with heavy industrial bevel
                const tray = this.add.graphics();
                tray.fillStyle(0x131722, 1);
                tray.fillRoundedRect(-this.TILE_SIZE / 2, -this.TILE_SIZE / 2, this.TILE_SIZE, this.TILE_SIZE, 8);
                tray.lineStyle(2, 0x2A354A, 1);
                tray.strokeRoundedRect(-this.TILE_SIZE / 2, -this.TILE_SIZE / 2, this.TILE_SIZE, this.TILE_SIZE, 8);
                container.add(tray);

                // Outer socket ports (visual notches where pipes connect)
                const notches = this.add.graphics();
                notches.fillStyle(0x0C0E14, 1);
                notches.fillRect(-8, -this.TILE_SIZE / 2 - 2, 16, 4); // Up
                notches.fillRect(this.TILE_SIZE / 2 - 2, -8, 4, 16);  // Right
                notches.fillRect(-8, this.TILE_SIZE / 2 - 2, 16, 4);  // Down
                notches.fillRect(-this.TILE_SIZE / 2 - 2, -8, 4, 16); // Left
                container.add(notches);

                // Hover / Click Glow ring
                const glowGraphic = this.add.graphics();
                glowGraphic.lineStyle(2.5, UITheme.colors.primaryCyan, 0);
                glowGraphic.strokeRoundedRect(-this.TILE_SIZE / 2 - 2, -this.TILE_SIZE / 2 - 2, this.TILE_SIZE + 4, this.TILE_SIZE + 4, 10);
                container.add(glowGraphic);

                // Rotating Pipe Graphic Container
                const pipeRotateContainer = this.add.container(0, 0);
                pipeRotateContainer.setAngle(setup.rot * 90);
                container.add(pipeRotateContainer);

                // Pipe graphics inside rotating container
                const pipeGraphics = this.add.graphics();
                const waterGraphics = this.add.graphics();
                pipeRotateContainer.add([pipeGraphics, waterGraphics]);

                // Interactive Hit Zone
                const hitZone = this.add.rectangle(0, 0, this.TILE_SIZE, this.TILE_SIZE, 0x000000, 0.001);
                hitZone.setInteractive({ useHandCursor: true });
                container.add(hitZone);

                const tileData: PipeTileData = {
                    col: c,
                    row: r,
                    type: setup.type,
                    rot: setup.rot,
                    isPowered: false,
                    container: pipeRotateContainer,
                    pipeGraphics: pipeGraphics,
                    waterGraphics: waterGraphics,
                    glowGraphic: glowGraphic
                };

                // Draw base static metal pipe casing
                this.drawPipeBody(tileData);

                // Hover Effects
                hitZone.on("pointerover", () => {
                    this.tweens.add({
                        targets: container,
                        scaleX: 1.05,
                        scaleY: 1.05,
                        duration: 120
                    });
                    glowGraphic.clear();
                    glowGraphic.lineStyle(2.5, UITheme.colors.primaryCyan, 0.9);
                    glowGraphic.strokeRoundedRect(-this.TILE_SIZE / 2 - 2, -this.TILE_SIZE / 2 - 2, this.TILE_SIZE + 4, this.TILE_SIZE + 4, 10);
                });

                hitZone.on("pointerout", () => {
                    this.tweens.add({
                        targets: container,
                        scaleX: 1.0,
                        scaleY: 1.0,
                        duration: 120
                    });
                    glowGraphic.clear();
                });

                // Click to Rotate 90° Clockwise
                hitZone.on("pointerdown", () => {
                    this.rotateTile(tileData);
                });

                this.grid[r][c] = tileData;
            }
        }
    }

    /**
     * Draws the mechanical Among Us pipe casing and fluid channel
     */
    private drawPipeBody(tile: PipeTileData) {
        const pG = tile.pipeGraphics;
        const wG = tile.waterGraphics;
        const half = this.TILE_SIZE / 2;
        const outerW = 22;
        const innerW = 12;

        pG.clear();
        wG.clear();

        // Colors
        const casingColor = 0x2A374C;
        const casingStroke = 0x0D121B;
        const waterColor = tile.isPowered ? 0x00E5FF : 0x161C26;
        const waterCore = tile.isPowered ? 0xE0F7FA : 0x0D121B;

        // Draw based on canonical rotation 0:
        if (tile.type === "STRAIGHT") {
            // Horizontal pipe: Left (-half) to Right (+half)
            pG.fillStyle(casingColor, 1);
            pG.fillRoundedRect(-half, -outerW / 2, this.TILE_SIZE, outerW, 4);
            pG.lineStyle(2.5, casingStroke, 1);
            pG.strokeRoundedRect(-half, -outerW / 2, this.TILE_SIZE, outerW, 4);

            // Flange rings at edges
            pG.fillStyle(0x455A75, 1);
            pG.fillRect(-half, -outerW / 2 - 2, 6, outerW + 4);
            pG.fillRect(half - 6, -outerW / 2 - 2, 6, outerW + 4);

            // Inner Fluid Channel
            wG.fillStyle(waterColor, 1);
            wG.fillRect(-half, -innerW / 2, this.TILE_SIZE, innerW);
            if (tile.isPowered) {
                wG.fillStyle(waterCore, 0.95);
                wG.fillRect(-half, -2, this.TILE_SIZE, 4);
            }
        } else if (tile.type === "CORNER") {
            // Corner connects UP (0, -half) to RIGHT (+half, 0)
            pG.fillStyle(casingColor, 1);
            pG.fillRect(-outerW / 2, -half, outerW, half); // Up vertical leg
            pG.fillRect(0, -outerW / 2, half, outerW);     // Right horizontal leg
            pG.fillCircle(0, 0, outerW / 2);              // Joint elbow

            pG.lineStyle(2.5, casingStroke, 1);
            pG.strokeRect(-outerW / 2, -half, outerW, half);
            pG.strokeRect(0, -outerW / 2, half, outerW);
            pG.strokeCircle(0, 0, outerW / 2);

            // Flange rings
            pG.fillStyle(0x455A75, 1);
            pG.fillRect(-outerW / 2 - 2, -half, outerW + 4, 6);
            pG.fillRect(half - 6, -outerW / 2 - 2, 6, outerW + 4);

            // Inner Fluid Channel
            wG.fillStyle(waterColor, 1);
            wG.fillRect(-innerW / 2, -half, innerW, half);
            wG.fillRect(0, -innerW / 2, half, innerW);
            wG.fillCircle(0, 0, innerW / 2);

            if (tile.isPowered) {
                wG.fillStyle(waterCore, 0.95);
                wG.fillRect(-2, -half, 4, half);
                wG.fillRect(0, -2, half, 4);
            }
        } else if (tile.type === "T_JUNCTION") {
            // T-junction connects LEFT (-half), UP (-half), and RIGHT (+half)
            pG.fillStyle(casingColor, 1);
            pG.fillRect(-half, -outerW / 2, this.TILE_SIZE, outerW); // Horizontal main trunk
            pG.fillRect(-outerW / 2, -half, outerW, half);          // Up vertical branch
            pG.fillCircle(0, 0, outerW / 2);

            pG.lineStyle(2.5, casingStroke, 1);
            pG.strokeRect(-half, -outerW / 2, this.TILE_SIZE, outerW);
            pG.strokeRect(-outerW / 2, -half, outerW, half);

            // Flange rings
            pG.fillStyle(0x455A75, 1);
            pG.fillRect(-half, -outerW / 2 - 2, 6, outerW + 4);
            pG.fillRect(half - 6, -outerW / 2 - 2, 6, outerW + 4);
            pG.fillRect(-outerW / 2 - 2, -half, outerW + 4, 6);

            // Inner Fluid Channel
            wG.fillStyle(waterColor, 1);
            wG.fillRect(-half, -innerW / 2, this.TILE_SIZE, innerW);
            wG.fillRect(-innerW / 2, -half, innerW, half);
            wG.fillCircle(0, 0, innerW / 2);

            if (tile.isPowered) {
                wG.fillStyle(waterCore, 0.95);
                wG.fillRect(-half, -2, this.TILE_SIZE, 4);
                wG.fillRect(-2, -half, 4, half);
            }
        }
    }

    /**
     * Rotates a pipe tile 90° clockwise with snappy tween and sound effect
     */
    private rotateTile(tile: PipeTileData) {
        if (this.isRotating || this.isCompleted) return;
        this.isRotating = true;

        SoundFX.playClick();

        tile.rot = (tile.rot + 1) % 4;
        const targetAngle = tile.container.angle + 90;

        this.tweens.add({
            targets: tile.container,
            angle: targetAngle,
            duration: 160,
            ease: "Back.easeOut",
            onComplete: () => {
                this.isRotating = false;
                this.evaluateWaterFlow(true);
            }
        });
    }

    /**
     * Returns the 4 connected directions for a tile at its current rotation.
     * Directions: 0 = UP, 1 = RIGHT, 2 = DOWN, 3 = LEFT.
     */
    private getTileConnections(tile: PipeTileData): number[] {
        let base: number[] = [];
        if (tile.type === "STRAIGHT") {
            base = [3, 1]; // LEFT and RIGHT
        } else if (tile.type === "CORNER") {
            base = [0, 1]; // UP and RIGHT
        } else if (tile.type === "T_JUNCTION") {
            base = [3, 0, 1]; // LEFT, UP, RIGHT
        }
        return base.map(d => (d + tile.rot) % 4);
    }

    /**
     * Evaluates continuous water flow from the water tank across the grid using BFS
     */
    private evaluateWaterFlow(playEffects = false) {
        // Reset all powered states
        for (let r = 0; r < this.GRID_ROWS; r++) {
            for (let c = 0; c < this.GRID_COLS; c++) {
                this.grid[r][c].isPowered = false;
            }
        }

        // Entrance is at (col: 0, row: 1) from the LEFT (direction 3)
        const startTile = this.grid[1][0];
        const startConnections = this.getTileConnections(startTile);

        const visited: boolean[][] = [
            [false, false, false],
            [false, false, false],
            [false, false, false]
        ];

        let pathCompletesToGarden = false;

        // Check if start tile connects to the Left entrance
        if (startConnections.includes(3)) {
            startTile.isPowered = true;
            visited[1][0] = true;

            const queue: [number, number][] = [[0, 1]]; // [col, row]

            // Opposite direction mapping: UP <-> DOWN, RIGHT <-> LEFT
            const opposite = (dir: number) => (dir + 2) % 4;

            while (queue.length > 0) {
                const [curC, curR] = queue.shift()!;
                const curTile = this.grid[curR][curC];
                const curDirs = this.getTileConnections(curTile);

                // Direction offsets: 0 = UP, 1 = RIGHT, 2 = DOWN, 3 = LEFT
                const deltas: [number, number][] = [
                    [0, -1], // UP
                    [1, 0],  // RIGHT
                    [0, 1],  // DOWN
                    [-1, 0]  // LEFT
                ];

                for (const d of curDirs) {
                    const nextC = curC + deltas[d][0];
                    const nextR = curR + deltas[d][1];

                    // Check if exiting to the Garden from (col: 2, row: 1) to the RIGHT (d === 1)
                    if (curC === 2 && curR === 1 && d === 1) {
                        pathCompletesToGarden = true;
                    }

                    // Within grid bounds
                    if (nextC >= 0 && nextC < this.GRID_COLS && nextR >= 0 && nextR < this.GRID_ROWS) {
                        if (!visited[nextR][nextC]) {
                            const nextTile = this.grid[nextR][nextC];
                            const nextDirs = this.getTileConnections(nextTile);

                            // Neighbor must have a matching port in opposite direction
                            if (nextDirs.includes(opposite(d))) {
                                nextTile.isPowered = true;
                                visited[nextR][nextC] = true;
                                queue.push([nextC, nextR]);
                            }
                        }
                    }
                }
            }
        }

        // Redraw all tiles with updated water glow
        for (let r = 0; r < this.GRID_ROWS; r++) {
            for (let c = 0; c < this.GRID_COLS; c++) {
                this.drawPipeBody(this.grid[r][c]);
            }
        }

        // Update Manifold Tubes & Pods
        this.drawManifoldTubes(pathCompletesToGarden);

        if (pathCompletesToGarden) {
            this.isWaterFlowingToGarden = true;
            this.updateTaskProgressBar(1.0);
            if (this.taskStatusLed) this.taskStatusLed.setFillStyle(UITheme.colors.bioGreen);

            if (playEffects && !this.isCompleted) {
                this.celebrateTomatoSprout();
            }
        } else {
            // Count connected tiles for partial progress
            let poweredCount = 0;
            for (let r = 0; r < this.GRID_ROWS; r++) {
                for (let c = 0; c < this.GRID_COLS; c++) {
                    if (this.grid[r][c].isPowered) poweredCount++;
                }
            }
            const partialPct = Math.min(0.85, (poweredCount / 6) * 0.85);
            this.updateTaskProgressBar(partialPct);
            if (this.taskStatusLed) this.taskStatusLed.setFillStyle(UITheme.colors.emergencyRed);
            this.updateVisorProgress(Math.round(partialPct * 100), 100, "%");
        }
    }

    /**
     * Updates the Among Us green task bar fill and label
     */
    private updateTaskProgressBar(pct: number) {
        const barW = 340;
        const barH = 18;
        const barX = 640 - barW / 2 + 20;
        const barY = 365 - 250 + 35 - barH / 2;

        if (this.taskProgressBarFill) {
            this.taskProgressBarFill.clear();
            this.taskProgressBarFill.fillStyle(pct >= 1.0 ? 0x00E676 : 0x00E5FF, 1);
            this.taskProgressBarFill.fillRoundedRect(barX + 2, barY + 2, Math.max(6, (barW - 4) * pct), barH - 4, 3);
        }

        const pctInt = Math.round(pct * 100);
        if (this.taskProgressLabel) {
            if (pct >= 1.0) {
                this.taskProgressLabel.setText("✔ TASK COMPLETED: WATER FLOW 100%");
                this.taskProgressLabel.setColor("#00E676");
            } else {
                this.taskProgressLabel.setText(`TASK: IRRIGATE GREENHOUSE PODS (${pctInt}%)`);
                this.taskProgressLabel.setColor("#FFFFFF");
            }
        }
    }

    /**
     * Right Section: Hydroponic Space-Tomato Pods
     */
    private createTomatoPods(x: number, y: number) {
        this.tomatoPods = [];
        this.tomatoSprites = [];

        const podYs = [-100, 0, 100]; // 3 Pods: Top, Middle, Bottom

        for (let i = 0; i < 3; i++) {
            const py = y + podYs[i];
            const podC = this.add.container(x, py).setDepth(13);

            const podG = this.add.graphics();

            // Glass Bio-Incubator Dome
            podG.fillStyle(0x0C1924, 0.95);
            podG.fillRoundedRect(-55, -42, 110, 84, 10);
            podG.lineStyle(2.5, 0x2A3E56, 1);
            podG.strokeRoundedRect(-55, -42, 110, 84, 10);

            // Rich Mars Hydroponic Soil Base
            podG.fillStyle(0x3E1C12, 1);
            podG.fillRoundedRect(-48, 16, 96, 20, 6);

            // Subtle Glass Specular highlight
            podG.lineStyle(1.5, 0x80D8FF, 0.4);
            podG.lineBetween(-44, -32, -18, -32);

            podC.add(podG);

            // Tomato Sprout Container (Initially small seed/sprout)
            const tomatoC = this.add.container(0, 15).setDepth(14);
            this.drawSpaceTomato(tomatoC, false);
            podC.add(tomatoC);

            this.tomatoPods.push(podC);
            this.tomatoSprites.push(tomatoC);
        }

        // Header label above pods
        this.add.text(x, y - 165, "🌱 MARTIAN HYDROPONIC BEDS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(14);
    }

    /**
     * Procedurally draws a vibrant, adorable Alien Space-Tomato
     */
    private drawSpaceTomato(c: Phaser.GameObjects.Container, isSprouted: boolean) {
        c.removeAll(true);
        const g = this.add.graphics();

        if (!isSprouted) {
            // Dormant tiny seed sprout
            g.fillStyle(0x3B6846, 1);
            g.fillCircle(0, 0, 5);
            g.lineStyle(1.5, 0x00E676, 0.8);
            g.lineBetween(0, 0, 0, -8);
            c.add(g);
            return;
        }

        // -------------------------------------------------------------
        // GIANT ALIEN SPACE-TOMATO SPROUTED!
        // -------------------------------------------------------------
        // Lush Leafy Vines coiling up from soil
        g.fillStyle(0x00C853, 1);
        g.fillEllipse(-18, -2, 18, 8);
        g.fillEllipse(18, -2, 18, 8);

        // Giant Plump Ruby-Crimson Alien Tomato Body
        g.fillStyle(0xE52538, 1);
        g.fillEllipse(0, -18, 52, 46);

        // Cartoon Glossy White Light Reflection Arc (Among Us Style)
        g.fillStyle(0xFFFFFF, 0.75);
        g.fillEllipse(-12, -26, 14, 8);
        g.fillCircle(-16, -20, 3);

        // Glowing Bioluminescent Alien Speckles
        g.fillStyle(0x00E5FF, 0.9);
        g.fillCircle(12, -14, 3.5);
        g.fillCircle(16, -24, 2.5);
        g.fillCircle(-8, -8, 2.5);

        // Big Cute Cartoon Expressive Eyes
        g.fillStyle(0x111622, 1);
        g.fillEllipse(-8, -18, 8, 11);
        g.fillEllipse(8, -18, 8, 11);

        // Eye Specular Sparkles
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(-9, -20, 2.5);
        g.fillCircle(7, -20, 2.5);

        // Cheerful Blushing Pink Cheeks
        g.fillStyle(0xFF6B8B, 0.7);
        g.fillCircle(-14, -11, 4);
        g.fillCircle(14, -11, 4);

        // Happy Smiling Mouth
        g.lineStyle(2, 0x111622, 1);
        g.beginPath();
        g.arc(0, -13, 5, 0.2, Math.PI - 0.2, false);
        g.strokePath();

        // Alien Calyx & Curly Antenna Vine on top
        g.fillStyle(0x00E676, 1);
        g.fillTriangle(0, -42, -14, -36, 14, -36);
        g.fillTriangle(-12, -38, -22, -30, -6, -34);
        g.fillTriangle(12, -38, 22, -30, 6, -34);

        // Little Glowing Golden Star Flower on antenna tip
        g.fillStyle(0xFFD600, 1);
        g.fillCircle(0, -45, 5);

        c.add(g);
    }

    /**
     * Draws Manifold Tubes connecting Grid Exit (col 2, row 1) to the 3 Garden Pods
     */
    private drawManifoldTubes(isFlowing: boolean) {
        this.gardenTubesGraphic.clear();

        const exitX = 580 + (this.TILE_SIZE + this.TILE_GAP); // Col 2 center is at 676
        const exitEdgeX = exitX + this.TILE_SIZE / 2;         // 676 + 42 = 718
        const gardenX = 880 - 55;                              // 825
        const midY = 385;

        const color = isFlowing ? 0x00E5FF : 0x2A374C;
        const core = isFlowing ? 0xE0F7FA : 0x141A24;

        // Main Horizontal Feed Pipe from grid exit (718, 385) to distributor trunk (775, 385)
        this.gardenTubesGraphic.lineStyle(16, 0x18202D, 1);
        this.gardenTubesGraphic.lineBetween(exitEdgeX, midY, 775, midY);

        this.gardenTubesGraphic.lineStyle(8, color, 1);
        this.gardenTubesGraphic.lineBetween(exitEdgeX, midY, 775, midY);

        if (isFlowing) {
            this.gardenTubesGraphic.lineStyle(3, core, 1);
            this.gardenTubesGraphic.lineBetween(exitEdgeX, midY, 775, midY);
        }

        // Vertical Manifold Trunk at x = 775 (branching to y = 285, 385, 485)
        this.gardenTubesGraphic.lineStyle(14, 0x18202D, 1);
        this.gardenTubesGraphic.lineBetween(775, 285, 775, 485);

        this.gardenTubesGraphic.lineStyle(7, color, 1);
        this.gardenTubesGraphic.lineBetween(775, 285, 775, 485);

        // 3 Branch tubes into each pod
        const podYs = [285, 385, 485];
        for (const py of podYs) {
            this.gardenTubesGraphic.lineStyle(12, 0x18202D, 1);
            this.gardenTubesGraphic.lineBetween(775, py, gardenX, py);

            this.gardenTubesGraphic.lineStyle(6, color, 1);
            this.gardenTubesGraphic.lineBetween(775, py, gardenX, py);

            if (isFlowing) {
                this.gardenTubesGraphic.lineStyle(2, core, 1);
                this.gardenTubesGraphic.lineBetween(775, py, gardenX, py);
            }
        }
    }

    /**
     * Rewarding Sprouting Celebration when water reaches the Garden!
     */
    private celebrateTomatoSprout() {
        SoundFX.playToggle(true);

        // Water Surge Particles rushing through pipes into pods
        for (let i = 0; i < 20; i++) {
            const p = this.add.circle(
                720 + Phaser.Math.Between(0, 100),
                385 + Phaser.Math.Between(-100, 100),
                Phaser.Math.Between(3, 7),
                0x00E5FF,
                0.9
            ).setDepth(25);

            this.tweens.add({
                targets: p,
                x: 880,
                alpha: 0,
                duration: Phaser.Math.Between(400, 700),
                onComplete: () => p.destroy()
            });
        }

        // Instant Rewarding Tomato Sprout Animations with bouncy squash-and-stretch!
        this.tomatoSprites.forEach((tomatoC, idx) => {
            this.time.delayedCall(idx * 160, () => {
                this.drawSpaceTomato(tomatoC, true);

                tomatoC.setScale(0);
                this.tweens.add({
                    targets: tomatoC,
                    scaleX: 1.35,
                    scaleY: 1.35,
                    duration: 320,
                    ease: "Back.easeOut",
                    onComplete: () => {
                        this.tweens.add({
                            targets: tomatoC,
                            scaleX: 0.92,
                            scaleY: 1.08,
                            duration: 180,
                            yoyo: true,
                            repeat: 1,
                            onComplete: () => {
                                tomatoC.setScale(1.0);
                            }
                        });
                    }
                });

                // Sparkle bio-luminescent particles popping from each tomato
                for (let s = 0; s < 8; s++) {
                    const spark = this.add.text(
                        880 + Phaser.Math.Between(-30, 30),
                        tomatoC.y + Phaser.Math.Between(-30, 10),
                        "✨",
                        { fontSize: "14px" }
                    ).setOrigin(0.5).setDepth(30);

                    this.tweens.add({
                        targets: spark,
                        y: spark.y - 40,
                        alpha: 0,
                        scaleX: 1.5,
                        scaleY: 1.5,
                        duration: 700,
                        onComplete: () => spark.destroy()
                    });
                }
            });
        });

        // Update Top Visor Progress HUD
        this.updateVisorProgress(100, 100, "%");
        this.showSurfaceFloatingText(880, 240, "🍅 SPACE-TOMATOES SPROUTED! +100% FRESH FOOD AUTONOMY!", UITheme.colors.bioGreenStr);

        // Slams down the iconic Among Us "TASK COMPLETED!" Green Stamp!
        this.time.delayedCall(450, () => {
            this.createTaskCompletedStamp();
        });
    }

    /**
     * Bold Among Us "TASK COMPLETED!" Stamp
     */
    private createTaskCompletedStamp() {
        this.taskCompleteStamp = this.add.container(640, 365).setDepth(40);
        this.taskCompleteStamp.setScale(2.5);
        this.taskCompleteStamp.setAlpha(0);

        const stampW = 420;
        const stampH = 90;

        const stampG = this.add.graphics();
        stampG.fillStyle(0x00E676, 0.95);
        stampG.fillRoundedRect(-stampW / 2, -stampH / 2, stampW, stampH, 12);
        stampG.lineStyle(4, 0xFFFFFF, 1);
        stampG.strokeRoundedRect(-stampW / 2, -stampH / 2, stampW, stampH, 12);

        // Diagonal industrial stripes on corners
        stampG.fillStyle(0x00B248, 1);
        stampG.fillRect(-stampW / 2 + 10, -stampH / 2 + 6, 20, stampH - 12);
        stampG.fillRect(stampW / 2 - 30, -stampH / 2 + 6, 20, stampH - 12);

        this.taskCompleteStamp.add(stampG);

        const stampTitle = this.add.text(0, -12, "✔ TASK COMPLETED!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "24px",
            color: "#051A10",
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);

        const stampSub = this.add.text(0, 18, "SPACE-TOMATO GREENHOUSE IRRIGATED · FOOD SECURE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#051A10",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.taskCompleteStamp.add([stampTitle, stampSub]);

        // Stamp Slam Down Tween
        this.tweens.add({
            targets: this.taskCompleteStamp,
            scaleX: 1.0,
            scaleY: 1.0,
            alpha: 1,
            angle: -3,
            duration: 250,
            ease: "Back.easeOut",
            onComplete: () => {
                SoundFX.playToggle(true);
            }
        });
    }

    protected isTargetMet(): boolean {
        return this.isWaterFlowingToGarden;
    }
}

export default Sol1DirtFortressScene;
