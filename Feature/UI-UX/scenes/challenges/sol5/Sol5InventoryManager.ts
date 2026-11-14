import type { Sol5Inventory } from "./types.ts";

export interface InventoryCallbacks {
    onInventoryChanged: (inv: Sol5Inventory) => void;
    onItemLooted: (itemText: string) => void;
}

export class Sol5InventoryManager {
    private inv: Sol5Inventory;
    private callbacks?: InventoryCallbacks;

    constructor(callbacks?: InventoryCallbacks) {
        this.callbacks = callbacks;
        this.inv = {
            pipeConnectors: 6,
            circuitRelays: 4,
            replacementValves: 3,
            patches: {
                aerogelSealant: 2,
                carbonFiberPatch: 2,
                titaniumClampingPlate: 2
            }
        };
    }

    public getInventory(): Sol5Inventory {
        return {
            pipeConnectors: this.inv.pipeConnectors,
            circuitRelays: this.inv.circuitRelays,
            replacementValves: this.inv.replacementValves,
            patches: { ...this.inv.patches }
        };
    }

    public usePipeConnector(): boolean {
        if (this.inv.pipeConnectors > 0) {
            this.inv.pipeConnectors--;
            this.notify();
            return true;
        }
        return false;
    }

    public useCircuitRelay(): boolean {
        if (this.inv.circuitRelays > 0) {
            this.inv.circuitRelays--;
            this.notify();
            return true;
        }
        return false;
    }

    public useReplacementValve(): boolean {
        if (this.inv.replacementValves > 0) {
            this.inv.replacementValves--;
            this.notify();
            return true;
        }
        return false;
    }

    public usePatch(type: keyof Sol5Inventory["patches"]): boolean {
        if (this.inv.patches[type] > 0) {
            this.inv.patches[type]--;
            this.notify();
            return true;
        }
        return false;
    }

    public lootCrate(crateId: string) {
        let msg = "";
        switch (crateId) {
            case "crate_pipes":
                this.inv.pipeConnectors += 4;
                msg = "+4 Pipe Connectors retrieved from Locker!";
                break;
            case "crate_circuits":
                this.inv.circuitRelays += 3;
                msg = "+3 High-Voltage Relays & Fuses found!";
                break;
            case "crate_patches":
                this.inv.patches.aerogelSealant += 2;
                this.inv.patches.carbonFiberPatch += 2;
                this.inv.patches.titaniumClampingPlate += 1;
                msg = "+5 Composite Repair Patches stocked!";
                break;
            case "crate_valves":
                this.inv.replacementValves += 2;
                msg = "+2 Precision Cryo-Valves equipped!";
                break;
            default:
                this.inv.pipeConnectors += 2;
                this.inv.circuitRelays += 1;
                msg = "+3 General Engineering Spares collected!";
                break;
        }

        this.notify();
        if (this.callbacks?.onItemLooted) {
            this.callbacks.onItemLooted(msg);
        }
    }

    private notify() {
        if (this.callbacks?.onInventoryChanged) {
            this.callbacks.onInventoryChanged(this.getInventory());
        }
    }
}
