import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import { ButtonFactory, SoundFX } from "./ButtonFactory.ts";

export interface PowerModule {
    id: string;
    name: string;
    icon: string;
    description: string;
    powerDrawKW: number;
    isPowered: boolean;
    isEssential?: boolean;
    perk: string;
}

export interface PowerSwitchboardCallbacks {
    onModuleToggled: (moduleId: string, isPowered: boolean) => void;
    onApply?: (poweredModuleIds: string[]) => string | undefined;
    onClose: () => void;
}

export class PowerSwitchboard {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: PowerSwitchboardCallbacks;

    private maxPlugs = 3; // 3 active simultaneous plugs allowed out of 4 total capacity lines
    private totalBusCapacity = 4;
    private activePlugsCount = 0;

    private overloadWarningText!: Phaser.GameObjects.Text;
    private loadBarFill!: Phaser.GameObjects.Graphics;
    private loadText!: Phaser.GameObjects.Text;
    private plugIndicators: Phaser.GameObjects.Container[] = [];

    private modules: PowerModule[] = [
        {
            id: "hab_life_support",
            name: "HABITAT LIFE SUPPORT",
            icon: "🫧",
            description: "Pressurization, O₂ scrubbers & thermal heating.",
            powerDrawKW: 20,
            isPowered: true,
            isEssential: true,
            perk: "+20% Life Support stability"
        },
        {
            id: "greenhouse",
            name: "MARS GREENHOUSE",
            icon: "🌱",
            description: "Hydroponic crops & bio-oxygen generation.",
            powerDrawKW: 12,
            isPowered: true,
            perk: "+15% Life Support regen"
        },
        {
            id: "comms_dish",
            name: "DEEP SPACE COMMS",
            icon: "📡",
            description: "Earth uplink & real-time NASA telemetry feeds.",
            powerDrawKW: 10,
            isPowered: true,
            perk: "Enables live DONKI warnings"
        },
        {
            id: "rover_charger",
            name: "ROVER CHARGE BAY",
            icon: "🚜",
            description: "Recharges surface exploration rover battery.",
            powerDrawKW: 15,
            isPowered: false,
            perk: "+25% Rover surface mobility"
        },
        {
            id: "science_lab",
            name: "ASTROBIOLOGY LAB",
            icon: "🔬",
            description: "Automated analysis of Martian regolith & ice samples.",
            powerDrawKW: 14,
            isPowered: false,
            perk: "+30% Research points"
        },
        {
            id: "shield_generator",
            name: "MAGNETIC SHIELD",
            icon: "🛡",
            description: "Deflects incoming solar flare energetic particles.",
            powerDrawKW: 25,
            isPowered: false,
            perk: "+50% Radiation protection"
        }
    ];

    private moduleCards: Map<string, {
        container: Phaser.GameObjects.Container;
        bg: Phaser.GameObjects.Graphics;
        switchToggle: Phaser.GameObjects.Graphics;
        led: Phaser.GameObjects.Arc;
        statusText: Phaser.GameObjects.Text;
    }> = new Map();

    constructor(scene: Phaser.Scene, callbacks: PowerSwitchboardCallbacks, initialPoweredModuleIds?: Iterable<string>) {
        this.scene = scene;
        this.callbacks = callbacks;
        if (initialPoweredModuleIds) {
            const initialPowered = new Set(initialPoweredModuleIds);
            this.modules.forEach(module => { module.isPowered = initialPowered.has(module.id); });
        } else if (((this.scene.registry.get("solLevel") as number) || 1) === 1) {
            const greenhouse = this.modules.find(module => module.id === "greenhouse");
            if (greenhouse) greenhouse.isPowered = false;
        }
        this.activePlugsCount = this.modules.filter(module => module.isPowered).length;
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(150);

        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // Dark Modal Backdrop
        const backdrop = this.scene.add.rectangle(0, 0, width, height, 0x040914, 0.88).setOrigin(0);
        backdrop.setInteractive(); // Blocks clicks underneath
        this.container.add(backdrop);

        // Switchboard Outer Chassis
        const panelW = 960;
        const panelH = 590;
        const panelX = (width - panelW) / 2;
        const panelY = (height - panelH) / 2;

        const chassis = this.scene.add.graphics();
        chassis.fillStyle(0x0A162B, 0.98);
        chassis.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
        chassis.lineStyle(3, UITheme.colors.solarGold, 0.9);
        chassis.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);
        this.container.add(chassis);

        // Header Title Banner
        const headerText = this.scene.add.text(width / 2, panelY + 34, "⚡ OUTPOST SOL · AUXILIARY POWER SWITCHBOARD ⚡", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "22px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        const subText = this.scene.add.text(width / 2, panelY + 62, "Route available power plugs (Maximum 3 Active simultaneously) to critical Mars modules", {
            fontFamily: UITheme.fonts.body,
            fontSize: "14px",
            color: UITheme.colors.textSecondary
        }).setOrigin(0.5);
        this.container.add([headerText, subText]);

        // Close / Minimize Button (Top Right)
        const closeBtn = ButtonFactory.createIconButton(
            this.scene,
            panelX + panelW - 35,
            panelY + 35,
            "✕",
            18,
            UITheme.colors.emergencyRed,
            () => this.callbacks.onClose()
        );
        this.container.add(closeBtn);

        // Top Status Bar: 3/4 Power Plugs Bay & Load Gauge
        this.createPowerPlugsBay(panelX + 35, panelY + 86, panelW - 70);

        // 6 Module Switches Grid (2 rows x 3 columns)
        this.createModulesGrid(panelX + 35, panelY + 178, panelW - 70);

        // Overload Warning Banner
        this.overloadWarningText = this.scene.add.text(width / 2, panelY + panelH - 62, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.container.add(this.overloadWarningText);

        // Bottom Action Button: Apply & Close Switchboard
        const confirmBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: width / 2,
            y: panelY + panelH - 28,
            width: 320,
            height: 38,
            fontSize: "13px",
            text: "APPLY & CLOSE SWITCHBOARD",
            primaryColor: UITheme.colors.bioGreen,
            secondaryColor: 0x082618,
            textColor: UITheme.colors.bioGreenStr,
            icon: "✔",
            onClick: () => {
                const poweredModuleIds = this.modules.filter(module => module.isPowered).map(module => module.id);
                const issue = this.callbacks.onApply?.(poweredModuleIds);
                if (issue) {
                    this.overloadWarningText.setText(issue).setAlpha(1);
                    return;
                }
                this.callbacks.onClose();
            }
        });
        this.container.add(confirmBtn);

        this.updatePowerGridState();
    }

    private createPowerPlugsBay(x: number, y: number, w: number) {
        const bay = this.scene.add.container(x, y);

        const bayBg = this.scene.add.graphics();
        bayBg.fillStyle(0x061122, 0.95);
        bayBg.fillRoundedRect(0, 0, w, 80, 10);
        bayBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        bayBg.strokeRoundedRect(0, 0, w, 80, 10);
        bay.add(bayBg);

        // Label
        const title = this.scene.add.text(20, 15, "MAIN BUS PLUGS (3/4 ACTIVE CAPACITOR):", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        bay.add(title);

        // 4 Physical Plug Sockets
        for (let i = 0; i < this.totalBusCapacity; i++) {
            const socket = this.scene.add.container(40 + i * 95, 50);

            const socketBg = this.scene.add.graphics();
            socketBg.fillStyle(0x0B1D38, 1);
            socketBg.fillRoundedRect(-38, -16, 76, 32, 6);
            socketBg.lineStyle(1.5, 0x1E3B68, 1);
            socketBg.strokeRoundedRect(-38, -16, 76, 32, 6);
            socket.add(socketBg);

            const label = this.scene.add.text(-12, 0, `PLUG ${i + 1}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: "#FFFFFF",
                fontStyle: "bold"
            }).setOrigin(0, 0.5);
            socket.add(label);

            const led = this.scene.add.circle(-24, 0, 5, UITheme.colors.bioGreen);
            socket.add(led);

            this.plugIndicators.push(socket);
            bay.add(socket);
        }

        // Overall Load Gauge (Right Side)
        const loadLabel = this.scene.add.text(w - 380, 15, "TOTAL GRID POWER ALLOCATION:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        bay.add(loadLabel);

        const barX = w - 380;
        const barY = 38;
        const barW = 350;
        const barH = 22;

        const track = this.scene.add.graphics();
        track.fillStyle(0x050D1A, 1);
        track.fillRoundedRect(barX, barY, barW, barH, 5);
        track.lineStyle(1, 0x1A355A, 1);
        track.strokeRoundedRect(barX, barY, barW, barH, 5);
        bay.add(track);

        this.loadBarFill = this.scene.add.graphics();
        bay.add(this.loadBarFill);

        this.loadText = this.scene.add.text(barX + barW / 2, barY + barH / 2, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        bay.add(this.loadText);

        this.container.add(bay);
    }

    private createModulesGrid(x: number, y: number, w: number) {
        const colW = (w - 30) / 3;
        const rowH = 150;

        this.modules.forEach((mod, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const cardX = x + col * (colW + 15);
            const cardY = y + row * (rowH + 14);

            const card = this.scene.add.container(cardX + colW / 2, cardY + rowH / 2);

            // Visuals layer (scales without displacing hit bounds)
            const visuals = this.scene.add.container(0, 0);
            card.add(visuals);

            // Drop shadow
            const shadow = this.scene.add.graphics();
            shadow.fillStyle(0x000000, 0.45);
            shadow.fillRoundedRect(-colW / 2 + 2, -rowH / 2 + 4, colW, rowH, 10);
            visuals.add(shadow);

            // Background Frame
            const bg = this.scene.add.graphics();
            bg.fillStyle(UITheme.colors.panelBg, 0.95);
            bg.fillRoundedRect(-colW / 2, -rowH / 2, colW, rowH, 10);
            bg.lineStyle(2, mod.isPowered ? UITheme.colors.bioGreen : UITheme.colors.panelBorder, 0.9);
            bg.strokeRoundedRect(-colW / 2, -rowH / 2, colW, rowH, 10);
            visuals.add(bg);

            // Luminous hover glow
            const hoverGlow = this.scene.add.graphics();
            hoverGlow.fillStyle(UITheme.colors.primaryCyan, 0.18);
            hoverGlow.fillRoundedRect(-colW / 2, -rowH / 2, colW, rowH, 10);
            hoverGlow.lineStyle(2.5, 0x65E5FF, 1);
            hoverGlow.strokeRoundedRect(-colW / 2, -rowH / 2, colW, rowH, 10);
            hoverGlow.setAlpha(0);
            visuals.add(hoverGlow);

            // Module Icon
            const icon = this.scene.add.text(-colW / 2 + 18, -rowH / 2 + 15, mod.icon, { fontSize: "22px" });
            visuals.add(icon);

            // Module Name
            const name = this.scene.add.text(-colW / 2 + 52, -rowH / 2 + 14, mod.name, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "12px",
                color: "#FFFFFF",
                fontStyle: "bold"
            });
            visuals.add(name);

            // Power Draw & Description
            const draw = this.scene.add.text(-colW / 2 + 52, -rowH / 2 + 32, `DRAW: ${mod.powerDrawKW} kW`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: UITheme.colors.solarGoldStr
            });
            const desc = this.scene.add.text(-colW / 2 + 18, -rowH / 2 + 56, mod.description, {
                fontFamily: UITheme.fonts.body,
                fontSize: "11px",
                color: UITheme.colors.textSecondary,
                wordWrap: { width: colW - 36 }
            });
            const perk = this.scene.add.text(-colW / 2 + 18, -rowH / 2 + 90, mod.perk, {
                fontFamily: UITheme.fonts.body,
                fontSize: "11px",
                color: UITheme.colors.bioGreenStr,
                fontStyle: "bold"
            });
            visuals.add([draw, desc, perk]);

            // Bottom Switch Bar: LED + Status + Toggle Switch
            const switchBar = this.scene.add.container(-colW / 2 + 18, -rowH / 2 + 118);

            const led = this.scene.add.circle(6, 6, 5, mod.isPowered ? UITheme.colors.bioGreen : 0x4A607F);
            const statusText = this.scene.add.text(18, 0, mod.isPowered ? "ONLINE" : "STANDBY", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: mod.isPowered ? UITheme.colors.bioGreenStr : "#7E95B8",
                fontStyle: "bold"
            });

            // Interactive Toggle Switch Graphics
            const toggle = this.scene.add.graphics();
            this.drawToggleSwitch(toggle, colW - 100, -4, mod.isPowered);

            switchBar.add([led, statusText, toggle]);
            visuals.add(switchBar);

            // Top-Layer Hit Shield: 100% full coverage of the module card (+10px w, +8px h)
            const hitShield = this.scene.add.rectangle(0, 0, colW + 10, rowH + 8, 0x000000, 0.001);
            hitShield.setOrigin(0.5, 0.5);
            hitShield.setInteractive({ useHandCursor: true });
            card.add(hitShield);

            hitShield.on("pointerover", () => {
                SoundFX.playHover();
                this.scene.tweens.killTweensOf(visuals);
                this.scene.tweens.killTweensOf(hoverGlow);

                this.scene.tweens.add({
                    targets: visuals,
                    scaleX: 1.035,
                    scaleY: 1.035,
                    duration: 50,
                    ease: "Back.easeOut"
                });

                this.scene.tweens.add({
                    targets: hoverGlow,
                    alpha: 1,
                    duration: 40
                });

                name.setColor(UITheme.colors.primaryCyanStr);
            });

            hitShield.on("pointermove", () => {
                if (hoverGlow.alpha < 0.95) hoverGlow.setAlpha(1);
                if (visuals.scaleX < 1.03) visuals.setScale(1.035);
            });

            hitShield.on("pointerout", () => {
                this.scene.tweens.killTweensOf(visuals);
                this.scene.tweens.killTweensOf(hoverGlow);

                this.scene.tweens.add({
                    targets: visuals,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 85,
                    ease: "Quad.easeOut"
                });

                this.scene.tweens.add({
                    targets: hoverGlow,
                    alpha: 0,
                    duration: 85
                });

                name.setColor("#FFFFFF");
            });

            hitShield.on("pointerdown", () => {
                // Tactile feedback bounce
                this.scene.tweens.add({
                    targets: visuals,
                    scaleX: 0.96,
                    scaleY: 0.96,
                    duration: 40,
                    yoyo: true,
                    onComplete: () => {
                        visuals.setScale(1.035);
                    }
                });

                this.toggleModule(mod.id);
            });

            this.moduleCards.set(mod.id, {
                container: card,
                bg,
                switchToggle: toggle,
                led,
                statusText
            });

            this.container.add(card);
        });
    }

    private drawToggleSwitch(g: Phaser.GameObjects.Graphics, x: number, y: number, isPowered: boolean) {
        g.clear();
        const swW = 46;
        const swH = 22;

        // Switch track
        g.fillStyle(isPowered ? UITheme.colors.bioGreen : 0x22354F, 0.9);
        g.fillRoundedRect(x, y, swW, swH, 11);
        g.lineStyle(1.5, 0xFFFFFF, 0.8);
        g.strokeRoundedRect(x, y, swW, swH, 11);

        // Switch knob
        const knobX = isPowered ? x + swW - 12 : x + 12;
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(knobX, y + swH / 2, 8);
    }

    private toggleModule(id: string) {
        const mod = this.modules.find(m => m.id === id);
        if (!mod) return;

        if (mod.isPowered && mod.isEssential) {
            this.overloadWarningText.setText("HABITAT LIFE SUPPORT MUST REMAIN ONLINE.").setAlpha(1);
            return;
        }

        // If trying to turn on
        if (!mod.isPowered) {
            // Check if active plugs exceeded
            if (this.activePlugsCount >= this.maxPlugs) {
                SoundFX.playAlert();
                this.triggerOverloadWarning();
                return;
            }
            mod.isPowered = true;
            this.activePlugsCount++;
            SoundFX.playToggle(true);
        } else {
            // Turning off
            mod.isPowered = false;
            this.activePlugsCount--;
            SoundFX.playToggle(false);
        }

        this.updatePowerGridState();
        this.callbacks.onModuleToggled(mod.id, mod.isPowered);
    }

    private triggerOverloadWarning() {
        this.overloadWarningText.setText(`⚠ CIRCUIT OVERLOAD PREVENTED: MAXIMUM ${this.maxPlugs} PLUGS ENGAGED! UNPLUG A MODULE FIRST.`);

        this.scene.tweens.killTweensOf(this.overloadWarningText);
        this.overloadWarningText.setAlpha(1);

        this.scene.tweens.add({
            targets: this.overloadWarningText,
            scale: 1.08,
            duration: 90,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.scene.time.delayedCall(3000, () => {
                    this.scene.tweens.add({
                        targets: this.overloadWarningText,
                        alpha: 0,
                        duration: 400
                    });
                });
            }
        });
    }

    private updatePowerGridState() {
        // Update Plug Sockets visual
        this.plugIndicators.forEach((socket, idx) => {
            const led = socket.list[2] as Phaser.GameObjects.Arc;
            const text = socket.list[1] as Phaser.GameObjects.Text;

            if (idx < this.activePlugsCount) {
                led.setFillStyle(UITheme.colors.bioGreen);
                text.setColor("#FFFFFF");
            } else if (idx < this.maxPlugs) {
                led.setFillStyle(0x3B557A);
                text.setColor("#7E95B8");
            } else {
                led.setFillStyle(UITheme.colors.emergencyRed);
                text.setColor("#FF8A8A");
            }
        });

        // Update Modules Switch Visuals
        this.modules.forEach(mod => {
            const ui = this.moduleCards.get(mod.id);
            if (!ui) return;

            const colW = (960 - 70 - 30) / 3;
            const rowH = 150;
            this.drawToggleSwitch(ui.switchToggle, colW - 100, -4, mod.isPowered);

            ui.led.setFillStyle(mod.isPowered ? UITheme.colors.bioGreen : 0x4A607F);
            ui.statusText.setText(mod.isPowered ? "ONLINE" : "STANDBY");
            ui.statusText.setColor(mod.isPowered ? UITheme.colors.bioGreenStr : "#7E95B8");

            if (ui.bg) {
                ui.bg.clear();
                ui.bg.fillStyle(UITheme.colors.panelBg, 0.95);
                ui.bg.fillRoundedRect(-colW / 2, -rowH / 2, colW, rowH, 10);
                ui.bg.lineStyle(2, mod.isPowered ? UITheme.colors.bioGreen : UITheme.colors.panelBorder, 0.9);
                ui.bg.strokeRoundedRect(-colW / 2, -rowH / 2, colW, rowH, 10);
            }
        });

        // Update Load Bar
        const barX = 960 - 70 - 380;
        const barY = 38;
        const barW = 350;
        const barH = 22;

        const ratio = this.activePlugsCount / this.maxPlugs;
        const fillW = Math.max(0, Math.min(barW, ratio * barW));

        this.loadBarFill.clear();
        let barColor = UITheme.colors.bioGreen;
        if (ratio >= 1.0) {
            barColor = UITheme.colors.solarGold;
        }

        this.loadBarFill.fillStyle(barColor, 0.95);
        this.loadBarFill.fillRoundedRect(barX + 2, barY + 2, fillW - 4, barH - 4, 4);

        this.loadText.setText(`${this.activePlugsCount} / ${this.maxPlugs} PLUGS ENGAGED (${Math.round(ratio * 100)}% LOAD)`);
    }

    public isModuleActive(id: string): boolean {
        return this.modules.find(m => m.id === id)?.isPowered ?? false;
    }

    public destroy() {
        this.container.destroy();
    }
}

export default PowerSwitchboard;
