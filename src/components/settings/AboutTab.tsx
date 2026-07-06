import { m } from "framer-motion";
import { HeartHandshake } from "lucide-react";
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
            className="font-bold text-[#86868b] uppercase tracking-[0.05em]"
          >{`aeronotch • powered by • ed • `}</SpinningText>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">
          AeroNotch
        </h1>
        <span className="text-[10px] text-[#86868b] font-semibold leading-none mt-1 inline-block">
          {t("lblVersion")}
        </span>
      </div>

      <p className="text-xs text-[#515154] max-w-sm leading-relaxed mt-1">
        {t("lblDescription")}
      </p>

      <div className="flex items-center gap-1.5 text-[10px] text-[#86868b] mt-4">
        <HeartHandshake className="w-4 h-4 text-[#ff2d55]" />
        <span>{t("lblBuiltWith")}</span>
      </div>
    </m.div>
  );
}
