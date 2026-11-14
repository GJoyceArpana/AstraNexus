import Phaser from "phaser";
import UITheme from "../../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../../components/ButtonFactory.ts";
import type { Sol5InventoryManager } from "./Sol5InventoryManager.ts";

export interface StructuralRepairPuzzleCallbacks {
    onComplete: () => void;
    onClose: () => void;
}

type PatchToolType = "aerogel" | "carbon_fiber" | "titanium_plate";

interface HullBreach {
    id: string;
    label: string;
    x: number;
    y: number;
    requiredTool: PatchToolType;
    requiredToolName: string;
    isSealed: boolean;
    boltsRemaining: number;
    container: Phaser.GameObjects.Container;
    crackGraphics: Phaser.GameObjects.Graphics;
    patchGraphics: Phaser.GameObjects.Graphics;
    statusText: Phaser.GameObjects.Text;
    hitZone: Phaser.GameObjects.Rectangle;
}

export class StructuralRepairPuzzle {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: StructuralRepairPuzzleCallbacks;
    private inventoryManager: Sol5InventoryManager;

    private selectedTool: PatchToolType = "aerogel";
    private breaches: HullBreach[] = [];
    private isSolved = false;

    private feedbackText!: Phaser.GameObjects.Text;
    private integrityGaugeFill!: Phaser.GameObjects.Graphics;
    private integrityText!: Phaser.GameObjects.Text;
    private toolButtons: Record<PatchToolType, { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text }> = {} as any;

    constructor(
        scene: Phaser.Scene,
        inventoryManager: Sol5InventoryManager,
        callbacks: StructuralRepairPuzzleCallbacks
    ) {
        this.scene = scene;
        this.inventoryManager = inventoryManager;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0).setDepth(200);

        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // Dark modal shield
        const bgShield = this.scene.add.rectangle(0, 0, width, height, 0x030713, 0.90).setOrigin(0);
        bgShield.setInteractive();
        this.container.add(bgShield);

        // Heavy Console Bezel (880x600)
        const frameW = 880;
        const frameH = 600;
        const cx = width / 2;
        const cy = height / 2;

        const chassis = this.scene.add.graphics();
        chassis.fillStyle(0x0C182A, 0.98);
        chassis.fillRoundedRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH, 16);
        chassis.lineStyle(3, UITheme.colors.primaryCyan, 0.9);
        chassis.strokeRoundedRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH, 16);
        chassis.lineStyle(1.5, UITheme.colors.panelBorder, 0.6);
        chassis.strokeRoundedRect(cx - frameW / 2 + 8, cy - frameH / 2 + 8, frameW - 16, frameH - 16, 12);
        this.container.add(chassis);

        // Header Section
        const headerY = cy - frameH / 2 + 40;
        const title = this.scene.add.text(
            cx - frameW / 2 + 28,
            headerY,
            "CHALLENGE 4 // STRUCTURAL HABITAT HULL SEALING",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "15px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold",
                letterSpacing: 1.5
            }
        ).setOrigin(0, 0.5);
        this.container.add(title);

        // Close Button
        const closeBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: cx + frameW / 2 - 50,
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

        const subheader = this.scene.add.text(
            cx - frameW / 2 + 28,
            headerY + 26,
            "PROCEDURE: Select appropriate patch material from inventory, place over the breach, and torque locking anchor bolts to restore hull hermetic integrity.",
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "11px",
                color: UITheme.colors.textSecondary
            }
        );
        this.container.add(subheader);

        // Habitat Wall Inspection Viewport (Center-Top: 820x330)
        this.createWallViewport(cx, cy - 20);

        // Tool Selection Dock (Center-Bottom)
        this.createToolDock(cx, cy + 185);

        // Bottom Feedback HUD
        this.createFeedbackHUD(cx, cy + frameH / 2 - 42, frameW - 56);

        this.updateIntegrityGauge();
    }

    private createWallViewport(cx: number, cy: number) {
        const vpW = 820;
        const vpH = 310;

        const vp = this.scene.add.graphics();
        // Aluminum-Lithium pressure hull color with Whipple shield ribs
        vp.fillStyle(0x132438, 1);
        vp.fillRoundedRect(cx - vpW / 2, cy - vpH / 2, vpW, vpH, 10);
        vp.lineStyle(2, UITheme.colors.panelBorder, 1);
        vp.strokeRoundedRect(cx - vpW / 2, cy - vpH / 2, vpW, vpH, 10);

        // Industrial bulkhead structural ribs
        for (let x = cx - vpW / 2 + 100; x < cx + vpW / 2; x += 120) {
            vp.lineStyle(2, 0x1A3859, 0.6);
            vp.lineBetween(x, cy - vpH / 2, x, cy + vpH / 2);
        }
        for (let y = cy - vpH / 2 + 70; y < cy + vpH / 2; y += 80) {
            vp.lineStyle(1.5, 0x1A3859, 0.4);
            vp.lineBetween(cx - vpW / 2, y, cx + vpW / 2, y);
        }
        this.container.add(vp);

        // 3 Damaged Breach Sites:
        // Breach 1: Micrometeoroid Fissure (Small) - Requires Aerogel Sealant
        this.createBreach({
            id: "breach_1",
            label: "SECTOR A // MICRO-FISSURE",
            x: cx - 240,
            y: cy - 60,
            requiredTool: "aerogel",
            requiredToolName: "Aerogel Sealant Injector",
            crackType: "FISSURE"
        });

        // Breach 2: Seam Impact Fracture (Medium) - Requires Carbon Fiber Patch
        this.createBreach({
            id: "breach_2",
            label: "SECTOR B // WELD SEAM FRACTURE",
            x: cx + 220,
            y: cy - 40,
            requiredTool: "carbon_fiber",
            requiredToolName: "Carbon Fiber Patch",
            crackType: "JAGGED_SPLIT"
        });

        // Breach 3: Punctured Hull Rupture (Heavy) - Requires Titanium Clamping Plate
        this.createBreach({
            id: "breach_3",
            label: "SECTOR C // PRESSURE HULL PUNCTURE",
            x: cx - 20,
            y: cy + 70,
            requiredTool: "titanium_plate",
            requiredToolName: "Titanium Clamping Plate",
            crackType: "PUNCTURE_CAVITY"
        });
    }

    private createBreach(cfg: {
        id: string;
        label: string;
        x: number;
        y: number;
        requiredTool: PatchToolType;
        requiredToolName: string;
        crackType: "FISSURE" | "JAGGED_SPLIT" | "PUNCTURE_CAVITY";
    }) {
        const c = this.scene.add.container(cfg.x, cfg.y);

        const crackGraphics = this.scene.add.graphics();
        const patchGraphics = this.scene.add.graphics();
        c.add([crackGraphics, patchGraphics]);

        // Draw specific crack type
        crackGraphics.lineStyle(3, 0xFF5252, 1);
        if (cfg.crackType === "FISSURE") {
            // Fine zigzag hair cracks
            crackGraphics.lineBetween(-35, -20, -10, -5);
            crackGraphics.lineBetween(-10, -5, 15, -15);
            crackGraphics.lineBetween(15, -15, 40, 10);
            crackGraphics.lineBetween(-10, -5, -5, 20);
        } else if (cfg.crackType === "JAGGED_SPLIT") {
            // Wider jagged breach
            crackGraphics.fillStyle(0x040812, 1);
            crackGraphics.beginPath();
            crackGraphics.moveTo(-45, -10);
            crackGraphics.lineTo(-10, -30);
            crackGraphics.lineTo(30, -15);
            crackGraphics.lineTo(50, 20);
            crackGraphics.lineTo(10, 15);
            crackGraphics.lineTo(-20, 25);
            crackGraphics.closePath();
            crackGraphics.fillPath();
            crackGraphics.strokePath();
        } else {
            // Heavy puncture breach with venting gas simulation
            crackGraphics.fillStyle(0x02050D, 1);
            crackGraphics.fillCircle(0, 0, 32);
            crackGraphics.lineStyle(4, 0xFF1744, 1);
            crackGraphics.strokeCircle(0, 0, 32);
            // Radiating cracks
            for (let a = 0; a < 360; a += 45) {
                const rad = Phaser.Math.DegToRad(a);
                crackGraphics.lineBetween(
                    Math.cos(rad) * 28,
                    Math.sin(rad) * 28,
                    Math.cos(rad) * 48,
                    Math.sin(rad) * 48
                );
            }
        }

        // Status text pill above breach
        const tagBg = this.scene.add.graphics();
        tagBg.fillStyle(0x050C18, 0.9);
        tagBg.fillRoundedRect(-80, -56, 160, 22, 4);
        tagBg.lineStyle(1, 0xFF1744, 0.8);
        tagBg.strokeRoundedRect(-80, -56, 160, 22, 4);
        c.add(tagBg);

        const statusText = this.scene.add.text(0, -45, cfg.label, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "8.5px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add(statusText);

        // Clickable Hit Zone
        const hitZone = this.scene.add.rectangle(0, 0, 120, 90, 0x000000, 0.001);
        hitZone.setInteractive({ useHandCursor: true });
        c.add(hitZone);

        const breachData: HullBreach = {
            id: cfg.id,
            label: cfg.label,
            x: cfg.x,
            y: cfg.y,
            requiredTool: cfg.requiredTool,
            requiredToolName: cfg.requiredToolName,
            isSealed: false,
            boltsRemaining: 4,
            container: c,
            crackGraphics,
            patchGraphics,
            statusText,
            hitZone
        };

        hitZone.on("pointerdown", () => {
            this.handleBreachClick(breachData);
        });

        this.breaches.push(breachData);
        this.container.add(c);
    }

    private createToolDock(cx: number, cy: number) {
        const dockW = 820;
        const dockH = 68;

        const dockBg = this.scene.add.graphics();
        dockBg.fillStyle(0x0A1626, 0.95);
        dockBg.fillRoundedRect(cx - dockW / 2, cy - dockH / 2, dockW, dockH, 8);
        dockBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        dockBg.strokeRoundedRect(cx - dockW / 2, cy - dockH / 2, dockW, dockH, 8);
        this.container.add(dockBg);

        const label = this.scene.add.text(cx - dockW / 2 + 18, cy, "REPAIR MATERIALS:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        this.container.add(label);

        const inv = this.inventoryManager.getInventory();
        const tools: { type: PatchToolType; name: string; qty: number; x: number }[] = [
            { type: "aerogel", name: "AEROGEL SEALANT INJECTOR", qty: inv.patches.aerogelSealant, x: cx - 80 },
            { type: "carbon_fiber", name: "CARBON FIBER PATCH", qty: inv.patches.carbonFiberPatch, x: cx + 130 },
            { type: "titanium_plate", name: "TITANIUM CLAMPING PLATE", qty: inv.patches.titaniumClampingPlate, x: cx + 320 }
        ];

        for (const t of tools) {
            const btnW = 180;
            const btnH = 42;
            const btnContainer = this.scene.add.container(t.x, cy);

            const btnBg = this.scene.add.graphics();
            this.drawToolButtonBg(btnBg, btnW, btnH, t.type === this.selectedTool);
            btnContainer.add(btnBg);

            const btnText = this.scene.add.text(0, -6, t.name, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8.5px",
                color: t.type === this.selectedTool ? "#FFFFFF" : UITheme.colors.textSecondary,
                fontStyle: "bold"
            }).setOrigin(0.5);

            const qtyText = this.scene.add.text(0, 8, `AVAILABLE: ${t.qty}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8.5px",
                color: t.qty > 0 ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr,
                fontStyle: "bold"
            }).setOrigin(0.5);

            btnContainer.add([btnText, qtyText]);
            btnContainer.setSize(btnW, btnH);
            btnContainer.setInteractive({ useHandCursor: true });

            btnContainer.on("pointerdown", () => {
                SoundFX.playClick();
                this.selectedTool = t.type;
                this.refreshToolDockVisuals();
            });

            this.toolButtons[t.type] = {
                container: btnContainer,
                text: qtyText
            };
            this.container.add(btnContainer);
        }
    }

    private drawToolButtonBg(g: Phaser.GameObjects.Graphics, w: number, h: number, isSelected: boolean) {
        g.clear();
        g.fillStyle(isSelected ? UITheme.colors.cardSelected : 0x07111D, 1);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
        g.lineStyle(1.5, isSelected ? UITheme.colors.primaryCyan : 0x1B3552, 1);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    }

    private refreshToolDockVisuals() {
        const inv = this.inventoryManager.getInventory();
        const tools: { type: PatchToolType; qty: number }[] = [
            { type: "aerogel", qty: inv.patches.aerogelSealant },
            { type: "carbon_fiber", qty: inv.patches.carbonFiberPatch },
            { type: "titanium_plate", qty: inv.patches.titaniumClampingPlate }
        ];

        for (const t of tools) {
            const btnObj = this.toolButtons[t.type];
            if (!btnObj) continue;
            const bg = btnObj.container.getAt(0) as Phaser.GameObjects.Graphics;
            this.drawToolButtonBg(bg, 180, 42, t.type === this.selectedTool);
            btnObj.text.setText(`AVAILABLE: ${t.qty}`);
            btnObj.text.setColor(t.qty > 0 ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);
        }
    }

    private handleBreachClick(breach: HullBreach) {
        if (this.isSolved || breach.isSealed) return;

        // Verify correct material selected
        if (this.selectedTool !== breach.requiredTool) {
            SoundFX.playAlert();
            this.feedbackText.setText(`⚠ INCOMPATIBLE MATERIAL! Breach requires ${breach.requiredToolName.toUpperCase()}.`);
            this.feedbackText.setColor(UITheme.colors.emergencyRedStr);

            this.scene.tweens.add({
                targets: breach.container,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 80,
                yoyo: true
            });
            return;
        }

        // Check Inventory stock
        const invKey = this.selectedTool === "aerogel"
            ? "aerogelSealant"
            : (this.selectedTool === "carbon_fiber" ? "carbonFiberPatch" : "titaniumClampingPlate");

        const consumed = this.inventoryManager.usePatch(invKey);
        if (!consumed) {
            SoundFX.playAlert();
            this.feedbackText.setText(`⚠ OUT OF STOCK! Search habitat supply lockers for ${breach.requiredToolName}.`);
            this.feedbackText.setColor(UITheme.colors.emergencyRedStr);
            return;
        }

        this.refreshToolDockVisuals();

        // Apply Patch Sequence
        SoundFX.playToggle(true);
        breach.isSealed = true;

        // Draw applied patch
        breach.crackGraphics.clear();
        breach.patchGraphics.clear();

        if (breach.requiredTool === "aerogel") {
            // Neon cyan polymer weld bead along the seam
            breach.patchGraphics.lineStyle(6, UITheme.colors.primaryCyan, 0.95);
            breach.patchGraphics.lineBetween(-35, -20, -10, -5);
            breach.patchGraphics.lineBetween(-10, -5, 15, -15);
            breach.patchGraphics.lineBetween(15, -15, 40, 10);
            breach.patchGraphics.lineStyle(2, 0xFFFFFF, 1);
            breach.patchGraphics.lineBetween(-35, -20, 40, 10);
        } else if (breach.requiredTool === "carbon_fiber") {
            // Woven carbon fiber diamond patch
            breach.patchGraphics.fillStyle(0x060E18, 0.95);
            breach.patchGraphics.fillRoundedRect(-55, -35, 110, 70, 8);
            breach.patchGraphics.lineStyle(2, UITheme.colors.solarGold, 1);
            breach.patchGraphics.strokeRoundedRect(-55, -35, 110, 70, 8);

            // 4 corner bolts
            breach.patchGraphics.fillStyle(0x8DA4C4, 1);
            breach.patchGraphics.fillCircle(-45, -25, 4);
            breach.patchGraphics.fillCircle(45, -25, 4);
            breach.patchGraphics.fillCircle(-45, 25, 4);
            breach.patchGraphics.fillCircle(45, 25, 4);
        } else {
            // Heavy titanium reinforced clamping plate
            breach.patchGraphics.fillStyle(0x1B3048, 1);
            breach.patchGraphics.fillRoundedRect(-50, -50, 100, 100, 10);
            breach.patchGraphics.lineStyle(3, UITheme.colors.bioGreen, 1);
            breach.patchGraphics.strokeRoundedRect(-50, -50, 100, 100, 10);

            // Heavy industrial cross bolts
            breach.patchGraphics.fillStyle(UITheme.colors.solarGold, 1);
            breach.patchGraphics.fillCircle(-36, -36, 5);
            breach.patchGraphics.fillCircle(36, -36, 5);
            breach.patchGraphics.fillCircle(-36, 36, 5);
            breach.patchGraphics.fillCircle(36, 36, 5);
        }

        breach.statusText.setText("✔ HERMETICALLY SEALED");
        breach.statusText.setColor(UITheme.colors.bioGreenStr);

        this.feedbackText.setText(`✔ ${breach.requiredToolName.toUpperCase()} INSTALLED & TORQUED TO SPECIFICATION!`);
        this.feedbackText.setColor(UITheme.colors.bioGreenStr);

        this.updateIntegrityGauge();

        // Check Victory
        const allSealed = this.breaches.every(b => b.isSealed);
        if (allSealed && !this.isSolved) {
            this.handleSolveSuccess();
        }
    }

    private updateIntegrityGauge() {
        const sealedCount = this.breaches.filter(b => b.isSealed).length;
        const total = this.breaches.length;
        const pct = sealedCount / total;

        const { width, height } = this.scene.scale;
        const frameW = 880;
        const frameH = 600;
        const meterW = 180;
        const meterH = 16;
        const meterX = width / 2 + frameW / 2 - 48 - meterW;
        const meterY = height / 2 + frameH / 2 - 42;

        this.integrityGaugeFill.clear();
        this.integrityGaugeFill.fillStyle(pct >= 1.0 ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan, 0.95);
        this.integrityGaugeFill.fillRoundedRect(meterX + 2, meterY - meterH / 2 + 2, Math.max(0, (meterW - 4) * pct), meterH - 4, 3);

        const integrityVal = Math.round(36 + pct * 64);
        this.integrityText.setText(`HULL INTEGRITY: ${integrityVal}%`);
    }

    private createFeedbackHUD(x: number, y: number, w: number) {
        const hudBg = this.scene.add.graphics();
        hudBg.fillStyle(0x060E1A, 0.95);
        hudBg.fillRoundedRect(x - w / 2, y - 24, w, 48, 8);
        hudBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        hudBg.strokeRoundedRect(x - w / 2, y - 24, w, 48, 8);
        this.container.add(hudBg);

        this.feedbackText = this.scene.add.text(
            x - w / 2 + 20,
            y,
            "STATUS: ⚠ STRUCTURAL BREACHES COMPROMISING CABIN SEAL (INTEGRITY 36%)",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10.5px",
                color: UITheme.colors.marsAmberStr,
                fontStyle: "bold"
            }
        ).setOrigin(0, 0.5);
        this.container.add(this.feedbackText);

        const meterW = 180;
        const meterH = 16;
        const meterX = x + w / 2 - 20 - meterW;
        const meterY = y;

        const mTrack = this.scene.add.graphics();
        mTrack.fillStyle(0x030812, 1);
        mTrack.fillRoundedRect(meterX, meterY - meterH / 2, meterW, meterH, 4);
        mTrack.lineStyle(1, UITheme.colors.panelBorder, 1);
        mTrack.strokeRoundedRect(meterX, meterY - meterH / 2, meterW, meterH, 4);
        this.container.add(mTrack);

        this.integrityGaugeFill = this.scene.add.graphics();
        this.container.add(this.integrityGaugeFill);

        this.integrityText = this.scene.add.text(
            meterX - 10,
            meterY,
            "HULL INTEGRITY: 36%",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold"
            }
        ).setOrigin(1, 0.5);
        this.container.add(this.integrityText);
    }

    private handleSolveSuccess() {
        this.isSolved = true;
        SoundFX.playToggle(true);

        this.feedbackText.setText("✔ ALL 3 HULL BREACHES SEALED! STRUCTURAL INTEGRITY 100% (HERMETIC LOCK CONFIRMED)");
        this.feedbackText.setColor(UITheme.colors.bioGreenStr);

        this.scene.cameras.main.flash(400, 0, 229, 255, false);

        this.scene.time.delayedCall(1600, () => {
            this.callbacks.onComplete();
            this.close();
        });
    }

    public close() {
        this.container.destroy();
        this.callbacks.onClose();
    }
}

export default StructuralRepairPuzzle;
