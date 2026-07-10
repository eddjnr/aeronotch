const React = window.React;
function jsx(type, props, key) {
  const { children, ...rest } = props || {};
  const finalProps = key !== void 0 ? { ...rest, key } : rest;
  if (children !== void 0) {
    if (Array.isArray(children)) {
      return React.createElement(type, finalProps, ...children);
    }
    return React.createElement(type, finalProps, children);
  }
  return React.createElement(type, finalProps);
}
const jsxs = jsx;
React.Fragment;
const sdk = window.WinotchSDK;
const usePluginState = sdk.usePluginState;
sdk.getPluginState;
sdk.subscribePluginState;
sdk.pluginStateActions;
sdk.secureStorage;
sdk.fileStorage;
sdk.oauth;
sdk.getActiveTab;
sdk.isWindowFocused;
sdk.subscribeActiveTab;
sdk.openInBrowser;
function Compact() {
  const state = usePluginState("github-plugin");
  const runs = state?.runs ?? [];
  const activeRuns = runs.filter(
    (r) => r.status === "in_progress" || r.status === "queued" || r.status === "running"
  );
  const failedRuns = runs.filter((r) => r.conclusion === "failure");
  let status = "idle";
  if (runs.length > 0) {
    if (activeRuns.length > 0) status = "running";
    else if (failedRuns.length > 0) status = "failed";
    else status = "success";
  }
  if (status === "idle") return null;
  const isRunning = status === "running";
  const colorClass = isRunning ? "text-blue-400" : status === "failed" ? "text-rose-400 animate-pulse" : "text-emerald-400";
  return /* @__PURE__ */ jsxs("div", { className: "relative flex items-center justify-center shrink-0 w-5 h-5", children: [
    isRunning && /* @__PURE__ */ jsxs(
      "svg",
      {
        className: "absolute inset-0 w-full h-full animate-spin text-blue-400",
        viewBox: "0 0 24 24",
        children: [
          /* @__PURE__ */ jsx(
            "circle",
            {
              className: "opacity-10",
              cx: "12",
              cy: "12",
              r: "9.5",
              stroke: "currentColor",
              strokeWidth: "1.25",
              fill: "none"
            }
          ),
          /* @__PURE__ */ jsx(
            "path",
            {
              className: "opacity-90",
              stroke: "currentColor",
              strokeWidth: "1.25",
              strokeLinecap: "round",
              fill: "none",
              d: "M 12,2.5 A 9.5,9.5 0 0,1 21.5,12"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      "svg",
      {
        className: `w-3.5 h-3.5 relative z-10 ${colorClass}`,
        fill: "currentColor",
        viewBox: "0 0 24 24",
        children: /* @__PURE__ */ jsx(
          "path",
          {
            fillRule: "evenodd",
            clipRule: "evenodd",
            d: "M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"
          }
        )
      }
    )
  ] });
}
export {
  Compact as default
};
