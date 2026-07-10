const React$1 = window.React;
function jsx(type, props, key) {
  const { children, ...rest } = props || {};
  const finalProps = key !== void 0 ? { ...rest, key } : rest;
  if (children !== void 0) {
    if (Array.isArray(children)) {
      return React$1.createElement(type, finalProps, ...children);
    }
    return React$1.createElement(type, finalProps, children);
  }
  return React$1.createElement(type, finalProps);
}
const jsxs = jsx;
const Fragment = React$1.Fragment;
const React = window.React;
const useState = React.useState;
const useEffect = React.useEffect;
const useMemo = React.useMemo;
React.useRef;
React.useCallback;
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
const openInBrowser = sdk.openInBrowser;
function Expanded() {
  const state = usePluginState("github-plugin") || {
    runs: [],
    selectedRepos: []
  };
  const [selectedRepoFullName, setSelectedRepoFullName] = useState(null);
  const runs = state.runs || [];
  const selectedRepos = state.selectedRepos || [];
  const runsByRepo = useMemo(() => {
    const map = {};
    runs.forEach((run) => {
      if (!map[run.repoFullName]) {
        map[run.repoFullName] = [];
      }
      map[run.repoFullName].push(run);
    });
    return map;
  }, [runs]);
  useEffect(() => {
    if (!selectedRepoFullName && selectedRepos.length > 0) {
      setSelectedRepoFullName(selectedRepos[0].fullName);
    }
  }, [selectedRepos, selectedRepoFullName]);
  const activeRepoRuns = selectedRepoFullName ? runsByRepo[selectedRepoFullName] || [] : [];
  const handleOpenUrl = (url) => {
    openInBrowser(url);
  };
  const getStatusColor = (status, conclusion) => {
    if (status === "in_progress" || status === "queued" || status === "running")
      return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    if (conclusion === "success")
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    if (conclusion === "failure")
      return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    return "bg-white/5 text-white/40 border border-white/10";
  };
  if (selectedRepos.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center h-full text-white/30 text-xs gap-1.5", children: [
      /* @__PURE__ */ jsx("p", { children: "No repositories selected for monitoring." }),
      /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-white/20", children: [
        "Configure them in settings (Plugins ",
        "=>",
        " GitHub ",
        "=>",
        " Configure)."
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[160px_1fr] h-full gap-3 overflow-hidden text-white", children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "flex flex-col gap-1 overflow-y-auto border-r border-white/[0.06] pr-2",
        style: {
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255, 255, 255, 0.12) transparent"
        },
        children: [
          /* @__PURE__ */ jsx("span", { className: "text-[9px] font-bold text-white/30 uppercase px-2 mb-1", children: "Monitored Repos" }),
          selectedRepos.map((repo) => {
            const repoRuns = runsByRepo[repo.fullName] || [];
            const hasActive = repoRuns.some(
              (r) => r.status === "in_progress" || r.status === "queued" || r.status === "running"
            );
            const completedRuns = repoRuns.filter(
              (r) => r.status !== "in_progress" && r.status !== "queued" && r.status !== "running"
            );
            const hasFailed = completedRuns[0]?.conclusion === "failure";
            let statusDotColor = "bg-white/20";
            if (hasActive) statusDotColor = "bg-blue-400 animate-pulse";
            else if (hasFailed) statusDotColor = "bg-rose-500 animate-pulse";
            else if (repoRuns.length > 0) statusDotColor = "bg-emerald-500";
            return /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => setSelectedRepoFullName(repo.fullName),
                className: `flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors focus:outline-none ${selectedRepoFullName === repo.fullName ? "bg-white/[0.08] text-white font-semibold" : "text-white/50 hover:bg-white/[0.04]"}`,
                children: [
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: `w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColor}`
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: "flex flex-col min-w-0 leading-tight", children: [
                    /* @__PURE__ */ jsx("span", { className: "truncate", children: repo.fullName.split("/")[1] || repo.fullName }),
                    /* @__PURE__ */ jsx("span", { className: "text-[9px] text-white/30 truncate", children: repo.fullName.split("/")[0] || "" })
                  ] })
                ]
              },
              repo.fullName
            );
          })
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "flex flex-col gap-2 overflow-y-auto pr-1",
        style: {
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255, 255, 255, 0.12) transparent"
        },
        children: selectedRepoFullName ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { className: "text-[9px] font-bold text-white/30 uppercase mb-1", children: "Recent Workflow Runs" }),
          activeRepoRuns.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-xs text-white/30 mt-4 text-center", children: "No runs found for this repository." }) : activeRepoRuns.map((run) => {
            return /* @__PURE__ */ jsxs(
              "div",
              {
                onClick: () => handleOpenUrl(run.htmlUrl),
                className: "bg-[#2c2c2e]/40 hover:bg-[#2c2c2e]/60 border border-white/[0.04] hover:border-white/[0.08] p-3 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all active:scale-[0.98]",
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex flex-col min-w-0 gap-0.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-white truncate", children: run.commitMessage || "No commit message" }),
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-[10px] text-white/40", children: [
                      /* @__PURE__ */ jsx("span", { className: "font-mono", children: run.branch }),
                      /* @__PURE__ */ jsx("span", { children: "by" }),
                      /* @__PURE__ */ jsx("span", { className: "font-semibold", children: run.author })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusColor(run.status, run.conclusion)}`,
                      children: run.status === "in_progress" || run.status === "running" ? "Running" : run.conclusion || run.status
                    }
                  )
                ]
              },
              run.id
            );
          })
        ] }) : /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-full text-white/20 text-xs", children: "Select a repository to view runs." })
      }
    )
  ] });
}
export {
  Expanded as default
};
