import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import StartScene from "./scenes/StartScene";
import StoryScene from "./scenes/StoryScene";
import CustomizationScene from "./scenes/CustomizationScene";
import LunarWorldScene from "./scenes/LunarWorldScene";
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
  scene: [
  BootScene,
  StartScene,
  StoryScene,
  CustomizationScene,
  LunarWorldScene
],
};

new Phaser.Game(config);