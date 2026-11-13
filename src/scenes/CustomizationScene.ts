
import Phaser from "phaser";

type AstronautGender = "boy" | "girl";

export default class CustomizationScene extends Phaser.Scene {
  private selectedGender: AstronautGender = "boy";
  private selectedColor = 0x36cfff;
  private selectedRole = "EXPLORER";

  private preview?: Phaser.GameObjects.Image;
  private nameInput?: HTMLInputElement;
  private inputWrapper?: HTMLDivElement;

  private readonly suitColors = [
    { name: "CYAN", color: 0x36cfff },
    { name: "PURPLE", color: 0xa879ff },
    { name: "ORANGE", color: 0xffa34d },
    { name: "GREEN", color: 0x65db9b },
    { name: "PINK", color: 0xff82b8 }
  ];

  constructor() {
    super("CustomizationScene");
  }

  preload() {
    this.load.image(
      "boy-astronaut",
      "/assets/game/characters/boy-astronaut.png"
    );

    this.load.image(
      "girl-astronaut",
      "/assets/game/characters/girl-astronaut.png"
    );

    this.load.image(
      "happy-moon",
      "/assets/game/characters/happy-moon.png"
    );

    this.load.image(
      "star-badge",
      "/assets/game/icons/star-badge.png"
    );
  }

  create() {
    this.selectedGender = "boy";
    this.selectedColor = this.suitColors[0].color;
    this.selectedRole = "EXPLORER";

    this.events.once("shutdown", this.cleanup, this);
    this.events.once("destroy", this.cleanup, this);

    this.showGenderSelection();
  }

  // ==========================================
  // COMMON BACKGROUND
  // ==========================================

  private drawBackground() {
    this.children.removeAll(true);

    this.add.rectangle(
      0, 0, 1280, 720, 0x071326
    ).setOrigin(0);

    // Space glow
    this.add.circle(
      1050, 170, 260, 0x123a61, 0.28
    );

    this.add.circle(
      180, 600, 300, 0x102c4d, 0.22
    );

    // Stars
    for (let i = 0; i < 75; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, 1280),
        Phaser.Math.Between(0, 720),
        Phaser.Math.FloatBetween(0.7, 1.8),
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 0.85)
      );

      this.tweens.add({
        targets: star,
        alpha: 0.15,
        duration: Phaser.Math.Between(1000, 2500),
        yoyo: true,
        repeat: -1
      });
    }

    this.add.text(
      55, 35, "✦ ASTRA NEXUS",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "21px",
        color: "#65e8ff",
        fontStyle: "bold",
        letterSpacing: 3
      }
    );

    this.add.text(
      58, 68, "ASTRONAUT PREPARATION CENTER",
      {
        fontFamily: "Arial",
        fontSize: "10px",
        color: "#9bb5d5",
        letterSpacing: 2
      }
    );

    // Top right moon mascot
    const moon = this.add.image(
      1180, 70, "happy-moon"
    );

    moon.setDisplaySize(65, 65);

    this.tweens.add({
      targets: moon,
      y: 62,
      duration: 1800,
      yoyo: true,
      repeat: -1
    });
  }

  // ==========================================
  // STAGE 1: BOY OR GIRL
  // ==========================================

  private showGenderSelection() {
    this.removeNameInput();
    this.drawBackground();

    this.add.text(
      640, 145,
      "CHOOSE YOUR ASTRONAUT",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
        letterSpacing: 2
      }
    ).setOrigin(0.5);

    this.add.text(
      640, 190,
      "Every great mission begins with YOU.",
      {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#9eeaff"
      }
    ).setOrigin(0.5);

    // Character cards
    this.createGenderCard(
      405,
      "boy-astronaut",
      "BOY ASTRONAUT",
      "boy"
    );

    this.createGenderCard(
      875,
      "girl-astronaut",
      "GIRL ASTRONAUT",
      "girl"
    );

    this.add.text(
      640, 650,
      "SELECT A CHARACTER TO CONTINUE",
      {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "#819bbd",
        letterSpacing: 2
      }
    ).setOrigin(0.5);
  }

  private createGenderCard(
    x: number,
    texture: string,
    title: string,
    gender: AstronautGender
  ) {
    const card = this.add.container(x, 415);

    const background = this.add.rectangle(
      0, 0, 300, 365, 0x102644, 0.9
    );

    background.setStrokeStyle(
      2,
      gender === this.selectedGender ? 0x65e8ff : 0x315174,
      1
    );

    const character = this.add.image(
      0, -35, texture
    );

    character.setDisplaySize(185, 235);

    const name = this.add.text(
      0, 115, title,
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "17px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5);

    const chooseText = this.add.text(
      0, 150, "SELECT ASTRONAUT  →",
      {
        fontFamily: "Arial",
        fontSize: "12px",
        color: "#65e8ff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5);

    card.add([
      background,
      character,
      name,
      chooseText
    ]);

    card.setSize(300, 365);

    card.setInteractive(
      new Phaser.Geom.Rectangle(-150, -182, 300, 365),
      Phaser.Geom.Rectangle.Contains
    );

    card.on("pointerover", () => {
      this.input.setDefaultCursor("pointer");

      this.tweens.add({
        targets: card,
        scale: 1.04,
        duration: 150
      });

      background.setStrokeStyle(2, 0x65e8ff, 1);
    });

    card.on("pointerout", () => {
      this.input.setDefaultCursor("default");

      this.tweens.add({
        targets: card,
        scale: 1,
        duration: 150
      });

      background.setStrokeStyle(2, 0x315174, 1);
    });

    card.on("pointerdown", () => {
      this.selectedGender = gender;
      this.showCharacterCustomization();
    });
  }

  // ==========================================
  // STAGE 2: CHARACTER CUSTOMIZATION
  // ==========================================

  private showCharacterCustomization() {
    this.drawBackground();

    this.add.text(
      640, 115,
      "CUSTOMIZE YOUR ASTRONAUT",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "30px",
        color: "#ffffff",
        fontStyle: "bold",
        letterSpacing: 2
      }
    ).setOrigin(0.5);

    this.add.text(
      640, 157,
      "Make your space suit mission-ready!",
      {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#9eeaff"
      }
    ).setOrigin(0.5);

    // Left preview panel
    const previewPanel = this.add.rectangle(
      340, 405, 340, 425, 0x102644, 0.9
    );

    previewPanel.setStrokeStyle(1, 0x315174, 1);

    this.add.text(
      340, 220,
      "YOUR ASTRONAUT",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "14px",
        color: "#65e8ff",
        letterSpacing: 2
      }
    ).setOrigin(0.5);

    const texture =
      this.selectedGender === "boy"
        ? "boy-astronaut"
        : "girl-astronaut";

    this.preview = this.add.image(
      340, 405, texture
    );

    this.preview.setDisplaySize(230, 300);
    this.preview.setTint(this.selectedColor);

    this.tweens.add({
      targets: this.preview,
      y: 390,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    // Right customization panel
    this.add.rectangle(
      850, 405, 590, 425, 0x102644, 0.9
    ).setStrokeStyle(1, 0x315174, 1);

    // Suit colour heading
    this.add.text(
      610, 230,
      "01  |  SPACE SUIT COLOUR",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "15px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    );

    this.add.text(
      610, 255,
      "Choose your astronaut's colour theme",
      {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#9bb5d5"
      }
    );

    // Colour choices
    this.suitColors.forEach((item, index) => {
      const x = 635 + index * 95;
      const y = 310;

      const swatch = this.add.circle(
        x, y, 24, item.color
      );

      swatch.setStrokeStyle(
        this.selectedColor === item.color ? 4 : 1,
        this.selectedColor === item.color
          ? 0xffffff
          : 0x7895b6
      );

      swatch.setInteractive(
        new Phaser.Geom.Circle(0, 0, 29),
        Phaser.Geom.Circle.Contains
      );

      swatch.on("pointerover", () => {
        this.input.setDefaultCursor("pointer");
      });

      swatch.on("pointerout", () => {
        this.input.setDefaultCursor("default");
      });

      swatch.on("pointerdown", () => {
        this.selectedColor = item.color;
        this.showCharacterCustomization();
      });

      this.add.text(
        x, 352, item.name,
        {
          fontFamily: "Arial",
          fontSize: "9px",
          color: "#b8cce6"
        }
      ).setOrigin(0.5);
    });

    // Mission role
    this.add.text(
      610, 405,
      "02  |  CHOOSE YOUR MISSION ROLE",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "15px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    );

    this.add.text(
      610, 430,
      "What kind of astronaut will you be?",
      {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#9bb5d5"
      }
    );

    const roles = [
      { name: "EXPLORER", symbol: "🚀" },
      { name: "ENGINEER", symbol: "🔧" },
      { name: "SCIENTIST", symbol: "🔬" }
    ];

    roles.forEach((role, index) => {
      const x = 680 + index * 175;

      const button = this.add.rectangle(
        x, 495, 150, 65, 0x17365e
      );

      button.setStrokeStyle(
        this.selectedRole === role.name ? 2 : 1,
        this.selectedRole === role.name
          ? 0x65e8ff
          : 0x426287
      );

      button.setInteractive();

      this.add.text(
        x, 495,
        `${role.symbol}  ${role.name}`,
        {
          fontFamily: "Arial",
          fontSize: "12px",
          color: "#ffffff",
          fontStyle: "bold"
        }
      ).setOrigin(0.5);

      button.on("pointerdown", () => {
        this.selectedRole = role.name;
        this.showCharacterCustomization();
      });

      button.on("pointerover", () => {
        this.input.setDefaultCursor("pointer");
      });

      button.on("pointerout", () => {
        this.input.setDefaultCursor("default");
      });
    });

    // Callsign label
    this.add.text(
      610, 565,
      "03  |  ASTRONAUT CALLSIGN",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    );

    this.add.text(
      610, 590,
      "Give your astronaut a name!",
      {
        fontFamily: "Arial",
        fontSize: "12px",
        color: "#9bb5d5"
      }
    );

    this.createNameInput();

    // Back button
    this.createActionButton(
      170, 665, 190, 48,
      "←  CHANGE CHARACTER",
      0x17365e,
      () => {
        this.showGenderSelection();
      }
    );

    // Confirm button
    this.createActionButton(
      1030, 665, 300, 48,
      "CONFIRM ASTRONAUT  →",
      0x087fa9,
      () => {
        this.confirmAstronaut();
      }
    );
  }

  // ==========================================
  // CALLSIGN INPUT
  // ==========================================

  private createNameInput() {
    this.removeNameInput();

    const app = document.getElementById("app");
    if (!app) return;

    const wrapper = document.createElement("div");
    this.inputWrapper = wrapper;

    Object.assign(wrapper.style, {
      position: "absolute",
      left: "50%",
      top: "84%",
      transform: "translate(-50%, -50%)",
      zIndex: "100",
      width: "min(300px, 75%)"
    });

    const input = document.createElement("input");
    this.nameInput = input;

    input.type = "text";
    input.maxLength = 18;
    input.placeholder = "e.g. STAR COMMANDER";

    Object.assign(input.style, {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 15px",
      borderRadius: "8px",
      border: "1px solid #65e8ff",
      background: "#0b1d35",
      color: "#ffffff",
      outline: "none",
      fontSize: "14px",
      textAlign: "center"
    });

    const previousName =
      String(this.registry.get("astronautName") || "");

    input.value = previousName;

    wrapper.appendChild(input);
    app.appendChild(wrapper);
  }

  private removeNameInput() {
    this.inputWrapper?.remove();
    this.inputWrapper = undefined;
    this.nameInput = undefined;
  }

  // ==========================================
  // BUTTON HELPER
  // ==========================================

  private createActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    callback: () => void
  ) {
    const button = this.add.container(x, y);

    const background = this.add.rectangle(
      0, 0, width, height, color
    );

    background.setStrokeStyle(1, 0x65e8ff, 1);

    const text = this.add.text(
      0, 0, label,
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "11px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5);

    button.add([background, text]);

    button.setSize(width, height);

    button.setInteractive(
      new Phaser.Geom.Rectangle(
        -width / 2,
        -height / 2,
        width,
        height
      ),
      Phaser.Geom.Rectangle.Contains
    );

    button.on("pointerover", () => {
      this.input.setDefaultCursor("pointer");
      background.setFillStyle(0x12618a);
    });

    button.on("pointerout", () => {
      this.input.setDefaultCursor("default");
      background.setFillStyle(color);
    });

    button.on("pointerdown", callback);

    return button;
  }

  // ==========================================
  // CONFIRM AND ENTER LUNAR WORLD
  // ==========================================

  private confirmAstronaut() {
    const name =
      this.nameInput?.value.trim() || "ASTRONAUT";

    this.registry.set("astronautGender", this.selectedGender);
    this.registry.set("astronautTexture",
      this.selectedGender === "boy"
        ? "boy-astronaut"
        : "girl-astronaut"
    );
    this.registry.set("astronautColor", this.selectedColor);
    this.registry.set("astronautRole", this.selectedRole);
    this.registry.set("astronautName", name);

    this.removeNameInput();

    const overlay = this.add.rectangle(
      0, 0, 1280, 720, 0x020817, 0
    ).setOrigin(0).setDepth(100);

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 600,
      onComplete: () => {
        this.scene.start("LunarWorldScene");
      }
    });
  }

  private cleanup() {
    this.removeNameInput();
  }
}
