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

        // 1. Central Hab Module (x=200, y=470)
        this.add.image(200, 470, "base-station").setScale(0.52).setDepth(12);

        // 2. ECLSS Life Support Station (x=480, y=490)
        const eclssBox = this.add.graphics().setDepth(12);
        eclssBox.fillStyle(0x1B2C44, 1);
        eclssBox.fillRoundedRect(420, 435, 120, 110, 10);
        eclssBox.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        eclssBox.strokeRoundedRect(420, 435, 120, 110, 10);
        this.add.image(480, 480, "oxygen-cylinder").setScale(0.42).setDepth(13);

        // 3. Subsurface Thermal Bus Station (x=760, y=500)
        const thermalBox = this.add.graphics().setDepth(12);
        thermalBox.fillStyle(0x2A1A14, 1);
        thermalBox.fillRoundedRect(700, 445, 120, 110, 10);
        thermalBox.lineStyle(2, UITheme.colors.marsAmber, 0.9);
        thermalBox.strokeRoundedRect(700, 445, 120, 110, 10);
        this.add.text(760, 495, "🔥", { fontSize: "30px" }).setOrigin(0.5).setDepth(13);

        // 4. MOXIE & Cryo Extraction Plant (x=1050, y=470)
        const plantBox = this.add.graphics().setDepth(12);
        plantBox.fillStyle(0x122438, 1);
        plantBox.fillRoundedRect(990, 420, 120, 110, 10);
        plantBox.lineStyle(2, UITheme.colors.bioGreen, 0.9);
        plantBox.strokeRoundedRect(990, 420, 120, 110, 10);
        this.add.text(1050, 475, "💧", { fontSize: "30px" }).setOrigin(0.5).setDepth(13);

        // 5. Interactive Surface Hotspots
        // Hotspot 1: Central Hab
        this.createSurfaceHotspot({
            x: 200,
            y: 470,
            width: 140,
            height: 130,
            icon: "🌐",
            label: "HABITAT CORE",
            actionHint: "ONLINE & ENERGIZED (100%)",
            color: UITheme.colors.primaryCyan,
            onClick: () => {
                SoundFX.playToggle(true);
                this.showSurfaceFloatingText(200, 390, "Habitat Core Operational & Stable.", UITheme.colors.primaryCyanStr);
            }
        });

        // Hotspot 2: ECLSS Life Support
        this.createSurfaceHotspot({
            x: 480,
            y: 490,
            width: 140,
            height: 130,
            icon: "💨",
            label: "ECLSS O2/CO2",
            actionHint: "ENERGIZE LIFE SUPPORT",
            color: UITheme.colors.primaryCyan,
            onClick: () => this.toggleModule("lifeSupport", "ECLSS Life Support Powered!", 480, 410)
        });

        // Hotspot 3: Thermal Bus
        this.createSurfaceHotspot({
            x: 760,
            y: 500,
            width: 140,
            height: 130,
            icon: "🔥",
            label: "THERMAL HEATERS",
            actionHint: "ENERGIZE HEATER LOOPS",
            color: UITheme.colors.solarGold,
            onClick: () => this.toggleModule("thermalBus", "Subsurface Thermal Heaters Online!", 760, 420)
        });

        // Hotspot 4: MOXIE & Cryo Extraction
        this.createSurfaceHotspot({
            x: 1050,
            y: 470,
            width: 140,
            height: 130,
            icon: "💧",
            label: "MOXIE & H2O PLANT",
            actionHint: "ENERGIZE ISRU EXTRACTION",
            color: UITheme.colors.bioGreen,
            onClick: () => this.toggleModule("moxieWater", "MOXIE O2 & Cryo Well Synchronized!", 1050, 390)
        });
    }

    private toggleModule(modKey: "lifeSupport" | "thermalBus" | "moxieWater", label: string, x: number, y: number) {
        SoundFX.playToggle(true);
        this.moduleStates[modKey] = true;
        this.redrawConduits();

        // Traveling electrical pulse animation along conduits
        const pulse = this.add.circle(200, 490, 6, UITheme.colors.primaryCyan).setDepth(15);
        this.tweens.add({
            targets: pulse,
            x: x,
            y: y + 80,
            duration: 500,
            onComplete: () => pulse.destroy()
        });

        this.recalcState();
        this.showSurfaceFloatingText(x, y - 10, `✔ ${label}`, UITheme.colors.bioGreenStr);
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

        drawLine(200, 490, 480, 500, this.moduleStates.lifeSupport);
        drawLine(480, 500, 760, 510, this.moduleStates.thermalBus);
        drawLine(760, 510, 1050, 490, this.moduleStates.moxieWater);
    }

    private recalcState() {
        let count = 1; // Hab is always active
        if (this.moduleStates.lifeSupport) count++;
        if (this.moduleStates.thermalBus) count++;
        if (this.moduleStates.moxieWater) count++;

        this.currentVal = count;
        this.updateVisorProgress(this.currentVal, this.challengeConfig.targetVal, "Modules");
    }

    protected isTargetMet(): boolean {
        return this.currentVal >= this.challengeConfig.targetVal;
    }
}

export default Sol6ColonyGridlockScene;
