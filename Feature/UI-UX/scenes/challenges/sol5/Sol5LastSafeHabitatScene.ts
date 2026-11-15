import Phaser from "phaser";
import UITheme from "../../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "../SolChallengeBaseScene.ts";
import type { SubsystemId } from "./types.ts";

interface StationTabDef {
    id: SubsystemId;
    index: number;
    title: string;
    icon: string;
    errorBadge: string;
    solvedBadge: string;
}

const STATION_DEFS: StationTabDef[] = [
    {
        id: "air_distribution",
        index: 0,
        title: "1. O₂ MANIFOLD",
        icon: "💨",
        errorBadge: "⚠ LEAKING",
        solvedBadge: "✔ BALANCED"
    },
    {
        id: "electrical_grid",
        index: 1,
        title: "2. POWER GRID",
        icon: "⚡",
        errorBadge: "⚠ TRIPPED",
        solvedBadge: "✔ ENERGIZED"
    },
    {
        id: "oxygen_regulation",
        index: 2,
        title: "3. O₂ REGULATOR",
        icon: "🎛️",
        errorBadge: "⚠ UNSTABLE",
        solvedBadge: "✔ 64 kPa NOMINAL"
    },
    {
        id: "structural_hull",
        index: 3,
        title: "4. HULL BREACHES",
        icon: "🛡️",
        errorBadge: "⚠ 3 BREACHES",
        solvedBadge: "✔ VACUUM SEALED"
    }
];

export class Sol5LastSafeHabitatScene extends SolChallengeBaseScene {
    // Current active station tab (0 = Manifold, 1 = Breaker, 2 = Pressure, 3 = Hull)
    public activeStationIndex = 0;
    public stationSolved: boolean[] = [false, false, false, false];

    // Containers
    private tabsContainer!: Phaser.GameObjects.Container;
    private telemetryContainer!: Phaser.GameObjects.Container;
    public stationContainers: Phaser.GameObjects.Container[] = [];
    private tabButtons: Phaser.GameObjects.Container[] = [];
    private tabBadges: Phaser.GameObjects.Text[] = [];

    // Telemetry text references
    private timerText!: Phaser.GameObjects.Text;
    private o2Text!: Phaser.GameObjects.Text;
    private pressureText!: Phaser.GameObjects.Text;
    private powerText!: Phaser.GameObjects.Text;
    private hullText!: Phaser.GameObjects.Text;

    // Simulation state
    private emergencySeconds = 300; // 5:00 buffer
    private timerEvent?: Phaser.Time.TimerEvent;
    private o2Pct = 42;
    private cabinPressureKPa = 24.5;
    private powerKW = 1.2;
    private hullPct = 35;

    // Station 1: O2 Manifold state
    // Target angles: [180, 90, 0, 270]
    private manifoldValves = [0, 180, 90, 0];
    private manifoldNeedles: Phaser.GameObjects.Graphics[] = [];
    private manifoldLamps: { red: Phaser.GameObjects.Arc; cyan: Phaser.GameObjects.Arc } | null = null;
    private manifoldParticles: Phaser.GameObjects.Graphics[] = [];

    // Station 2: Power Breaker state
    // Required: CB-1 (8A), CB-2 (10A), CB-3 (9A). Total = 27A (Safe: 26 - 28A).
    // CB-4 (15A Comms) causes overload surge (> 28A)
    // CB-5 (12A Cryo) causes ground fault short
    private breakers = [false, false, false, false, false];
    private breakerLoads = [8, 10, 9, 15, 12];
    private breakerNames = [
        "CB-1: ECLSS LIFE SUPPORT",
        "CB-2: THERMAL CORE",
        "CB-3: O₂ ELECTROLYSIS",
        "CB-4: HIGH-GAIN COMMS",
        "CB-5: AUX CRYO PUMP"
    ];
    private breakerSwitches: Phaser.GameObjects.Container[] = [];
    private ammeterBar!: Phaser.GameObjects.Graphics;
    private ammeterText!: Phaser.GameObjects.Text;
    private coilGlows: Phaser.GameObjects.Arc[] = [];

    // Station 3: O2 Pressure Regulator state
    // Range: 0 to 100 kPa. Target: 58.0 to 66.0 kPa.
    private regulatorKPa = 24.5;
    private regulatorNeedle!: Phaser.GameObjects.Graphics;
    private regulatorDwellSec = 0;
    private regulatorDwellTarget = 3.0;
    private regulatorDwellText!: Phaser.GameObjects.Text;
    private oscilloscopeG!: Phaser.GameObjects.Graphics;
    private oscPhase = 0;

    // Station 4: Hull Breaches state
    // Breaches: 0: Spider Fissure (Aerogel), 1: Longitudinal Tear (Carbon-Fiber), 2: Puncture Hole (Titanium)
    private breachesSealed = [false, false, false];
    private selectedPatchIndex: number | null = null;
    private patchButtons: Phaser.GameObjects.Container[] = [];
    private breachHotspots: Phaser.GameObjects.Container[] = [];
    private breachGases: Phaser.GameObjects.Graphics[] = [];

    // Storm particle graphics
    private stormG!: Phaser.GameObjects.Graphics;
    private stormParticles: Array<{ x: number; y: number; speed: number; len: number; alpha: number }> = [];

    constructor() {
        super("Sol5LastSafeHabitatScene", {
            solNumber: 5,
            title: "SOL 5: THE LAST SAFE HABITAT",
            codename: "MARTIAN EMERGENCY LIFE-SUPPORT RESTORATION",
            hazardBadge: "CABIN DECOMPRESSION & POWER GRID TRIPPED",
            briefing: "A ferocious dust storm has crippled Outpost Sol. Re-sequence the O2 manifold, balance the power grid, calibrate cabin pressure above the Armstrong limit, and seal structural vacuum hull breaches before life support reserves deplete.",
            nasaFact: "Mars ambient pressure is only ~0.6 kPa (<1% of Earth). The Armstrong Limit (6.3 kPa) is where body temperature water boils. Habitats rely on NASA ECLSS closed-loop life support and multi-layer composite pressure vessels to maintain a habitable 56-70 kPa environment.",
            primaryTarget: "Restore 4 critical stations: Air Manifold, Power Grid, O2 Regulator & Hull Seals.",
            unit: "Systems",
            targetVal: 4,
            initialVal: 0
        });
    }

    init() {
        // Reset all simulation arrays & states for clean start / restart
        this.activeStationIndex = 0;
        this.stationSolved = [false, false, false, false];
        this.stationContainers = [];
        this.tabButtons = [];
        this.tabBadges = [];
        this.manifoldValves = [0, 180, 90, 0];
        this.manifoldNeedles = [];
        this.manifoldLamps = null;
        this.manifoldParticles = [];
        this.breakers = [false, false, false, false, false];
        this.breakerSwitches = [];
        this.coilGlows = [];
        this.regulatorKPa = 24.5;
        this.regulatorDwellSec = 0;
        this.breachesSealed = [false, false, false];
        this.selectedPatchIndex = 0;
        this.patchButtons = [];
        this.breachHotspots = [];
        this.breachGases = [];
        this.stormParticles = [];
        this.emergencySeconds = 300;
        this.o2Pct = 42;
        this.cabinPressureKPa = 24.5;
        this.powerKW = 1.2;
        this.hullPct = 35;
    }

    preload() {
        super.preload();
        // Load the 4 high-fidelity hardware station assets uploaded by the user
        if (!this.textures.exists("sol5_air_manifold")) {
            this.load.image("sol5_air_manifold", "/assets/game/sol5/sol5_air_manifold.png");
        }
        if (!this.textures.exists("sol5_breaker_box")) {
            this.load.image("sol5_breaker_box", "/assets/game/sol5/sol5_breaker_box.png");
        }
        if (!this.textures.exists("sol5_pressure_station")) {
            this.load.image("sol5_pressure_station", "/assets/game/sol5/sol5_pressure_station.png");
        }
        if (!this.textures.exists("sol5_hull_breaches")) {
            this.load.image("sol5_hull_breaches", "/assets/game/sol5/sol5_hull_breaches.png");
        }
    }

    create() {
        this.cameras.main.setBackgroundColor("#070E1A");

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.time.removeAllEvents();
            this.tweens.killAll();
            this.input.keyboard?.removeAllListeners();
        });

        // 1. Build Authentic Martian Surface Panorama with stormy ember gradient
        this.createMartianSurfaceBase(0x160813, 0xBD4930, 0x7E2A1C);

        // 2. Build Sol-Specific Martian Surface Content
        this.createChallengeContent();

        // 3. Floating NASA Astronaut Visor HUD (Top & Bottom)
        (this as any).createVisorHUD();

        // 4. Keyboard Shortcut: ESC to safely return to Mars EVA
        this.input.keyboard?.on("keydown-ESC", () => {
            SoundFX.playClick();
            this.returnToMars();
        });
    }

    protected isTargetMet(): boolean {
        return this.currentVal >= 4;
    }

    protected createChallengeContent(): void {
        // 1. Ambient Storm Gale Particles & Habitat Silhouette
        this.createMartianStormAtmosphere();

        // 2. Station Navigation Switchboard Tabs (y = 80)
        this.createStationNavigationTabs();

        // 3. Live Emergency Telemetry Ribbon (y = 124)
        this.createTelemetryRibbon();

        // 4. Main Engineering Workspace & The 4 Station Viewports (y = 156 to 650)
        this.createStationViewports();

        // 5. Start Emergency Buffer Countdown Timer
        this.startEmergencyBufferTimer();

        // 6. Initial Viewport Activation
        this.switchStation(0);

        // Initial feedback
        this.setActionFeedback("EMERGENCY ALERT: SELECT HARDWARE STATIONS TO RESOLVE MALFUNCTIONS", false);
    }

    /**
     * Atmospheric Martian Dust Storm Gale & Emergency Dome Beacon
     */
    private createMartianStormAtmosphere() {
        // Distant Outpost Sol habitat silhouette in the dust storm
        const domeG = this.add.graphics().setDepth(-26);
        domeG.fillStyle(0x0E040B, 0.75);
        domeG.fillCircle(this.W / 2, 380, 110);
        domeG.fillRect(this.W / 2 - 140, 375, 280, 60);

        // Revolving Emergency Beacon atop the dome
        const beacon = this.add.graphics().setDepth(-25);
        let beaconAngle = 0;
        this.time.addEvent({
            delay: 40,
            loop: true,
            callback: () => {
                if (!this.scene.isActive() || !beacon || !beacon.scene) return;
                beaconAngle += 0.08;
                beacon.clear();
                const bx = this.W / 2;
                const by = 270;
                beacon.fillStyle(0xFF1744, 0.85);
                beacon.fillCircle(bx, by, 5);

                // Sweeping beam of light through dust storm
                const beamLen = 220;
                const endX1 = bx + Math.cos(beaconAngle - 0.25) * beamLen;
                const endY1 = by + Math.sin(beaconAngle - 0.25) * 60;
                const endX2 = bx + Math.cos(beaconAngle + 0.25) * beamLen;
                const endY2 = by + Math.sin(beaconAngle + 0.25) * 60;

                beacon.fillStyle(0xFF1744, 0.15);
                beacon.beginPath();
                beacon.moveTo(bx, by);
                beacon.lineTo(endX1, endY1);
                beacon.lineTo(endX2, endY2);
                beacon.closePath();
                beacon.fillPath();
            }
        });

        // Fast-moving horizontal dust streaks
        this.stormG = this.add.graphics().setDepth(-20);
        for (let i = 0; i < 60; i++) {
            this.stormParticles.push({
                x: Math.random() * this.W,
                y: 120 + Math.random() * 480,
                speed: 12 + Math.random() * 18,
                len: 30 + Math.random() * 70,
                alpha: 0.15 + Math.random() * 0.35
            });
        }

        this.time.addEvent({
            delay: 30,
            loop: true,
            callback: () => {
                if (!this.scene.isActive() || !this.stormG || !this.stormG.scene) return;
                this.stormG.clear();
                for (const p of this.stormParticles) {
                    p.x += p.speed;
                    if (p.x > this.W + 80) {
                        p.x = -80;
                        p.y = 120 + Math.random() * 480;
                    }
                    this.stormG.lineStyle(1.5, 0xFFA07A, p.alpha);
                    this.stormG.lineBetween(p.x, p.y, p.x + p.len, p.y + (p.speed * 0.15));
                }
            }
        });
    }

    /**
     * Station Switchboard Navigation Tabs (y = 80)
     */
    private createStationNavigationTabs() {
        this.tabsContainer = this.add.container(0, 0).setDepth(110);
        const tabY = 82;
        const totalW = 1220;
        const tabW = totalW / 4 - 8;
        const tabH = 34;

        STATION_DEFS.forEach((def, i) => {
            const tabX = 30 + i * (tabW + 10) + tabW / 2;
            const tabBtn = this.add.container(tabX, tabY);

            // Tab background frame
            const bg = this.add.graphics();
            bg.fillStyle(0x061124, 0.92);
            bg.fillRoundedRect(-tabW / 2, -tabH / 2, tabW, tabH, 6);
            bg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
            bg.strokeRoundedRect(-tabW / 2, -tabH / 2, tabW, tabH, 6);
            tabBtn.add(bg);

            // Tab label
            const label = this.add.text(-tabW / 2 + 14, 0, `${def.icon} ${def.title}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: "#FFFFFF",
                fontStyle: "bold"
            }).setOrigin(0, 0.5);
            tabBtn.add(label);

            // Status Badge
            const badge = this.add.text(tabW / 2 - 12, 0, def.errorBadge, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold"
            }).setOrigin(1, 0.5);
            tabBtn.add(badge);
            this.tabBadges.push(badge);

            // Interactive hitzone
            const hit = this.add.rectangle(0, 0, tabW, tabH, 0x000000, 0.001);
            hit.setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                SoundFX.playClick();
                this.switchStation(i);
            });
            tabBtn.add(hit);

            this.tabButtons.push(tabBtn);
            this.tabsContainer.add(tabBtn);
        });
    }

    /**
     * Live Telemetry & Emergency Buffer Countdown Ribbon (y = 122)
     */
    private createTelemetryRibbon() {
        this.telemetryContainer = this.add.container(0, 0).setDepth(110);
        const y = 124;
        const w = 1220;
        const h = 26;
        const bg = this.add.graphics();
        bg.fillStyle(0x040915, 0.88);
        bg.fillRoundedRect(30, y - h / 2, w, h, 5);
        bg.lineStyle(1, UITheme.colors.primaryCyan, 0.4);
        bg.strokeRoundedRect(30, y - h / 2, w, h, 5);
        this.telemetryContainer.add(bg);

        // Emergency buffer timer (x = 50)
        this.timerText = this.add.text(50, y, "⏱️ BUFFER: 05:00", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);

        // Cabin O2
        this.o2Text = this.add.text(310, y, `🫁 CABIN O₂: ${this.o2Pct}%`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);

        // Cabin Pressure
        this.pressureText = this.add.text(550, y, `🌡️ PRESSURE: ${this.cabinPressureKPa.toFixed(1)} kPa`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: "#FFA726",
            fontStyle: "bold"
        }).setOrigin(0, 0.5);

        // Electrical Power
        this.powerText = this.add.text(820, y, `⚡ GRID BUS: ${this.powerKW.toFixed(1)} kW / 8.5 kW`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);

        // Hull Integrity
        this.hullText = this.add.text(1070, y, `🛡️ HULL: ${this.hullPct}%`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: "#EF5350",
            fontStyle: "bold"
        }).setOrigin(0, 0.5);

        this.telemetryContainer.add([
            this.timerText,
            this.o2Text,
            this.pressureText,
            this.powerText,
            this.hullText
        ]);
    }

    /**
     * Start the Emergency Buffer countdown
     */
    private startEmergencyBufferTimer() {
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (!this.scene.isActive()) return;
                if (this.currentVal >= 4) return; // Mission won!
                if (this.emergencySeconds > 0) {
                    this.emergencySeconds--;
                    const m = Math.floor(this.emergencySeconds / 60);
                    const s = this.emergencySeconds % 60;
                    const timeStr = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                    this.timerText.setText(`⏱️ BUFFER: ${timeStr}`);

                    if (this.emergencySeconds <= 60) {
                        this.timerText.setColor("#FF1744");
                        if (this.emergencySeconds % 2 === 0) {
                            SoundFX.playAlert();
                        }
                    }
                } else {
                    // Buffer exhausted
                    this.timerEvent?.remove();
                    this.handleEmergencyDepletion();
                }
            }
        });
    }

    private handleEmergencyDepletion() {
        SoundFX.playAlert();
        this.setActionFeedback("CRITICAL FAILURE: EMERGENCY BUFFER EXHAUSTED! CABIN DECOMPRESSION.", false);
        const failModal = this.add.container(this.W / 2, this.H / 2).setDepth(200);
        const modalBg = this.add.graphics();
        modalBg.fillStyle(0x070E1A, 0.96);
        modalBg.fillRoundedRect(-280, -140, 560, 280, 12);
        modalBg.lineStyle(2, 0xFF1744, 0.9);
        modalBg.strokeRoundedRect(-280, -140, 560, 280, 12);
        failModal.add(modalBg);

        const title = this.add.text(0, -90, "🚨 MISSION FAILED: OUTPOST DECOMPRESSED", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "15px",
            color: "#FF1744",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const desc = this.add.text(0, -30, "The emergency life support buffer was exhausted before all 4 stations\ncould be stabilized. The crew's life support systems collapsed.", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#ECEFF1",
            align: "center",
            lineSpacing: 6
        }).setOrigin(0.5);

        const retryBtn = ButtonFactory.createButton({
            scene: this,
            x: 0,
            y: 60,
            width: 220,
            height: 38,
            text: "RETRY REPAIR SEQUENCE",
            primaryColor: UITheme.colors.primaryCyan,
            textColor: "#000000",
            onClick: () => {
                SoundFX.playClick();
                this.scene.restart();
            }
        });

        failModal.add([title, desc, retryBtn]);
    }

    /**
     * Switch between the 4 station viewports
     */
    public switchStation(targetIndex: number) {
        this.activeStationIndex = targetIndex;

        // Update tab visuals
        const totalW = 1220;
        const tabW = totalW / 4 - 8;
        const tabH = 34;

        this.tabButtons.forEach((tabBtn, i) => {
            if (!tabBtn || !tabBtn.scene) return;
            const bg = tabBtn.getAt(0) as Phaser.GameObjects.Graphics;
            if (!bg || typeof bg.clear !== "function") return;
            bg.clear();
            const isActive = i === targetIndex;
            const isSolved = this.stationSolved[i];

            const fillColor = isActive ? 0x0C2344 : 0x061124;
            const borderColor = isActive
                ? UITheme.colors.primaryCyan
                : isSolved
                    ? UITheme.colors.bioGreen
                    : UITheme.colors.panelBorder;

            bg.fillStyle(fillColor, 0.95);
            bg.fillRoundedRect(-tabW / 2, -tabH / 2, tabW, tabH, 6);
            bg.lineStyle(isActive ? 2 : 1, borderColor, 0.9);
            bg.strokeRoundedRect(-tabW / 2, -tabH / 2, tabW, tabH, 6);

            // Active neon underline
            if (isActive) {
                bg.fillStyle(UITheme.colors.primaryCyan, 1);
                bg.fillRect(-tabW / 2 + 10, tabH / 2 - 3, tabW - 20, 3);
            }
        });

        // Show/hide station containers
        this.stationContainers.forEach((c, i) => {
            if (c && c.scene) {
                c.setVisible(i === targetIndex);
            }
        });

        const activeDef = STATION_DEFS[targetIndex];
        this.setActionFeedback(`ACTIVE CONSOLE: ${activeDef.title} — OPERATE CONTROLS TO RESTORE NOMINAL STATE`, true);
    }

    /**
     * Build the 4 Engineering Station Viewports
     */
    private createStationViewports() {
        this.stationContainers = [
            this.createStation1Manifold(),
            this.createStation2Breaker(),
            this.createStation3Pressure(),
            this.createStation4Hull()
        ];
    }

    // =========================================================================
    // STATION 1: O₂ DISTRIBUTION MANIFOLD (Asset: sol5_air_manifold)
    // =========================================================================
    private createStation1Manifold(): Phaser.GameObjects.Container {
        const c = this.add.container(0, 0).setDepth(50).setVisible(false);

        // Layout Cards
        this.createStationCardFrames(c, "O₂ MANIFOLD SUBSYSTEM", "DIAGNOSTIC: TURBULENT BACKPRESSURE & FLANGE LEAK");

        // Left Info Panel: Schematic & Operating Instructions
        const leftX = 40;
        const leftY = 190;
        const leftInfo = this.add.text(leftX, leftY, [
            "✦ ECLSS ACOUSTIC SENSOR DIAGNOSTIC",
            "High-pressure Mars atmosphere has breached",
            "the distribution bypass flange.",
            "",
            "▶ REQUIRED CALIBRATION CODE:",
            "  • VALVE A (Feed Line):      180° [DOWN]",
            "  • VALVE B (Bypass Vent):     90° [RIGHT]",
            "  • VALVE C (Cabin Supply):     0° [UP]",
            "  • VALVE D (Scrubber Loop):  270° [LEFT]",
            "",
            "▶ INSTRUCTION:",
            "Click each yellow handwheel valve to rotate",
            "it 90° until all 4 valves achieve laminar flow.",
            "Watch analog needles enter green nominal zone!"
        ].join("\n"), {
            fontFamily: UITheme.fonts.body,
            fontSize: "10.5px",
            color: "#CFD8DC",
            lineSpacing: 5
        });
        c.add(leftInfo);

        // Center: Uploaded Hardware Station Asset (656x578 source -> scaled to ~480x420)
        const assetX = 640;
        const assetY = 390;
        const manifoldImg = this.add.image(assetX, assetY, "sol5_air_manifold");
        manifoldImg.setDisplaySize(480, 420);
        c.add(manifoldImg);

        // 4 Rotatable Handwheels overlaid directly over the 4 valves in the image
        const valveOffsets = [-142, -47, 47, 142];
        const valveY = assetY + 68;

        valveOffsets.forEach((ox, vi) => {
            const vx = assetX + ox;
            const valveC = this.add.container(vx, valveY);

            // Valve indicator ring & orientation arrow
            const vRing = this.add.graphics();
            this.drawValveGraphics(vRing, this.manifoldValves[vi]);
            valveC.add(vRing);

            // Valve degree label
            const degText = this.add.text(0, 24, `${this.manifoldValves[vi]}°`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            valveC.add(degText);

            // Click zone
            const hit = this.add.circle(0, 0, 26, 0x000000, 0.001);
            hit.setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                if (this.stationSolved[0]) return;
                SoundFX.playClick();
                this.manifoldValves[vi] = (this.manifoldValves[vi] + 90) % 360;
                degText.setText(`${this.manifoldValves[vi]}°`);
                this.drawValveGraphics(vRing, this.manifoldValves[vi]);
                this.checkManifoldSolution();
            });
            valveC.add(hit);

            c.add(valveC);
        });

        // 2 Pressure needles over the analog dials at top of manifold
        const dialLeftX = assetX - 88;
        const dialRightX = assetX + 90;
        const dialY = assetY - 118;

        const leftNeedle = this.add.graphics();
        const rightNeedle = this.add.graphics();
        this.manifoldNeedles = [leftNeedle, rightNeedle];
        this.drawNeedle(leftNeedle, dialLeftX, dialY, -40);
        this.drawNeedle(rightNeedle, dialRightX, dialY, -30);
        c.add([leftNeedle, rightNeedle]);

        // Red/Cyan indicator lamps over the top central lights
        const redLamp = this.add.circle(assetX + 28, assetY - 96, 10, 0xFF1744, 0.85);
        const cyanLamp = this.add.circle(assetX - 18, assetY - 96, 10, 0x00E5FF, 0.2);
        this.manifoldLamps = { red: redLamp, cyan: cyanLamp };
        c.add([redLamp, cyanLamp]);

        // Right Info Card: Live Flow Telemetry & Status
        const rightX = 960;
        const rightY = 190;
        const rightInfo = this.add.text(rightX, rightY, [
            "✦ LIVE MANIFOLD TELEMETRY",
            "LOOP STATUS: LEAK DETECTED",
            "FLANGE PRESSURE: 32 kPa (LOW)",
            "MASS FLOW RATE: 110 L/min",
            "",
            "▶ STATUS ALIGNMENT:",
            "  V-1: MISALIGNED",
            "  V-2: MISALIGNED",
            "  V-3: MISALIGNED",
            "  V-4: MISALIGNED",
            "",
            "Restore 420 L/min laminar flow to",
            "supply Outpost Sol crew compartments."
        ].join("\n"), {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            lineSpacing: 5
        });
        c.add(rightInfo);

        // Store reference to right info for updates
        (c as any).updateTelemetry = () => {
            const targets = [180, 90, 0, 270];
            const v1Ok = this.manifoldValves[0] === targets[0] ? "✔ LOCKED" : "MISALIGNED";
            const v2Ok = this.manifoldValves[1] === targets[1] ? "✔ LOCKED" : "MISALIGNED";
            const v3Ok = this.manifoldValves[2] === targets[2] ? "✔ LOCKED" : "MISALIGNED";
            const v4Ok = this.manifoldValves[3] === targets[3] ? "✔ LOCKED" : "MISALIGNED";
            const isSolved = this.stationSolved[0];

            rightInfo.setText([
                "✦ LIVE MANIFOLD TELEMETRY",
                `LOOP STATUS: ${isSolved ? "✔ LAMINAR FLOW STABLE" : "LEAK DETECTED"}`,
                `FLANGE PRESSURE: ${isSolved ? "98.5 kPa (NOMINAL)" : "32 kPa (LOW)"}`,
                `MASS FLOW RATE: ${isSolved ? "420 L/min (NOMINAL)" : "110 L/min"}`,
                "",
                "▶ STATUS ALIGNMENT:",
                `  V-1 (FEED):     ${v1Ok}`,
                `  V-2 (BYPASS):   ${v2Ok}`,
                `  V-3 (CABIN):    ${v3Ok}`,
                `  V-4 (SCRUBBER): ${v4Ok}`,
                "",
                isSolved
                    ? "✔ O₂ DISTRIBUTION FULLY RESTORED!\nCABIN OXYGEN SUPPLY NOMINAL."
                    : "Restore 420 L/min laminar flow to\nsupply Outpost Sol crew compartments."
            ].join("\n"));
            rightInfo.setColor(isSolved ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr);
        };

        return c;
    }

    private drawValveGraphics(g: Phaser.GameObjects.Graphics, angleDeg: number) {
        if (!g || !g.scene) return;
        g.clear();
        // Outer glowing halo
        g.lineStyle(2, UITheme.colors.solarGold, 0.9);
        g.strokeCircle(0, 0, 16);
        g.fillStyle(0xFFD600, 0.2);
        g.fillCircle(0, 0, 16);

        // Direction pointer arrow
        const rad = Phaser.Math.DegToRad(angleDeg - 90);
        const px = Math.cos(rad) * 14;
        const py = Math.sin(rad) * 14;

        g.lineStyle(3, 0xFFFFFF, 1);
        g.lineBetween(0, 0, px, py);
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(px, py, 3);
    }

    private drawNeedle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, angleDeg: number) {
        if (!g || !g.scene) return;
        g.clear();
        const rad = Phaser.Math.DegToRad(angleDeg);
        const len = 22;
        const nx = cx + Math.cos(rad) * len;
        const ny = cy + Math.sin(rad) * len;

        g.lineStyle(2.5, 0xFF1744, 0.95);
        g.lineBetween(cx, cy, nx, ny);
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx, cy, 3);
    }

    private checkManifoldSolution() {
        const targets = [180, 90, 0, 270];
        let correctCount = 0;
        this.manifoldValves.forEach((v, i) => {
            if (v === targets[i]) correctCount++;
        });

        // Update needles based on correctness
        const leftDeg = -40 + correctCount * 20;
        const rightDeg = -30 + correctCount * 22;
        if (this.manifoldNeedles.length === 2) {
            this.drawNeedle(this.manifoldNeedles[0], 640 - 88, 390 - 118, leftDeg);
            this.drawNeedle(this.manifoldNeedles[1], 640 + 90, 390 - 118, rightDeg);
        }

        // Update container telemetry text
        const c1 = this.stationContainers[0];
        if (c1 && (c1 as any).updateTelemetry) {
            (c1 as any).updateTelemetry();
        }

        if (correctCount === 4 && !this.stationSolved[0]) {
            // SOLVED!
            this.stationSolved[0] = true;
            SoundFX.playSuccess();

            // Lamp updates
            if (this.manifoldLamps) {
                this.manifoldLamps.red.setAlpha(0.15);
                this.manifoldLamps.cyan.setAlpha(1);
            }

            // Atmospheric flow particles
            const pG = this.add.graphics().setDepth(55);
            this.manifoldParticles.push(pG);
            c1.add(pG);
            this.time.addEvent({
                delay: 50,
                repeat: 30,
                callback: () => {
                    if (!this.scene.isActive() || !pG || !pG.scene) return;
                    pG.clear();
                    pG.fillStyle(0x00E5FF, 0.85);
                    for (let i = 0; i < 8; i++) {
                        const px = 640 - 160 + (i * 45) + Math.sin(this.time.now * 0.01 + i) * 6;
                        const py = 390 - 20 + Math.cos(this.time.now * 0.01 + i) * 8;
                        pG.fillCircle(px, py, 3);
                    }
                }
            });

            this.onStationComplete(0);
        }
    }

    // =========================================================================
    // STATION 2: POWER GRID & BREAKER SEQUENCING (Asset: sol5_breaker_box)
    // =========================================================================
    private createStation2Breaker(): Phaser.GameObjects.Container {
        const c = this.add.container(0, 0).setDepth(50).setVisible(false);

        this.createStationCardFrames(c, "POWER GRID & BREAKER BUS", "DIAGNOSTIC: ELECTROSTATIC DISCHARGE & GROUND FAULT");

        // Left Info Panel: Breaker Load Rules
        const leftX = 40;
        const leftY = 190;
        const leftInfo = this.add.text(leftX, leftY, [
            "✦ MAIN BUS CAPACITY: 28 AMPS MAX",
            "Martian dust gale triboelectricity triggered",
            "the habitat's master safety relay.",
            "",
            "▶ BUS LOAD MATRIX:",
            "  • CB-1: ECLSS LIFE SUPPORT    [8 A] ★",
            "  • CB-2: THERMAL CORE         [10 A] ★",
            "  • CB-3: O₂ ELECTROLYSIS       [9 A] ★",
            "  • CB-4: COMMS DISH           [15 A] ⚠",
            "  • CB-5: AUX CRYO PUMP        [12 A] ⚠",
            "",
            "▶ SURGE SAFETY PROTOCOL:",
            "• Drawing > 28 Amps trips master breaker!",
            "• CB-4 has a short to ground chassis.",
            "• CB-5 has a severe induction leakage.",
            "Engage ONLY the 3 critical life-support buses!"
        ].join("\n"), {
            fontFamily: UITheme.fonts.body,
            fontSize: "10.5px",
            color: "#CFD8DC",
            lineSpacing: 5
        });
        c.add(leftInfo);

        // Center: Uploaded Breaker Box Asset (641x599 -> scaled to ~450x420)
        const assetX = 640;
        const assetY = 390;
        const breakerImg = this.add.image(assetX, assetY, "sol5_breaker_box");
        breakerImg.setDisplaySize(450, 420);
        c.add(breakerImg);

        // Top Induction Coils Glow (left coil & right coil)
        const coil1Glow = this.add.circle(assetX - 98, assetY - 110, 24, 0xFF9800, 0);
        const coil2Glow = this.add.circle(assetX - 34, assetY - 110, 24, 0xFF9800, 0);
        this.coilGlows = [coil1Glow, coil2Glow];
        c.add([coil1Glow, coil2Glow]);

        // 5 Interactive Breaker Switches across the middle row
        const switchStartX = assetX - 128;
        const switchSpacing = 32;
        const switchY = assetY + 22;

        this.breakers.forEach((_, bi) => {
            const bx = switchStartX + bi * switchSpacing;
            const bC = this.add.container(bx, switchY);

            // Switch lever graphic
            const leverG = this.add.graphics();
            this.drawBreakerSwitch(leverG, false);
            bC.add(leverG);

            // Breaker number label
            const bNum = this.add.text(0, 28, `CB${bi + 1}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: "#FFFFFF",
                fontStyle: "bold"
            }).setOrigin(0.5);
            bC.add(bNum);

            // Interactive hitzone
            const hit = this.add.rectangle(0, 0, 28, 44, 0x000000, 0.001);
            hit.setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                if (this.stationSolved[1]) return;
                SoundFX.playClick();
                this.toggleBreaker(bi);
            });
            bC.add(hit);

            this.breakerSwitches.push(bC);
            c.add(bC);
        });

        // Right Info Card: Live Bus Ammeter & Breaker Status
        const rightX = 960;
        const rightY = 190;
        const rightTitle = this.add.text(rightX, rightY, "✦ POWER BUS LOAD MONITOR", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        c.add(rightTitle);

        // Ammeter Bar Track
        const barBg = this.add.graphics();
        barBg.fillStyle(0x020712, 0.95);
        barBg.fillRoundedRect(rightX, rightY + 24, 250, 16, 4);
        barBg.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        barBg.strokeRoundedRect(rightX, rightY + 24, 250, 16, 4);
        c.add(barBg);

        this.ammeterBar = this.add.graphics();
        c.add(this.ammeterBar);

        this.ammeterText = this.add.text(rightX + 125, rightY + 32, "0 A / 28 A MAX", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add(this.ammeterText);

        const breakerLog = this.add.text(rightX, rightY + 54, [
            "CB-1: OPEN [OFF]",
            "CB-2: OPEN [OFF]",
            "CB-3: OPEN [OFF]",
            "CB-4: OPEN [OFF]",
            "CB-5: OPEN [OFF]",
            "",
            "SURGE THRESHOLD: 28 Amps",
            "Power grid offline. Cabin systems",
            "running on emergency capacitors."
        ].join("\n"), {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            lineSpacing: 5
        });
        c.add(breakerLog);

        (c as any).updateLog = (currentAmps: number, isOverload: boolean) => {
            const isSolved = this.stationSolved[1];
            const lines = this.breakers.map((b, i) => {
                const name = this.breakerNames[i].split(":")[0];
                return `${name}: ${b ? "CLOSED [ON]" : "OPEN [OFF]"} (${this.breakerLoads[i]}A)`;
            });

            lines.push("");
            if (isOverload) {
                lines.push("🚨 SURGE TRIPPED! BUS LOAD EXCEEDED 28A!");
                lines.push("Safety relay reset all tripped circuits.");
            } else if (isSolved) {
                lines.push("✔ 27A NOMINAL LOAD ACHIEVED!");
                lines.push("Outpost Sol power bus energized at 8.5 kW.");
            } else {
                lines.push(`TOTAL DRAW: ${currentAmps} A / 28 A Max`);
                lines.push("Engage CB-1, CB-2, CB-3 to restore life support.");
            }

            breakerLog.setText(lines.join("\n"));
            breakerLog.setColor(isSolved ? UITheme.colors.bioGreenStr : isOverload ? "#FF1744" : UITheme.colors.solarGoldStr);
        };

        this.updateAmmeterDisplay(0, false);
        return c;
    }

    private drawBreakerSwitch(g: Phaser.GameObjects.Graphics, isOn: boolean) {
        if (!g || !g.scene) return;
        g.clear();
        // Breaker toggle lever
        g.fillStyle(0x1F2937, 0.9);
        g.fillRoundedRect(-10, -18, 20, 36, 3);
        g.lineStyle(1, 0x4B5563, 0.8);
        g.strokeRoundedRect(-10, -18, 20, 36, 3);

        // Toggle knob position
        const knobY = isOn ? -9 : 9;
        g.fillStyle(isOn ? UITheme.colors.bioGreen : UITheme.colors.solarGold, 1);
        g.fillRoundedRect(-8, knobY - 5, 16, 10, 2);

        // Mini status LED
        g.fillStyle(isOn ? 0x00E5FF : 0x374151, 1);
        g.fillCircle(0, -14, 2.5);
    }

    private toggleBreaker(index: number) {
        this.breakers[index] = !this.breakers[index];
        const bC = this.breakerSwitches[index];
        const leverG = bC.getAt(0) as Phaser.GameObjects.Graphics;
        this.drawBreakerSwitch(leverG, this.breakers[index]);

        // Calculate total current draw
        let totalAmps = 0;
        this.breakers.forEach((b, i) => {
            if (b) totalAmps += this.breakerLoads[i];
        });

        const isOverload = totalAmps > 28;
        this.updateAmmeterDisplay(totalAmps, isOverload);

        const c2 = this.stationContainers[1];
        if (c2 && (c2 as any).updateLog) {
            (c2 as any).updateLog(totalAmps, isOverload);
        }

        if (isOverload) {
            // Overload surge!
            SoundFX.playAlert();
            this.setActionFeedback("⚡ SURGE OVERLOAD! BUS CAPACITY EXCEEDED. BREAKERS TRIPPED TO OFF.", false);

            // Flash breaker and reset after 350ms
            this.time.delayedCall(350, () => {
                if (!this.scene.isActive()) return;
                this.breakers = [false, false, false, false, false];
                this.breakers.forEach((_, bi) => {
                    const bgC = this.breakerSwitches[bi];
                    if (bgC && bgC.scene) {
                        const g = bgC.getAt(0) as Phaser.GameObjects.Graphics;
                        this.drawBreakerSwitch(g, false);
                    }
                });
                this.updateAmmeterDisplay(0, false);
                if (c2 && (c2 as any).updateLog) {
                    (c2 as any).updateLog(0, false);
                }
            });
            return;
        }

        // Check if correct 3 are active: CB-1, CB-2, CB-3
        if (this.breakers[0] && this.breakers[1] && this.breakers[2] && !this.breakers[3] && !this.breakers[4]) {
            if (!this.stationSolved[1]) {
                this.stationSolved[1] = true;
                SoundFX.playSuccess();

                // Illuminate induction coils
                this.coilGlows.forEach(cg => {
                    if (cg && cg.scene) cg.setAlpha(0.6);
                });

                this.onStationComplete(1);
            }
        }
    }

    private updateAmmeterDisplay(totalAmps: number, isOverload: boolean) {
        if (!this.ammeterBar || !this.ammeterBar.scene) return;
        const rightX = 960;
        const rightY = 190;
        this.ammeterBar.clear();

        const pct = Math.min(1, totalAmps / 28);
        const barColor = isOverload ? 0xFF1744 : pct >= 0.95 ? 0x00E676 : 0x00E5FF;

        this.ammeterBar.fillStyle(barColor, 0.9);
        this.ammeterBar.fillRoundedRect(rightX + 2, rightY + 26, Math.max(0, 246 * pct), 12, 3);

        this.ammeterText.setText(`${totalAmps} A / 28 A MAX`);
        this.ammeterText.setColor(isOverload ? "#FF1744" : "#FFFFFF");
    }

    // =========================================================================
    // STATION 3: O₂ PRESSURE REGULATOR (Asset: sol5_pressure_station)
    // =========================================================================
    private createStation3Pressure(): Phaser.GameObjects.Container {
        const c = this.add.container(0, 0).setDepth(50).setVisible(false);

        this.createStationCardFrames(c, "O₂ PRESSURE & ECLSS REGULATOR", "DIAGNOSTIC: HYPOBARIC HYPOXIA / BELOW ARMSTRONG LIMIT");

        // Left Info Panel: Armstrong Limit & Dwell Calibration
        const leftX = 40;
        const leftY = 190;
        const leftInfo = this.add.text(leftX, leftY, [
            "✦ ECLSS BAROMETRIC STANDARD",
            "Mars atmospheric pressure is 0.6 kPa.",
            "Water boils at human body temp (37°C)",
            "at the Armstrong Limit (6.3 kPa).",
            "",
            "▶ CALIBRATION TARGET:",
            "  • NOMINAL CABIN: 58.0 to 66.0 kPa",
            "  • DWELL DURATION: 3.0 Seconds Lock",
            "",
            "▶ VALVE CONTROLS:",
            "  • VALVE 1 (Cryo Injector): +6.0 kPa",
            "  • VALVE 2 (Exhaust Bleed): -4.0 kPa",
            "  • VALVE 3 (Fine Vernier):  ±1.5 kPa",
            "",
            "Bring the needle into the GREEN NOMINAL ZONE",
            "and hold for 3 seconds to lock calibration!"
        ].join("\n"), {
            fontFamily: UITheme.fonts.body,
            fontSize: "10.5px",
            color: "#CFD8DC",
            lineSpacing: 5
        });
        c.add(leftInfo);

        // Center: Uploaded Pressure Station Asset (656x600 -> scaled to ~460x420)
        const assetX = 640;
        const assetY = 390;
        const pressureImg = this.add.image(assetX, assetY, "sol5_pressure_station");
        pressureImg.setDisplaySize(460, 420);
        c.add(pressureImg);

        // Dial Needle over the large central dial in the image
        this.regulatorNeedle = this.add.graphics();
        this.drawPressureNeedle(this.regulatorKPa);
        c.add(this.regulatorNeedle);

        // Oscilloscope Screen overlay (top right of the asset)
        this.oscilloscopeG = this.add.graphics();
        c.add(this.oscilloscopeG);
        this.startOscilloscopeAnimation(assetX + 114, assetY - 100);

        // 3 Interactive Valve Controls below the asset
        const valveStartX = assetX - 78;
        const valveSpacing = 78;
        const valveY = assetY + 68;

        // Valve 1: Inflow (+6 kPa)
        this.createPressureValveButton(c, valveStartX, valveY, "INFLOW\n+6 kPa", () => {
            if (this.stationSolved[2]) return;
            SoundFX.playClick();
            this.adjustPressure(6.0);
        });

        // Valve 2: Bleed (-4 kPa)
        this.createPressureValveButton(c, valveStartX + valveSpacing, valveY, "BLEED\n-4 kPa", () => {
            if (this.stationSolved[2]) return;
            SoundFX.playClick();
            this.adjustPressure(-4.0);
        });

        // Valve 3: Fine Vernier (±1.5 kPa)
        let fineSign = 1;
        this.createPressureValveButton(c, valveStartX + valveSpacing * 2, valveY, "VERNIER\n±1.5 kPa", () => {
            if (this.stationSolved[2]) return;
            SoundFX.playClick();
            this.adjustPressure(1.5 * fineSign);
            fineSign *= -1;
        });

        // Right Info Card: Live Pressure Readout & Dwell Lock Countdown
        const rightX = 960;
        const rightY = 190;
        const rightTitle = this.add.text(rightX, rightY, "✦ CABIN PRESSURE TELEMETRY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        c.add(rightTitle);

        const currentKPaText = this.add.text(rightX, rightY + 26, `CURRENT: ${this.regulatorKPa.toFixed(1)} kPa`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: "#FFA726",
            fontStyle: "bold"
        });
        c.add(currentKPaText);

        const statusLabel = this.add.text(rightX, rightY + 54, "STATUS: HYPOBARIC DANGER", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#FF1744",
            fontStyle: "bold"
        });
        c.add(statusLabel);

        this.regulatorDwellText = this.add.text(rightX, rightY + 80, "CALIBRATION LOCK: WAITING", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        c.add(this.regulatorDwellText);

        const pressureNotes = this.add.text(rightX, rightY + 110, [
            "SAFE RANGE: 58.0 — 66.0 kPa",
            "ARMSTRONG LIMIT: 6.3 kPa (LETHAL)",
            "OVERPRESSURE LIMIT: > 70.0 kPa",
            "",
            "Once pressure is inside the green zone,",
            "the system begins a 3-second dwell lock."
        ].join("\n"), {
            fontFamily: UITheme.fonts.body,
            fontSize: "10px",
            color: "#CFD8DC",
            lineSpacing: 5
        });
        c.add(pressureNotes);

        (c as any).updateReadout = () => {
            const isSolved = this.stationSolved[2];
            currentKPaText.setText(`CURRENT: ${this.regulatorKPa.toFixed(1)} kPa`);

            if (isSolved) {
                currentKPaText.setColor(UITheme.colors.bioGreenStr);
                statusLabel.setText("STATUS: ✔ 64.0 kPa NOMINAL");
                statusLabel.setColor(UITheme.colors.bioGreenStr);
                this.regulatorDwellText.setText("CALIBRATION LOCK: ✔ COMPLETE");
                this.regulatorDwellText.setColor(UITheme.colors.bioGreenStr);
            } else if (this.regulatorKPa >= 58.0 && this.regulatorKPa <= 66.0) {
                currentKPaText.setColor(UITheme.colors.solarGoldStr);
                statusLabel.setText("STATUS: IN NOMINAL ZONE — DWELLING");
                statusLabel.setColor(UITheme.colors.solarGoldStr);
            } else if (this.regulatorKPa > 70.0) {
                currentKPaText.setColor("#FF1744");
                statusLabel.setText("STATUS: 🚨 CRITICAL OVERPRESSURE!");
                statusLabel.setColor("#FF1744");
            } else {
                currentKPaText.setColor("#FFA726");
                statusLabel.setText("STATUS: HYPOBARIC DANGER");
                statusLabel.setColor("#FFA726");
            }
        };

        // Dwell Lock Timer Event
        this.time.addEvent({
            delay: 100,
            loop: true,
            callback: () => {
                if (!this.scene.isActive()) return;
                if (this.stationSolved[2]) return;
                if (this.regulatorKPa >= 58.0 && this.regulatorKPa <= 66.0) {
                    this.regulatorDwellSec += 0.1;
                    const remaining = Math.max(0, this.regulatorDwellTarget - this.regulatorDwellSec);
                    this.regulatorDwellText.setText(`CALIBRATION LOCK: ${remaining.toFixed(1)}s`);
                    this.regulatorDwellText.setColor(UITheme.colors.solarGoldStr);

                    if (this.regulatorDwellSec >= this.regulatorDwellTarget) {
                        this.stationSolved[2] = true;
                        SoundFX.playSuccess();
                        (c as any).updateReadout();
                        this.onStationComplete(2);
                    }
                } else {
                    this.regulatorDwellSec = 0;
                    this.regulatorDwellText.setText("CALIBRATION LOCK: WAITING");
                    this.regulatorDwellText.setColor(UITheme.colors.solarGoldStr);
                }
            }
        });

        return c;
    }

    private createPressureValveButton(
        parent: Phaser.GameObjects.Container,
        x: number,
        y: number,
        label: string,
        onClick: () => void
    ) {
        const btnC = this.add.container(x, y);

        // Circular valve ring overlay
        const ring = this.add.graphics();
        ring.fillStyle(0x0C2344, 0.7);
        ring.fillCircle(0, 0, 24);
        ring.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        ring.strokeCircle(0, 0, 24);
        btnC.add(ring);

        // Valve text label
        const txt = this.add.text(0, 0, label, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "8.5px",
            color: "#FFFFFF",
            fontStyle: "bold",
            align: "center"
        }).setOrigin(0.5);
        btnC.add(txt);

        // Hit Area
        const hit = this.add.circle(0, 0, 26, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => {
            this.tweens.add({
                targets: btnC,
                scaleX: 0.92,
                scaleY: 0.92,
                duration: 80,
                yoyo: true,
                onComplete: onClick
            });
        });
        btnC.add(hit);

        parent.add(btnC);
    }

    private adjustPressure(delta: number) {
        this.regulatorKPa = Math.max(0, Math.min(100, this.regulatorKPa + delta));
        this.drawPressureNeedle(this.regulatorKPa);

        const c3 = this.stationContainers[2];
        if (c3 && (c3 as any).updateReadout) {
            (c3 as any).updateReadout();
        }
    }

    private drawPressureNeedle(pressureKPa: number) {
        if (!this.regulatorNeedle || !this.regulatorNeedle.scene) return;
        this.regulatorNeedle.clear();
        const cx = 640 - 8;
        const cy = 390 - 110;

        // Needle angle mapping: 0 kPa = -135°, 100 kPa = 135°
        const minAngle = -135;
        const maxAngle = 135;
        const angle = minAngle + (pressureKPa / 100) * (maxAngle - minAngle);
        const rad = Phaser.Math.DegToRad(angle - 90);

        const len = 34;
        const nx = cx + Math.cos(rad) * len;
        const ny = cy + Math.sin(rad) * len;

        this.regulatorNeedle.lineStyle(3, 0x111827, 0.95);
        this.regulatorNeedle.lineBetween(cx, cy, nx, ny);
        this.regulatorNeedle.fillStyle(0xFF1744, 1);
        this.regulatorNeedle.fillCircle(cx, cy, 4);
    }

    private startOscilloscopeAnimation(ox: number, oy: number) {
        this.time.addEvent({
            delay: 40,
            loop: true,
            callback: () => {
                if (!this.scene.isActive() || !this.oscilloscopeG || !this.oscilloscopeG.scene) return;
                this.oscPhase += 0.12;
                this.oscilloscopeG.clear();

                const w = 70;
                const h = 40;
                const isStable = this.stationSolved[2] || (this.regulatorKPa >= 58.0 && this.regulatorKPa <= 66.0);

                this.oscilloscopeG.lineStyle(1.5, isStable ? 0x00E5FF : 0xFF9800, 0.9);
                this.oscilloscopeG.beginPath();

                for (let x = 0; x <= w; x += 3) {
                    const progress = x / w;
                    const freq = isStable ? 4 : 8;
                    const noise = isStable ? 0 : Math.sin(x * 12 + this.oscPhase) * 6;
                    const y = oy + Math.sin(progress * Math.PI * freq + this.oscPhase) * (h / 3) + noise;

                    if (x === 0) {
                        this.oscilloscopeG.moveTo(ox - w / 2 + x, y);
                    } else {
                        this.oscilloscopeG.lineTo(ox - w / 2 + x, y);
                    }
                }
                this.oscilloscopeG.strokePath();
            }
        });
    }

    // =========================================================================
    // STATION 4: STRUCTURAL HULL BREACHES (Asset: sol5_hull_breaches)
    // =========================================================================
    private createStation4Hull(): Phaser.GameObjects.Container {
        const c = this.add.container(0, 0).setDepth(50).setVisible(false);

        this.createStationCardFrames(c, "STRUCTURAL TITANIUM HULL", "DIAGNOSTIC: 3 VACUUM BREACHES / RAPID DEPRESSURIZATION");

        // Left Info Panel: Material Science & Breach Types
        const leftX = 40;
        const leftY = 190;
        const leftInfo = this.add.text(leftX, leftY, [
            "✦ VACUUM COMPOSITE PATCH SCIENCE",
            "Impact and thermal stress caused 3 distinct",
            "hull ruptures across the crew module.",
            "",
            "▶ BREACH CLASSIFICATIONS:",
            "  1. SPIDER FISSURE (Left):",
            "     High velocity micro-fracture network.",
            "     Requires: EXPANDING AEROGEL FOAM.",
            "",
            "  2. LONGITUDINAL TEAR (Center):",
            "     Ragged shear-stress rupture.",
            "     Requires: CARBON-FIBER WEAVE.",
            "",
            "  3. PUNCTURE CRATER (Right):",
            "     Micrometeorite circular impact hole.",
            "     Requires: TITANIUM CLAMPING PLATE.",
            "",
            "Select the correct patch, then click the breach!"
        ].join("\n"), {
            fontFamily: UITheme.fonts.body,
            fontSize: "10px",
            color: "#CFD8DC",
            lineSpacing: 5
        });
        c.add(leftInfo);

        // Center: Uploaded Hull Breaches Asset (640x572 -> scaled to ~470x410)
        const assetX = 640;
        const assetY = 380;
        const hullImg = this.add.image(assetX, assetY, "sol5_hull_breaches");
        hullImg.setDisplaySize(470, 410);
        c.add(hullImg);

        // 3 Breach Hotspots on the curved hull
        const breachPositions = [
            { x: assetX - 140, y: assetY - 40, name: "Spider Fissure", correctPatch: 0 },
            { x: assetX - 25, y: assetY - 30, name: "Longitudinal Tear", correctPatch: 1 },
            { x: assetX + 105, y: assetY - 35, name: "Puncture Hole", correctPatch: 2 }
        ];

        breachPositions.forEach((bp, bi) => {
            const bC = this.add.container(bp.x, bp.y);

            // Escaping Gas Particle Stream
            const gasG = this.add.graphics();
            this.breachGases.push(gasG);
            bC.add(gasG);
            this.startBreachGasAnimation(gasG);

            // Breach Highlight Halo
            const halo = this.add.graphics();
            halo.lineStyle(2, 0xFF1744, 0.85);
            halo.strokeCircle(0, 0, 22);
            bC.add(halo);

            // Sealed Patch Visual (hidden initially)
            const patchG = this.add.graphics().setVisible(false);
            bC.add(patchG);

            // Click zone to apply patch
            const hit = this.add.circle(0, 0, 26, 0x000000, 0.001);
            hit.setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                if (this.breachesSealed[bi]) return;
                SoundFX.playClick();
                this.applyPatchToBreach(bi, bp.correctPatch, patchG, halo, gasG);
            });
            bC.add(hit);

            this.breachHotspots.push(bC);
            c.add(bC);
        });

        // Bottom Patch Selection Tray (3 Patches)
        const patchStartX = assetX - 130;
        const patchSpacing = 130;
        const patchY = assetY + 160;

        const patchDefs = [
            { name: "AEROGEL FOAM", color: 0xE0E0E0, desc: "For micro-fissures" },
            { name: "CARBON WEAVE", color: 0x263238, desc: "For shear tears" },
            { name: "TITANIUM PLATE", color: 0x90A4AE, desc: "For impact holes" }
        ];

        patchDefs.forEach((pd, pi) => {
            const px = patchStartX + pi * patchSpacing;
            const pBtn = this.add.container(px, patchY);

            // Patch tray frame
            const pBg = this.add.graphics();
            pBg.fillStyle(0x0C2344, 0.9);
            pBg.fillRoundedRect(-52, -22, 104, 44, 6);
            pBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
            pBg.strokeRoundedRect(-52, -22, 104, 44, 6);
            pBtn.add(pBg);

            // Miniature patch swatch
            const swatch = this.add.graphics();
            swatch.fillStyle(pd.color, 1);
            swatch.fillRoundedRect(-44, -14, 28, 28, 4);
            swatch.lineStyle(1, 0xFFFFFF, 0.6);
            swatch.strokeRoundedRect(-44, -14, 28, 28, 4);
            pBtn.add(swatch);

            // Text
            const pName = this.add.text(-10, -8, pd.name, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8px",
                color: "#FFFFFF",
                fontStyle: "bold"
            });
            const pSub = this.add.text(-10, 4, pd.desc, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "6.5px",
                color: UITheme.colors.solarGoldStr
            });
            pBtn.add([pName, pSub]);

            // Hit zone
            const hit = this.add.rectangle(0, 0, 104, 44, 0x000000, 0.001);
            hit.setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                SoundFX.playClick();
                this.selectPatch(pi);
            });
            pBtn.add(hit);

            this.patchButtons.push(pBtn);
            c.add(pBtn);
        });

        // Right Info Card: Hull Status & Sealing Progress
        const rightX = 960;
        const rightY = 190;
        const rightTitle = this.add.text(rightX, rightY, "✦ HULL PRESSURE INTEGRITY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        c.add(rightTitle);

        const breachStatusText = this.add.text(rightX, rightY + 30, [
            "BREACH 1 (FISSURE):   VENTING ⚠",
            "BREACH 2 (TEAR):      VENTING ⚠",
            "BREACH 3 (PUNCTURE):  VENTING ⚠",
            "",
            "SEAL PROGRESS: 0 / 3",
            "ATMOSPHERE LOSS: 85 L/sec",
            "",
            "Apply space composite patches to stop",
            "the vacuum atmospheric blow-off."
        ].join("\n"), {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            lineSpacing: 5
        });
        c.add(breachStatusText);

        (c as any).updateBreachStatus = () => {
            const isSolved = this.stationSolved[3];
            const sealedCount = this.breachesSealed.filter(Boolean).length;
            const b1 = this.breachesSealed[0] ? "✔ SEALED" : "VENTING ⚠";
            const b2 = this.breachesSealed[1] ? "✔ SEALED" : "VENTING ⚠";
            const b3 = this.breachesSealed[2] ? "✔ SEALED" : "VENTING ⚠";

            breachStatusText.setText([
                `BREACH 1 (FISSURE):   ${b1}`,
                `BREACH 2 (TEAR):      ${b2}`,
                `BREACH 3 (PUNCTURE):  ${b3}`,
                "",
                `SEAL PROGRESS: ${sealedCount} / 3`,
                `ATMOSPHERE LOSS: ${isSolved ? "0 L/sec (ZERO LEAK)" : `${(3 - sealedCount) * 28} L/sec`}`,
                "",
                isSolved
                    ? "✔ ALL 3 HULL BREACHES AIRTIGHT!\nHABITAT STRUCTURAL INTEGRITY 100%."
                    : "Apply space composite patches to stop\nthe vacuum atmospheric blow-off."
            ].join("\n"));
            breachStatusText.setColor(isSolved ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr);
        };

        // Select patch 0 by default
        this.selectPatch(0);

        return c;
    }

    private selectPatch(index: number) {
        this.selectedPatchIndex = index;
        this.patchButtons.forEach((pb, i) => {
            if (!pb || !pb.scene) return;
            const bg = pb.getAt(0) as Phaser.GameObjects.Graphics;
            if (!bg || typeof bg.clear !== "function") return;
            bg.clear();
            const isSel = i === index;

            bg.fillStyle(isSel ? 0x0E3A70 : 0x0C2344, 0.95);
            bg.fillRoundedRect(-52, -22, 104, 44, 6);
            bg.lineStyle(isSel ? 2 : 1, isSel ? UITheme.colors.primaryCyan : UITheme.colors.panelBorder, 0.9);
            bg.strokeRoundedRect(-52, -22, 104, 44, 6);
        });

        const patchNames = ["Aerogel Foam Sealant", "Carbon-Fiber Weave Patch", "Titanium Clamping Plate"];
        this.setActionFeedback(`SELECTED PATCH: ${patchNames[index].toUpperCase()} — CLICK CORRESPONDING BREACH ON HULL`, true);
    }

    private applyPatchToBreach(
        breachIndex: number,
        correctPatchIndex: number,
        patchG: Phaser.GameObjects.Graphics,
        halo: Phaser.GameObjects.Graphics,
        gasG: Phaser.GameObjects.Graphics
    ) {
        if (this.selectedPatchIndex === null) {
            SoundFX.playAlert();
            this.setActionFeedback("SELECT A COMPOSITE REPAIR PATCH FROM THE TRAY FIRST!", false);
            return;
        }

        if (this.selectedPatchIndex === correctPatchIndex) {
            // SUCCESSFUL SEAL
            SoundFX.playSuccess();
            this.breachesSealed[breachIndex] = true;

            // Draw sealed patch over breach
            patchG.setVisible(true);
            patchG.clear();
            const patchColors = [0xE0E0E0, 0x212121, 0x90A4AE];
            patchG.fillStyle(patchColors[correctPatchIndex], 0.95);
            patchG.fillRoundedRect(-18, -18, 36, 36, 4);
            patchG.lineStyle(2, UITheme.colors.bioGreen, 1);
            patchG.strokeRoundedRect(-18, -18, 36, 36, 4);

            // Halo turns green
            halo.clear();
            halo.lineStyle(2, UITheme.colors.bioGreen, 0.9);
            halo.strokeCircle(0, 0, 24);

            // Extinguish gas
            gasG.clear();
            gasG.setVisible(false);

            this.setActionFeedback(`✔ BREACH ${breachIndex + 1} SUCCESSFULLY SEALED AND PRESSURE-TESTED!`, true);

            const c4 = this.stationContainers[3];
            if (c4 && (c4 as any).updateBreachStatus) {
                (c4 as any).updateBreachStatus();
            }

            // Check if all 3 sealed
            if (this.breachesSealed.every(Boolean) && !this.stationSolved[3]) {
                this.stationSolved[3] = true;
                SoundFX.playSuccess();
                this.onStationComplete(3);
            }
        } else {
            // MATERIAL MISMATCH
            SoundFX.playAlert();
            const hints = [
                "Spider fissures require expanding nano-porous Aerogel Foam!",
                "Longitudinal shear ruptures require high-tensile Carbon-Fiber Weave!",
                "Circular micrometeorite punctures require rigid bolted Titanium Plates!"
            ];
            this.setActionFeedback(`⚠ MATERIAL MISMATCH: ${hints[breachIndex]}`, false);
        }
    }

    private startBreachGasAnimation(g: Phaser.GameObjects.Graphics) {
        let phase = Math.random() * 10;
        this.time.addEvent({
            delay: 40,
            loop: true,
            callback: () => {
                if (!this.scene.isActive() || !g || !g.scene || !g.visible) return;
                phase += 0.2;
                g.clear();
                g.fillStyle(0x00E5FF, 0.4);

                // Venting cone of gas particles
                for (let i = 0; i < 6; i++) {
                    const dist = 10 + i * 8;
                    const spread = (i * 4) * Math.sin(phase + i);
                    g.fillCircle(dist, dist * 0.4 + spread, 2 + i * 0.8);
                }
            }
        });
    }

    // =========================================================================
    // COMMON STATION CARD FRAMES (Left 260px, Right 280px, Center 620px)
    // =========================================================================
    private createStationCardFrames(
        parent: Phaser.GameObjects.Container,
        title: string,
        diagnostic: string
    ) {
        const topY = 156;
        const totalH = 490;

        // Left Card (x = 24 to 284, width = 260)
        const leftBg = this.add.graphics();
        leftBg.fillStyle(0x050C1B, 0.88);
        leftBg.fillRoundedRect(24, topY, 260, totalH, 8);
        leftBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        leftBg.strokeRoundedRect(24, topY, 260, totalH, 8);
        parent.add(leftBg);

        const leftHeader = this.add.text(38, topY + 14, title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        parent.add(leftHeader);

        // Center Card Frame (x = 296 to 928, width = 632)
        const centerBg = this.add.graphics();
        centerBg.fillStyle(0x020712, 0.82);
        centerBg.fillRoundedRect(296, topY, 632, totalH, 8);
        centerBg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.4);
        centerBg.strokeRoundedRect(296, topY, 632, totalH, 8);
        parent.add(centerBg);

        const diagText = this.add.text(612, topY + 14, diagnostic, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5, 0);
        parent.add(diagText);

        // Right Card (x = 940 to 1256, width = 316)
        const rightBg = this.add.graphics();
        rightBg.fillStyle(0x050C1B, 0.88);
        rightBg.fillRoundedRect(940, topY, 316, totalH, 8);
        rightBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        rightBg.strokeRoundedRect(940, topY, 316, totalH, 8);
        parent.add(rightBg);
    }

    // =========================================================================
    // PROGRESSION & CELEBRATION
    // =========================================================================
    private onStationComplete(stationIndex: number) {
        // Update badge
        const def = STATION_DEFS[stationIndex];
        const badge = this.tabBadges[stationIndex];
        if (badge && badge.scene) {
            badge.setText(def.solvedBadge);
            badge.setColor(UITheme.colors.bioGreenStr);
        }

        // Update overall challenge progress
        this.currentVal++;
        this.updateVisorProgress(this.currentVal, 4, "Systems");

        // Update telemetry values
        this.o2Pct = Math.min(100, 42 + this.currentVal * 14.5);
        this.cabinPressureKPa = Math.min(65.0, 24.5 + this.currentVal * 10.1);
        this.powerKW = Math.min(8.5, 1.2 + this.currentVal * 1.82);
        this.hullPct = Math.min(100, 35 + this.currentVal * 16.25);

        this.o2Text.setText(`🫁 CABIN O₂: ${Math.round(this.o2Pct)}%`);
        this.pressureText.setText(`🌡️ PRESSURE: ${this.cabinPressureKPa.toFixed(1)} kPa`);
        this.powerText.setText(`⚡ GRID BUS: ${this.powerKW.toFixed(1)} kW / 8.5 kW`);
        this.hullText.setText(`🛡️ HULL: ${Math.round(this.hullPct)}%`);

        // Check if all 4 are done
        if (this.currentVal >= 4) {
            SoundFX.playSuccess();
            this.setActionFeedback("✔ ALL 4 LIFE-SUPPORT STATIONS RESTORED! OUTPOST SOL IS SECURED.", true);
            this.showVictoryDebriefModal();
        } else {
            this.setActionFeedback(`STATION ${stationIndex + 1} RESTORED! (${this.currentVal}/4). SWITCH TABS TO PROCEED.`, true);
        }
    }

    /**
     * Celebratory NASA Victory Debrief Modal
     */
    private showVictoryDebriefModal() {
        const modal = this.add.container(this.W / 2, this.H / 2).setDepth(200);

        // Backdrop tint
        const tint = this.add.rectangle(0, 0, this.W, this.H, 0x000000, 0.7);
        modal.add(tint);

        // Frame
        const mw = 680;
        const mh = 440;
        const bg = this.add.graphics();
        bg.fillStyle(0x050E1E, 0.96);
        bg.fillRoundedRect(-mw / 2, -mh / 2, mw, mh, 14);
        bg.lineStyle(2, UITheme.colors.primaryCyan, 0.95);
        bg.strokeRoundedRect(-mw / 2, -mh / 2, mw, mh, 14);
        modal.add(bg);

        // Golden Victory Banner
        const banner = this.add.text(0, -mh / 2 + 36, "🏆 OUTPOST SOL RESCUED! THE LAST SAFE HABITAT", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "15px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Subtitle
        const sub = this.add.text(0, -mh / 2 + 66, "EMERGENCY LIFE-SUPPORT & STRUCTURAL INTEGRITY FULLY RESTORED", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Performance Statistics Box
        const statBg = this.add.graphics();
        statBg.fillStyle(0x020712, 0.9);
        statBg.fillRoundedRect(-mw / 2 + 30, -mh / 2 + 96, mw - 60, 90, 8);
        statBg.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        statBg.strokeRoundedRect(-mw / 2 + 30, -mh / 2 + 96, mw - 60, 90, 8);
        modal.add(statBg);

        const m = Math.floor(this.emergencySeconds / 60);
        const s = this.emergencySeconds % 60;
        const remainingStr = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

        const statsText = this.add.text(0, -mh / 2 + 141, [
            `⏱️ TIME BUFFER REMAINING: ${remainingStr}    |    🫁 CABIN O₂: 100% NOMINAL`,
            `🌡️ FINAL PRESSURE: 65.0 kPa    |    ⚡ POWER GRID: 8.5 kW ACTIVE    |    🛡️ HULL: 100% AIRTIGHT`
        ].join("\n"), {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold",
            align: "center",
            lineSpacing: 8
        }).setOrigin(0.5);

        // NASA Science Debrief
        const nasaDebrief = this.add.text(0, 36, [
            "✦ NASA ECLSS & MARS EXPLORATION SCIENCE DEBRIEF:",
            "On Earth, atmospheric pressure at sea level is 101.3 kPa.",
            "On Mars, ambient air pressure is barely 0.6 kPa—less than 1% of Earth!",
            "At pressures below the Armstrong Limit (6.3 kPa), water and saliva boil instantly.",
            "NASA Environmental Control and Life Support Systems (ECLSS) maintain 56-70 kPa",
            "habitats using MOXIE oxygen generation, water recycling, and multi-layer composites."
        ].join("\n"), {
            fontFamily: UITheme.fonts.body,
            fontSize: "11px",
            color: "#ECEFF1",
            align: "center",
            lineSpacing: 6
        }).setOrigin(0.5);

        // Advance Button
        const advanceBtn = ButtonFactory.createButton({
            scene: this,
            x: 0,
            y: mh / 2 - 46,
            width: 280,
            height: 42,
            text: "VALIDATE SOL 5 & ADVANCE TO SOL 6 ➔",
            primaryColor: UITheme.colors.solarGold,
            textColor: "#000000",
            onClick: () => {
                SoundFX.playClick();
                this.completeChallengeAndAdvance();
            }
        });

        modal.add([banner, sub, statsText, nasaDebrief, advanceBtn]);
    }
}

export default Sol5LastSafeHabitatScene;
