import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand palette — stadium night, broadcast graphics.
        pitch: {
          DEFAULT: "hsl(var(--pitch))",
          deep: "hsl(var(--pitch-deep))",
        },
        electric: "hsl(var(--electric))",
        violet: "hsl(var(--brand-violet))",
        gold: "hsl(var(--gold))",
        live: "hsl(var(--live))",
        magenta: "hsl(var(--magenta))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 10px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--electric) / 0.25), 0 0 40px -8px hsl(var(--electric) / 0.55)",
        "glow-gold": "0 0 0 1px hsl(var(--gold) / 0.3), 0 0 50px -10px hsl(var(--gold) / 0.6)",
        "glow-live": "0 0 0 1px hsl(var(--live) / 0.4), 0 0 50px -8px hsl(var(--live) / 0.7)",
        elevated: "0 24px 70px -20px rgba(0,0,0,0.65), 0 8px 24px -12px rgba(0,0,0,0.5)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        aurora:
          "radial-gradient(60% 120% at 20% 0%, hsl(var(--electric) / 0.28) 0%, transparent 60%), radial-gradient(50% 100% at 90% 10%, hsl(var(--brand-violet) / 0.26) 0%, transparent 55%), radial-gradient(70% 120% at 50% 100%, hsl(var(--pitch) / 0.22) 0%, transparent 60%)",
        "grid-fade":
          "linear-gradient(to bottom, transparent, hsl(var(--background))), linear-gradient(hsl(var(--border)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.5) 1px, transparent 1px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "pulse-live": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.92)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        aurora: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "score-pop": {
          "0%": { transform: "scale(0.4) rotate(-8deg)", opacity: "0" },
          "60%": { transform: "scale(1.25) rotate(2deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0)", opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        // Slow cinematic zoom/pan for stadium stills (and video poster fallbacks).
        "ken-burns": {
          "0%": { transform: "scale(1.06) translate3d(0, 0, 0)" },
          "50%": { transform: "scale(1.18) translate3d(-1.5%, -1.2%, 0)" },
          "100%": { transform: "scale(1.06) translate3d(0, 0, 0)" },
        },
        // Broadcast-style light bar sweeping across a surface.
        "light-sweep": {
          "0%": { transform: "translateX(-130%) skewX(-14deg)", opacity: "0" },
          "35%": { opacity: "0.7" },
          "100%": { transform: "translateX(240%) skewX(-14deg)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        "pulse-live": "pulse-live 1.4s ease-in-out infinite",
        shimmer: "shimmer 2.2s infinite",
        aurora: "aurora 18s ease infinite",
        marquee: "marquee 32s linear infinite",
        "score-pop": "score-pop 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        glow: "glow 3s ease-in-out infinite",
        "ken-burns": "ken-burns 32s ease-in-out infinite",
        "light-sweep": "light-sweep 5.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
