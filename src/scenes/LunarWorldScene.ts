
import Phaser from "phaser";

type ResourceName = "power" | "oxygen" | "water" | "safety";

interface Resource {
  label: string;
  value: number;
  color: number;
}

interface Interactable {
  name: string;
  description: string;
  object: Phaser.GameObjects.Image;
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
  private astronaut!: Phaser.GameObjects.Image;
  private rover!: Phaser.GameObjects.Image;

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

  private readonly W = 1280;
  private readonly H = 720;

  private resources: Record<ResourceName, Resource> = {
    power: {
      label: "POWER",
      value: 100,
      color: 0xf6c85f,
    },
    oxygen: {
      label: "OXYGEN",
      value: 100,
      color: 0x53d9f5,
    },
    water: {
      label: "WATER",
      value: 100,
      color: 0x659cff,
    },
    safety: {
      label: "CREW SAFETY",
      value: 100,
      color: 0x63dfa1,
    },
  };

  private resourceBars = {} as Record<
    ResourceName,
    Phaser.GameObjects.Rectangle
  >;

  private resourceTexts = {} as Record<
    ResourceName,
    Phaser.GameObjects.Text
  >;

  private objectActions: Record<string, ObjectAction> = {};

  private objectives: MissionObjective[] = [
    {
      id: "base",
      title: "Inspect the Mars habitat",
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

  private missionProgressText!: Phaser.GameObjects.Text;
  private missionProgressBar!: Phaser.GameObjects.Rectangle;

  private objectiveMarks: Phaser.GameObjects.Text[] = [];
  private objectiveTexts: Phaser.GameObjects.Text[] = [];

  private missionCompleted = false;

  private warningText!: Phaser.GameObjects.Text;
  private interactionText!: Phaser.GameObjects.Text;
  private notificationText!: Phaser.GameObjects.Text;

  private drainTimer = 0;
  private warningTimer = 0;

  constructor() {
    super("LunarWorldScene");
  }

  // =========================================================
  // 1. ASSET LOADING
  // =========================================================

  preload(): void {
    // NASA Mars Trek terrain
    this.load.image(
      "mars_terrain",
      "/assets/game/mars/jezero-ctx-mosaic-3x3.png"
    );

    // Mars outpost buildings
    this.load.image(
      "mars_habitat",
      "/assets/game/base/base-station.png"
    );

    this.load.image(
      "mars_greenhouse",
      "/assets/game/base/greenhouse.png"
    );

    this.load.image(
      "mars_solar",
      "/assets/game/base/solar-panels.png"
    );

    this.load.image(
      "mars_antenna",
      "/assets/game/base/dish-antenna.png"
    );

    this.load.image(
      "mars_oxygen",
      "/assets/game/base/oxygen-cylinder.png"
    );

    // Rover
    this.load.image(
      "mars_rover",
      "/assets/game/base/rover.png"
    );

    // Astronauts
    this.load.image(
      "mars_boy",
      "/assets/game/characters/boy-astronaut.png"
    );

    this.load.image(
      "mars_girl",
      "/assets/game/characters/girl-astronaut.png"
    );
  }

  // =========================================================
  // 2. SCENE CREATION
  // =========================================================

  create(): void {
    this.createWorld();
    this.createBaseObjects();
    this.createAstronaut();
    this.createRover();

    this.createTopHUD();
    this.createMissionPanel();
    this.createInteractionBar();
    this.createNotifications();
    this.createControls();

    this.updateDashboard();
    this.updateMissionPanel();

    this.cameras.main.fadeIn(700, 20, 10, 5);
  }

  // =========================================================
  // 3. MARS ENVIRONMENT
  // =========================================================

  private createWorld(): void {
    // Deep Mars sky background
    this.add.rectangle(
      this.W / 2,
      this.H / 2,
      this.W,
      this.H,
      0x24101a
    ).setDepth(-25);

    // Actual NASA Jezero Crater terrain
    if (this.textures.exists("mars_terrain")) {
      const terrain = this.add.image(
        this.W / 2,
        this.H / 2,
        "mars_terrain"
      );

      terrain.setDisplaySize(this.W, this.H);
      terrain.setDepth(-24);

      // Warm Mars colour grading.
      terrain.setTint(0xe99b72);
      terrain.setAlpha(0.96);
    }

    // Subtle atmospheric colour overlay
    this.add.rectangle(
      this.W / 2,
      this.H / 2,
      this.W,
      this.H,
      0xb94f35,
      0.15
    ).setDepth(-23);

    // Horizon glow
    const horizon = this.add.ellipse(
      640,
      350,
      1250,
      260,
      0xf18a58,
      0.10
    );

    horizon.setDepth(-22);

    // Atmospheric dust particles
    for (let i = 0; i < 45; i++) {
      const dust = this.add.circle(
        Phaser.Math.Between(0, this.W),
        Phaser.Math.Between(130, this.H),
        Phaser.Math.FloatBetween(1, 3),
        0xffc49b,
        Phaser.Math.FloatBetween(0.12, 0.38)
      );

      dust.setDepth(-10);

      this.tweens.add({
        targets: dust,
        x: dust.x + Phaser.Math.Between(-35, 35),
        y: dust.y - Phaser.Math.Between(15, 45),
        alpha: 0.05,
        duration: Phaser.Math.Between(3000, 6500),
        repeat: -1,
        yoyo: true,
      });
    }

    // Outpost ground platform
    this.add.ellipse(
      650,
      570,
      1050,
      190,
      0x743b30,
      0.23
    ).setDepth(-5);

    // Small terrain lights
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(30, 1250);
      const y = Phaser.Math.Between(400, 640);

      this.add.circle(
        x,
        y,
        Phaser.Math.Between(2, 5),
        0xf4b08a,
        0.25
      ).setDepth(-3);
    }

    // Fixed HUD background
    this.add.rectangle(
      640,
      0,
      1280,
      126,
      0x160d19,
      0.75
    )
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setScrollFactor(0);

    this.add.text(
      34,
      145,
      "JEZERO CRATER  /  MARS EXPLORATION ZONE 01",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "12px",
        color: "#ffe1ce",
        letterSpacing: 2,
        fontStyle: "bold",
      }
    ).setDepth(12);
  }

  // =========================================================
  // 4. MARS OUTPOST STRUCTURES
  // =========================================================

  private addBaseSprite(
    key: string,
    x: number,
    y: number,
    width: number,
    depth: number,
    name: string
  ): Phaser.GameObjects.Image {
    const sprite = this.add.image(x, y, key);

    sprite.setDisplaySize(
      width,
      width * sprite.height / sprite.width
    );

    sprite.setDepth(depth);
    sprite.setName(name);

    return sprite;
  }

  private createBaseObjects(): void {
    const habitat = this.addBaseSprite(
      "mars_habitat",
      620,
      475,
      235,
      4,
      "Mars Habitat"
    );

    const greenhouse = this.addBaseSprite(
      "mars_greenhouse",
      315,
      500,
      175,
      5,
      "Greenhouse"
    );

    const solar = this.addBaseSprite(
      "mars_solar",
      920,
      535,
      205,
      5,
      "Solar Panels"
    );

    const antenna = this.addBaseSprite(
      "mars_antenna",
      1080,
      450,
      115,
      4,
      "Communication Tower"
    );

    const oxygen = this.addBaseSprite(
      "mars_oxygen",
      790,
      535,
      65,
      5,
      "Oxygen Station"
    );

    this.interactables = [
      {
        name: "Mars Habitat",
        description:
          "Inspect the habitat and verify the crew safety systems.",
        object: habitat,
      },
      {
        name: "Greenhouse",
        description:
          "Check the greenhouse and restore oxygen production.",
        object: greenhouse,
      },
      {
        name: "Solar Panels",
        description:
          "Activate the solar array to recharge the colony.",
        object: solar,
      },
      {
        name: "Communication Tower",
        description:
          "Establish a communication link with Mission Control.",
        object: antenna,
      },
      {
        name: "Oxygen Station",
        description:
          "Inspect the oxygen storage and life-support equipment.",
        object: oxygen,
      },
    ];

    this.objectActions = {
      "Mars Habitat": {
        resource: "safety",
        amount: 10,
        message:
          "Habitat inspection complete! Crew safety improved.",
        lastUsed: -15000,
      },

      "Solar Panels": {
        resource: "power",
        amount: 20,
        message:
          "Solar array activated! Power restored.",
        lastUsed: -15000,
      },

      Greenhouse: {
        resource: "oxygen",
        amount: 15,
        message:
          "Greenhouse activated! Oxygen production restored.",
        lastUsed: -15000,
      },

      "Communication Tower": {
        message:
          "Mission Control: Communication link established. Excellent work!",
        lastUsed: -15000,
      },

      "Oxygen Station": {
        resource: "oxygen",
        amount: 10,
        message:
          "Oxygen station inspected! Life-support reserve improved.",
        lastUsed: -15000,
      },
    };

    this.addLocationLabel(620, 355, "MARS HABITAT");
    this.addLocationLabel(315, 410, "GREENHOUSE");
    this.addLocationLabel(920, 445, "SOLAR ARRAY");
    this.addLocationLabel(1080, 355, "COMMUNICATIONS");
    this.addLocationLabel(790, 460, "OXYGEN STATION");
  }

  private addLocationLabel(
    x: number,
    y: number,
    label: string
  ): void {
    const text = this.add.text(x, y, label, {
      fontFamily: "Orbitron, Arial",
      fontSize: "10px",
      color: "#fff0e5",
      fontStyle: "bold",
      letterSpacing: 1,
      backgroundColor: "#321b20dd",
      padding: {
        x: 8,
        y: 5,
      },
    })
      .setOrigin(0.5)
      .setDepth(14);

    this.tweens.add({
      targets: text,
      alpha: {
        from: 0.72,
        to: 1,
      },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }

  // =========================================================
  // 5. ASTRONAUT
  // =========================================================

  private createAstronaut(): void {
    const selectedGender = this.registry.get(
      "astronautGender"
    );

    const selectedTexture = this.registry.get(
      "astronautTexture"
    );

    let texture = "mars_boy";

    if (
      selectedTexture === "girl-astronaut" ||
      selectedGender === "girl"
    ) {
      texture = "mars_girl";
    }

    if (!this.textures.exists(texture)) {
      texture = "mars_boy";
    }

    this.astronaut = this.add.image(
      540,
      595,
      texture
    );

    this.astronaut.setDisplaySize(66, 105);
    this.astronaut.setDepth(12);
    this.astronaut.setName("playerAstronaut");

    const callsign = this.registry.get(
      "astronautName"
    ) || "ASTRONAUT";

    this.add.text(
      540,
      520,
      String(callsign).toUpperCase(),
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "10px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#321b20dd",
        padding: {
          x: 6,
          y: 4,
        },
      }
    ).setOrigin(0.5).setDepth(13);
  }

  // =========================================================
  // 6. MARS ROVER
  // =========================================================

  private createRover(): void {
    this.rover = this.add.image(
      400,
      605,
      "mars_rover"
    );

    this.rover.setDisplaySize(112, 72);
    this.rover.setDepth(11);
    this.rover.setName("MarsRover");
  }

  // =========================================================
  // 7. TOP RESOURCE HUD
  // =========================================================

  private createTopHUD(): void {
    const panel = this.add.graphics()
      .setDepth(25)
      .setScrollFactor(0);

    panel.fillStyle(0x21131d, 0.97);
    panel.fillRoundedRect(18, 16, 1244, 94, 18);

    panel.lineStyle(1.5, 0xb9674b, 0.9);
    panel.strokeRoundedRect(18, 16, 1244, 94, 18);

    this.add.text(
      40,
      27,
      "ASTRA NEXUS",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "18px",
        color: "#ffae7d",
        fontStyle: "bold",
        letterSpacing: 2,
      }
    ).setDepth(26);

    this.add.text(
      42,
      55,
      "MARSBASE MISSION  •  DAY 01",
      {
        fontFamily: "Arial",
        fontSize: "10px",
        color: "#e5c1ad",
        letterSpacing: 1,
      }
    ).setDepth(26);

    const names: ResourceName[] = [
      "power",
      "oxygen",
      "water",
      "safety",
    ];

    const positions = [
      310,
      550,
      790,
      1030,
    ];

    names.forEach((name, index) => {
      const resource = this.resources[name];
      const x = positions[index];

      this.add.circle(
        x,
        42,
        6,
        resource.color
      ).setDepth(27);

      this.add.text(
        x + 15,
        30,
        resource.label,
        {
          fontFamily: "Orbitron, Arial",
          fontSize: "10px",
          color: "#f2dfd5",
          fontStyle: "bold",
          letterSpacing: 1,
        }
      ).setDepth(27);

      this.add.rectangle(
        x + 15,
        67,
        145,
        9,
        0x49333b
      )
        .setOrigin(0, 0.5)
        .setDepth(27);

      this.resourceBars[name] = this.add.rectangle(
        x + 15,
        67,
        145,
        9,
        resource.color
      )
        .setOrigin(0, 0.5)
        .setDepth(28);

      this.resourceTexts[name] = this.add.text(
        x + 168,
        56,
        "100%",
        {
          fontFamily: "Orbitron, Arial",
          fontSize: "13px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      ).setDepth(28);
    });
  }

  private updateDashboard(): void {
    (
      Object.keys(this.resources) as ResourceName[]
    ).forEach((name) => {
      const resource = this.resources[name];

      const value = Phaser.Math.Clamp(
        resource.value,
        0,
        100
      );

      const color = value <= 20
        ? 0xef6262
        : value <= 50
          ? 0xf4bd58
          : resource.color;

      this.resourceBars[name].width =
        145 * (value / 100);

      this.resourceBars[name].setFillStyle(color);

      this.resourceTexts[name].setText(
        `${Math.round(value)}%`
      );
    });
  }

  // =========================================================
  // 8. MISSION OBJECTIVES
  // =========================================================

  private createMissionPanel(): void {
    const panel = this.add.graphics()
      .setDepth(25)
      .setScrollFactor(0);

    panel.fillStyle(0x21131d, 0.96);
    panel.fillRoundedRect(24, 445, 320, 238, 16);

    panel.lineStyle(1.5, 0xb9674b, 0.95);
    panel.strokeRoundedRect(24, 445, 320, 238, 16);

    this.add.text(
      45,
      463,
      "MISSION OBJECTIVES",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "14px",
        color: "#ffae7d",
        fontStyle: "bold",
        letterSpacing: 1,
      }
    ).setDepth(26);

    this.add.text(
      45,
      488,
      "DAY 01  /  ESTABLISH THE OUTPOST",
      {
        fontFamily: "Arial",
        fontSize: "10px",
        color: "#f1c78c",
        fontStyle: "bold",
        letterSpacing: 0.7,
      }
    ).setDepth(26);

    this.missionProgressText = this.add.text(
      45,
      650,
      "0 / 3 COMPLETED",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "11px",
        color: "#f3e5dc",
        fontStyle: "bold",
      }
    ).setDepth(27);

    this.add.rectangle(
      45,
      672,
      275,
      5,
      0x49333b
    )
      .setOrigin(0, 0.5)
      .setDepth(26);

    this.missionProgressBar = this.add.rectangle(
      45,
      672,
      0,
      5,
      0x63dfa1
    )
      .setOrigin(0, 0.5)
      .setDepth(27);

    this.objectives.forEach((objective, index) => {
      const y = 525 + index * 37;

      const mark = this.add.text(
        47,
        y,
        "○",
        {
          fontSize: "18px",
          color: "#f1c96c",
          fontStyle: "bold",
        }
      ).setDepth(27);

      const label = this.add.text(
        73,
        y + 2,
        objective.title,
        {
          fontFamily: "Arial",
          fontSize: "12px",
          color: "#f2e4dd",
          wordWrap: {
            width: 245,
          },
        }
      ).setDepth(27);

      this.objectiveMarks.push(mark);
      this.objectiveTexts.push(label);
    });
  }

  private updateMissionPanel(): void {
    const completed = this.objectives.filter(
      objective => objective.completed
    ).length;

    this.missionProgressText.setText(
      `${completed} / ${this.objectives.length} COMPLETED`
    );

    this.missionProgressBar.width =
      275 * completed / this.objectives.length;

    this.objectives.forEach((objective, index) => {
      this.objectiveMarks[index]
        .setText(objective.completed ? "✓" : "○")
        .setColor(
          objective.completed
            ? "#63dfa1"
            : "#f1c96c"
        );

      this.objectiveTexts[index].setColor(
        objective.completed
          ? "#8ce8b8"
          : "#f2e4dd"
      );
    });
  }

  private completeObjective(id: string): void {
    if (this.missionCompleted) return;

    const objective = this.objectives.find(
      item => item.id === id
    );

    if (!objective || objective.completed) return;

    objective.completed = true;

    this.updateMissionPanel();

    this.showNotification(
      `OBJECTIVE COMPLETE: ${objective.title}`,
      "#8ce8b8"
    );

    if (
      this.objectives.every(
        item => item.completed
      )
    ) {
      this.completeDayOne();
    }
  }

  private completeDayOne(): void {
    if (this.missionCompleted) return;

    this.missionCompleted = true;

    this.showNotification(
      "DAY 01 COMPLETE! Your Mars outpost is established!",
      "#f4d477"
    );

    this.missionProgressText.setText(
      "DAY 01 COMPLETE!"
    );

    this.missionProgressText.setColor("#8ce8b8");
  }

  // =========================================================
  // 9. INTERACTION UI
  // =========================================================

  private createInteractionBar(): void {
    const bar = this.add.graphics()
      .setDepth(29)
      .setScrollFactor(0);

    bar.fillStyle(0x21131d, 0.96);
    bar.fillRoundedRect(390, 650, 500, 48, 14);

    bar.lineStyle(1, 0xb9674b, 0.9);
    bar.strokeRoundedRect(390, 650, 500, 48, 14);

    this.interactionText = this.add.text(
      640,
      674,
      "WASD / ARROWS  MOVE     •     E  INTERACT",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "11px",
        color: "#f5e4dc",
        fontStyle: "bold",
        letterSpacing: 0.5,
      }
    )
      .setOrigin(0.5)
      .setDepth(30)
      .setScrollFactor(0);
  }

  private createNotifications(): void {
    this.warningText = this.add.text(
      640,
      132,
      "",
      {
        fontFamily: "Orbitron, Arial",
        fontSize: "13px",
        color: "#ffaaaa",
        backgroundColor: "#481b2acc",
        padding: {
          x: 14,
          y: 9,
        },
        fontStyle: "bold",
      }
    )
      .setOrigin(0.5)
      .setDepth(35)
      .setScrollFactor(0);

    this.warningText.setVisible(false);

    this.notificationText = this.add.text(
      640,
      175,
      "",
      {
        fontFamily: "Arial",
        fontSize: "15px",
        color: "#8ce8b8",
        backgroundColor: "#321b20ee",
        padding: {
          x: 16,
          y: 11,
        },
        align: "center",
        wordWrap: {
          width: 650,
        },
      }
    )
      .setOrigin(0.5)
      .setDepth(36)
      .setScrollFactor(0);

    this.notificationText.setVisible(false);
  }

  private showNotification(
    message: string,
    color: string
  ): void {
    this.notificationText.setText(message);
    this.notificationText.setColor(color);
    this.notificationText.setAlpha(1);
    this.notificationText.setVisible(true);

    this.tweens.killTweensOf(
      this.notificationText
    );

    this.tweens.add({
      targets: this.notificationText,
      alpha: 0,
      delay: 2600,
      duration: 500,

      onComplete: () => {
        this.notificationText.setVisible(false);
        this.notificationText.setAlpha(1);
      },
    });
  }

  // =========================================================
  // 10. INPUT CONTROLS
  // =========================================================

  private createControls(): void {
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

  // =========================================================
  // 11. GAME LOOP
  // =========================================================

  update(_time: number, delta: number): void {
    this.updateResourceDrain(delta);
    this.updateWarning(delta);

    if (this.isDriving) {
      this.driveRover();
      return;
    }

    this.moveAstronaut();
    this.checkInteractions();

    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      const roverDistance =
        Phaser.Math.Distance.Between(
          this.astronaut.x,
          this.astronaut.y,
          this.rover.x,
          this.rover.y
        );

      if (roverDistance < 95) {
        this.enterRover();
      } else if (this.currentInteractable) {
        this.useObject(this.currentInteractable);
      }
    }
  }

  // =========================================================
  // 12. ASTRONAUT MOVEMENT
  // =========================================================

  private moveAstronaut(): void {
    const speed = 3;

    let dx = 0;
    let dy = 0;

    if (
      this.cursors.left.isDown ||
      this.keys.A.isDown
    ) dx -= speed;

    if (
      this.cursors.right.isDown ||
      this.keys.D.isDown
    ) dx += speed;

    if (
      this.cursors.up.isDown ||
      this.keys.W.isDown
    ) dy -= speed;

    if (
      this.cursors.down.isDown ||
      this.keys.S.isDown
    ) dy += speed;

    this.astronaut.x = Phaser.Math.Clamp(
      this.astronaut.x + dx,
      30,
      1250
    );

    this.astronaut.y = Phaser.Math.Clamp(
      this.astronaut.y + dy,
      150,
      635
    );

    if (dx !== 0) {
      this.astronaut.setFlipX(dx < 0);
    }
  }

  // =========================================================
  // 13. ROVER MOVEMENT
  // =========================================================

  private driveRover(): void {
    const speed = 5;

    let dx = 0;
    let dy = 0;

    if (
      this.cursors.left.isDown ||
      this.keys.A.isDown
    ) dx -= speed;

    if (
      this.cursors.right.isDown ||
      this.keys.D.isDown
    ) dx += speed;

    if (
      this.cursors.up.isDown ||
      this.keys.W.isDown
    ) dy -= speed;

    if (
      this.cursors.down.isDown ||
      this.keys.S.isDown
    ) dy += speed;

    this.rover.x = Phaser.Math.Clamp(
      this.rover.x + dx,
      35,
      1245
    );

    this.rover.y = Phaser.Math.Clamp(
      this.rover.y + dy,
      150,
      650
    );

    if (dx !== 0) {
      this.rover.setFlipX(dx < 0);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.E)
    ) {
      this.exitRover();
    }
  }

  private enterRover(): void {
    this.isDriving = true;

    this.astronaut.setVisible(false);
    this.currentInteractable = null;

    this.interactionText.setText(
      "ROVER MODE  •  WASD TO DRIVE  •  E TO EXIT"
    );
  }

  private exitRover(): void {
    this.isDriving = false;

    this.astronaut.setPosition(
      Phaser.Math.Clamp(
        this.rover.x + 75,
        30,
        1250
      ),
      Phaser.Math.Clamp(
        this.rover.y,
        150,
        635
      )
    );

    this.astronaut.setVisible(true);

    this.interactionText.setText(
      "WASD / ARROWS  MOVE     •     E  INTERACT"
    );
  }

  // =========================================================
  // 14. INTERACTION DETECTION
  // =========================================================

  private checkInteractions(): void {
    let nearest: Interactable | null = null;
    let nearestDistance = Infinity;

    for (const item of this.interactables) {
      const object = item.object;

      const bounds = object.getBounds();

      const closestX = Phaser.Math.Clamp(
        this.astronaut.x,
        bounds.left,
        bounds.right
      );

      const closestY = Phaser.Math.Clamp(
        this.astronaut.y,
        bounds.top,
        bounds.bottom
      );

      const distance =
        Phaser.Math.Distance.Between(
          this.astronaut.x,
          this.astronaut.y,
          closestX,
          closestY
        );

      if (
        distance < 55 &&
        distance < nearestDistance
      ) {
        nearestDistance = distance;
        nearest = item;
      }
    }

    this.currentInteractable = nearest;

    const roverDistance =
      Phaser.Math.Distance.Between(
        this.astronaut.x,
        this.astronaut.y,
        this.rover.x,
        this.rover.y
      );

    if (roverDistance < 95) {
      this.interactionText.setText(
        "PRESS E TO ENTER ROVER"
      );
    } else if (nearest) {
      this.interactionText.setText(
        `PRESS E TO INSPECT ${nearest.name.toUpperCase()}`
      );
    } else {
      this.interactionText.setText(
        "WASD / ARROWS  MOVE     •     E  INTERACT"
      );
    }
  }

  // =========================================================
  // 15. OBJECT ACTIONS
  // =========================================================

  private useObject(item: Interactable): void {
    const action = this.objectActions[item.name];

    if (!action) return;

    const elapsed =
      this.time.now - action.lastUsed;

    if (elapsed < this.cooldownDuration) {
      const remaining = Math.ceil(
        (this.cooldownDuration - elapsed) / 1000
      );

      this.showNotification(
        `${item.name} is recharging. Try again in ${remaining}s.`,
        "#f4d477"
      );

      return;
    }

    action.lastUsed = this.time.now;

    if (action.resource && action.amount) {
      const before =
        this.resources[action.resource].value;

      this.changeResource(
        action.resource,
        action.amount
      );

      const increase =
        this.resources[action.resource].value - before;

      this.showNotification(
        increase > 0
          ? `${action.message} +${increase}% ${this.resources[action.resource].label}.`
          : `${this.resources[action.resource].label} is already full!`,

        increase > 0
          ? "#8ce8b8"
          : "#f4d477"
      );
    } else {
      this.showNotification(
        action.message,
        "#a8dfff"
      );
    }

    if (item.name === "Mars Habitat") {
      this.completeObjective("base");
    }

    if (item.name === "Solar Panels") {
      this.completeObjective("solar");
    }

    if (item.name === "Greenhouse") {
      this.completeObjective("greenhouse");
    }
  }

  private changeResource(
    name: ResourceName,
    amount: number
  ): void {
    this.resources[name].value =
      Phaser.Math.Clamp(
        this.resources[name].value + amount,
        0,
        100
      );

    this.updateDashboard();
  }

  // =========================================================
  // 16. RESOURCE DEPLETION
  // =========================================================

  private updateResourceDrain(delta: number): void {
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

  // =========================================================
  // 17. RESOURCE WARNINGS
  // =========================================================

  private updateWarning(delta: number): void {
    this.warningTimer += delta;

    if (this.warningTimer < 500) return;

    this.warningTimer = 0;

    const low = Object.entries(this.resources)
      .filter(([, resource]) => resource.value <= 20)
      .map(([name]) => name.toUpperCase());

    if (low.length > 0) {
      this.warningText.setText(
        `⚠ LOW RESOURCE WARNING: ${low.join(", ")}`
      );

      this.warningText.setVisible(true);
    } else {
      this.warningText.setVisible(false);
    }
  }
}
