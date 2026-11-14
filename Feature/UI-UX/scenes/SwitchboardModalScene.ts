import Phaser from "phaser";
import PowerSwitchboard from "../components/PowerSwitchboard.ts";

export class SwitchboardModalScene extends Phaser.Scene {
    private switchboard?: PowerSwitchboard;

    constructor() {
        super("SwitchboardModalScene");
    }

    create() {
        this.switchboard = new PowerSwitchboard(this, {
            onModuleToggled: (moduleId: string, isPowered: boolean) => {
                // Emit event to main LunarWorldScene or registry so resources and visuals react
                this.game.events.emit("switchboard:module-toggle", { moduleId, isPowered });
            },
            onClose: () => {
                this.scene.stop();
            }
        });
    }

    shutdown() {
        if (this.switchboard) {
            this.switchboard.destroy();
            this.switchboard = undefined;
        }
    }
}

export default SwitchboardModalScene;
