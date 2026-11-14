import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

interface GridModule {
    id: string;
    name: string;
    icon: string;
    kw: number;
    active: boolean;
    essential?: boolean;
}

export class Sol6ColonyGridlockScene extends SolChallengeBaseScene {
    private maxCapacityKW = 18.0; // 10 kW nuclear + 8 kW solar
    private gridModules: GridModule[] = [
        { id: "eclss", name: "ECLSS LIFE SUPPORT", icon: "🫧", kw: 6.0, active: true, essential: true },
        { id: "heaters", name: "THERMAL SUBCRYO HEATERS", icon: "🔥", kw: 4.0, active: true, essential: true },
        { id: "moxie", name: "MOXIE OXYGEN CONVERTER", icon: "💨", kw: 3.0, active: true },
        { id: "ice", name: "CRYO-ICE EXTRACTOR", icon: "💧", kw: 3.0, active: true },
        { id: "hydro", name: "HYDROPONIC GROW LIGHTS", icon: "🌱", kw: 2.0, active: false },
        { id: "rover", name: "ROVER FAST-CHARGE BAY", icon: "🚜", kw: 2.0, active: false }
    ];

    private moduleButtons: Phaser.GameObjects.Container[] = [];
    private gridStatsText!: Phaser.GameObjects.Text;
    private breakerText!: Phaser.GameObjects.Text;

    constructor() {
        super("Sol6ColonyGridlockScene", {
            solNumber: 6,
            title: "SOL 6: COLONY GRIDLOCK",
            codename: "TOTAL SYSTEM INTEGRATION",
            hazardBadge: "SUBCRYO COLD FRONT (-110°C) & PEAK LOAD",
            briefing: "An extreme sub-zero thermal cold front (-110°C) stresses every outpost engineering module at maximum load. Balance ECLSS Life Support, Heaters, MOXIE, and Water Extractor simultaneously without tripping the main 18 kW bus circuit breaker!",
            nasaFact: "NASA Moon-to-Mars integration tests verify complete hardware-in-the-loop interoperability: ensuring life support, nuclear fission, rovers, and habitats operate simultaneously under peak grid demand without catastrophic blackouts.",
            primaryTarget: "Power 4 critical modules simultaneously with 0 breaker trips.",
            unit: "Modules",
            targetVal: 4,
            initialVal: 4
        });
    }

    protected createChallengeContent() {
        const frameX = (this.W - 1220) / 2;
        const frameY = (this.H - 660) / 2;
        const topY = frameY + 70;
        const colW = 575;
        const colH = 505;

        // -------------------------------------------------------------
        // LEFT COLUMN: ELECTRICAL BUS METERS & CIRCUIT BREAKER
        // -------------------------------------------------------------
        const leftX = frameX + 24;
        const leftBg = this.add.graphics();
        leftBg.fillStyle(UITheme.colors.cardBg, 0.9);
        leftBg.fillRoundedRect(leftX, topY, colW, colH, 12);
        leftBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        leftBg.strokeRoundedRect(leftX, topY, colW, colH, 12);

        this.add.text(leftX + 24, topY + 18, "MAIN 18 kW BUS LOAD & CIRCUIT BREAKER", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        // Bus Visualizer
        const viewW = colW - 48;
        const viewH = 240;
        const viewX = leftX + 24;
        const viewY = topY + 50;

        const viewBg = this.add.graphics();
        viewBg.fillStyle(0x061122, 1);
        viewBg.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
        viewBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        viewBg.strokeRoundedRect(viewX, viewY, viewW, viewH, 10);

        // Load Meter Bar
        const barX = viewX + 30;
        const barY = viewY + 60;
        const barW = viewW - 60;
        const barH = 34;

        const trackBg = this.add.graphics();
        trackBg.fillStyle(0x040914, 1);
        trackBg.fillRoundedRect(barX, barY, barW, barH, 8);
        trackBg.lineStyle(1, 0x183050, 1);
        trackBg.strokeRoundedRect(barX, barY, barW, barH, 8);

        this.progressFill = this.add.graphics();

        this.gridStatsText = this.add.text(viewX + viewW / 2, barY + barH / 2, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Breaker Status
        this.breakerText = this.add.text(viewX + viewW / 2, viewY + 150, "CIRCUIT BREAKER: NOMINAL (0 TRIPS)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.updateBusMeter(barX, barY, barW, barH);

        // Telemetry Box
        const statBoxY = topY + 310;
        const statBox = this.add.graphics();
        statBox.fillStyle(0x081528, 0.95);
        statBox.fillRoundedRect(leftX + 24, statBoxY, colW - 48, 170, 10);
        statBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        statBox.strokeRoundedRect(leftX + 24, statBoxY, colW - 48, 170, 10);

        this.add.text(leftX + 44, statBoxY + 16, "⚡ TOTAL SYSTEM INTEGRATION TELEMETRY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });

        this.add.text(leftX + 44, statBoxY + 48, this.challengeConfig.nasaFact, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: UITheme.colors.textSecondary,
            lineSpacing: 4,
            wordWrap: { width: colW - 88 }
        });

        // -------------------------------------------------------------
        // RIGHT COLUMN: 6 MODULAR LOAD-SHEDDING TOGGLE SWITCHES
        // -------------------------------------------------------------
        const rightX = leftX + colW + 22;
        const rightBg = this.add.graphics();
        rightBg.fillStyle(UITheme.colors.cardBg, 0.9);
        rightBg.fillRoundedRect(rightX, topY, colW, colH, 12);
        rightBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        rightBg.strokeRoundedRect(rightX, topY, colW, colH, 12);

        this.add.text(rightX + 24, topY + 18, "6 MODULE LOAD ALLOCATION SWITCHES", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });

        // Create 6 Module Toggle Buttons
        const itemW = colW - 48;
        const itemH = 56;
        const startItemY = topY + 54;

        this.gridModules.forEach((mod, idx) => {
            const itemY = startItemY + idx * 64;
            const container = this.add.container(rightX + 24, itemY);

            const bg = this.add.graphics();
            bg.name = `bg_${mod.id}`;
            this.drawModuleBg(bg, itemW, itemH, mod.active, mod.essential);
            container.add(bg);

            const icon = this.add.text(16, itemH / 2, mod.icon, { fontSize: "20px" }).setOrigin(0, 0.5);
            const label = this.add.text(50, 14, `${mod.name} (${mod.kw} kW)`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "12px",
                color: "#FFFFFF",
                fontStyle: "bold"
            });

            const status = this.add.text(itemW - 100, itemH / 2, mod.active ? "ONLINE" : "OFFLINE", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: mod.active ? UITheme.colors.bioGreenStr : "#7E94B5",
                fontStyle: "bold"
            }).setOrigin(0, 0.5);
            status.name = `status_${mod.id}`;

            container.add([icon, label, status]);

            // Hit shield
            const hit = this.add.rectangle(itemW / 2, itemH / 2, itemW, itemH, 0x000000, 0.001);
            hit.setInteractive({ useHandCursor: true });
            container.add(hit);

            hit.on("pointerdown", () => {
                SoundFX.playClick();
                this.toggleModule(mod);
            });

            this.moduleButtons.push(container);
        });

        // Quick Auto-Balance Button
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: topY + colH - 36,
            width: colW - 48,
            height: 44,
            fontSize: "13px",
            text: "⚡ AUTO-BALANCE SWITCHBOARD LOAD",
            primaryColor: UITheme.colors.solarGold,
            onClick: () => {
                SoundFX.playClick();
                this.autoBalanceGrid();
            }
        });
    }

    private drawModuleBg(g: Phaser.GameObjects.Graphics, w: number, h: number, active: boolean, essential?: boolean) {
        g.clear();
        g.fillStyle(active ? 0x0A223E : 0x060E1A, 0.95);
        g.fillRoundedRect(0, 0, w, h, 8);
        g.lineStyle(1.5, active ? (essential ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan) : UITheme.colors.panelBorder, 0.85);
        g.strokeRoundedRect(0, 0, w, h, 8);
    }

    private toggleModule(mod: GridModule) {
        if (mod.essential && mod.active) {
            this.setActionFeedback(`⚠ Cannot deactivate ${mod.name}! Life Support is mission-critical.`, false);
            return;
        }

        mod.active = !mod.active;
        this.refreshModulesUI();
    }

    private autoBalanceGrid() {
        this.gridModules[0].active = true; // ECLSS (6kW)
        this.gridModules[1].active = true; // Heaters (4kW)
        this.gridModules[2].active = true; // MOXIE (3kW)
        this.gridModules[3].active = true; // Ice (3kW)
        this.gridModules[4].active = false; // Hydro
        this.gridModules[5].active = false; // Rover

        this.refreshModulesUI();
        this.setActionFeedback("⚡ Auto-balance complete: Exactly 16.0 kW allocated across 4 critical pillars.", true);
    }

    private refreshModulesUI() {
        this.gridModules.forEach(mod => {
            const container = this.moduleButtons.find(c => c.getByName(`bg_${mod.id}`) !== null);
            if (container) {
                const bg = container.getByName(`bg_${mod.id}`) as Phaser.GameObjects.Graphics;
                const status = container.getByName(`status_${mod.id}`) as Phaser.GameObjects.Text;
                this.drawModuleBg(bg, 575 - 48, 56, mod.active, mod.essential);
                status.setText(mod.active ? "ONLINE" : "OFFLINE");
                status.setColor(mod.active ? UITheme.colors.bioGreenStr : "#7E94B5");
            }
        });

        const frameX = (this.W - 1220) / 2;
        const leftX = frameX + 24;
        const viewX = leftX + 24;
        const viewW = 575 - 48;
        const viewY = (this.H - 660) / 2 + 120;
        this.updateBusMeter(viewX + 30, viewY + 60, viewW - 60, 34);
    }

    private updateBusMeter(x: number, y: number, w: number, h: number) {
        const totalLoadKW = this.gridModules.filter(m => m.active).reduce((sum, m) => sum + m.kw, 0);
        const activeCount = this.gridModules.filter(m => m.active).length;
        this.currentVal = activeCount;

        const ratio = Math.min(1.2, totalLoadKW / this.maxCapacityKW);
        const isOverload = totalLoadKW > this.maxCapacityKW;

        this.gridStatsText.setText(`TOTAL BUS LOAD: ${totalLoadKW.toFixed(1)} / ${this.maxCapacityKW.toFixed(1)} kW (${activeCount} MODS ONLINE)`);

        this.progressFill.clear();
        this.progressFill.fillStyle(isOverload ? UITheme.colors.emergencyRed : UITheme.colors.bioGreen, 1);
        this.progressFill.fillRoundedRect(x + 2, y + 2, Math.max(8, (w - 4) * Math.min(1.0, ratio)), h - 4, 6);

        if (isOverload) {
            this.breakerText.setText("⚠ CIRCUIT BREAKER TRIPPED! GRID OVERLOAD!");
            this.breakerText.setColor(UITheme.colors.emergencyRedStr);
            this.setActionFeedback("⚡ OVERLOAD: Reduce load below 18.0 kW to reset breaker!", false);
        } else {
            this.breakerText.setText(`CIRCUIT BREAKER: NOMINAL (+${(this.maxCapacityKW - totalLoadKW).toFixed(1)} kW HEADROOM)`);
            this.breakerText.setColor(UITheme.colors.bioGreenStr);
        }
    }
}

export default Sol6ColonyGridlockScene;
