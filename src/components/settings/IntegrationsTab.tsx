import { m } from "framer-motion";
import { Calendar } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useGoogleCalendar } from "../../hooks/useGoogleCalendar";

const tabTransition = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1] as const,
};

export function IntegrationsTab() {
  const { t } = useTranslation();
  const {
    googleStatus,
    calendarUrl,
    setCalendarUrl,
    isConnecting,
    connectionError,
    handleConnect,
    handleDisconnect,
  } = useGoogleCalendar();

  return (
    <m.div
      key="integrations"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={tabTransition}
      className="flex flex-col gap-6 max-w-lg"
    >
      <div>
        <h1 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">
          {t("integrationsTitle")}
        </h1>
        <p className="text-[13px] text-[#86868b] mt-1">
          {t("integrationsSubtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#007aff] text-white flex-shrink-0 shadow-[0_2px_8px_rgba(0,122,255,0.25)]">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#1d1d1f]">
                  {t("lblCalendarSub")}
                </span>
                <span className="text-xs text-[#86868b] mt-0.5">
                  {googleStatus?.connected
                    ? t("descCalendarSubConnected")
                    : t("descCalendarSubDisconnected")}
                </span>
              </div>
            </div>

            <div>
              {googleStatus?.connected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 text-[#ff3b30] text-xs font-semibold px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  {t("btnDisconnect")}
                </button>
              )}
            </div>
          </div>

          {!googleStatus?.connected ? (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[#555557]">
                {t("lblSecretIcsAddress")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={calendarUrl}
                  onChange={(e) => setCalendarUrl(e.target.value)}
                  placeholder={t("phIcsLink")}
                  aria-label={t("lblSecretIcsAddress")}
                  className="flex-1 bg-[#f5f5f7] border border-black/10 rounded-lg px-3 py-2 text-xs text-[#1d1d1f] placeholder:text-[#86868b] outline-none focus:bg-white focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff] transition-all"
                />
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="bg-[#007aff] hover:bg-[#0062cc] disabled:bg-[#007aff]/50 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {isConnecting ? t("btnSyncing") : t("btnSyncCalendar")}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#f5f5f7] p-4 rounded-lg border border-black/5 flex flex-col gap-3">
              <div>
                <span className="text-[10px] text-[#86868b] font-bold block uppercase tracking-wider">
                  {t("lblSyncedLink")}
                </span>
                <span className="text-xs text-[#1d1d1f] break-all block mt-1 font-mono bg-white p-2.5 rounded-md border border-black/5 select-text">
                  {googleStatus.url}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#34c759] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse" />
                {t("lblActiveSync")}
              </div>
            </div>
          )}

          {connectionError && (
            <div className="p-3 bg-[#ff3b30]/5 text-[#ff3b30] text-xs rounded-lg border border-[#ff3b30]/15">
              {connectionError}
            </div>
          )}

          <div className="border-t border-black/5 pt-4">
            <span className="text-xs font-semibold text-[#1d1d1f] block mb-2">
              {t("instructionsTitle")}
            </span>
            <ol className="text-xs text-[#555557] leading-relaxed list-decimal list-inside flex flex-col gap-1.5">
              <li>
                Open{" "}
                <strong className="text-[#1d1d1f]">
                  {t("lblGoogleCalendar")}
                </strong>{" "}
                in your web browser.
              </li>
              <li>
                Hover over your calendar name in the left list, click
                the <strong className="text-[#1d1d1f]">3 dots</strong>{" "}
                icon, and choose{" "}
                <strong className="text-[#1d1d1f]">
                  {t("instructionStep2").split("choose ")[1] ||
                    "Settings and sharing"}
                </strong>
                .
              </li>
              <li>
                Scroll down to the{" "}
                <strong className="text-[#1d1d1f]">
                  {t("instructionStep3")
                    .split("to the ")[1]
                    ?.split(" section")[0] || "Integrate calendar"}
                </strong>{" "}
                section and copy the{" "}
                <strong className="text-[#1d1d1f]">
                  {t("instructionStep3").split("copy the ")[1] ||
                    "Secret address in iCal format"}
                </strong>
                .
              </li>
            </ol>
          </div>
        </div>
      </div>
    </m.div>
  );
}
