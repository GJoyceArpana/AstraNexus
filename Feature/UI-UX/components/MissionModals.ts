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
        const modalW = 820;
        const modalH = 550;
        const modalX = (width - modalW) / 2;
        const modalY = (height - modalH) / 2;

        const frame = scene.add.graphics();
        frame.fillStyle(0x07152B, 0.98);
        frame.fillRoundedRect(modalX, modalY, modalW, modalH, 20);
        frame.lineStyle(3, UITheme.colors.primaryCyan, 0.95);
        frame.strokeRoundedRect(modalX, modalY, modalW, modalH, 20);
        container.add(frame);

        // Header Tag
        const tag = scene.add.text(width / 2, modalY + 32, "✦ MISSION BRIEFING ✦", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "14px",
            color: "#00E5FF",
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);

        // Main Title: EXPLORE YOUR BASE!
        const title = scene.add.text(width / 2, modalY + 68, "EXPLORE YOUR BASE!", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "32px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);

        // Subtitle
        const sub = scene.add.text(width / 2, modalY + 102, "Welcome to Mars, Cadet! Put on your space suit and explore your new home.", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "15px",
            color: "#D0E4FA",
            fontStyle: "bold"
        }).setOrigin(0.5);
        container.add([tag, title, sub]);

        // Welcoming Transmission Box
        const bodyBox = scene.add.graphics();
        bodyBox.fillStyle(0x061122, 0.9);
        bodyBox.fillRoundedRect(modalX + 35, modalY + 126, modalW - 70, 72, 12);
        bodyBox.lineStyle(1.5, 0x1A385C, 1);
        bodyBox.strokeRoundedRect(modalX + 35, modalY + 126, modalW - 70, 72, 12);
        container.add(bodyBox);

        const commText = scene.add.text(
            modalX + 50,
            modalY + 138,
            "🎉 HOUSTON CAPCOM: Touchdown confirmed! Your base modules are ready for exploration. Step outside, check your life support, and see what you can discover!",
            {
                fontFamily: "Nunito, Montserrat, sans-serif",
                fontSize: "14.5px",
                color: "#E8F2FF",
                lineSpacing: 5,
                wordWrap: { width: modalW - 100 }
            }
        );
        container.add(commText);

        // Section Title
        const actTitle = scene.add.text(width / 2, modalY + 222, "✦ COOL THINGS TO EXPLORE & DO ✦", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);
        container.add(actTitle);

        // 4 Kid-Friendly Activity Cards (2x2 Grid)
        const activities = [
            {
                icon: "🏠",
                title: "HABITAT DOME",
                color: "#00E5FF",
                desc: "Check your airlock & cozy living quarters!"
            },
            {
                icon: "⚡",
                title: "POWER SWITCHBOARD",
                color: "#FFD54F",
                desc: "Plug in cords to power up lights & heaters!"
            },
            {
                icon: "🍅",
                title: "SPACE GREENHOUSE",
                color: "#69F0AE",
                desc: "Harvest fresh space salad & yummy tomatoes!"
            },
            {
                icon: "🚜",
                title: "MARS ROVER",
                color: "#FF9100",
                desc: "Hop inside & drive across the red dunes!"
            }
        ];

        const cardW = 360;
        const cardH = 74;
        const gridX = [modalX + 40, modalX + 420];
        const gridY = [modalY + 248, modalY + 334];

        activities.forEach((act, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const cx = gridX[col];
            const cy = gridY[row];

            const actCard = scene.add.graphics();
            actCard.fillStyle(0x0A1C33, 0.9);
            actCard.fillRoundedRect(cx, cy, cardW, cardH, 12);
            actCard.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(act.color).color, 0.65);
            actCard.strokeRoundedRect(cx, cy, cardW, cardH, 12);
            container.add(actCard);

            const iconText = scene.add.text(cx + 18, cy + cardH / 2, act.icon, {
                fontSize: "28px"
            }).setOrigin(0, 0.5);

            const titleText = scene.add.text(cx + 60, cy + 14, act.title, {
                fontFamily: "Nunito, Montserrat, sans-serif",
                fontSize: "15px",
                color: act.color,
                fontStyle: "bold"
            });

            const descText = scene.add.text(cx + 60, cy + 38, act.desc, {
                fontFamily: "Nunito, Montserrat, sans-serif",
                fontSize: "13.5px",
                color: "#FFFFFF",
                wordWrap: { width: cardW - 70 }
            });

            container.add([iconText, titleText, descText]);
        });

        let started = false;
        const startMission = () => {
            if (started) return;
            started = true;
            container.destroy();
            callbacks.onStart();
        };
        const handleKeyboard = (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                event.preventDefault();
                startMission();
            }
        };
        scene.input.keyboard?.on("keydown", handleKeyboard);
        container.once("destroy", () => scene.input.keyboard?.off("keydown", handleKeyboard));

        // Start Button
        const startBtn = ButtonFactory.createButton({
            scene,
            x: width / 2,
            y: modalY + modalH - 58,
            width: 340,
            height: 50,
            fontSize: "16px",
            text: "LET'S EXPLORE MARS! 🚀",
            primaryColor: UITheme.colors.solarGold,
            textColor: UITheme.colors.solarGoldStr,
            onClick: startMission
        });
        container.add(startBtn);

        const keyboardHint = scene.add.text(width / 2, modalY + modalH - 16, "[ Press ENTER or Click to Start ]", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "13px",
            color: "#9FB0BD",
            fontStyle: "bold"
        }).setOrigin(0.5, 1);
        container.add(keyboardHint);

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
