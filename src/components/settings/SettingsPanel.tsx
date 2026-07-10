import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SettingsSidebar } from "./SettingsSidebar";
import { GeneralTab } from "./GeneralTab";
import { WidgetsTab } from "./WidgetsTab";
import { IntegrationsTab } from "./IntegrationsTab";
import { PluginsTab } from "./PluginsTab";
import { AboutTab } from "./AboutTab";

type TabId = "general" | "widgets" | "integrations" | "plugins" | "about";

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  return (
    <div className="flex h-full w-full bg-[#1c1c1e] text-[#f5f5f7] font-sans overflow-hidden">
      <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto px-10 py-8 select-none">
        <AnimatePresence mode="wait">
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "widgets" && <WidgetsTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "plugins" && <PluginsTab />}
          {activeTab === "about" && <AboutTab />}
        </AnimatePresence>
      </div>
    </div>
  );
}
