import Phaser from "phaser";
import { SoundFX } from "./ButtonFactory.ts";

export interface OutpostSolTitleCallbacks {
    onStartMission: () => void;
    onSelectRole: () => void;
    onSelectLandingSite: () => void;
    onCustomization: () => void;
    onOpenTelemetry: () => void;
    onHowToPlay: () => void;
}

type WeatherStatus = "loading" | "live" | "unavailable";

interface WeatherResponse {
    success: boolean;
    data?: {
        totalEvents: number;
    };
}

const WEATHER_ENDPOINT = import.meta.env.DEV
    ? "http://localhost:3001/api/nasa/space-weather"
    : "/api/nasa/space-weather";
const WEATHER_TIMEOUT_MS = 8_000;

export class OutpostSolTitle {
    private readonly scene: Phaser.Scene;
    private readonly container: Phaser.GameObjects.Container;
    private readonly callbacks: OutpostSolTitleCallbacks;
    private weatherIndicator!: Phaser.GameObjects.Text;
    private weatherStatus: WeatherStatus = "loading";
    private weatherController?: AbortController;
    private destroyed = false;

    constructor(scene: Phaser.Scene, callbacks: OutpostSolTitleCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0);
        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        this.createBackground(width, height);
        this.createHabitat(width, height);
        this.createAstronaut(width, height);
        this.createBranding(width, height);
        this.createLaunchButton(width, height);
        this.createStatusFooter(width, height);
        void this.loadSpaceWeather();
    }

    private getAvailableTerrainTexture(): string | null {
        const selectedSite = this.scene.registry.get("landingSite") as string | undefined;
        if (selectedSite === "arcadia" && this.scene.textures.exists("arcadia-mosaic")) {
            return "arcadia-mosaic";
        }
        if (this.scene.textures.exists("jezero-mosaic")) {
            return "jezero-mosaic";
        }
        if (this.scene.textures.exists("arcadia-mosaic")) {
            return "arcadia-mosaic";
        }
        return null;
    }

    private createBackground(width: number, height: number) {
        const sky = this.scene.add.rectangle(0, 0, width, height, 0x071331).setOrigin(0);
        this.container.add(sky);

        const nebula = this.scene.add.ellipse(width * 0.79, height * 0.17, 570, 180, 0x4c3a9d, 0.15);
        nebula.setAngle(-24);
        const skyGlow = this.scene.add.ellipse(width * 0.49, height * 0.43, 720, 390, 0x274684, 0.13);
        this.container.add([nebula, skyGlow]);

        for (let index = 0; index < 94; index += 1) {
            const star = this.scene.add.circle(
                Phaser.Math.Between(18, width - 18),
                Phaser.Math.Between(12, height * 0.69),
                Phaser.Math.FloatBetween(0.6, 1.8),
                0xfff8dc,
                Phaser.Math.FloatBetween(0.35, 0.95)
            );
            this.container.add(star);
            this.scene.tweens.add({
                targets: star,
                alpha: Phaser.Math.FloatBetween(0.2, 0.7),
                duration: Phaser.Math.Between(1_100, 2_900),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 1_000)
            });
        }

        const sunX = width * 0.12;
        const sunY = height * 0.17;
        const halo = this.scene.add.circle(sunX, sunY, 112, 0xffa51e, 0.1);
        const innerHalo = this.scene.add.circle(sunX, sunY, 91, 0xffc33e, 0.18);
        const sun = this.scene.add.graphics();
        sun.fillStyle(0xffc84c, 1);
        sun.fillCircle(sunX, sunY, 76);
        sun.lineStyle(4, 0xffe28a, 0.95);
        sun.strokeCircle(sunX, sunY, 76);
        const sunFace = this.scene.add.graphics();
        sunFace.lineStyle(4, 0x71372f, 0.95);
        sunFace.beginPath();
        sunFace.arc(sunX - 25, sunY - 5, 12, Math.PI * 1.15, Math.PI * 1.85, false);
        sunFace.strokePath();
        sunFace.beginPath();
        sunFace.arc(sunX + 25, sunY - 5, 12, Math.PI * 1.15, Math.PI * 1.85, false);
        sunFace.strokePath();
        sunFace.beginPath();
        sunFace.arc(sunX, sunY + 10, 20, 0.15, Math.PI - 0.15, false);
        sunFace.strokePath();
        const cheekLeft = this.scene.add.circle(sunX - 39, sunY + 22, 12, 0xf18a64, 0.82);
        const cheekRight = this.scene.add.circle(sunX + 39, sunY + 22, 12, 0xf18a64, 0.82);
        this.container.add([halo, innerHalo, sun, sunFace, cheekLeft, cheekRight]);

        const distant = this.scene.add.ellipse(width * 0.3, height * 0.86, width * 1.35, 190, 0x713844);
        const distantHighlight = this.scene.add.ellipse(width * 0.11, height * 0.82, width * 0.58, 105, 0xb45443);
        const midground = this.scene.add.ellipse(width * 0.75, height * 0.9, width * 1.18, 210, 0x9b483e);
        const ground = this.scene.add.rectangle(0, height * 0.86, width, height * 0.14, 0xc65d3e).setOrigin(0);
        this.container.add([distant, distantHighlight, midground, ground]);

        const terrainTexture = this.getAvailableTerrainTexture();
        if (terrainTexture) {
            const terrain = this.scene.add.image(width * 0.5, height * 0.91, terrainTexture);
            terrain.setDisplaySize(width, height * 0.23);
            terrain.setAlpha(0.18);
            terrain.setTint(0xe1774e);
            this.container.add(terrain);
        }

        const foregroundRocks = this.scene.add.graphics();
        foregroundRocks.fillStyle(0x9c453d, 1);
        foregroundRocks.fillTriangle(width * 0.62, height, width * 0.72, height * 0.82, width * 0.84, height);
        foregroundRocks.fillStyle(0x783c3e, 1);
        foregroundRocks.fillTriangle(width * 0.79, height, width * 0.89, height * 0.79, width, height);
        this.container.add(foregroundRocks);
    }

    private createHabitat(width: number, height: number) {
        const habitat = this.scene.add.container(width * 0.5, height * 0.16);
        const platform = this.scene.add.ellipse(0, 58, 590, 62, 0x9f4b39);
        platform.setStrokeStyle(3, 0xe87542, 0.85);
        habitat.add(platform);

        if (this.scene.textures.exists("greenhouse")) {
            const greenhouse = this.scene.add.image(-12, 5, "greenhouse");
            greenhouse.setDisplaySize(300, 240);
            habitat.add(greenhouse);
        } else {
            const dome = this.scene.add.ellipse(-12, 10, 198, 102, 0x6f9c9b, 0.72);
            dome.setStrokeStyle(3, 0xf6c36b, 0.9);
            habitat.add(dome);
        }

        if (this.scene.textures.exists("mars-habitat")) {
            const module = this.scene.add.image(205, 20, "mars-habitat");
            module.setDisplaySize(245, 190);
            habitat.add(module);
        }

        if (this.scene.textures.exists("dish-antenna")) {
            const dish = this.scene.add.image(-215, -10, "dish-antenna");
            dish.setDisplaySize(150, 136);
            habitat.add(dish);
        }

        const antenna = this.scene.add.graphics();
        antenna.lineStyle(3, 0xffc56a, 1);
        antenna.lineBetween(211, 2, 211, -66);
        antenna.fillStyle(0xffc56a, 1);
        antenna.fillCircle(211, -70, 5);
        habitat.add(antenna);

        const solarGlints = this.scene.add.text(-250, -20, "✦", {
            fontFamily: "Nunito",
            fontSize: "24px",
            color: "#ffd36b"
        }).setOrigin(0.5);
        habitat.add(solarGlints);
        this.container.add(habitat);
    }

    private createAstronaut(width: number, height: number) {
        const ledge = this.scene.add.graphics();
        ledge.fillStyle(0x8c403b, 1);
        ledge.fillRoundedRect(width * 0.74, height * 0.79, width * 0.34, height * 0.24, 28);
        ledge.fillStyle(0xb9553f, 1);
        ledge.fillTriangle(width * 0.72, height * 0.82, width * 0.82, height * 0.75, width * 0.99, height * 0.83);
        this.container.add(ledge);

        if (!this.scene.textures.exists("girl-astronaut")) return;

        const astronaut = this.scene.add.image(width * 0.84, height * 0.63, "girl-astronaut");
        astronaut.setDisplaySize(400, 570);
        astronaut.setAngle(-7);
        this.container.add(astronaut);
        this.scene.tweens.add({
            targets: astronaut,
            y: height * 0.62,
            duration: 2_500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    private createBranding(width: number, height: number) {
        const centerX = width * 0.49;
        const titleY = height * 0.39;
        const titleGlow = this.scene.add.text(centerX, titleY + 5, "SOL SURVIVOR", {
            fontFamily: "Nunito",
            fontSize: "70px",
            fontStyle: "900",
            color: "#d56f43",
            letterSpacing: 4
        }).setOrigin(0.5);
        const title = this.scene.add.text(centerX, titleY, "SOL SURVIVOR", {
            fontFamily: "Nunito",
            fontSize: "70px",
            fontStyle: "900",
            color: "#fff2d1",
            letterSpacing: 4
        }).setOrigin(0.5);
        title.setShadow(0, 4, "#3b2338", 6);

        const subtitle = this.scene.add.text(centerX, titleY + 60, "JUNIOR ASTRONAUT MISSION TRAINER", {
            fontFamily: "Nunito",
            fontSize: "19px",
            fontStyle: "bold",
            color: "#ffe0a2",
            letterSpacing: 2
        }).setOrigin(0.5);

        const divider = this.scene.add.graphics();
        divider.lineStyle(4, 0xf28a43, 1);
        divider.lineBetween(centerX - 250, titleY + 103, centerX - 72, titleY + 103);
        divider.lineBetween(centerX + 72, titleY + 103, centerX + 250, titleY + 103);
        divider.fillStyle(0xffa425, 1);
        divider.fillTriangle(centerX - 20, titleY + 114, centerX, titleY + 89, centerX + 20, titleY + 114);
        divider.fillStyle(0xffd26a, 1);
        divider.fillCircle(centerX, titleY + 103, 4);

        const description = this.scene.add.text(centerX, titleY + 146, "Your first adventure on Mars begins here.", {
            fontFamily: "Nunito",
            fontSize: "22px",
            fontStyle: "italic",
            color: "#fff0d6"
        }).setOrigin(0.5);
        this.container.add([titleGlow, title, subtitle, divider, description]);
    }

    private createLaunchButton(width: number, height: number) {
        const button = this.scene.add.container(width * 0.49, height * 0.73);
        const glow = this.scene.add.graphics();
        glow.fillStyle(0xff8e31, 0.22);
        glow.fillRoundedRect(-304, -62, 608, 124, 54);
        const background = this.scene.add.graphics();
        background.fillStyle(0xff741d, 1);
        background.fillRoundedRect(-286, -51, 572, 102, 48);
        background.lineStyle(5, 0xffd351, 1);
        background.strokeRoundedRect(-286, -51, 572, 102, 48);
        const icon = this.scene.add.text(-205, 0, "▶", {
            fontFamily: "Nunito",
            fontSize: "38px",
            color: "#fff9e9"
        }).setOrigin(0.5);
        const label = this.scene.add.text(-166, 0, "START MISSION", {
            fontFamily: "Nunito",
            fontSize: "32px",
            fontStyle: "900",
            color: "#fff9e9",
            letterSpacing: 2
        }).setOrigin(0, 0.5);
        const rays = this.scene.add.text(300, -70, "✦", {
            fontFamily: "Nunito",
            fontSize: "34px",
            color: "#ffd02e"
        }).setOrigin(0.5);
        const hit = this.scene.add.rectangle(0, 0, 572, 102, 0, 0).setInteractive({ useHandCursor: true });
        button.add([glow, background, icon, label, rays, hit]);
        this.container.add(button);

        hit.on("pointerover", () => {
            SoundFX.playHover();
            this.scene.tweens.add({ targets: button, scale: 1.045, duration: 150, ease: "Sine.easeOut" });
            glow.setAlpha(1.45);
        });
        hit.on("pointerout", () => {
            this.scene.tweens.add({ targets: button, scale: 1, duration: 150, ease: "Sine.easeOut" });
            glow.setAlpha(1);
        });
        hit.on("pointerdown", () => {
            SoundFX.playClick();
            this.scene.tweens.add({
                targets: button,
                scale: 0.96,
                duration: 75,
                yoyo: true,
                onComplete: () => this.callbacks.onStartMission()
            });
        });
    }

    private createStatusFooter(width: number, height: number) {
        const footerY = height - 19;
        this.weatherIndicator = this.scene.add.text(40, footerY, "☀ NASA SPACE WEATHER ●", {
            fontFamily: "Nunito",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#ffd36b",
            letterSpacing: 1
        }).setOrigin(0, 1);

        const terrainConnected = this.getAvailableTerrainTexture() !== null;
        const separator = this.scene.add.rectangle(367, footerY - 11, 2, 32, 0xffe0a0, 0.82);
        const terrainIcon = this.scene.add.text(395, footerY, "⛰", {
            fontFamily: "Nunito",
            fontSize: "22px",
            color: terrainConnected ? "#8be0b0" : "#b8b8b8"
        }).setOrigin(0, 1);
        const terrain = this.scene.add.text(426, footerY, "MARS TERRAIN ●", {
            fontFamily: "Nunito",
            fontSize: "15px",
            fontStyle: "bold",
            color: terrainConnected ? "#fff0d6" : "#b8b8b8",
            letterSpacing: 1
        }).setOrigin(0, 1);
        if (!terrainConnected) {
            terrain.setText("MARS TERRAIN FALLBACK ●");
        }
        this.container.add([this.weatherIndicator, separator, terrainIcon, terrain]);
    }

    private async loadSpaceWeather() {
        this.weatherStatus = "loading";
        this.updateWeatherIndicator();
        this.weatherController = new AbortController();
        const timeout = window.setTimeout(() => this.weatherController?.abort(), WEATHER_TIMEOUT_MS);

        try {
            const response = await fetch(WEATHER_ENDPOINT, {
                headers: { Accept: "application/json" },
                signal: this.weatherController.signal
            });
            if (!response.ok) throw new Error(`NASA proxy returned HTTP ${response.status}`);

            const payload = await response.json() as WeatherResponse;
            if (!payload.success || !payload.data || !Number.isFinite(payload.data.totalEvents)) {
                throw new Error("NASA proxy returned an invalid response.");
            }

            if (!this.destroyed) {
                this.weatherStatus = "live";
                this.updateWeatherIndicator();
            }
        } catch (error) {
            if (!this.destroyed) {
                this.weatherStatus = "unavailable";
                this.updateWeatherIndicator();
                console.warn("NASA space-weather status unavailable:", error);
            }
        } finally {
            window.clearTimeout(timeout);
        }
    }

    private updateWeatherIndicator() {
        if (!this.weatherIndicator) return;
        const states: Record<WeatherStatus, { text: string; color: string }> = {
            loading: { text: "☀ NASA SPACE WEATHER ●", color: "#ffd36b" },
            live: { text: "☀ NASA SPACE WEATHER ●", color: "#8be0b0" },
            unavailable: { text: "☀ NASA SPACE WEATHER ●", color: "#b8b8b8" }
        };
        const state = states[this.weatherStatus];
        this.weatherIndicator.setText(state.text).setColor(state.color);
    }

    public destroy() {
        this.destroyed = true;
        this.weatherController?.abort();
        this.scene.tweens.killTweensOf(this.container);
        this.container.destroy(true);
    }
}

export default OutpostSolTitle;