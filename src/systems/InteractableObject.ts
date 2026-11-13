
import Phaser from "phaser";

export default interface Interactable {
  name: string;
  description: string;
  object: Phaser.GameObjects.GameObject;
}
