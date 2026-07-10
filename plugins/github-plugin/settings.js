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
React.useMemo;
const useRef = React.useRef;
React.useCallback;
const sdk = window.WinotchSDK;
const usePluginState = sdk.usePluginState;
const getPluginState = sdk.getPluginState;
sdk.subscribePluginState;
const pluginStateActions = sdk.pluginStateActions;
const secureStorage = sdk.secureStorage;
const fileStorage = sdk.fileStorage;
const oauth = sdk.oauth;
sdk.getActiveTab;
sdk.isWindowFocused;
const pluginId = "github-plugin";
const CustomCheckbox = ({ checked }) => /* @__PURE__ */ jsx(
  "div",
  {
    className: `w-4 h-4 rounded flex items-center justify-center border transition-all duration-100 ${checked ? "bg-white border-white text-black" : "bg-transparent border-white/30"}`,
    children: checked && /* @__PURE__ */ jsx(
      "svg",
      {
        className: "w-2.5 h-2.5 stroke-[3]",
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        children: /* @__PURE__ */ jsx(
          "path",
          {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M4.5 12.75l6 6 9-13.5"
          }
        )
      }
    )
  }
);
function Settings() {
  const state = usePluginState(pluginId) || {
    accounts: [],
    selectedRepos: [],
    refreshInterval: 60,
    clientId: "Iv23lihsnIKVszmrHOp7"
  };
  const [deviceCodeData, setDeviceCodeData] = useState(
    null
  );
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [activeTab, setActiveTab] = useState(
    "accounts"
  );
  const pollRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("personal");
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const accounts = state.accounts || [];
  const selectedRepos = state.selectedRepos || [];
  const refreshInterval = state.refreshInterval || 60;
  const clientId = state.clientId || "Iv23lihsnIKVszmrHOp7";
  const [inputClientId, setInputClientId] = useState(clientId);
  const [tempSelectedRepos, setTempSelectedRepos] = useState(selectedRepos);
  useEffect(() => {
    if (state.clientId) {
      setInputClientId(state.clientId);
    }
  }, [state.clientId]);
  useEffect(() => {
    setTempSelectedRepos(state.selectedRepos || []);
  }, [state.selectedRepos]);
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        pollRef.current();
      }
    };
  }, []);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);
  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;
  const handleClientIdChange = async (newClientId) => {
    const currentState = getPluginState(pluginId) || {};
    const nextState = { ...currentState, clientId: newClientId };
    pluginStateActions.set(pluginId, nextState);
    await fileStorage.writeJson(pluginId, "settings.json", {
      accounts,
      selectedRepos,
      refreshInterval,
      clientId: newClientId
    });
  };
  const pollForToken = (deviceCode, intervalSeconds, authClientId) => {
    let currentInterval = intervalSeconds;
    let timerId = null;
    const poll = async () => {
      try {
        const data = await oauth.pollAccessToken(authClientId, deviceCode);
        if (data.access_token) {
          await handleAuthSuccess(data.access_token);
        } else if (data.error === "authorization_pending") {
          timerId = setTimeout(poll, currentInterval * 1e3);
        } else if (data.error === "slow_down") {
          currentInterval += 5;
          console.warn(
            "[GitHubPlugin] Polling too fast. Increasing interval to " + currentInterval + "s..."
          );
          timerId = setTimeout(poll, currentInterval * 1e3);
        } else {
          setAuthError(
            "Authorization error: " + String(data.error_description || data.error)
          );
          setLoadingAuth(false);
          setDeviceCodeData(null);
        }
      } catch (e) {
        setAuthError("Polling error: " + String(e.message || e));
        setLoadingAuth(false);
        setDeviceCodeData(null);
      }
    };
    timerId = setTimeout(poll, currentInterval * 1e3);
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  };
  const handleAuthSuccess = async (token) => {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(
          `Profile fetch failed: ${res.status} ${res.statusText}`
        );
      }
      const profile = await res.json();
      const newAccount = {
        id: String(profile.id),
        username: profile.login,
        avatarUrl: profile.avatar_url
      };
      await secureStorage.saveToken(newAccount.id, token);
      const nextAccounts = [
        ...accounts.filter((a) => a.id !== newAccount.id),
        newAccount
      ];
      await fileStorage.writeJson(pluginId, "settings.json", {
        accounts: nextAccounts,
        selectedRepos,
        refreshInterval,
        clientId
      });
      const currentState = getPluginState(pluginId) || {};
      const nextState = { ...currentState, accounts: nextAccounts };
      pluginStateActions.set(pluginId, nextState);
      setLoadingAuth(false);
      setDeviceCodeData(null);
    } catch (e) {
      console.error(e);
      setAuthError("Failed to save account: " + String(e.message || e));
      setLoadingAuth(false);
    }
  };
  const startDeviceFlow = async () => {
    if (pollRef.current) {
      pollRef.current();
      pollRef.current = null;
    }
    setLoadingAuth(true);
    setDeviceCodeData(null);
    setAuthError(null);
    try {
      await handleClientIdChange(inputClientId);
      const data = await oauth.requestDeviceCode(
        inputClientId,
        "repo read:org"
      );
      setDeviceCodeData(data);
      pollRef.current = pollForToken(
        data.device_code,
        data.interval || 5,
        inputClientId
      );
    } catch (e) {
      console.error(e);
      setAuthError(
        "Failed to initiate authentication: " + String(e.message || e)
      );
      setLoadingAuth(false);
    }
  };
  const handleDisconnect = async (accountId) => {
    await secureStorage.deleteToken(accountId);
    const nextAccounts = accounts.filter((a) => a.id !== accountId);
    const nextSelectedRepos = selectedRepos.filter(
      (r) => r.accountId !== accountId
    );
    const currentState = getPluginState(pluginId) || {};
    const nextState = {
      ...currentState,
      accounts: nextAccounts,
      selectedRepos: nextSelectedRepos
    };
    pluginStateActions.set(pluginId, nextState);
    await fileStorage.writeJson(pluginId, "settings.json", {
      accounts: nextAccounts,
      selectedRepos: nextSelectedRepos,
      refreshInterval,
      clientId
    });
  };
  const activeAccountId = activeAccount?.id;
  useEffect(() => {
    if (!activeAccountId) return;
    const fetchOrgs = async () => {
      try {
        const token = await secureStorage.getToken(activeAccountId);
        if (!token) return;
        const res = await fetch("https://api.github.com/user/orgs", {
          headers: { Authorization: `token ${token}` }
        });
        const data = await res.json();
        setOrgs([{ login: "personal", id: "personal" }, ...data]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchOrgs();
  }, [activeAccountId]);
  useEffect(() => {
    if (!activeAccountId) return;
    const fetchRepos = async () => {
      setLoadingRepos(true);
      try {
        const token = await secureStorage.getToken(activeAccountId);
        if (!token) return;
        let url = "https://api.github.com/user/repos?per_page=100";
        if (selectedOrg !== "personal") {
          url = `https://api.github.com/orgs/${selectedOrg}/repos?per_page=100`;
        }
        const res = await fetch(url, {
          headers: { Authorization: `token ${token}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setRepos(data);
        } else {
          setRepos([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingRepos(false);
      }
    };
    fetchRepos();
  }, [activeAccountId, selectedOrg]);
  const toggleRepo = (repoFullName) => {
    if (!activeAccount) return;
    const isSelected = tempSelectedRepos.some(
      (r) => r.fullName === repoFullName
    );
    const nextRepos = isSelected ? tempSelectedRepos.filter((r) => r.fullName !== repoFullName) : [
      ...tempSelectedRepos,
      { fullName: repoFullName, accountId: activeAccount.id }
    ];
    setTempSelectedRepos(nextRepos);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      const currentState = getPluginState(pluginId) || {};
      const nextState = { ...currentState, selectedRepos: nextRepos };
      pluginStateActions.set(pluginId, nextState);
      await fileStorage.writeJson(pluginId, "settings.json", {
        accounts,
        selectedRepos: nextRepos,
        refreshInterval,
        clientId
      });
    }, 350);
  };
  const handleIntervalChange = async (interval) => {
    const currentState = getPluginState(pluginId) || {};
    const nextState = { ...currentState, refreshInterval: interval };
    pluginStateActions.set(pluginId, nextState);
    await fileStorage.writeJson(pluginId, "settings.json", {
      accounts,
      selectedRepos,
      refreshInterval: interval,
      clientId
    });
  };
  const filteredRepos = repos.filter(
    (r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 text-xs text-zinc-200", children: [
    /* @__PURE__ */ jsx("div", { className: "flex p-0.5 bg-black/40 border border-white/10 rounded-lg select-none", children: ["accounts", "repos", "settings"].map((tab) => {
      const isActive = activeTab === tab;
      return /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setActiveTab(tab),
          className: `flex-1 py-1 rounded-md text-[11px] font-semibold tracking-wide transition-all duration-100 capitalize focus:outline-none text-center ${isActive ? "bg-white/10 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`,
          children: tab
        },
        tab
      );
    }) }),
    activeTab === "accounts" && /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-3", children: accounts.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center gap-4 py-4 w-full", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 w-full max-w-xs", children: [
        /* @__PURE__ */ jsx("span", { className: "font-semibold text-white text-sm", children: "Connect GitHub Accounts" }),
        /* @__PURE__ */ jsx("span", { className: "text-zinc-400 text-xs", children: "Authorize pipeline access for your repositories." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5 items-start w-full max-w-xs", children: [
        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-zinc-400 font-bold uppercase tracking-wider", children: "GitHub App Client ID" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: inputClientId,
            onChange: (e) => setInputClientId(e.target.value),
            onBlur: (e) => handleClientIdChange(e.target.value),
            placeholder: "e.g. Iv23lihsnIKVszmrHOp7",
            className: "w-full bg-[#121214] border border-white/20 focus:border-white/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-white/20 transition-all duration-100"
          }
        )
      ] }),
      !loadingAuth ? /* @__PURE__ */ jsx(
        "button",
        {
          onClick: startDeviceFlow,
          className: "bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg font-semibold transition-all duration-100 w-full max-w-xs active:scale-[0.98] text-center",
          children: "Connect Account"
        }
      ) : /* @__PURE__ */ jsx("div", { className: "flex flex-col items-start gap-2 w-full max-w-xs py-2", children: deviceCodeData ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "text-zinc-400 text-xs", children: [
          "Go to",
          " ",
          /* @__PURE__ */ jsx(
            "a",
            {
              href: deviceCodeData.verification_uri,
              target: "_blank",
              className: "text-white font-semibold hover:underline",
              children: deviceCodeData.verification_uri
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-zinc-400 text-xs", children: "Enter code:" }),
        /* @__PURE__ */ jsx("div", { className: "text-base font-bold tracking-wider bg-white/10 px-4 py-1.5 rounded-lg border border-white/25 text-white w-full text-center", children: deviceCodeData.user_code }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-[10px] text-zinc-400 mt-1", children: [
          /* @__PURE__ */ jsxs(
            "svg",
            {
              className: "w-3.5 h-3.5 animate-spin",
              fill: "none",
              viewBox: "0 0 24 24",
              children: [
                /* @__PURE__ */ jsx(
                  "circle",
                  {
                    className: "opacity-25",
                    cx: "12",
                    cy: "12",
                    r: "10",
                    stroke: "currentColor",
                    strokeWidth: "4"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "path",
                  {
                    className: "opacity-75",
                    fill: "currentColor",
                    d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsx("span", { children: "Waiting for authorization..." })
        ] })
      ] }) : /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-zinc-400 text-xs py-1", children: [
        /* @__PURE__ */ jsxs(
          "svg",
          {
            className: "w-3.5 h-3.5 animate-spin",
            fill: "none",
            viewBox: "0 0 24 24",
            children: [
              /* @__PURE__ */ jsx(
                "circle",
                {
                  className: "opacity-25",
                  cx: "12",
                  cy: "12",
                  r: "10",
                  stroke: "currentColor",
                  strokeWidth: "4"
                }
              ),
              /* @__PURE__ */ jsx(
                "path",
                {
                  className: "opacity-75",
                  fill: "currentColor",
                  d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx("span", { children: "Requesting code..." })
      ] }) }),
      authError && /* @__PURE__ */ jsx("div", { className: "p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 text-left w-full max-w-xs break-all mt-1", children: authError })
    ] }) : /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2.5", children: accounts.map((acc) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: "flex items-center justify-between gap-4 py-2 border-b border-white/10 last:border-b-0",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                src: acc.avatarUrl,
                className: "w-8 h-8 rounded-full border border-white/15"
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-white text-sm", children: acc.username }),
              /* @__PURE__ */ jsxs("span", { className: "text-zinc-400 text-[10px]", children: [
                "Account ID: ",
                acc.id
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => handleDisconnect(acc.id),
              className: "text-red-400 hover:text-red-300 font-medium transition-colors text-xs",
              children: "Disconnect"
            }
          )
        ]
      },
      acc.id
    )) }) }),
    activeTab === "repos" && /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-3", children: !activeAccount ? /* @__PURE__ */ jsx("div", { className: "text-center text-zinc-400 py-8", children: "Please connect a GitHub account first." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      accounts.length > 1 && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 justify-between pb-2 border-b border-white/10", children: [
        /* @__PURE__ */ jsx("span", { className: "text-zinc-300 font-medium", children: "Active Account" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            "select",
            {
              value: selectedAccountId || (activeAccount?.id ?? ""),
              onChange: (e) => {
                setSelectedAccountId(e.target.value);
                setSelectedOrg("personal");
              },
              className: "appearance-none bg-[#121214] border border-white/20 hover:border-white/40 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white outline-none transition-all duration-100",
              children: accounts.map((acc) => /* @__PURE__ */ jsx("option", { value: acc.id, children: acc.username }, acc.id))
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400", children: /* @__PURE__ */ jsx(
            "svg",
            {
              className: "w-3.5 h-3.5",
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              children: /* @__PURE__ */ jsx(
                "path",
                {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: "2",
                  d: "M19.5 8.25l-7.5 7.5-7.5-7.5"
                }
              )
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 justify-between", children: [
        /* @__PURE__ */ jsx("span", { className: "text-zinc-300 font-medium", children: "Select Organization" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            "select",
            {
              value: selectedOrg,
              onChange: (e) => setSelectedOrg(e.target.value),
              className: "appearance-none bg-[#121214] border border-white/20 hover:border-white/40 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white outline-none transition-all duration-100",
              children: orgs.map((o) => /* @__PURE__ */ jsx("option", { value: o.login, children: o.login === "personal" ? "Personal Account" : o.login }, o.id))
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400", children: /* @__PURE__ */ jsx(
            "svg",
            {
              className: "w-3.5 h-3.5",
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              children: /* @__PURE__ */ jsx(
                "path",
                {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: "2",
                  d: "M19.5 8.25l-7.5 7.5-7.5-7.5"
                }
              )
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: "Search repositories...",
            className: "w-full bg-[#121214] border border-white/20 hover:border-white/40 focus:border-white/60 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-white/20 transition-all duration-100"
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400", children: /* @__PURE__ */ jsx(
          "svg",
          {
            className: "w-3.5 h-3.5",
            fill: "none",
            viewBox: "0 0 24 24",
            stroke: "currentColor",
            children: /* @__PURE__ */ jsx(
              "path",
              {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: "2",
                d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              }
            )
          }
        ) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-col max-h-[220px] overflow-y-auto bg-black/40 border border-white/10 rounded-lg divide-y divide-white/10", children: loadingRepos ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2 py-8 text-zinc-400", children: [
        /* @__PURE__ */ jsxs(
          "svg",
          {
            className: "w-4 h-4 animate-spin",
            fill: "none",
            viewBox: "0 0 24 24",
            children: [
              /* @__PURE__ */ jsx(
                "circle",
                {
                  className: "opacity-25",
                  cx: "12",
                  cy: "12",
                  r: "10",
                  stroke: "currentColor",
                  strokeWidth: "4"
                }
              ),
              /* @__PURE__ */ jsx(
                "path",
                {
                  className: "opacity-75",
                  fill: "currentColor",
                  d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx("span", { children: "Fetching repositories..." })
      ] }) : filteredRepos.length === 0 ? /* @__PURE__ */ jsx("span", { className: "text-zinc-400 text-center py-8", children: searchQuery ? "No matching repositories found." : "No repositories found." }) : filteredRepos.map((repo) => {
        const isChecked = tempSelectedRepos.some(
          (r) => r.fullName === repo.full_name
        );
        const [owner, name] = repo.full_name.split("/");
        return /* @__PURE__ */ jsxs(
          "div",
          {
            onClick: () => toggleRepo(repo.full_name),
            className: "flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-white/5 transition-all duration-100",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5 min-w-0", children: [
                /* @__PURE__ */ jsx("span", { className: "truncate text-white font-medium", children: name }),
                /* @__PURE__ */ jsx("span", { className: "text-[10px] text-zinc-400 truncate", children: owner })
              ] }),
              /* @__PURE__ */ jsx(CustomCheckbox, { checked: isChecked })
            ]
          },
          repo.id
        );
      }) })
    ] }) }),
    activeTab === "settings" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4 pb-3 border-b border-white/10", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: "Refresh Frequency" }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] text-zinc-400", children: "How often the pipeline checks for updates." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            "select",
            {
              value: refreshInterval,
              onChange: (e) => handleIntervalChange(Number(e.target.value)),
              className: "appearance-none bg-[#121214] border border-white/20 hover:border-white/40 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white outline-none transition-all duration-100",
              children: [15, 30, 60, 120, 300].map((val) => /* @__PURE__ */ jsxs("option", { value: val, children: [
                val,
                "s"
              ] }, val))
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400", children: /* @__PURE__ */ jsx(
            "svg",
            {
              className: "w-3.5 h-3.5",
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              children: /* @__PURE__ */ jsx(
                "path",
                {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: "2",
                  d: "M19.5 8.25l-7.5 7.5-7.5-7.5"
                }
              )
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: "GitHub App Client ID" }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] text-zinc-400", children: "OAuth Client ID used for connecting GitHub accounts." })
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: inputClientId,
            onChange: (e) => setInputClientId(e.target.value),
            onBlur: (e) => handleClientIdChange(e.target.value),
            placeholder: "e.g. Iv23lihsnIKVszmrHOp7",
            className: "w-full bg-[#121214] border border-white/20 focus:border-white/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-white/20 transition-all duration-100"
          }
        )
      ] })
    ] })
  ] });
}
export {
  Settings as default
};
