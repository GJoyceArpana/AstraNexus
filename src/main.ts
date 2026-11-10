import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import StartScene from "./scenes/StartScene";
import StoryScene from "./scenes/StoryScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 1280,
  height: 720,
  backgroundColor: "#080D20",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, StartScene, StoryScene],
};

new Phaser.Game(config);