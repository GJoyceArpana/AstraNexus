import Phaser from "phaser";
import UITheme from "../../../styles/UITheme.ts";
import ButtonFactory from "../../../components/ButtonFactory.ts";
import type { Sol5ResourceState, Sol5Inventory, SubsystemId } from "./types.ts";

export interface HUDCallbacks {
    onPause: () => void;
    onOpenGuide: () => void;
}

export class Sol5HUD {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: HUDCallbacks;

    // Meter fills & texts
    private o2Fill!: Phaser.GameObjects.Graphics;
    private o2Text!: Phaser.GameObjects.Text;

    private pressureFill!: Phaser.GameObjects.Graphics;
    private pressureText!: Phaser.GameObjects.Text;

    private hullFill!: Phaser.GameObjects.Graphics;
    private hullText!: Phaser.GameObjects.Text;

    private powerFill!: Phaser.GameObjects.Graphics;
    private powerText!: Phaser.GameObjects.Text;

    private timerText!: Phaser.GameObjects.Text;
    private timerBox!: Phaser.GameObjects.Graphics;

    // Objectives checkmarks
    private objectiveTexts: Record<SubsystemId, Phaser.GameObjects.Text> = {} as any;

    // Inventory dock texts
    private invPipesText!: Phaser.GameObjects.Text;
    private invRelaysText!: Phaser.GameObjects.Text;
    private invValvesText!: Phaser.GameObjects.Text;
    private invPatchesText!: Phaser.GameObjects.Text;

    // Toast alert banner
    private bannerContainer!: Phaser.GameObjects.Container;
    private bannerText!: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, callbacks: HUDCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0).setDepth(150);

        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width } = this.scene.scale;

        // 1. TOP EMERGENCY DASHBOARD (Width: 1020, centered, leaving room for #fullscreen-btn)
        const dashW = 1010;
        const dashH = 68;
        const dashX = 20;
        const dashY = 12;

        const dashBg = this.scene.add.graphics();
        dashBg.fillStyle(0x060D1A, 0.94);
        dashBg.fillRoundedRect(dashX, dashY, dashW, dashH, 12);
        dashBg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.85);
        dashBg.strokeRoundedRect(dashX, dashY, dashW, dashH, 12);
        this.container.add(dashBg);

        // Header Title Tag
        const titleTag = this.scene.add.text(dashX + 16, dashY + 10, "EMERGENCY REPAIR PROTOCOL · SOL 05", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1.2
        });
        this.container.add(titleTag);

        // 4 RESOURCE METERS:
        // [1] Oxygen Reserve (x = dashX + 16)
        this.createResourceMeter("O₂ RESERVE", dashX + 16, dashY + 28, 140, "o2");
        // [2] Habitat Pressure (x = dashX + 175)
        this.createResourceMeter("PRESSURE (kPa)", dashX + 175, dashY + 28, 140, "pressure");
        // [3] Structural Hull (x = dashX + 335)
        this.createResourceMeter("HULL INTEGRITY", dashX + 335, dashY + 28, 140, "hull");
        // [4] Electrical Power (x = dashX + 495)
        this.createResourceMeter("POWER GRID (kW)", dashX + 495, dashY + 28, 140, "power");

        // [5] EMERGENCY COUNTDOWN TIMER (x = dashX + 660)
        this.createCountdownTimer(dashX + 655, dashY + 12);

        // Pause & Guide Buttons (Top Right inside visor)
        const guideBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: dashX + dashW - 145,
            y: dashY + dashH / 2,
            width: 80,
            height: 36,
            text: "GUIDE 📖",
            fontSize: "11px",
            primaryColor: UITheme.colors.cardHover,
            onClick: () => this.callbacks.onOpenGuide()
        });

        const pauseBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: dashX + dashW - 55,
            y: dashY + dashH / 2,
            width: 80,
            height: 36,
            text: "PAUSE ⏸",
            fontSize: "11px",
            primaryColor: UITheme.colors.cardHover,
            onClick: () => this.callbacks.onPause()
        });
        this.container.add([guideBtn, pauseBtn]);

        // 2. BOTTOM-LEFT OBJECTIVES CHECKLIST (340 x 145)
        this.createObjectivesBox(20, this.scene.scale.height - 155);

        // 3. BOTTOM-RIGHT INVENTORY DOCK (400 x 65)
        this.createInventoryDock(width - 420, this.scene.scale.height - 75);

        // 4. FLOATING WARNING / EVENT BANNER (Top-Center)
        this.createAlertBanner(width / 2, 92);
    }

    private createResourceMeter(
        label: string,
        x: number,
        y: number,
        width: number,
        type: "o2" | "pressure" | "hull" | "power"
    ) {
        const height = 16;

        const lbl = this.scene.add.text(x, y, label, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: UITheme.colors.textSecondary,
            fontStyle: "bold"
        });

        const valTxt = this.scene.add.text(x + width, y, "--", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(1, 0);

        const track = this.scene.add.graphics();
        track.fillStyle(0x020712, 1);
        track.fillRoundedRect(x, y + 14, width, height, 4);
        track.lineStyle(1, UITheme.colors.panelBorder, 0.7);
        track.strokeRoundedRect(x, y + 14, width, height, 4);

        const fill = this.scene.add.graphics();

        this.container.add([lbl, valTxt, track, fill]);

        if (type === "o2") {
            this.o2Fill = fill;
            this.o2Text = valTxt;
        } else if (type === "pressure") {
            this.pressureFill = fill;
            this.pressureText = valTxt;
        } else if (type === "hull") {
            this.hullFill = fill;
            this.hullText = valTxt;
        } else {
            this.powerFill = fill;
            this.powerText = valTxt;
        }
    }

    private createCountdownTimer(x: number, y: number) {
        this.timerBox = this.scene.add.graphics();
        this.timerBox.fillStyle(0x1B070A, 1);
        this.timerBox.fillRoundedRect(x, y, 160, 44, 8);
        this.timerBox.lineStyle(1.5, UITheme.colors.emergencyRed, 1);
        this.timerBox.strokeRoundedRect(x, y, 160, 44, 8);
        this.container.add(this.timerBox);

        const tTag = this.scene.add.text(x + 12, y + 8, "EMERGENCY BUFFER:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "8.5px",
            color: "#FF8A8A",
            fontStyle: "bold"
        });

        this.timerText = this.scene.add.text(x + 80, y + 26, "05:00", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);

        this.container.add([tTag, this.timerText]);
    }

    private createObjectivesBox(x: number, y: number) {
        const boxW = 340;
        const boxH = 142;

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x060E1A, 0.94);
        bg.fillRoundedRect(x, y, boxW, boxH, 10);
        bg.lineStyle(1.5, UITheme.colors.panelBorder, 0.85);
        bg.strokeRoundedRect(x, y, boxW, boxH, 10);
        this.container.add(bg);

        const title = this.scene.add.text(x + 14, y + 10, "HABITAT DAMAGE REPAIR DIRECTIVES:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        this.container.add(title);

        const objectives: { id: SubsystemId; text: string }[] = [
            { id: "air_distribution", text: "1. Air Conduit Leak (Pipe Network)" },
            { id: "electrical_grid", text: "2. Power Grid Short (Circuit Matrix)" },
            { id: "oxygen_regulation", text: "3. Oxygen Regulator (Pressure Valves)" },
            { id: "structural_hull", text: "4. Exterior Breaches (Composite Sealing)" }
        ];

        let lineY = y + 32;
        for (const obj of objectives) {
            const line = this.scene.add.text(x + 14, lineY, `[ ⚠ ] ${obj.text}`, {
                fontFamily: UITheme.fonts.body,
                fontSize: "11px",
                color: "#E2EDF8"
            });
            this.objectiveTexts[obj.id] = line;
            this.container.add(line);
            lineY += 25;
        }
    }

    private createInventoryDock(x: number, y: number) {
        const dockW = 400;
        const dockH = 62;

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x060E1A, 0.94);
        bg.fillRoundedRect(x, y, dockW, dockH, 10);
        bg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.85);
        bg.strokeRoundedRect(x, y, dockW, dockH, 10);
        this.container.add(bg);

        const label = this.scene.add.text(x + 14, y + 8, "REPAIR MATERIALS INVENTORY:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        this.container.add(label);

        this.invPipesText = this.scene.add.text(x + 14, y + 28, "PIPES: 6", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });

        this.invRelaysText = this.scene.add.text(x + 105, y + 28, "RELAYS: 4", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });

        this.invValvesText = this.scene.add.text(x + 205, y + 28, "VALVES: 3", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });

        this.invPatchesText = this.scene.add.text(x + 305, y + 28, "PATCHES: 6", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });

        this.container.add([this.invPipesText, this.invRelaysText, this.invValvesText, this.invPatchesText]);
    }

    private createAlertBanner(x: number, y: number) {
        this.bannerContainer = this.scene.add.container(x, y);
        this.bannerContainer.setAlpha(0);

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x1B070A, 0.95);
        bg.fillRoundedRect(-280, -18, 560, 36, 8);
        bg.lineStyle(1.5, UITheme.colors.emergencyRed, 1);
        bg.strokeRoundedRect(-280, -18, 560, 36, 8);
        this.bannerContainer.add(bg);

        this.bannerText = this.scene.add.text(0, 0, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.bannerContainer.add(this.bannerText);

        this.container.add(this.bannerContainer);
    }

    public updateResources(state: Sol5ResourceState) {
        const w = 140;
        const h = 16;

        // O2 Meter
        const o2Pct = Math.max(0, Math.min(1.0, state.oxygenReserve / 100));
        this.o2Fill.clear();
        this.o2Fill.fillStyle(state.oxygenReserve < 25 ? UITheme.colors.emergencyRed : UITheme.colors.primaryCyan, 0.95);
        this.o2Fill.fillRoundedRect(20 + 16 + 2, 12 + 28 + 14 + 2, Math.max(0, (w - 4) * o2Pct), h - 4, 3);
        this.o2Text.setText(`${Math.round(state.oxygenReserve)}%`);

        // Pressure Meter (Target 56 - 64 kPa)
        const pPct = Math.max(0, Math.min(1.0, state.habitatPressure / 100));
        this.pressureFill.clear();
        const pSafe = state.habitatPressure >= 56 && state.habitatPressure <= 64;
        this.pressureFill.fillStyle(pSafe ? UITheme.colors.bioGreen : (state.habitatPressure < 30 ? UITheme.colors.emergencyRed : UITheme.colors.marsAmber), 0.95);
        this.pressureFill.fillRoundedRect(20 + 175 + 2, 12 + 28 + 14 + 2, Math.max(0, (w - 4) * pPct), h - 4, 3);
        this.pressureText.setText(`${state.habitatPressure.toFixed(1)} kPa`);

        // Structural Integrity
        const hPct = Math.max(0, Math.min(1.0, state.structuralIntegrity / 100));
        this.hullFill.clear();
        this.hullFill.fillStyle(state.structuralIntegrity < 25 ? UITheme.colors.emergencyRed : UITheme.colors.solarGold, 0.95);
        this.hullFill.fillRoundedRect(20 + 335 + 2, 12 + 28 + 14 + 2, Math.max(0, (w - 4) * hPct), h - 4, 3);
        this.hullText.setText(`${Math.round(state.structuralIntegrity)}%`);

        // Power Grid
        const pwPct = Math.max(0, Math.min(1.0, state.electricalPower / 60));
        this.powerFill.clear();
        this.powerFill.fillStyle(state.electricalPower < 20 ? UITheme.colors.emergencyRed : UITheme.colors.solarGold, 0.95);
        this.powerFill.fillRoundedRect(20 + 495 + 2, 12 + 28 + 14 + 2, Math.max(0, (w - 4) * pwPct), h - 4, 3);
        this.powerText.setText(`${Math.round(state.electricalPower)} kW`);

        // Timer
        const m = Math.floor(state.timeRemainingSec / 60);
        const s = Math.floor(state.timeRemainingSec % 60);
        this.timerText.setText(`${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`);

        if (state.timeRemainingSec < 60) {
            this.timerText.setColor(Math.floor(Date.now() / 300) % 2 === 0 ? UITheme.colors.emergencyRedStr : "#FFFFFF");
        }
    }

    public updateInventory(inv: Sol5Inventory) {
        this.invPipesText.setText(`PIPES: ${inv.pipeConnectors}`);
        this.invRelaysText.setText(`RELAYS: ${inv.circuitRelays}`);
        this.invValvesText.setText(`VALVES: ${inv.replacementValves}`);

        const totalPatches = inv.patches.aerogelSealant + inv.patches.carbonFiberPatch + inv.patches.titaniumClampingPlate;
        this.invPatchesText.setText(`PATCHES: ${totalPatches}`);
    }

    public markObjectiveComplete(id: SubsystemId) {
        const txt = this.objectiveTexts[id];
        if (!txt) return;

        txt.setColor(UITheme.colors.bioGreenStr);
        const cur = txt.text.replace("[ ⚠ ]", "[ ✔ ]");
        txt.setText(cur + " — RESTORED");
    }

    public showAlertToast(msg: string, isHazard = true) {
        this.bannerText.setText(msg);
        this.bannerText.setColor(isHazard ? "#FFA4A4" : UITheme.colors.bioGreenStr);

        this.scene.tweens.killTweensOf(this.bannerContainer);
        this.scene.tweens.add({
            targets: this.bannerContainer,
            alpha: 1,
            y: 92,
            duration: 200,
            ease: "Quad.easeOut",
            onComplete: () => {
                this.scene.time.delayedCall(3800, () => {
                    this.scene.tweens.add({
                        targets: this.bannerContainer,
                        alpha: 0,
                        duration: 300
                    });
                });
            }
        });
    }

    public destroy() {
        this.container.destroy();
    }
}

export default Sol5HUD;
