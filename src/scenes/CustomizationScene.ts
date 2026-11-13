
import Phaser from "phaser";

export default class CustomizationScene extends Phaser.Scene {
  private helmetColor = 0x4da6ff;

  constructor() {
    super("CustomizationScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x080d20
    );

    this.add.text(
      width / 2,
      90,
      "CUSTOMIZE YOUR ASTRONAUT",
      {
        fontSize: "34px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5);

    // Astronaut preview placeholder
    const astronaut = this.add.circle(
      width / 2,
      300,
      65,
      this.helmetColor
    );

    this.add.text(
      width / 2,
      410,
      "Choose your helmet colour",
      {
        fontSize: "22px",
        color: "#ffffff"
      }
    ).setOrigin(0.5);

    const colors = [
      0x4da6ff,
      0xff5555,
      0x55cc77,
      0xffcc33,
      0xffffff
    ];

    colors.forEach((color, index) => {
      const button = this.add.circle(
        width / 2 - 120 + index * 60,
        475,
        22,
        color
      ).setInteractive({ useHandCursor: true });

      button.on("pointerdown", () => {
        this.helmetColor = color;
        astronaut.setFillStyle(color);
      });
    });

    const continueButton = this.add.text(
      width / 2,
      590,
      "CONTINUE TO MOONBASE",
      {
        fontSize: "23px",
        color: "#ffffff",
        backgroundColor: "#3455aa",
        padding: { x: 25, y: 15 }
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });

    continueButton.on("pointerdown", () => {
      this.scene.start("LunarWorldScene");
    });
  }
}
