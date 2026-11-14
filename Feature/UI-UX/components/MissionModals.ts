import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory from "./ButtonFactory.ts";

export interface BriefingCallbacks {
    onStart: () => void;
}

export interface PauseCallbacks {
    onResume: () => void;
    onRestart: () => void;
    onAbort: () => void;
}

export interface ResultsCallbacks {
    onNextSol: () => void;
    onReturnHome: () => void;
}

export interface SolResultsStats {
    stars: number; // 1 to 3
    lifeSupportScore: number;
    powerEfficiencyScore: number;
    samplesCollected: number;
    insightTitle: string;
    insightDesc: string;
    solLevel?: number;
    suitName?: string;
    callsign?: string;
}

export class MissionModals {
    /**
     * 1. MISSION BRIEFING SCREEN
     */
    public static createBriefingModal(scene: Phaser.Scene, callbacks: BriefingCallbacks): Phaser.GameObjects.Container {
        const { width, height } = scene.scale;
        const container = scene.add.container(0, 0);
        container.setDepth(180);

        // Backdrop
        const bg = scene.add.rectangle(0, 0, width, height, 0x050C1A, 0.92).setOrigin(0);
        bg.setInteractive();
        container.add(bg);

        // Modal Frame
        const modalW = 760;
        const modalH = 520;
        const modalX = (width - modalW) / 2;
        const modalY = (height - modalH) / 2;

        const frame = scene.add.graphics();
        frame.fillStyle(UITheme.colors.panelBg, 0.98);
        frame.fillRoundedRect(modalX, modalY, modalW, modalH, 16);
        frame.lineStyle(2.5, UITheme.colors.primaryCyan, 0.9);
        frame.strokeRoundedRect(modalX, modalY, modalW, modalH, 16);
        container.add(frame);

        // Header
        const tag = scene.add.text(width / 2, modalY + 32, "✦ INCOMING NASA TRANSMISSION ✦", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        const title = scene.add.text(width / 2, modalY + 62, "SOL 01: OUTPOST SOL ACTIVATION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "24px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        container.add([tag, title]);

        // Transmission Body Box
        const bodyBox = scene.add.graphics();
        bodyBox.fillStyle(0x071426, 0.9);
        bodyBox.fillRoundedRect(modalX + 35, modalY + 95, modalW - 70, 100, 8);
        bodyBox.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        bodyBox.strokeRoundedRect(modalX + 35, modalY + 95, modalW - 70, 100, 8);
        container.add(bodyBox);

        const commText = scene.add.text(
            modalX + 50,
            modalY + 110,
            "HOUSTON CAPCOM TO OUTPOST SOL:\nCongratulations on touching down on Mars! Your initial mandate is to bring base life support online, inspect the habitat dome, and balance the 3-plug power switchboard before Martian sunset.",
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "14px",
                color: "#E2EDFC",
                lineSpacing: 6,
                wordWrap: { width: modalW - 100 }
            }
        );
        container.add(commText);

        // Objectives Checklist
        const objTitle = scene.add.text(modalX + 35, modalY + 215, "SOL 01 MANDATORY OBJECTIVES:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        container.add(objTitle);

        const objectives = [
            "1. Inspect the Mars Habitat dome pressurization airlock.",
            "2. Access the Power Switchboard: Connect Greenhouse & Life Support.",
            "3. Board the exploration rover and map ancient Jezero crater rims.",
            "4. Monitor NASA DONKI telemetry for coronal mass ejections."
        ];

        objectives.forEach((obj, idx) => {
            const checkY = modalY + 245 + idx * 32;
            const check = scene.add.circle(modalX + 50, checkY + 8, 8, 0x112A4F);
            check.setStrokeStyle(1.5, UITheme.colors.primaryCyan, 1);
            const text = scene.add.text(modalX + 70, checkY, obj, {
                fontFamily: UITheme.fonts.body,
                fontSize: "14px",
                color: "#FFFFFF"
            });
            container.add([check, text]);
        });

        // Start Button
        const startBtn = ButtonFactory.createButton({
            scene,
            x: width / 2,
            y: modalY + modalH - 50,
            width: 320,
            height: 48,
            text: "COMMENCE SOL 01 MISSION ➔",
            primaryColor: UITheme.colors.solarGold,
            textColor: UITheme.colors.solarGoldStr,
            onClick: () => {
                container.destroy();
                callbacks.onStart();
            }
        });
        container.add(startBtn);

        return container;
    }

    /**
     * 2. IN-GAME PAUSE SCREEN
     */
    public static createPauseModal(scene: Phaser.Scene, callbacks: PauseCallbacks): Phaser.GameObjects.Container {
        const { width, height } = scene.scale;
        const container = scene.add.container(0, 0);
        container.setDepth(190);

        const bg = scene.add.rectangle(0, 0, width, height, 0x030814, 0.90).setOrigin(0);
        bg.setInteractive();
        container.add(bg);

        const modalW = 540;
        const modalH = 460;
        const modalX = (width - modalW) / 2;
        const modalY = (height - modalH) / 2;

        const frame = scene.add.graphics();
        frame.fillStyle(UITheme.colors.panelBg, 0.98);
        frame.fillRoundedRect(modalX, modalY, modalW, modalH, 16);
        frame.lineStyle(2.5, UITheme.colors.marsAmber, 0.9);
        frame.strokeRoundedRect(modalX, modalY, modalW, modalH, 16);
        container.add(frame);

        const title = scene.add.text(width / 2, modalY + 40, "MISSION PAUSED", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "26px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const sub = scene.add.text(width / 2, modalY + 70, "OUTPOST SOL OPERATIONS ON STANDBY", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: UITheme.colors.textMuted
        }).setOrigin(0.5);
        container.add([title, sub]);

        // Controls Summary Box
        const ctrlBox = scene.add.graphics();
        ctrlBox.fillStyle(0x081628, 0.9);
        ctrlBox.fillRoundedRect(modalX + 35, modalY + 95, modalW - 70, 140, 8);
        ctrlBox.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        ctrlBox.strokeRoundedRect(modalX + 35, modalY + 95, modalW - 70, 140, 8);
        container.add(ctrlBox);

        const ctrlTitle = scene.add.text(modalX + 50, modalY + 107, "CADET KEYBOARD & EVA CONTROLS:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        const ctrlText1 = scene.add.text(modalX + 50, modalY + 128, "• W / A / S / D  or  ARROWS: Move Astronaut / Steer Rover", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: "#FFFFFF",
            wordWrap: { width: modalW - 100 }
        });
        const ctrlText2 = scene.add.text(modalX + 50, modalY + 151, "• [ E ]: Interact with Base Modules, Airlocks & Rover", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: "#FFFFFF",
            wordWrap: { width: modalW - 100 }
        });
        const ctrlText3 = scene.add.text(modalX + 50, modalY + 174, "• [ P ]: Power Switchboard   |   [ M ]: 5-Sol Challenges", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: UITheme.colors.solarGoldStr,
            wordWrap: { width: modalW - 100 }
        });
        const ctrlText4 = scene.add.text(modalX + 50, modalY + 197, "• [ ESC ]: Toggle Mission Pause Menu", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: "#A0B4D0",
            wordWrap: { width: modalW - 100 }
        });
        container.add([ctrlTitle, ctrlText1, ctrlText2, ctrlText3, ctrlText4]);

        // Buttons
        const resumeBtn = ButtonFactory.createButton({
            scene,
            x: width / 2,
            y: modalY + 265,
            width: 280,
            height: 44,
            text: "RESUME MISSION",
            primaryColor: UITheme.colors.bioGreen,
            onClick: () => {
                container.destroy();
                callbacks.onResume();
            }
        });

        const restartBtn = ButtonFactory.createButton({
            scene,
            x: width / 2,
            y: modalY + 323,
            width: 280,
            height: 44,
            text: "RESTART SOL 01",
            primaryColor: UITheme.colors.solarGold,
            onClick: () => {
                container.destroy();
                callbacks.onRestart();
            }
        });

        const abortBtn = ButtonFactory.createButton({
            scene,
            x: width / 2,
            y: modalY + 381,
            width: 280,
            height: 44,
            text: "ABORT TO MAIN MENU",
            primaryColor: UITheme.colors.emergencyRed,
            onClick: () => {
                container.destroy();
                callbacks.onAbort();
            }
        });

        container.add([resumeBtn, restartBtn, abortBtn]);
        return container;
    }

    /**
     * 3. SOL MISSION RESULTS / DEBRIEF SCREEN
     */
    public static createResultsModal(
        scene: Phaser.Scene,
        stats: SolResultsStats,
        callbacks: ResultsCallbacks
    ): Phaser.GameObjects.Container {
        const { width, height } = scene.scale;
        const container = scene.add.container(0, 0);
        container.setDepth(200);

        const bg = scene.add.rectangle(0, 0, width, height, 0x040914, 0.94).setOrigin(0);
        bg.setInteractive();
        container.add(bg);

        const modalW = 760;
        const modalH = 540;
        const modalX = (width - modalW) / 2;
        const modalY = (height - modalH) / 2;

        const frame = scene.add.graphics();
        frame.fillStyle(UITheme.colors.panelBg, 0.98);
        frame.fillRoundedRect(modalX, modalY, modalW, modalH, 16);
        frame.lineStyle(3, UITheme.colors.solarGold, 0.9);
        frame.strokeRoundedRect(modalX, modalY, modalW, modalH, 16);
        container.add(frame);

        // Header Title
        const solNum = stats.solLevel || 1;
        const headerTitle = solNum >= 3
            ? "MARS EXPEDITION ACCOMPLISHED · ALL SOLS MASTERED"
            : `SOL 0${solNum} MISSION COMPLETE · MARS DEBRIEF`;

        const header = scene.add.text(width / 2, modalY + 30, headerTitle, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Equipped Suit & Callsign Subtitle Banner
        const suitSub = scene.add.text(width / 2, modalY + 54, `✦ EQUIPPED SUIT: ${stats.suitName || "ALPHA RECON EVA"}  |  CALLSIGN: ${stats.callsign || "CADET"} ✦`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        container.add([header, suitSub]);

        // Star Rating (1 to 3 stars)
        for (let i = 0; i < 3; i++) {
            const isEarned = i < stats.stars;
            const starText = scene.add.text(width / 2 - 60 + i * 60, modalY + 86, isEarned ? "⭐" : "☆", {
                fontSize: "32px"
            }).setOrigin(0.5);
            container.add(starText);

            if (isEarned) {
                scene.tweens.add({
                    targets: starText,
                    scale: 1.25,
                    duration: 400,
                    yoyo: true,
                    delay: i * 200
                });
            }
        }

        // Stats Summary Box
        const statBox = scene.add.graphics();
        statBox.fillStyle(0x08152A, 0.9);
        statBox.fillRoundedRect(modalX + 40, modalY + 125, modalW - 80, 110, 8);
        statBox.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        statBox.strokeRoundedRect(modalX + 40, modalY + 125, modalW - 80, 110, 8);
        container.add(statBox);

        const col1X = modalX + 70;
        const col2X = modalX + 420;

        const s1 = scene.add.text(col1X, modalY + 145, `• LIFE SUPPORT STABILITY: ${stats.lifeSupportScore}%`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: "#FFFFFF"
        });
        const s2 = scene.add.text(col1X, modalY + 185, `• POWER EFFICIENCY: ${stats.powerEfficiencyScore}%`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: "#FFFFFF"
        });
        const s3 = scene.add.text(col2X, modalY + 145, `• MARS SAMPLES CATALOGED: ${stats.samplesCollected}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.bioGreenStr
        });
        const s4 = scene.add.text(col2X, modalY + 185, `• NASA DONKI STORMS ENDURED: 1`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.solarGoldStr
        });
        container.add([s1, s2, s3, s4]);

        // Educational Insight Card
        const insBox = scene.add.graphics();
        insBox.fillStyle(0x0C223D, 0.95);
        insBox.fillRoundedRect(modalX + 40, modalY + 255, modalW - 80, 160, 8);
        insBox.lineStyle(2, UITheme.colors.primaryCyan, 0.8);
        insBox.strokeRoundedRect(modalX + 40, modalY + 255, modalW - 80, 160, 8);
        container.add(insBox);

        const insTag = scene.add.text(modalX + 60, modalY + 270, "✦ NASA SCIENTIFIC DISCOVERY UNLOCKED ✦", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        const insTitle = scene.add.text(modalX + 60, modalY + 292, stats.insightTitle, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "15px",
            color: "#FFFFFF",
            fontStyle: "bold",
            wordWrap: { width: modalW - 120 }
        });
        const insDesc = scene.add.text(modalX + 60, modalY + 322, stats.insightDesc, {
            fontFamily: UITheme.fonts.body,
            fontSize: "13px",
            color: "#D0E2FF",
            wordWrap: { width: modalW - 120 },
            lineSpacing: 4
        });
        container.add([insTag, insTitle, insDesc]);

        // Footer Actions
        const homeBtn = ButtonFactory.createButton({
            scene,
            x: width / 2 - 160,
            y: modalY + modalH - 50,
            width: 240,
            height: 48,
            text: "OUTPOST SOL MENU",
            primaryColor: 0x6E85A8,
            onClick: () => {
                container.destroy();
                callbacks.onReturnHome();
            }
        });

        const nextLabel = solNum === 1
            ? "PROCEED TO SOL 02 ➔"
            : (solNum === 2 ? "PROCEED TO SOL 03 ➔" : "MISSION VICTORY · RETURN HOME ➔");

        const nextBtn = ButtonFactory.createButton({
            scene,
            x: width / 2 + 160,
            y: modalY + modalH - 50,
            width: 280,
            height: 48,
            text: nextLabel,
            primaryColor: UITheme.colors.solarGold,
            textColor: UITheme.colors.solarGoldStr,
            onClick: () => {
                container.destroy();
                callbacks.onNextSol();
            }
        });

        container.add([homeBtn, nextBtn]);
        return container;
    }
}

export default MissionModals;
