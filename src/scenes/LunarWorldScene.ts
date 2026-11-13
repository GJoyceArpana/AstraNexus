
import Phaser from "phaser";

interface Interactable {
  name: string;
  description: string;
  object: Phaser.GameObjects.GameObject;
}

type ResourceName = "power" | "oxygen" | "water" | "safety";

interface Resource {
  label: string;
  value: number;
  color: number;
}

interface ObjectAction {
  resource?: ResourceName;
  amount?: number;
  message: string;
  lastUsed: number;
}

interface MissionObjective {
  id: string;
  title: string;
  completed: boolean;
}

export default class LunarWorldScene extends Phaser.Scene {
  // Astronaut is now a container holding both body and head.
  private astronaut!: Phaser.GameObjects.Container;
  private rover!: Phaser.GameObjects.Rectangle;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
  };

  private isDriving = false;
  private currentInteractable: Interactable | null = null;
  private interactables: Interactable[] = [];

  private readonly cooldownDuration = 15000;

  // RESOURCE SYSTEM

  private resources: Record<ResourceName, Resource> = {
    power: {
      label: "POWER",
      value: 100,
      color: 0xfacc15,
    },
    oxygen: {
      label: "OXYGEN",
      value: 100,
      color: 0x38bdf8,
    },
    water: {
      label: "WATER",
      value: 100,
      color: 0x3b82f6,
    },
    safety: {
      label: "CREW SAFETY",
      value: 100,
      color: 0x22c55e,
    },
  };

  private resourceBars: Record<
    ResourceName,
    Phaser.GameObjects.Rectangle
  > = {} as Record<ResourceName, Phaser.GameObjects.Rectangle>;

  private resourceTexts: Record<
    ResourceName,
    Phaser.GameObjects.Text
  > = {} as Record<ResourceName, Phaser.GameObjects.Text>;

  // OBJECT ACTIONS

  private objectActions: Record<string, ObjectAction> = {};

  // DAY 1 MISSION

  private objectives: MissionObjective[] = [
    {
      id: "base",
      title: "Inspect the MoonBase habitat",
      completed: false,
    },
    {
      id: "solar",
      title: "Activate the solar panels",
      completed: false,
    },
    {
      id: "greenhouse",
      title: "Activate the greenhouse",
      completed: false,
    },
  ];

  private missionPanel!: Phaser.GameObjects.Container;
  private missionProgressText!: Phaser.GameObjects.Text;
  private missionProgressBar!: Phaser.GameObjects.Rectangle;

  private objectiveTexts: Phaser.GameObjects.Text[] = [];
  private objectiveMarks: Phaser.GameObjects.Text[] = [];

  private missionCompleted = false;

  // UI

  private warningText!: Phaser.GameObjects.Text;
  private interactionText!: Phaser.GameObjects.Text;
  private notificationText!: Phaser.GameObjects.Text;

  // TIMERS

  private drainTimer = 0;
  private warningTimer = 0;

  constructor() {
    super("LunarWorldScene");
  }

  create() {
    this.createWorld();
    this.createObjects();
    this.createAstronaut();
    this.createRover();

    this.createDashboard();
    this.createMissionPanel();
    this.createMessages();
    this.createControls();

    this.updateDashboard();
    this.updateMissionPanel();
  }

  // WORLD

  private createWorld() {
    this.add.rectangle(
      640, 360, 1280, 720, 0x080d20
    );

    // Stars
    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(0, 1280);
      const y = Phaser.Math.Between(0, 720);
      const size = Phaser.Math.Between(1, 3);

      this.add.circle(
        x, y, size, 0xffffff, 0.8
      );
    }

    // Lunar surface
    this.add.rectangle(
      640, 640, 1280, 160, 0x555568
    );

    // Craters
    for (let i = 0; i < 14; i++) {
      const x = Phaser.Math.Between(30, 1250);
      const y = Phaser.Math.Between(575, 700);
      const size = Phaser.Math.Between(12, 35);

      this.add.circle(
        x, y, size, 0x3d4053, 0.6
      );
    }

    this.add.text(
      640, 150, "MOONBASE MISSION", {
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      }
    ).setOrigin(0.5);
  }

  // INTERACTIVE OBJECTS

  private createObjects() {
    const base = this.add.rectangle(
      640, 480, 180, 110, 0x94a3b8
    );

    this.add.text(
      640, 480, "MOON BASE", {
        fontSize: "18px",
        color: "#111827",
        fontStyle: "bold",
      }
    ).setOrigin(0.5);

    const solar = this.add.rectangle(
      920, 510, 130, 65, 0x2563eb
    );

    this.add.text(
      920, 510, "SOLAR", {
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      }
    ).setOrigin(0.5);

    const greenhouse = this.add.rectangle(
      350, 510, 130, 65, 0x16a34a
    );

    this.add.text(
      350, 510, "GREENHOUSE", {
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
      }
    ).setOrigin(0.5);

    const radio = this.add.rectangle(
      1100, 510, 75, 100, 0x64748b
    );

    this.add.text(
      1100, 510, "RADIO", {
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
      }
    ).setOrigin(0.5);

    this.interactables = [
      {
        name: "Moon Base",
        description:
          "Your main lunar shelter. Run a safety inspection to protect the crew.",
        object: base,
      },
      {
        name: "Solar Panels",
        description:
          "Solar panels collect sunlight and recharge the MoonBase power supply.",
        object: solar,
      },
      {
        name: "Greenhouse",
        description:
          "The greenhouse supports food production and helps maintain oxygen.",
        object: greenhouse,
      },
      {
        name: "Radio Tower",
        description:
          "The radio tower keeps communication open with Mission Control.",
        object: radio,
      },
    ];

    this.objectActions = {
      "Moon Base": {
        resource: "safety",
        amount: 10,
        message: "Safety inspection complete! Crew safety +10%.",
        lastUsed: -15000,
      },

      "Solar Panels": {
        resource: "power",
        amount: 20,
        message: "Solar panels recharged! Power +20%.",
        lastUsed: -15000,
      },

      Greenhouse: {
        resource: "oxygen",
        amount: 15,
        message: "Oxygen production restored! Oxygen +15%.",
        lastUsed: -15000,
      },

      "Radio Tower": {
        message:
          "Mission Control: Communication link established. Good work, astronaut!",
        lastUsed: -15000,
      },
    };
  }

  // ASTRONAUT
  // Body and head are children of one container.
  // Moving the container moves both parts together.

  private createAstronaut() {
    const body = this.add.rectangle(
      0, 8, 30, 34, 0xffffff
    );

    body.setStrokeStyle(2, 0x94a3b8);

    const head = this.add.circle(
      0, -17, 12, 0x93c5fd
    );

    head.setStrokeStyle(2, 0xffffff);

    const visor = this.add.ellipse(
      3, -18, 12, 8, 0x1e3a8a
    );

    // Group all astronaut parts into one object.
    this.astronaut = this.add.container(
      600, 590, [
        body,
        head,
        visor,
      ]
    );

    this.astronaut.setDepth(10);
    this.astronaut.setSize(30, 58);
  }

  // ROVER

  private createRover() {
    this.rover = this.add.rectangle(
      350, 590, 90, 45, 0xf59e0b
    );

    this.rover.setStrokeStyle(2, 0x78350f);

    this.add.text(
      350, 590, "ROVER", {
        fontSize: "14px",
        color: "#111827",
        fontStyle: "bold",
      }
    ).setOrigin(0.5).setDepth(11);
  }

  // RESOURCE DASHBOARD

  private createDashboard() {
    this.add.rectangle(
      640, 48, 1240, 78, 0x111827, 0.96
    )
      .setStrokeStyle(2, 0x475569)
      .setDepth(25)
      .setScrollFactor(0);

    const names: ResourceName[] = [
      "power",
      "oxygen",
      "water",
      "safety",
    ];

    const startX = 45;
    const spacing = 305;

    names.forEach((name, index) => {
      const resource = this.resources[name];
      const x = startX + index * spacing;

      this.add.text(
        x, 17, resource.label, {
          fontSize: "14px",
          color: "#cbd5e1",
          fontStyle: "bold",
        }
      )
        .setDepth(26)
        .setScrollFactor(0);

      this.add.rectangle(
        x + 90, 58, 160, 13, 0x334155
      )
        .setOrigin(0, 0.5)
        .setDepth(26)
        .setScrollFactor(0);

      this.resourceBars[name] = this.add.rectangle(
        x + 90, 58, 160, 13, resource.color
      )
        .setOrigin(0, 0.5)
        .setDepth(27)
        .setScrollFactor(0);

      this.resourceTexts[name] = this.add.text(
        x + 260, 48, "100%", {
          fontSize: "18px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
        .setDepth(27)
        .setScrollFactor(0);
    });
  }

  private updateDashboard() {
    const names: ResourceName[] = [
      "power",
      "oxygen",
      "water",
      "safety",
    ];

    names.forEach((name) => {
      const resource = this.resources[name];

      this.resourceBars[name].width =
        160 * (resource.value / 100);

      this.resourceTexts[name].setText(
        `${Math.round(resource.value)}%`
      );

      const color =
        resource.value <= 20
          ? 0xef4444
          : resource.value <= 50
            ? 0xf59e0b
            : resource.color;

      this.resourceBars[name].setFillStyle(color);
    });
  }

  // DAY 1 MISSION PANEL

  private createMissionPanel() {
    const background = this.add.rectangle(
      0, 0, 270, 330, 0x111827, 0.96
    );

    background.setStrokeStyle(2, 0x38bdf8);

    const heading = this.add.text(
      -115, -145, "MISSION CONTROL", {
        fontSize: "19px",
        color: "#38bdf8",
        fontStyle: "bold",
      }
    );

    const dayLabel = this.add.text(
      -115, -112, "DAY 1: ESTABLISH BASE", {
        fontSize: "13px",
        color: "#facc15",
        fontStyle: "bold",
      }
    );

    const description = this.add.text(
      -115, -80,
      "Prepare your lunar outpost for survival.",
      {
        fontSize: "12px",
        color: "#cbd5e1",
        wordWrap: { width: 230 },
      }
    );

    const objectiveHeading = this.add.text(
      -115, -38, "OBJECTIVES", {
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
      }
    );

    this.missionProgressText = this.add.text(
      -115, 115, "PROGRESS: 0 / 3", {
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
      }
    );

    this.add.rectangle(
      0, 150, 230, 10, 0x334155
    );

    this.missionProgressBar = this.add.rectangle(
      -115, 150, 0, 10, 0x22c55e
    )
      .setOrigin(0, 0.5);

    const footer = this.add.text(
      -115, 175,
      "Complete all tasks to finish Day 1.", {
        fontSize: "11px",
        color: "#94a3b8",
        wordWrap: { width: 230 },
      }
    );

    this.missionPanel = this.add.container(
      145, 365, [
        background,
        heading,
        dayLabel,
        description,
        objectiveHeading,
        this.missionProgressText,
        this.missionProgressBar,
        footer,
      ]
    );

    this.missionPanel.setDepth(28);
    this.missionPanel.setScrollFactor(0);

    // Add objective rows.
    this.objectives.forEach((objective, index) => {
      const y = 8 + index * 42;

      const mark = this.add.text(
        -113, y, "[ ]", {
          fontSize: "17px",
          color: "#facc15",
          fontStyle: "bold",
        }
      );

      const text = this.add.text(
        -85, y, objective.title, {
          fontSize: "12px",
          color: "#ffffff",
          wordWrap: { width: 185 },
        }
      );

      this.missionPanel.add([mark, text]);

      this.objectiveMarks.push(mark);
      this.objectiveTexts.push(text);
    });
  }

  private updateMissionPanel() {
    const completedCount = this.objectives.filter(
      (objective) => objective.completed
    ).length;

    this.missionProgressText.setText(
      `PROGRESS: ${completedCount} / ${this.objectives.length}`
    );

    const percentage =
      completedCount / this.objectives.length;

    this.missionProgressBar.width =
      230 * percentage;

    this.objectives.forEach((objective, index) => {
      const mark = this.objectiveMarks[index];
      const text = this.objectiveTexts[index];

      if (objective.completed) {
        mark.setText("[✓]");
        mark.setColor("#22c55e");
        text.setColor("#86efac");
      } else {
        mark.setText("[ ]");
        mark.setColor("#facc15");
        text.setColor("#ffffff");
      }
    });
  }

  private completeObjective(id: string) {
    if (this.missionCompleted) return;

    const objective = this.objectives.find(
      (item) => item.id === id
    );

    if (!objective || objective.completed) return;

    objective.completed = true;

    this.updateMissionPanel();

    this.showNotification(
      `OBJECTIVE COMPLETE: ${objective.title}`,
      "#86efac"
    );

    const allCompleted = this.objectives.every(
      (item) => item.completed
    );

    if (allCompleted) {
      this.completeDayOne();
    }
  }

  private completeDayOne() {
    if (this.missionCompleted) return;

    this.missionCompleted = true;

    this.showNotification(
      "DAY 1 COMPLETE! Your MoonBase is established. Mission accomplished!",
      "#facc15"
    );

    this.missionProgressText.setText(
      "DAY 1: COMPLETED!"
    );

    this.missionProgressText.setColor(
      "#86efac"
    );

    const unlockText = this.add.text(
      -115, 205, "DAY 2 UNLOCKED SOON!", {
        fontSize: "12px",
        color: "#facc15",
        fontStyle: "bold",
      }
    );

    this.missionPanel.add(unlockText);
  }

  // UI MESSAGES

  private createMessages() {
    this.interactionText = this.add.text(
      640, 665, "", {
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#111827",
        padding: { x: 12, y: 7 },
      }
    )
      .setOrigin(0.5)
      .setDepth(30)
      .setScrollFactor(0);

    this.warningText = this.add.text(
      640, 105, "", {
        fontSize: "17px",
        color: "#fca5a5",
        backgroundColor: "#450a0a",
        padding: { x: 12, y: 8 },
        align: "center",
      }
    )
      .setOrigin(0.5)
      .setDepth(31)
      .setScrollFactor(0);

    this.warningText.setVisible(false);

    this.notificationText = this.add.text(
      640, 145, "", {
        fontSize: "18px",
        color: "#86efac",
        backgroundColor: "#052e16",
        padding: { x: 12, y: 9 },
        align: "center",
        wordWrap: { width: 650 },
      }
    )
      .setOrigin(0.5)
      .setDepth(35)
      .setScrollFactor(0);

    this.notificationText.setVisible(false);
  }

  // KEYBOARD CONTROLS

  private createControls() {
    if (!this.input.keyboard) return;

    this.cursors =
      this.input.keyboard.createCursorKeys();

    this.keys = {
      W: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.W
      ),
      A: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.A
      ),
      S: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.S
      ),
      D: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.D
      ),
      E: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.E
      ),
    };
  }

  // MAIN GAME LOOP

  update(_time: number, delta: number) {
    this.updateResourceDrain(delta);
    this.updateWarning(delta);

    if (this.isDriving) {
      this.driveRover();
      return;
    }

    this.moveAstronaut();
    this.checkInteractions();

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.E)
    ) {
      // Rover gets priority over nearby equipment.
      const roverDistance = Phaser.Math.Distance.Between(
        this.astronaut.x,
        this.astronaut.y,
        this.rover.x,
        this.rover.y
      );

      if (roverDistance < 85) {
        this.enterRover();
        return;
      }

      if (this.currentInteractable) {
        this.useObject(this.currentInteractable);
      }
    }
  }

  // ASTRONAUT MOVEMENT

  private moveAstronaut() {
    const speed = 3;

    let dx = 0;
    let dy = 0;

    if (
      this.cursors.left.isDown ||
      this.keys.A.isDown
    ) {
      dx -= speed;
    }

    if (
      this.cursors.right.isDown ||
      this.keys.D.isDown
    ) {
      dx += speed;
    }

    if (
      this.cursors.up.isDown ||
      this.keys.W.isDown
    ) {
      dy -= speed;
    }

    if (
      this.cursors.down.isDown ||
      this.keys.S.isDown
    ) {
      dy += speed;
    }

    this.astronaut.x = Phaser.Math.Clamp(
      this.astronaut.x + dx,
      20,
      1260
    );

    this.astronaut.y = Phaser.Math.Clamp(
      this.astronaut.y + dy,
      540,
      620
    );
  }

  // ROVER MOVEMENT

  private driveRover() {
    const speed = 5;

    if (
      this.cursors.left.isDown ||
      this.keys.A.isDown
    ) {
      this.rover.x -= speed;
    }

    if (
      this.cursors.right.isDown ||
      this.keys.D.isDown
    ) {
      this.rover.x += speed;
    }

    if (
      this.cursors.up.isDown ||
      this.keys.W.isDown
    ) {
      this.rover.y -= speed;
    }

    if (
      this.cursors.down.isDown ||
      this.keys.S.isDown
    ) {
      this.rover.y += speed;
    }

    this.rover.x = Phaser.Math.Clamp(
      this.rover.x,
      30,
      1250
    );

    this.rover.y = Phaser.Math.Clamp(
      this.rover.y,
      560,
      670
    );

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.E)
    ) {
      this.exitRover();
    }
  }

  private enterRover() {
    this.isDriving = true;
    this.astronaut.setVisible(false);

    this.currentInteractable = null;

    this.interactionText.setText(
      "Driving rover — press E to exit"
    );
  }

  private exitRover() {
    this.isDriving = false;

    this.astronaut.setPosition(
      Phaser.Math.Clamp(
        this.rover.x + 65,
        20,
        1260
      ),
      Phaser.Math.Clamp(
        this.rover.y,
        540,
        620
      )
    );

    this.astronaut.setVisible(true);

    this.interactionText.setText(
      "WASD / Arrow keys: Move | E: Interact"
    );
  }

  // INTERACTION DETECTION

  private checkInteractions() {
    let nearest: Interactable | null = null;
    let nearestDistance = Infinity;

    for (const item of this.interactables) {
      const object =
        item.object as Phaser.GameObjects.Rectangle;

      // Find the nearest point on the object's boundary.
      const closestX = Phaser.Math.Clamp(
        this.astronaut.x,
        object.x - object.width / 2,
        object.x + object.width / 2
      );

      const closestY = Phaser.Math.Clamp(
        this.astronaut.y,
        object.y - object.height / 2,
        object.y + object.height / 2
      );

      const distance = Phaser.Math.Distance.Between(
        this.astronaut.x,
        this.astronaut.y,
        closestX,
        closestY
      );

      if (
        distance < 45 &&
        distance < nearestDistance
      ) {
        nearestDistance = distance;
        nearest = item;
      }
    }

    this.currentInteractable = nearest;

    const roverDistance = Phaser.Math.Distance.Between(
      this.astronaut.x,
      this.astronaut.y,
      this.rover.x,
      this.rover.y
    );

    if (roverDistance < 85) {
      this.interactionText.setText(
        "Press E to enter rover"
      );
    } else if (nearest) {
      this.interactionText.setText(
        `Press E to use ${nearest.name}`
      );
    } else {
      this.interactionText.setText(
        "WASD / Arrow keys: Move | E: Interact"
      );
    }
  }

  // OBJECT ACTIONS AND COOLDOWNS

  private useObject(item: Interactable) {
    const action = this.objectActions[item.name];

    if (!action) return;

    const now = this.time.now;
    const elapsed = now - action.lastUsed;

    if (elapsed < this.cooldownDuration) {
      const remaining = Math.ceil(
        (this.cooldownDuration - elapsed) / 1000
      );

      this.showNotification(
        `${item.name} is recharging. Try again in ${remaining}s.`,
        "#fcd34d"
      );

      return;
    }

    action.lastUsed = now;

    if (action.resource && action.amount) {
      const before =
        this.resources[action.resource].value;

      this.changeResource(
        action.resource,
        action.amount
      );

      const after =
        this.resources[action.resource].value;

      const actualIncrease = after - before;

      if (actualIncrease > 0) {
        this.showNotification(
          `${action.message} Actual increase: +${actualIncrease}%.`,
          "#86efac"
        );
      } else {
        this.showNotification(
          `${this.resources[action.resource].label} is already full!`,
          "#fcd34d"
        );
      }
    } else {
      this.showNotification(
        action.message,
        "#93c5fd"
      );
    }

    // Complete the corresponding Day 1 objective.
    if (item.name === "Moon Base") {
      this.completeObjective("base");
    }

    if (item.name === "Solar Panels") {
      this.completeObjective("solar");
    }

    if (item.name === "Greenhouse") {
      this.completeObjective("greenhouse");
    }
  }

  // RESOURCE CHANGES

  private changeResource(
    name: ResourceName,
    amount: number
  ) {
    const resource = this.resources[name];

    resource.value = Phaser.Math.Clamp(
      resource.value + amount,
      0,
      100
    );

    this.updateDashboard();
  }

  // NOTIFICATIONS

  private showNotification(
    message: string,
    color: string
  ) {
    this.notificationText.setText(message);
    this.notificationText.setColor(color);
    this.notificationText.setVisible(true);
    this.notificationText.setAlpha(1);

    this.tweens.killTweensOf(
      this.notificationText
    );

    this.tweens.add({
      targets: this.notificationText,
      alpha: 0,
      delay: 2500,
      duration: 500,

      onComplete: () => {
        this.notificationText.setVisible(false);
        this.notificationText.setAlpha(1);
      },
    });
  }

  // RESOURCE DRAIN

  private updateResourceDrain(delta: number) {
    this.drainTimer += delta;

    if (this.drainTimer >= 10000) {
      this.drainTimer = 0;

      this.changeResource("power", -2);
      this.changeResource("oxygen", -1);
      this.changeResource("water", -1);

      if (
        this.resources.oxygen.value <= 20 ||
        this.resources.power.value <= 10
      ) {
        this.changeResource("safety", -2);
      }
    }
  }

  // LOW RESOURCE WARNINGS

  private updateWarning(delta: number) {
    this.warningTimer += delta;

    if (this.warningTimer < 500) return;

    this.warningTimer = 0;

    const lowResources = Object.entries(
      this.resources
    )
      .filter(([, resource]) => resource.value <= 20)
      .map(([name]) => name.toUpperCase());

    if (lowResources.length > 0) {
      this.warningText.setText(
        `WARNING: LOW ${lowResources.join(", ")}!`
      );

      this.warningText.setVisible(true);
    } else {
      this.warningText.setVisible(false);
    }
  }
}
