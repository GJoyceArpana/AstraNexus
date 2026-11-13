
import Phaser from "phaser";

export default class StoryScene extends Phaser.Scene {
  private wrapper?: HTMLDivElement;
  private video?: HTMLVideoElement;
  private isLeaving = false;

  constructor() {
    super("StoryScene");
  }

  create() {
    this.isLeaving = false;

    const app = document.getElementById("app");

    if (!app) {
      console.error("App container not found.");
      this.scene.start("CustomizationScene");
      return;
    }

    // Main overlay
    const wrapper = document.createElement("div");
    this.wrapper = wrapper;

    Object.assign(wrapper.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "1000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "auto",
      background:
        "radial-gradient(circle at 50% 35%, #142b50 0%, #070e20 65%, #030711 100%)",
      fontFamily: "Arial, sans-serif",
      color: "#ffffff",
      boxSizing: "border-box",
      padding: "24px"
    });

    // Background stars
    for (let i = 0; i < 65; i++) {
      const star = document.createElement("div");

      Object.assign(star.style, {
        position: "absolute",
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${Math.random() * 3 + 1}px`,
        height: `${Math.random() * 3 + 1}px`,
        borderRadius: "50%",
        background: "#ffffff",
        opacity: `${Math.random() * 0.7 + 0.2}`,
        pointerEvents: "none",
        boxShadow: "0 0 8px #8deaff"
      });

      wrapper.appendChild(star);
    }

    // Main briefing panel
    const panel = document.createElement("div");

    Object.assign(panel.style, {
      position: "relative",
      width: "min(900px, 100%)",
      maxHeight: "100%",
      overflowY: "auto",
      boxSizing: "border-box",
      padding: "clamp(20px, 4vw, 38px)",
      border: "1px solid rgba(94, 220, 255, 0.35)",
      borderRadius: "22px",
      background: "rgba(8, 22, 46, 0.94)",
      boxShadow: "0 0 60px rgba(0, 175, 255, 0.14)",
      backdropFilter: "blur(16px)",
      textAlign: "center"
    });

    wrapper.appendChild(panel);

    // Mission label
    const label = document.createElement("div");
    label.textContent = "✦  NASA-INSPIRED LUNAR EXPLORATION PROGRAM";

    Object.assign(label.style, {
      color: "#65e8ff",
      fontSize: "11px",
      fontWeight: "bold",
      letterSpacing: "3px",
      marginBottom: "15px"
    });

    panel.appendChild(label);

    // Heading
    const heading = document.createElement("h1");
    heading.textContent = "MISSION BRIEFING";

    Object.assign(heading.style, {
      fontSize: "clamp(27px, 5vw, 42px)",
      fontWeight: "900",
      letterSpacing: "3px",
      margin: "0 0 10px",
      color: "#ffffff",
      textShadow: "0 0 18px rgba(73, 213, 255, 0.4)"
    });

    panel.appendChild(heading);

    // Subtitle
    const subtitle = document.createElement("p");
    subtitle.textContent =
      "A new home for humanity begins with YOU.";

    Object.assign(subtitle.style, {
      fontSize: "clamp(14px, 2vw, 18px)",
      color: "#9eeaff",
      margin: "0 0 24px"
    });

    panel.appendChild(subtitle);

    // Video container
    const videoContainer = document.createElement("div");

    Object.assign(videoContainer.style, {
      position: "relative",
      width: "100%",
      aspectRatio: "16 / 9",
      background: "#020611",
      border: "1px solid rgba(100, 220, 255, 0.35)",
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: "0 0 30px rgba(0, 160, 255, 0.12)"
    });

    panel.appendChild(videoContainer);

    // Video
    const video = document.createElement("video");
    this.video = video;

    video.src = "public\\assets\\video\\intro.mp4";
    video.preload = "auto";
    video.playsInline = true;
    video.controls = true;
    video.muted = false;
    video.volume = 1;

    Object.assign(video.style, {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      display: "block",
      background: "#020611"
    });

    videoContainer.appendChild(video);

    // Video loading message
    const loadingMessage = document.createElement("div");
    loadingMessage.textContent = "PREPARING MISSION TRANSMISSION...";

    Object.assign(loadingMessage.style, {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#9eeaff",
      fontSize: "13px",
      letterSpacing: "2px",
      background: "#020611",
      pointerEvents: "none"
    });

    videoContainer.appendChild(loadingMessage);

    video.addEventListener("loadeddata", () => {
      loadingMessage.style.display = "none";
    });

    video.addEventListener("error", () => {
      loadingMessage.textContent =
        "VIDEO COULD NOT BE LOADED. CHECK THE VIDEO FILE PATH.";
      loadingMessage.style.display = "flex";
    });

    // Mission briefing description
    const description = document.createElement("p");

    description.textContent =
      "Astronaut, humanity is preparing for a new chapter. Your mission is to help establish a sustainable lunar base. Manage resources, solve engineering challenges and keep your crew safe.";

    Object.assign(description.style, {
      maxWidth: "700px",
      margin: "22px auto",
      color: "#c8d8ef",
      lineHeight: "1.7",
      fontSize: "clamp(13px, 1.7vw, 16px)"
    });

    panel.appendChild(description);

    // Buttons
    const buttonRow = document.createElement("div");

    Object.assign(buttonRow.style, {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "14px",
      marginTop: "20px"
    });

    panel.appendChild(buttonRow);

    // Play button
    const playButton = this.createButton(
      "▶  PLAY MISSION INTRO",
      "#0785ad",
      "#79eaff"
    );

    buttonRow.appendChild(playButton);

    playButton.addEventListener("click", async () => {
      try {
        await video.play();
        playButton.textContent = "▶  INTRO PLAYING";
        playButton.style.opacity = "0.65";
      } catch (error) {
        console.error("Video playback failed:", error);
        playButton.textContent = "PLAY VIDEO AGAIN";
      }
    });

    // Continue button
    const continueButton = this.createButton(
      "CONTINUE TO ASTRONAUT SELECTION  →",
      "#17365e",
      "#65e8ff"
    );

    buttonRow.appendChild(continueButton);

    continueButton.addEventListener("click", () => {
      this.goToCustomization();
    });

    // Skip button
    const skipButton = document.createElement("button");
    skipButton.textContent = "Skip introduction";

    Object.assign(skipButton.style, {
      display: "block",
      margin: "18px auto 0",
      padding: "8px 16px",
      background: "transparent",
      border: "none",
      color: "#93a9c6",
      cursor: "pointer",
      fontSize: "12px",
      textDecoration: "underline"
    });

    skipButton.addEventListener("click", () => {
      this.goToCustomization();
    });

    panel.appendChild(skipButton);

    // Video ends -> continue
    video.addEventListener("ended", () => {
      this.goToCustomization();
    });

    // Add to game container
    app.appendChild(wrapper);

    // Remove overlay when scene stops
    this.events.once("shutdown", this.cleanup, this);
    this.events.once("destroy", this.cleanup, this);
  }

  private createButton(
    text: string,
    background: string,
    borderColor: string
  ): HTMLButtonElement {
    const button = document.createElement("button");

    button.textContent = text;

    Object.assign(button.style, {
      padding: "15px 23px",
      borderRadius: "10px",
      border: `1px solid ${borderColor}`,
      background,
      color: "#ffffff",
      fontWeight: "bold",
      fontSize: "12px",
      letterSpacing: "1px",
      cursor: "pointer",
      transition: "all 0.2s ease"
    });

    button.addEventListener("mouseenter", () => {
      button.style.transform = "translateY(-2px)";
      button.style.boxShadow = `0 0 20px ${borderColor}55`;
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "none";
    });

    return button;
  }

  private goToCustomization() {
    if (this.isLeaving) return;

    this.isLeaving = true;

    if (this.video) {
      this.video.pause();
    }

    if (this.wrapper) {
      this.wrapper.style.transition = "opacity 0.5s ease";
      this.wrapper.style.opacity = "0";
    }

    this.time.delayedCall(500, () => {
      this.scene.start("CustomizationScene");
    });
  }

  private cleanup() {
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();
      this.video = undefined;
    }

    this.wrapper?.remove();
    this.wrapper = undefined;
  }
}
