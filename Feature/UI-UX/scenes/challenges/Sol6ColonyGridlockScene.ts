import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol6ColonyGridlockScene extends SolChallengeBaseScene {
    private moduleStates = {
        hab: true,
        lifeSupport: false,
        thermalBus: false,
        moxieWater: false
    };

    private conduitsGraphic!: Phaser.GameObjects.Graphics;
    private telemetryText!: Phaser.GameObjects.Text;

    constructor() {
        super("Sol6ColonyGridlockScene", {
            solNumber: 6,
            title: "SOL 6: COLONY GRIDLOCK",
            codename: "TOTAL SYSTEM INTEGRATION",
            hazardBadge: "CONTINUOUS MAXIMUM ELECTRICAL LOAD",
            briefing: "A sub-zero thermal cold front (-110°C) tests every engineering system simultaneously under peak load. Power Life Support, Heaters, MOXIE, and Water Extractor while keeping grid surplus positive.",
            nasaFact: "NASA Moon-to-Mars architecture tests Total System Integration: verifying ECLSS, nuclear power, rovers, and habitats operate harmoniously under extreme stress.",
            primaryTarget: "Power all 4 colony modules simultaneously with zero breaker trips.",
            unit: "Modules",
            targetVal: 4,
            initialVal: 1
        });
    }

    protected createChallengeContent() {
        // Night Martian landscape with cold starry sky
        this.createMartianSurfaceBase(0x060C1A, 0x384E6D, 0x5C3224);

        // Interconnecting Power Conduits on ground between the 4 modules
        this.conduitsGraphic = this.add.graphics().setDepth(10);
        this.redrawConduits();

        // 1. Central Hab Module (x=220, y=470)
        this.add.image(220, 470, "base-station").setScale(0.52).setDepth(12);

        // 2. ECLSS Life Support Station (x=500, y=500)
        const eclssBox = this.add.graphics().setDepth(12);
        eclssBox.fillStyle(0x1B2C44, 1);
        eclssBox.fillRoundedRect(440, 440, 120, 110, 10);
        eclssBox.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        eclssBox.strokeRoundedRect(440, 440, 120, 110, 10);
        this.add.image(500, 485, "oxygen-cylinder").setScale(0.42).setDepth(13);

        // 3. Subsurface Thermal Bus Station (x=780, y=510)
        const thermalBox = this.add.graphics().setDepth(12);
        thermalBox.fillStyle(0x2A1A14, 1);
        thermalBox.fillRoundedRect(720, 450, 120, 110, 10);
        thermalBox.lineStyle(2, UITheme.colors.marsAmber, 0.9);
        thermalBox.strokeRoundedRect(720, 450, 120, 110, 10);
        this.add.text(780, 500, "🔥", { fontSize: "32px" }).setOrigin(0.5).setDepth(13);

        // 4. MOXIE & Cryo Extraction Plant (x=1060, y=470)
        const plantBox = this.add.graphics().setDepth(12);
        plantBox.fillStyle(0x122438, 1);
        plantBox.fillRoundedRect(1000, 420, 120, 110, 10);
        plantBox.lineStyle(2, UITheme.colors.bioGreen, 0.9);
        plantBox.strokeRoundedRect(1000, 420, 120, 110, 10);
        this.add.text(1060, 475, "💧", { fontSize: "32px" }).setOrigin(0.5).setDepth(13);

        // 5. Grid Equilibrium Telemetry Panel on ground
        const statBox = this.add.graphics().setDepth(20);
        statBox.fillStyle(0x050C1B, 0.9);
        statBox.fillRoundedRect(360, 580, 560, 58, 8);
        statBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.85);
        statBox.strokeRoundedRect(360, 580, 560, 58, 8);

        this.add.text(380, 592, "⚡ COLONY ELECTRICAL GRID LOAD BALANCE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setDepth(21);

        this.telemetryText = this.add.text(380, 613, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            fontStyle: "bold"
        }).setDepth(21);
        this.updateTelemetry();

        // 6. Interactive Surface Hotspots for Transformers
        // Hotspot 1: Central Hab
        this.createSurfaceHotspot({
            x: 220,
            y: 420,
            width: 140,
            height: 120,
            icon: "🌐",
            label: "HABITAT CORE",
            actionHint: "STATUS: PRIMARY (100%)",
            color: UITheme.colors.primaryCyan,
            onClick: () => {
                SoundFX.playToggle(true);
                this.showSurfaceFloatingText(220, 380, "Habitat Core Operational & Stable.", UITheme.colors.primaryCyanStr);
            }
        });

        // Hotspot 2: ECLSS Life Support
        this.createSurfaceHotspot({
            x: 500,
            y: 430,
            width: 140,
            height: 120,
            icon: "💨",
            label: "ECLSS LIFE SUPPORT",
            actionHint: "CLICK TO ENERGIZE",
            color: UITheme.colors.primaryCyan,
            onClick: () => this.toggleModule("lifeSupport", "ECLSS Life Support Powered!", 500, 420)
        });

        // Hotspot 3: Thermal Bus
        this.createSurfaceHotspot({
            x: 780,
            y: 440,
            width: 140,
            height: 120,
            icon: "🔥",
            label: "CABIN THERMAL BUS",
            actionHint: "CLICK TO ENERGIZE",
            color: UITheme.colors.solarGold,
            onClick: () => this.toggleModule("thermalBus", "Subsurface Thermal Heaters Online!", 780, 430)
        });

        // Hotspot 4: MOXIE & Cryo Extraction
        this.createSurfaceHotspot({
            x: 1060,
            y: 410,
            width: 140,
            height: 120,
            icon: "💧",
            label: "MOXIE & H2O PLANT",
            actionHint: "CLICK TO ENERGIZE",
            color: UITheme.colors.bioGreen,
            onClick: () => this.toggleModule("moxieWater", "MOXIE O2 & Cryo Well Synchronized!", 1060, 400)
        });
    }

    private toggleModule(modKey: "lifeSupport" | "thermalBus" | "moxieWater", label: string, x: number, y: number) {
        SoundFX.playToggle(true);
        this.moduleStates[modKey] = true;
        this.redrawConduits();

        // Traveling electrical pulse animation along conduits
        const pulse = this.add.circle(220, 490, 6, UITheme.colors.primaryCyan).setDepth(15);
        this.tweens.add({
            targets: pulse,
            x: x,
            y: y + 40,
            duration: 500,
            onComplete: () => pulse.destroy()
        });

        this.recalcState();
        this.showSurfaceFloatingText(x, y - 20, `✔ ${label}`, UITheme.colors.bioGreenStr);
    }

    private redrawConduits() {
        this.conduitsGraphic.clear();

        // Ground conduit trunk lines
        const drawLine = (x1: number, y1: number, x2: number, y2: number, active: boolean) => {
            this.conduitsGraphic.lineStyle(6, active ? UITheme.colors.primaryCyan : 0x243242, 0.9);
            this.conduitsGraphic.lineBetween(x1, y1, x2, y2);
            if (active) {
                this.conduitsGraphic.lineStyle(2, 0xFFFFFF, 0.9);
                this.conduitsGraphic.lineBetween(x1, y1, x2, y2);
            }
        };

        drawLine(220, 490, 500, 510, this.moduleStates.lifeSupport);
        drawLine(500, 510, 780, 520, this.moduleStates.thermalBus);
        drawLine(780, 520, 1060, 490, this.moduleStates.moxieWater);
    }

    private recalcState() {
        let count = 0;
        if (this.moduleStates.hab) count++;
        if (this.moduleStates.lifeSupport) count++;
        if (this.moduleStates.thermalBus) count++;
        if (this.moduleStates.moxieWater) count++;

        this.currentVal = count;
        this.updateTelemetry();
        this.updateVisorProgress(this.currentVal, this.challengeConfig.targetVal, "Modules");
    }

    private updateTelemetry() {
        this.telemetryText.setText(
            `ACTIVE MODULES: ${this.currentVal} / 4  |  GRID STABILITY: ${this.currentVal === 4 ? "100% NOMINAL EQUILIBRIUM" : "BALANCING BUS LOAD"}`
        );
        this.telemetryText.setColor(this.currentVal >= 4 ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr);
    }

    protected isTargetMet(): boolean {
        return this.currentVal >= this.challengeConfig.targetVal;
    }
}

export default Sol6ColonyGridlockScene;
