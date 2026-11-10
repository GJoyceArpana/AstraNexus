import Phaser from "phaser";

export default class StoryScene extends Phaser.Scene {
  private storyIndex = 0;

  private stories = [
    {
      title: "PART 1 – YOUR NEW BEGINNING",
      text: "Congratulations, astronaut! You have received your special astronaut badge on Earth."
    },
    {
      title: "PART 2 – JOURNEY TO THE MOON",
      text: "Your spaceship travels through space and safely lands in a giant lunar crater."
    },
    {
      title: "PART 3 – YOUR MISSION BEGINS",
      text: "Welcome to the Moon! Explore the surface and prepare to build your lunar base."
    }
  ];

  private storyText!: Phaser.GameObjects.Text;
  private storyTitle!: Phaser.GameObjects.Text;
  private nextButton!: Phaser.GameObjects.Text;

  constructor() {
    super("StoryScene");
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x080d20);

    this.add.text(width / 2, 100, "YOUR SPACE ADVENTURE", {
      fontSize: "38px",
      color: "#80dfff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.storyTitle = this.add.text(width / 2, 270, "", {
      fontSize: "27px",
      color: "#ffffff",
      fontStyle: "bold",
      align: "center"
    }).setOrigin(0.5);

    this.storyText = this.add.text(width / 2, 370, "", {
      fontSize: "23px",
      color: "#d5e5f5",
      align: "center",
      wordWrap: { width: 850 },
      lineSpacing: 12
    }).setOrigin(0.5);

    this.nextButton = this.add.text(width / 2, 570, "", {
      fontSize: "25px",
      color: "#ffffff",
      backgroundColor: "#159d69",
      padding: { x: 25, y: 15 }
    }).setOrigin(0.5);

    this.nextButton.setInteractive({ useHandCursor: true });
    this.nextButton.on("pointerdown", () => this.nextStory());

    this.showStory();
  }

  private showStory() {
    const story = this.stories[this.storyIndex];

    this.storyTitle.setText(story.title);
    this.storyText.setText(story.text);

    this.nextButton.setText(
      this.storyIndex === 2 ? "CONTINUE TO SUIT LOCKER →" : "NEXT →"
    );
  }

  private nextStory() {
    if (this.storyIndex < this.stories.length - 1) {
      this.storyIndex++;
      this.showStory();
    } else {
      this.storyTitle.setText("MISSION STORY COMPLETE!");
      this.storyText.setText(
        "Your next step is to customize your astronaut suit and prepare for lunar exploration."
      );
      this.nextButton.setText("BACK TO START");
      this.nextButton.removeAllListeners("pointerdown");
      this.nextButton.on("pointerdown", () => {
        this.scene.start("StartScene");
      });
    }
  }
}