import Phaser from "phaser";

/**
 * Backwards-compatible scene wrapper for Sol 5.
 * Forwards seamlessly to Sol5LastSafeHabitatScene.
 */
export class Sol5SilenceCommsLagScene extends Phaser.Scene {
    constructor() {
        super("Sol5SilenceCommsLagScene");
    }

    create() {
        this.scene.start("Sol5LastSafeHabitatScene");
    }
}

export default Sol5SilenceCommsLagScene;
