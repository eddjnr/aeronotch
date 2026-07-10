import { m } from "framer-motion";
import { SpinningText } from "@/components/ui/spinnig-text";
import { useTranslation } from "../../hooks/useTranslation";

const tabTransition = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1] as const,
};

export function AboutTab() {
  const { t } = useTranslation();

  return (
    <m.div
      key="about"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={tabTransition}
      className="flex flex-col gap-4 max-w-lg"
    >
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-white tracking-tight">About</h1>
        <p className="text-[13px] text-white/40 mt-0.5">AeroNotch System Information</p>
      </div>

      {/* Spinning logo + version */}
      <div className="flex flex-col items-center justify-center gap-1.5 py-2">
        <div className="relative flex items-center justify-center">
          <SpinningText
            duration={20}
            fontSize={0.6}
            radius={4.8}
            className="text-[#8e8e93]"
            style={{ width: 120, height: 120 }}
          >
            AERONOTCH • MINIMALIST • DYNAMIC •
          </SpinningText>
          <img
            src="/logo.png"
            alt="AeroNotch"
            className="absolute w-9 h-9 object-contain opacity-80"
          />
        </div>
        <span className="text-[9px] font-medium text-white/25 tracking-[0.2em] uppercase">
          {t("lblVersion")}
        </span>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#8e8e93]">
        <p>
          AeroNotch is an interactive menu bar widget designed for Windows, bringing elegant status
          indicators, quick shortcuts, and media information in a compact layout.
        </p>
        <p>
          Developed with React, Tailwind CSS, and Rust (Tauri), designed to be lightweight, fast,
          and customizable.
        </p>
      </div>

      {/* Support */}
      <a
        href="https://ko-fi.com/F6J722W2N5"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#2c2c2e] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#3a3a3c] transition-all group"
      >
        <span className="text-lg">☕</span>
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold text-white">Buy me a coffee</span>
          <span className="text-[10px] text-white/40">Support AeroNotch on Ko-fi</span>
        </div>
        <svg
          className="ml-auto w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </a>

      {/* Source */}
      <div className="flex items-center gap-1.5 text-[10px] text-[#8e8e93]">
        Source code:{" "}
        <a
          href="https://github.com/eddjnr/aeronotch"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#007aff] hover:underline"
        >
          https://github.com/eddjnr/aeronotch
        </a>
      </div>
    </m.div>
  );
}
