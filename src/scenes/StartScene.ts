import Phaser from "phaser";

export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Background
    this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x080d20
    );

    // Stars
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);

      this.add.circle(
        x,
        y,
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 1)
      );
    }

    // Moon surface
    this.add.circle(
      width / 2,
      height + 150,
      450,
      0x9da6b5
    );

    // Moon craters
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(150, width - 150);
      const y = Phaser.Math.Between(height - 170, height - 30);

      this.add.circle(x, y, 12, 0x747e90, 0.5);
    }

    // Main title
    this.add.text(
      width / 2,
      130,
      "MOONBASE MISSION",
      {
        fontSize: "54px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#253c68",
        strokeThickness: 7,
      }
    ).setOrigin(0.5);

    // Subtitle
    this.add.text(
      width / 2,
      195,
      "JUNIOR ASTRONAUT MISSION TRAINER",
      {
        fontSize: "20px",
        color: "#80dfff",
        letterSpacing: 3,
      }
    ).setOrigin(0.5);

    // Astronaut placeholder
    this.add.circle(width / 2, 390, 55, 0xe5edf5);
    this.add.circle(width / 2, 385, 35, 0x173b5c);
    this.add.circle(width / 2, 385, 27, 0x80dfff, 0.6);

    this.add.text(
      width / 2,
      475,
      "WELCOME, JUNIOR ASTRONAUT!",
      {
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
      }
    ).setOrigin(0.5);

    // Start button
    const button = this.add.rectangle(
      width / 2,
      565,
      280,
      65,
      0x27c978
    );

    button.setStrokeStyle(3, 0xb5ffda);
    button.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(
      width / 2,
      565,
      "START MISSION  ▶",
      {
        fontSize: "25px",
        fontStyle: "bold",
        color: "#ffffff",
      }
    ).setOrigin(0.5);

    button.on("pointerover", () => {
      button.setFillStyle(0x16a85e);
      button.setScale(1.05);
      buttonText.setScale(1.05);
    });

    button.on("pointerout", () => {
      button.setFillStyle(0x27c978);
      button.setScale(1);
      buttonText.setScale(1);
    });

    button.on("pointerdown", () => {
      this.scene.start("StoryScene");
    });

    // Footer
    this.add.text(
      width / 2,
      665,
      "ONE MOON. ONE MISSION. YOUR ADVENTURE BEGINS.",
      {
        fontSize: "14px",
        color: "#c1d2e8",
      }
    ).setOrigin(0.5);
  }
}