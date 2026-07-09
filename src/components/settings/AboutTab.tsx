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
        kofiContainerRef.current.innerHTML = kofi.getHTML();
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.src = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";
      script.type = "text/javascript";
      script.async = true;
      script.onload = initWidget;
      document.body.appendChild(script);
    } else {
      if ((window as any).kofiwidget2) {
        initWidget();
      } else {
        script.addEventListener("load", initWidget);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener("load", initWidget);
      }
    };
  }, []);

  return (
    <m.div
      key="about"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={tabTransition}
      className="flex flex-col items-center justify-center text-center gap-4 py-8 select-none"
    >
      <div className="relative w-44 h-44 flex items-center justify-center mb-1">
        <img
          src="/logo.png"
          alt="AeroNotch Logo"
          className="w-16 h-16 rounded-2xl object-cover z-10 shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-white/20 select-none pointer-events-none"
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <SpinningText
            radius={5.5}
            fontSize={0.8}
            variants={{
              container: {
                hidden: { opacity: 1 },
                visible: {
                  opacity: 1,
                  rotate: 360,
                  transition: {
                    type: "spring",
                    bounce: 0,
                    duration: 8,
                    repeat: Infinity,
                    staggerChildren: 0.03,
                  },
                },
              },
              item: {
                hidden: { opacity: 0, filter: "blur(4px)" },
                visible: { opacity: 1, filter: "none" },
              },
            }}
            className="font-bold text-[#8e8e93] uppercase tracking-[0.05em]"
          >{`aeronotch • powered by • ed • `}</SpinningText>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          AeroNotch
        </h1>
        <span className="text-[10px] text-[#8e8e93] font-semibold leading-none mt-1 inline-block">
          {t("lblVersion")}
        </span>
      </div>

      <p className="text-xs text-[#c7c7cc] max-w-sm leading-relaxed mt-1">
        {t("lblDescription")}
      </p>

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
