import Phaser from "phaser";
import UITheme from "../../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../../components/ButtonFactory.ts";

export type PipeType = "STRAIGHT" | "ELBOW" | "T_JUNCTION" | "OBSTACLE";

interface TilePortSet {
    n: boolean;
    e: boolean;
    s: boolean;
    w: boolean;
}

interface PipeTile {
    col: number;
    row: number;
    type: PipeType;
    rot: number; // 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°
    isAirFilled: boolean;
    container: Phaser.GameObjects.Container;
    baseGraphics: Phaser.GameObjects.Graphics;
    flowGraphics: Phaser.GameObjects.Graphics;
    glowGraphics: Phaser.GameObjects.Graphics;
}

export interface AirLeakPuzzleCallbacks {
    onComplete: () => void;
    onClose: () => void;
}

export class AirLeakPuzzle {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: AirLeakPuzzleCallbacks;

    private readonly COLS = 4;
    private readonly ROWS = 4;
    private readonly TILE_SIZE = 76;
    private readonly TILE_GAP = 10;

    private grid: PipeTile[][] = [];
    private isSolved = false;
    private isClosed = false;
    private completionTimer?: Phaser.Time.TimerEvent;
    private statusText!: Phaser.GameObjects.Text;
    private flowMeterFill!: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, callbacks: AirLeakPuzzleCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0).setDepth(200);

        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // 1. Semi-transparent dark background shield
        const bgShield = this.scene.add.rectangle(0, 0, width, height, 0x040814, 0.88).setOrigin(0);
        bgShield.setInteractive(); // blocks input behind
        this.container.add(bgShield);

        // 2. Heavy Industrial Bezel Frame (Among Us / NASA ECLSS console style)
        const frameW = 860;
        const frameH = 580;
        const frameX = width / 2;
        const frameY = height / 2;

        const bezel = this.scene.add.graphics();
        bezel.fillStyle(UITheme.colors.panelBg, 0.98);
        bezel.fillRoundedRect(frameX - frameW / 2, frameY - frameH / 2, frameW, frameH, 16);
        bezel.lineStyle(3, UITheme.colors.primaryCyan, 0.9);
        bezel.strokeRoundedRect(frameX - frameW / 2, frameY - frameH / 2, frameW, frameH, 16);
        bezel.lineStyle(1.5, UITheme.colors.panelBorder, 0.6);
        bezel.strokeRoundedRect(frameX - frameW / 2 + 6, frameY - frameH / 2 + 6, frameW - 12, frameH - 12, 12);
        this.container.add(bezel);

        // Corner structural bolts
        const cornerOffsets = [
            [-frameW / 2 + 16, -frameH / 2 + 16],
            [frameW / 2 - 16, -frameH / 2 + 16],
            [-frameW / 2 + 16, frameH / 2 - 16],
            [frameW / 2 - 16, frameH / 2 - 16]
        ];
        const boltGraphics = this.scene.add.graphics();
        boltGraphics.fillStyle(0x3B4E6B, 1);
        for (const [bx, by] of cornerOffsets) {
            boltGraphics.fillCircle(frameX + bx, frameY + by, 5);
        }
        this.container.add(boltGraphics);

        // 3. Header Bar
        const headerY = frameY - frameH / 2 + 38;
        const headerTitle = this.scene.add.text(
            frameX - frameW / 2 + 28,
            headerY,
            "CHALLENGE 1 // AIR DISTRIBUTION MANIFOLD LEAK",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "15px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold",
                letterSpacing: 1.5
            }
        ).setOrigin(0, 0.5);
        this.container.add(headerTitle);

        // Close [X] Button
        const closeBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: frameX + frameW / 2 - 50,
            y: headerY,
            width: 70,
            height: 32,
            text: "EXIT ✕",
            fontSize: "11px",
            primaryColor: UITheme.colors.cardHover,
            onClick: () => {
                SoundFX.playClick();
                this.close();
            }
        });
        this.container.add(closeBtn);

        // Subheader instructions
        const subheader = this.scene.add.text(
            frameX - frameW / 2 + 28,
            headerY + 28,
            "CRITICAL: Rotate pipe segments to form an airtight conduit from Cryo Air Source (IN) to Life Support Intake (OUT).",
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "12px",
                color: UITheme.colors.textSecondary
            }
        );
        this.container.add(subheader);

        // 4. Inflow Source & Outflow Target Indicators
        const gridStartX = frameX - 170;
        const gridStartY = frameY - 80;

        // Source Box (Left of (0,0))
        const srcX = gridStartX - 100;
        const srcY = gridStartY;
        const srcBox = this.scene.add.graphics();
        srcBox.fillStyle(0x0C253D, 1);
        srcBox.fillRoundedRect(srcX - 55, srcY - 35, 110, 70, 8);
        srcBox.lineStyle(2, UITheme.colors.bioGreen, 1);
        srcBox.strokeRoundedRect(srcX - 55, srcY - 35, 110, 70, 8);
        this.container.add(srcBox);

        const srcTitle = this.scene.add.text(srcX, srcY - 14, "O₂ SOURCE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        const srcSub = this.scene.add.text(srcX, srcY + 12, "PRESSURIZED\n▶ INFLOW", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: "#FFFFFF",
            align: "center"
        }).setOrigin(0.5);
        this.container.add([srcTitle, srcSub]);

        // Target Box (Right of (3,3))
        const targetX = gridStartX + (this.COLS - 1) * (this.TILE_SIZE + this.TILE_GAP) + 110;
        const targetY = gridStartY + (this.ROWS - 1) * (this.TILE_SIZE + this.TILE_GAP);
        const targetBox = this.scene.add.graphics();
        targetBox.fillStyle(0x0C253D, 1);
        targetBox.fillRoundedRect(targetX - 55, targetY - 35, 110, 70, 8);
        targetBox.lineStyle(2, UITheme.colors.solarGold, 1);
        targetBox.strokeRoundedRect(targetX - 55, targetY - 35, 110, 70, 8);
        this.container.add(targetBox);

        const targetTitle = this.scene.add.text(targetX, targetY - 14, "ECLSS DUCT", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        const targetSub = this.scene.add.text(targetX, targetY + 12, "INTAKE VENT\n▶ RECEIVE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: "#FFFFFF",
            align: "center"
        }).setOrigin(0.5);
        this.container.add([targetTitle, targetSub]);

        // Connecting feeder pipes to grid
        const feederG = this.scene.add.graphics();
        feederG.lineStyle(8, 0x1B3654, 1);
        feederG.lineBetween(srcX + 55, srcY, gridStartX - this.TILE_SIZE / 2, srcY);
        feederG.lineBetween(
            gridStartX + (this.COLS - 1) * (this.TILE_SIZE + this.TILE_GAP) + this.TILE_SIZE / 2,
            targetY,
            targetX - 55,
            targetY
        );
        feederG.lineStyle(4, UITheme.colors.bioGreen, 0.9);
        feederG.lineBetween(srcX + 55, srcY, gridStartX - this.TILE_SIZE / 2, srcY);
        this.container.add(feederG);

        // 5. Build 4x4 Pipe Grid with designed puzzle layout
        this.createGrid(gridStartX, gridStartY);

        // 6. Bottom Status HUD inside panel
        const hudY = frameY + frameH / 2 - 50;
        const hudBg = this.scene.add.graphics();
        hudBg.fillStyle(0x091426, 0.9);
        hudBg.fillRoundedRect(frameX - frameW / 2 + 28, hudY - 24, frameW - 56, 48, 8);
        hudBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        hudBg.strokeRoundedRect(frameX - frameW / 2 + 28, hudY - 24, frameW - 56, 48, 8);
        this.container.add(hudBg);

        this.statusText = this.scene.add.text(
            frameX - frameW / 2 + 48,
            hudY,
            "STATUS: ⚠ AIR LEAK DETECTED · CIRCUIT DISCONNECTED · PRESSURE LEAKING (-0.32%/s)",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.emergencyRedStr,
                fontStyle: "bold"
            }
        ).setOrigin(0, 0.5);
        this.container.add(this.statusText);

        // Flow Meter Gauge
        const meterW = 160;
        const meterH = 16;
        const meterX = frameX + frameW / 2 - 48 - meterW;
        const meterY = hudY;

        const mTrack = this.scene.add.graphics();
        mTrack.fillStyle(0x040914, 1);
        mTrack.fillRoundedRect(meterX, meterY - meterH / 2, meterW, meterH, 4);
        mTrack.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        mTrack.strokeRoundedRect(meterX, meterY - meterH / 2, meterW, meterH, 4);
        this.container.add(mTrack);

        this.flowMeterFill = this.scene.add.graphics();
        this.container.add(this.flowMeterFill);

        const meterLabel = this.scene.add.text(meterX - 10, meterY, "AIRFLOW:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(1, 0.5);
        this.container.add(meterLabel);

        // Wait for the first renderer pass before changing text styles. Phaser
        // 4 can leave a newly-created text texture uninitialized in WebGL.
        this.scene.time.delayedCall(0, () => {
            if (!this.isClosed) this.evaluateFlow();
        });
    }

    /**
     * Initializes the 4x4 pipe puzzle.
     * Engineered with obstacles and rotatable segments ensuring a single elegant path.
     */
    private createGrid(startX: number, startY: number) {
        // Layout:
        // (0,0): ELBOW [N,E] needs rot=1 (E-S) to flow down, or STRAIGHT needs rot=1 to flow right
        // Designed correct path:
        // (0,0) [ELBOW: rot 1 -> E,S]
        // (0,1) [STRAIGHT: rot 0 -> N,S]
        // (0,2) [ELBOW: rot 0 -> N,E]
        // (1,2) [T_JUNCTION: rot 1 -> E,S,W]
        // (2,2) [T_JUNCTION: rot 2 -> N,S,W]
        // (2,3) [ELBOW: dead-end branch]
        // (3,3) [ELBOW: rot 2 -> S,W] or STRAIGHT [E,W] to exit!
        // (3,2) [ELBOW: rot 0 -> N,E]
        // (3,3) [STRAIGHT: rot 1 -> E,W] to exit
        const puzzleBlueprint: { type: PipeType; initRot: number; solutionRot: number }[][] = [
            // Row 0
            [
                { type: "ELBOW", initRot: 2, solutionRot: 1 },        // (0,0) - Inflow from W, turns S
                { type: "STRAIGHT", initRot: 0, solutionRot: 1 },     // (1,0) - Alternate route
                { type: "OBSTACLE", initRot: 0, solutionRot: 0 },     // (2,0) - BLOCKED VENT
                { type: "ELBOW", initRot: 3, solutionRot: 2 }         // (3,0)
            ],
            // Row 1
            [
                { type: "STRAIGHT", initRot: 1, solutionRot: 0 },     // (0,1) - Flows N-S
                { type: "OBSTACLE", initRot: 0, solutionRot: 0 },     // (1,1) - STRUCTURAL BULKHEAD
                { type: "ELBOW", initRot: 1, solutionRot: 3 },        // (2,1)
                { type: "STRAIGHT", initRot: 0, solutionRot: 0 }      // (3,1)
            ],
            // Row 2
            [
                { type: "ELBOW", initRot: 3, solutionRot: 0 },        // (0,2) - Turns S to E
                { type: "T_JUNCTION", initRot: 0, solutionRot: 1 },   // (1,2) - T-junction connecting W, E, S
                { type: "T_JUNCTION", initRot: 1, solutionRot: 2 },   // (2,2) - Routes W down to the final row
                { type: "ELBOW", initRot: 2, solutionRot: 2 }         // (2,3) - Dead-end branch
            ],
            // Row 3
            [
                { type: "OBSTACLE", initRot: 0, solutionRot: 0 },     // (0,3) - BLOCKED DRAIN
                { type: "ELBOW", initRot: 2, solutionRot: 0 },        // (1,3) - Dead end branch
                { type: "ELBOW", initRot: 2, solutionRot: 0 },        // (2,3) - Turns downflow into the final row
                { type: "STRAIGHT", initRot: 0, solutionRot: 1 }      // (3,3) - Flows W to Outflow Target!
            ]
        ];

        for (let r = 0; r < this.ROWS; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.COLS; c++) {
                const cellX = startX + c * (this.TILE_SIZE + this.TILE_GAP);
                const cellY = startY + r * (this.TILE_SIZE + this.TILE_GAP);
                const bp = puzzleBlueprint[r][c];

                const tileContainer = this.scene.add.container(cellX, cellY);

                // Slot base plate
                const slotBg = this.scene.add.graphics();
                slotBg.fillStyle(0x07111F, 1);
                slotBg.fillRoundedRect(-this.TILE_SIZE / 2, -this.TILE_SIZE / 2, this.TILE_SIZE, this.TILE_SIZE, 8);
                slotBg.lineStyle(1.5, bp.type === "OBSTACLE" ? 0x47221A : 0x1A3452, 1);
                slotBg.strokeRoundedRect(-this.TILE_SIZE / 2, -this.TILE_SIZE / 2, this.TILE_SIZE, this.TILE_SIZE, 8);
                tileContainer.add(slotBg);

                // Obstacle cross hatch
                if (bp.type === "OBSTACLE") {
                    const obsG = this.scene.add.graphics();
                    obsG.lineStyle(2, 0x8C3F2D, 0.7);
                    obsG.lineBetween(-20, -20, 20, 20);
                    obsG.lineBetween(-20, 20, 20, -20);
                    tileContainer.add(obsG);

                    const obsText = this.scene.add.text(0, 0, "VENT\nBLOCKED", {
                        fontFamily: UITheme.fonts.heading,
                        fontSize: "8.5px",
                        color: "#E57373",
                        align: "center",
                        fontStyle: "bold"
                    }).setOrigin(0.5);
                    tileContainer.add(obsText);
                }

                const glowGraphics = this.scene.add.graphics();
                const baseGraphics = this.scene.add.graphics();
                const flowGraphics = this.scene.add.graphics();

                tileContainer.add([glowGraphics, baseGraphics, flowGraphics]);

                const tileData: PipeTile = {
                    col: c,
                    row: r,
                    type: bp.type,
                    rot: bp.initRot,
                    isAirFilled: false,
                    container: tileContainer,
                    baseGraphics,
                    flowGraphics,
                    glowGraphics
                };

                // Draw initial pipe graphics
                this.drawPipeGraphics(tileData);

                // Interactive rotation
                if (bp.type !== "OBSTACLE") {
                    tileContainer.setSize(this.TILE_SIZE, this.TILE_SIZE);
                    tileContainer.setInteractive({ useHandCursor: true });

                    tileContainer.on("pointerover", () => {
                        if (!this.isSolved) {
                            slotBg.lineStyle(2, UITheme.colors.primaryCyan, 1);
                            slotBg.strokeRoundedRect(-this.TILE_SIZE / 2, -this.TILE_SIZE / 2, this.TILE_SIZE, this.TILE_SIZE, 8);
                        }
                    });

                    tileContainer.on("pointerout", () => {
                        if (!this.isSolved) {
                            slotBg.lineStyle(1.5, 0x1A3452, 1);
                            slotBg.strokeRoundedRect(-this.TILE_SIZE / 2, -this.TILE_SIZE / 2, this.TILE_SIZE, this.TILE_SIZE, 8);
                        }
                    });

                    tileContainer.on("pointerdown", () => {
                        if (this.isSolved) return;
                        SoundFX.playClick();
                        this.rotateTile(tileData);
                    });
                }

                this.grid[r][c] = tileData;
                this.container.add(tileContainer);
            }
        }
    }

    private rotateTile(tile: PipeTile) {
        tile.rot = (tile.rot + 1) % 4;

        this.scene.tweens.add({
            targets: [tile.baseGraphics, tile.flowGraphics, tile.glowGraphics],
            angle: tile.rot * 90,
            duration: 120,
            ease: "Quad.easeOut",
            onComplete: () => {
                this.evaluateFlow();
            }
        });
    }

    /**
     * Computes port connectivity for a tile based on type and rotation
     */
    private getPorts(type: PipeType, rot: number): TilePortSet {
        if (type === "OBSTACLE") {
            return { n: false, e: false, s: false, w: false };
        }

        if (type === "STRAIGHT") {
            // rot 0 or 2 = N-S; rot 1 or 3 = E-W
            const isVertical = rot % 2 === 0;
            return {
                n: isVertical,
                s: isVertical,
                e: !isVertical,
                w: !isVertical
            };
        }

        if (type === "ELBOW") {
            // 0 = N,E ; 1 = E,S ; 2 = S,W ; 3 = W,N
            switch (rot) {
                case 0: return { n: true, e: true, s: false, w: false };
                case 1: return { n: false, e: true, s: true, w: false };
                case 2: return { n: false, e: false, s: true, w: true };
                case 3: return { n: true, e: false, s: false, w: true };
            }
        }

        if (type === "T_JUNCTION") {
            // 0 = N,E,S ; 1 = E,S,W ; 2 = S,W,N ; 3 = W,N,E
            switch (rot) {
                case 0: return { n: true, e: true, s: true, w: false };
                case 1: return { n: false, e: true, s: true, w: true };
                case 2: return { n: true, e: false, s: true, w: true };
                case 3: return { n: true, e: true, s: false, w: true };
            }
        }

        return { n: false, e: false, s: false, w: false };
    }

    /**
     * Breadth-First-Search (BFS) Pathfinding across the pipe grid.
     * Evaluates continuous airtight connection from Inflow to Target.
     */
    private evaluateFlow() {
        // Reset all air fill states
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                this.grid[r][c].isAirFilled = false;
            }
        }

        // Source feeds into cell (0, 0) from the West port
        const startPorts = this.getPorts(this.grid[0][0].type, this.grid[0][0].rot);
        let reachesTarget = false;

        if (startPorts.w) {
            // Valid intake into (0,0)
            const queue: { col: number; row: number }[] = [{ col: 0, row: 0 }];
            this.grid[0][0].isAirFilled = true;

            const visited = new Set<string>();
            visited.add("0,0");

            while (queue.length > 0) {
                const curr = queue.shift()!;
                const currTile = this.grid[curr.row][curr.col];
                const currPorts = this.getPorts(currTile.type, currTile.rot);

                // Did we reach Target at (3, 3) exiting through East port?
                if (curr.col === this.COLS - 1 && curr.row === this.ROWS - 1 && currPorts.e) {
                    reachesTarget = true;
                }

                // Check 4 cardinal neighbors
                // NORTH
                if (currPorts.n && curr.row > 0) {
                    const nbr = this.grid[curr.row - 1][curr.col];
                    const nbrPorts = this.getPorts(nbr.type, nbr.rot);
                    const key = `${curr.col},${curr.row - 1}`;
                    if (nbrPorts.s && !visited.has(key)) {
                        visited.add(key);
                        nbr.isAirFilled = true;
                        queue.push({ col: curr.col, row: curr.row - 1 });
                    }
                }
                // SOUTH
                if (currPorts.s && curr.row < this.ROWS - 1) {
                    const nbr = this.grid[curr.row + 1][curr.col];
                    const nbrPorts = this.getPorts(nbr.type, nbr.rot);
                    const key = `${curr.col},${curr.row + 1}`;
                    if (nbrPorts.n && !visited.has(key)) {
                        visited.add(key);
                        nbr.isAirFilled = true;
                        queue.push({ col: curr.col, row: curr.row + 1 });
                    }
                }
                // EAST
                if (currPorts.e && curr.col < this.COLS - 1) {
                    const nbr = this.grid[curr.row][curr.col + 1];
                    const nbrPorts = this.getPorts(nbr.type, nbr.rot);
                    const key = `${curr.col + 1},${curr.row}`;
                    if (nbrPorts.w && !visited.has(key)) {
                        visited.add(key);
                        nbr.isAirFilled = true;
                        queue.push({ col: curr.col + 1, row: curr.row });
                    }
                }
                // WEST
                if (currPorts.w && curr.col > 0) {
                    const nbr = this.grid[curr.row][curr.col - 1];
                    const nbrPorts = this.getPorts(nbr.type, nbr.rot);
                    const key = `${curr.col - 1},${curr.row}`;
                    if (nbrPorts.e && !visited.has(key)) {
                        visited.add(key);
                        nbr.isAirFilled = true;
                        queue.push({ col: curr.col - 1, row: curr.row });
                    }
                }
            }
        }

        // Re-render flow layers
        let filledCount = 0;
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const t = this.grid[r][c];
                if (t.isAirFilled) filledCount++;
                this.updateFlowVisuals(t);
            }
        }

        // Update Flow Meter
        const pct = reachesTarget ? 1.0 : Math.min(0.8, filledCount / 8);
        this.updateMeter(pct, reachesTarget);

        if (reachesTarget && !this.isSolved) {
            this.handleSolveSuccess();
        }
    }

    private updateMeter(pct: number, isComplete: boolean) {
        const { width, height } = this.scene.scale;
        const frameW = 860;
        const frameH = 580;
        const meterW = 160;
        const meterH = 16;
        const meterX = width / 2 + frameW / 2 - 48 - meterW;
        const meterY = height / 2 + frameH / 2 - 50;

        this.flowMeterFill.clear();
        this.flowMeterFill.fillStyle(isComplete ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan, 0.95);
        this.flowMeterFill.fillRoundedRect(meterX + 2, meterY - meterH / 2 + 2, Math.max(0, (meterW - 4) * pct), meterH - 4, 3);

        if (isComplete) {
            this.statusText.setText("✔ AIR CONDUIT HERMETICALLY SEALED! COMPRESSED AIRFLOW ONLINE (100%)");
            this.statusText.setColor(UITheme.colors.bioGreenStr);
        } else {
            const pctInt = Math.round(pct * 100);
            this.statusText.setText(`STATUS: ⚠ AIR LEAK ACTIVE · PARTIAL SEAL (${pctInt}%) · ALIGN RECIPIENT DUCT`);
            this.statusText.setColor(UITheme.colors.emergencyRedStr);
        }
    }

    private handleSolveSuccess() {
        this.isSolved = true;
        SoundFX.playToggle(true);

        // Success Fanfare & Glow
        this.scene.cameras.main.flash(400, 0, 229, 255, false);

        this.completionTimer = this.scene.time.delayedCall(1600, () => {
            if (this.isClosed) return;
            this.callbacks.onComplete();
            this.close();
        });
    }

    private drawPipeGraphics(tile: PipeTile) {
        tile.baseGraphics.clear();
        if (tile.type === "OBSTACLE") return;

        const hw = 12; // half-width of pipe lumen
        const color = 0x19304A;
        const edgeColor = 0x2A4C73;

        tile.baseGraphics.lineStyle(2, edgeColor, 1);
        tile.baseGraphics.fillStyle(color, 1);

        if (tile.type === "STRAIGHT") {
            // Draw N to S conduit
            tile.baseGraphics.fillRect(-hw, -this.TILE_SIZE / 2, hw * 2, this.TILE_SIZE);
            tile.baseGraphics.strokeRect(-hw, -this.TILE_SIZE / 2, hw * 2, this.TILE_SIZE);
        } else if (tile.type === "ELBOW") {
            // Draw N to E corner conduit
            tile.baseGraphics.fillRect(-hw, -this.TILE_SIZE / 2, hw * 2, this.TILE_SIZE / 2 + hw);
            tile.baseGraphics.fillRect(-hw, -hw, this.TILE_SIZE / 2 + hw, hw * 2);
            tile.baseGraphics.strokeRect(-hw, -this.TILE_SIZE / 2, hw * 2, this.TILE_SIZE / 2 + hw);
            tile.baseGraphics.strokeRect(-hw, -hw, this.TILE_SIZE / 2 + hw, hw * 2);
        } else if (tile.type === "T_JUNCTION") {
            // Draw N to S to E junction
            tile.baseGraphics.fillRect(-hw, -this.TILE_SIZE / 2, hw * 2, this.TILE_SIZE);
            tile.baseGraphics.fillRect(-hw, -hw, this.TILE_SIZE / 2 + hw, hw * 2);
            tile.baseGraphics.strokeRect(-hw, -this.TILE_SIZE / 2, hw * 2, this.TILE_SIZE);
            tile.baseGraphics.strokeRect(-hw, -hw, this.TILE_SIZE / 2 + hw, hw * 2);
        }

        tile.baseGraphics.angle = tile.rot * 90;
        tile.flowGraphics.angle = tile.rot * 90;
        tile.glowGraphics.angle = tile.rot * 90;
    }

    private updateFlowVisuals(tile: PipeTile) {
        tile.flowGraphics.clear();
        tile.glowGraphics.clear();

        if (tile.type === "OBSTACLE" || !tile.isAirFilled) return;

        const hw = 6;
        const flowColor = UITheme.colors.primaryCyan;

        tile.flowGraphics.fillStyle(flowColor, 0.9);
        tile.glowGraphics.fillStyle(flowColor, 0.25);

        if (tile.type === "STRAIGHT") {
            tile.flowGraphics.fillRect(-hw, -this.TILE_SIZE / 2, hw * 2, this.TILE_SIZE);
            tile.glowGraphics.fillRect(-hw - 4, -this.TILE_SIZE / 2, hw * 2 + 8, this.TILE_SIZE);
        } else if (tile.type === "ELBOW") {
            tile.flowGraphics.fillRect(-hw, -this.TILE_SIZE / 2, hw * 2, this.TILE_SIZE / 2 + hw);
            tile.flowGraphics.fillRect(-hw, -hw, this.TILE_SIZE / 2 + hw, hw * 2);
            tile.glowGraphics.fillRect(-hw - 4, -this.TILE_SIZE / 2, hw * 2 + 8, this.TILE_SIZE / 2 + hw);
            tile.glowGraphics.fillRect(-hw - 4, -hw - 4, this.TILE_SIZE / 2 + hw + 4, hw * 2 + 8);
        } else if (tile.type === "T_JUNCTION") {
            tile.flowGraphics.fillRect(-hw, -this.TILE_SIZE / 2, hw * 2, this.TILE_SIZE);
            tile.flowGraphics.fillRect(-hw, -hw, this.TILE_SIZE / 2 + hw, hw * 2);
            tile.glowGraphics.fillRect(-hw - 4, -this.TILE_SIZE / 2, hw * 2 + 8, this.TILE_SIZE);
            tile.glowGraphics.fillRect(-hw - 4, -hw - 4, this.TILE_SIZE / 2 + hw + 4, hw * 2 + 8);
        }
    }

    public close() {
        if (this.isClosed) return;
        this.isClosed = true;
        this.completionTimer?.destroy();
        this.completionTimer = undefined;
        this.container.destroy();
        this.callbacks.onClose();
    }
}

export default AirLeakPuzzle;
