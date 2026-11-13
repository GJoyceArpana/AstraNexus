/**
 * ASTRA NEXUS - OUTPOST SOL: UI & UX DESIGN SYSTEM
 * Tailored for Mars Base mission operations, child-friendly readability,
 * and high-contrast accessibility.
 */

export const UITheme = {
    colors: {
        // Core Space & Mars Environment
        spaceDark: 0x080D1C,
        spaceNavy: 0x0E1A32,
        marsSky: 0x15172D,
        marsSurface: 0xC35D40,
        marsDeepRust: 0x753C42,
        marsGlow: 0xF18A55,

        // High-Tech Neon Accents
        primaryCyan: 0x00E5FF,
        primaryCyanStr: "#00E5FF",
        marsAmber: 0xFF8A50,
        marsAmberStr: "#FF8A50",
        solarGold: 0xFFD600,
        solarGoldStr: "#FFD600",
        bioGreen: 0x00E676,
        bioGreenStr: "#00E676",
        emergencyRed: 0xFF1744,
        emergencyRedStr: "#FF1744",
        cosmicPurple: 0xB388FF,
        cosmicPurpleStr: "#B388FF",

        // Card & Panel Colors
        panelBg: 0x0C1930,
        panelBorder: 0x1E3B68,
        panelBorderGlow: 0x36CFFF,
        cardBg: 0x112244,
        cardHover: 0x1A3566,
        cardSelected: 0x1C457D,

        // Text Colors
        textPrimary: "#FFFFFF",
        textSecondary: "#A8BBD9",
        textMuted: "#6B84A6",
        textHighlight: "#00E5FF",
        textWarning: "#FFD600",
        textDanger: "#FF5252",
        textSuccess: "#69F0AE"
    },

    fonts: {
        heading: '"Orbitron", "Nunito", sans-serif',
        body: '"Nunito", sans-serif',
        sizes: {
            title: "42px",
            subtitle: "24px",
            h1: "30px",
            h2: "22px",
            h3: "18px",
            body: "16px",
            caption: "13px",
            badge: "11px"
        }
    },

    layout: {
        width: 1280,
        height: 720,
        safePadding: 24,
        radius: 12,
        cardRadius: 16,
        buttonRadius: 10
    },

    transitions: {
        quick: 120,
        standard: 250,
        slow: 500
    }
};

export default UITheme;
