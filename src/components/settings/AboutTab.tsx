import { useEffect, useRef } from "react";
import { m } from "framer-motion";
import { SpinningText } from "@/components/ui/spinnig-text";
import { useTranslation } from "../../hooks/useTranslation";

const tabTransition = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1] as const,
};

export function AboutTab() {
  const { t } = useTranslation();
  const kofiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let script = document.querySelector(
      'script[src="https://storage.ko-fi.com/cdn/widget/Widget_2.js"]'
    ) as HTMLScriptElement | null;

    const initWidget = () => {
      const kofi = (window as any).kofiwidget2;
      if (kofi && kofiContainerRef.current) {
        kofi.init('Buy me a coffe', '#141414', 'F6J722W2N5');
        kofi.draw();
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.src = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";
      script.async = true;
      script.onload = initWidget;
      document.body.appendChild(script);
    } else {
      initWidget();
    }
  }, []);

  return (
    <m.div
      key="about"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={tabTransition}
      className="flex flex-col gap-6 max-w-lg overflow-y-auto max-h-[82vh] pr-2 pb-6"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255, 255, 255, 0.12) transparent",
      }}
    >
      <div>
        <h1 className="text-[22px] font-bold text-white tracking-tight">About</h1>
        <p className="text-[13px] text-white/40 mt-1">AeroNotch System Information</p>
      </div>

      <div className="flex flex-col items-center justify-center p-8 bg-[#2c2c2e] rounded-xl border border-white/[0.08] relative overflow-hidden">
        <SpinningText duration={20} className="text-[#8e8e93] text-xs font-medium">
          AERONOTCH • MINIMALIST • DYNAMIC •
        </SpinningText>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-white tracking-widest">
          v{t("about.version")}
        </div>
      </div>

      <div className="flex flex-col gap-3 text-xs leading-relaxed text-[#8e8e93]">
        <p>
          AeroNotch is an interactive menu bar widget designed for Windows, bringing elegant status
          indicators, quick shortcuts, and media information in a compact layout.
        </p>
        <p>
          Developed with React, Tailwind CSS, and Rust (Tauri), designed to be lightweight, fast,
          and customizable.
        </p>
      </div>

      <div ref={kofiContainerRef} className="mt-2" />

      <div className="flex items-center gap-1.5 text-[10px] text-[#8e8e93] mt-4">
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
