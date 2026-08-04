'use client';

import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";

const EPIDBOT_URL = "https://epidbot.kwar-ai.com.br";

const THEMES = {
  dark: { bg: "#141413", border: "#2a2a26", text: "#fafaf5", accent: "#60a5fa" },
  light: { bg: "#ffffff", border: "#e8e6dc", text: "#141413", accent: "#2563eb" },
};

const LABELS = {
  en: { prefix: "Explore with ", accent: "EpidBot" },
  pt: { prefix: "Explore com o ", accent: "EpidBot" },
};

export default function EpidBotBadge() {
  const { i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const lang = i18n.language?.toLowerCase().startsWith("pt") ? "pt" : "en";
  const c = THEMES[resolvedTheme === "light" ? "light" : "dark"];
  const label = LABELS[lang];

  return (
    <a
      href={EPIDBOT_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 20px 8px 8px",
        background: c.bg,
        borderRadius: 50,
        textDecoration: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        border: `1px solid ${c.border}`,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
      }}
    >
      <img
        src={`${EPIDBOT_URL}/assets/epidbot.png`}
        alt="EpidBot"
        width={40}
        height={40}
        style={{ borderRadius: "50%", flexShrink: 0 }}
      />
      <span
        style={{
          color: c.text,
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "0.3px",
          whiteSpace: "nowrap",
        }}
      >
        {label.prefix}
        <span style={{ color: c.accent }}>{label.accent}</span>
      </span>
    </a>
  );
}
