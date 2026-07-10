import { useState, useEffect, useRef } from "react";
import {
  usePluginState,
  getPluginState,
  pluginStateActions,
  secureStorage,
  fileStorage,
  oauth,
} from "@aeronotch/plugin-sdk";

interface Account {
  id: string;
  username: string;
  avatarUrl: string;
}

interface Repo {
  id: string | number;
  name: string;
  full_name: string;
}

interface SelectedRepo {
  fullName: string;
  accountId: string;
}

interface PluginState {
  accounts: Account[];
  selectedRepos: SelectedRepo[];
  refreshInterval: number;
  clientId: string;
}

interface DeviceCodeData {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval?: number;
}

interface Org {
  login: string;
  id: string | number;
}

const pluginId = "github-plugin";

const CustomCheckbox = ({ checked }: { checked: boolean }) => (
  <div
    className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-100 ${
      checked
        ? "bg-white border-white text-black"
        : "bg-transparent border-white/30"
    }`}
  >
    {checked && (
      <svg
        className="w-2.5 h-2.5 stroke-[3]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 12.75l6 6 9-13.5"
        />
      </svg>
    )}
  </div>
);

export default function Settings() {
  const state =
    usePluginState(pluginId) ||
    ({
      accounts: [],
      selectedRepos: [],
      refreshInterval: 60,
      clientId: "Iv23lihsnIKVszmrHOp7",
    } as PluginState);
  const [deviceCodeData, setDeviceCodeData] = useState<DeviceCodeData | null>(
    null,
  );
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"accounts" | "repos" | "settings">(
    "accounts",
  );

  const pollRef = useRef<(() => void) | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("personal");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const accounts = state.accounts || [];
  const selectedRepos = state.selectedRepos || [];
  const refreshInterval = state.refreshInterval || 60;
  const clientId = state.clientId || "Iv23lihsnIKVszmrHOp7";

  const [inputClientId, setInputClientId] = useState(clientId);
  const [tempSelectedRepos, setTempSelectedRepos] =
    useState<SelectedRepo[]>(selectedRepos);

  // Sync input and selected repos if store state loads/updates later
  useEffect(() => {
    if (state.clientId) {
      setInputClientId(state.clientId);
    }
  }, [state.clientId]);

  useEffect(() => {
    setTempSelectedRepos(state.selectedRepos || []);
  }, [state.selectedRepos]);

  // Clean up poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        pollRef.current();
      }
    };
  }, []);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const activeAccount =
    accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;

  const handleClientIdChange = async (newClientId: string) => {
    const currentState = getPluginState(pluginId) || {};
    const nextState = { ...currentState, clientId: newClientId };
    pluginStateActions.set(pluginId, nextState);
    await fileStorage.writeJson(pluginId, "settings.json", {
      accounts,
      selectedRepos,
      refreshInterval,
      clientId: newClientId,
    });
  };

  const pollForToken = (
    deviceCode: string,
    intervalSeconds: number,
    authClientId: string,
  ) => {
    let currentInterval = intervalSeconds;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const data = await oauth.pollAccessToken(authClientId, deviceCode);

        if (data.access_token) {
          await handleAuthSuccess(data.access_token);
        } else if (data.error === "authorization_pending") {
          timerId = setTimeout(poll, currentInterval * 1000);
        } else if (data.error === "slow_down") {
          currentInterval += 5;
          console.warn(
            "[GitHubPlugin] Polling too fast. Increasing interval to " +
              currentInterval +
              "s...",
          );
          timerId = setTimeout(poll, currentInterval * 1000);
        } else {
          setAuthError(
            "Authorization error: " +
              String(data.error_description || data.error),
          );
          setLoadingAuth(false);
          setDeviceCodeData(null);
        }
      } catch (e: any) {
        setAuthError("Polling error: " + String(e.message || e));
        setLoadingAuth(false);
        setDeviceCodeData(null);
      }
    };

    timerId = setTimeout(poll, currentInterval * 1000);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  };

  const handleAuthSuccess = async (token: string) => {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(
          `Profile fetch failed: ${res.status} ${res.statusText}`,
        );
      }
      const profile = await res.json();

      const newAccount: Account = {
        id: String(profile.id),
        username: profile.login,
        avatarUrl: profile.avatar_url,
      };

      await secureStorage.saveToken(newAccount.id, token);

      const nextAccounts = [
        ...accounts.filter((a) => a.id !== newAccount.id),
        newAccount,
      ];

      await fileStorage.writeJson(pluginId, "settings.json", {
        accounts: nextAccounts,
        selectedRepos,
        refreshInterval,
        clientId,
      });

      const currentState = getPluginState(pluginId) || {};
      const nextState = { ...currentState, accounts: nextAccounts };
      pluginStateActions.set(pluginId, nextState);

      setLoadingAuth(false);
      setDeviceCodeData(null);
    } catch (e: any) {
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
        "repo read:org",
      );
      setDeviceCodeData(data);

      pollRef.current = pollForToken(
        data.device_code,
        data.interval || 5,
        inputClientId,
      );
    } catch (e: any) {
      console.error(e);
      setAuthError(
        "Failed to initiate authentication: " + String(e.message || e),
      );
      setLoadingAuth(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    await secureStorage.deleteToken(accountId);
    const nextAccounts = accounts.filter((a) => a.id !== accountId);
    const nextSelectedRepos = selectedRepos.filter(
      (r) => r.accountId !== accountId,
    );

    const currentState = getPluginState(pluginId) || {};
    const nextState = {
      ...currentState,
      accounts: nextAccounts,
      selectedRepos: nextSelectedRepos,
    };
    pluginStateActions.set(pluginId, nextState);
    await fileStorage.writeJson(pluginId, "settings.json", {
      accounts: nextAccounts,
      selectedRepos: nextSelectedRepos,
      refreshInterval,
      clientId,
    });
  };

  const activeAccountId = activeAccount?.id;

  // Fetch Orgs when active account changes
  useEffect(() => {
    if (!activeAccountId) return;

    const fetchOrgs = async () => {
      try {
        const token = await secureStorage.getToken(activeAccountId);
        if (!token) return;

        const res = await fetch("https://api.github.com/user/orgs", {
          headers: { Authorization: `token ${token}` },
        });
        const data = await res.json();
        setOrgs([{ login: "personal", id: "personal" }, ...data]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchOrgs();
  }, [activeAccountId]);

  // Fetch Repos when active account or selected org changes
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
          headers: { Authorization: `token ${token}` },
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

  const toggleRepo = (repoFullName: string) => {
    if (!activeAccount) return;
    const isSelected = tempSelectedRepos.some(
      (r) => r.fullName === repoFullName,
    );
    const nextRepos = isSelected
      ? tempSelectedRepos.filter((r) => r.fullName !== repoFullName)
      : [
          ...tempSelectedRepos,
          { fullName: repoFullName, accountId: activeAccount.id },
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
        clientId,
      });
    }, 350);
  };

  const handleIntervalChange = async (interval: number) => {
    const currentState = getPluginState(pluginId) || {};
    const nextState = { ...currentState, refreshInterval: interval };
    pluginStateActions.set(pluginId, nextState);
    await fileStorage.writeJson(pluginId, "settings.json", {
      accounts,
      selectedRepos,
      refreshInterval: interval,
      clientId,
    });
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4 text-xs text-zinc-200">
      {/* Segmented Control Header */}
      <div className="flex p-0.5 bg-black/40 border border-white/10 rounded-lg select-none">
        {(["accounts", "repos", "settings"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1 rounded-md text-[11px] font-semibold tracking-wide transition-all duration-100 capitalize focus:outline-none text-center ${
                isActive
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab Panel: Accounts */}
      {activeTab === "accounts" && (
        <div className="flex flex-col gap-3">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4 w-full">
              <div className="flex flex-col gap-1 w-full max-w-xs">
                <span className="font-semibold text-white text-sm">
                  Connect GitHub Accounts
                </span>
                <span className="text-zinc-400 text-xs">
                  Authorize pipeline access for your repositories.
                </span>
              </div>

              {/* Client ID input */}
              <div className="flex flex-col gap-1.5 items-start w-full max-w-xs">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  GitHub App Client ID
                </span>
                <input
                  type="text"
                  value={inputClientId}
                  onChange={(e) => setInputClientId(e.target.value)}
                  onBlur={(e) => handleClientIdChange(e.target.value)}
                  placeholder="e.g. Iv23lihsnIKVszmrHOp7"
                  className="w-full bg-[#121214] border border-white/20 focus:border-white/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-white/20 transition-all duration-100"
                />
              </div>

              {!loadingAuth ? (
                <button
                  onClick={startDeviceFlow}
                  className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg font-semibold transition-all duration-100 w-full max-w-xs active:scale-[0.98] text-center"
                >
                  Connect Account
                </button>
              ) : (
                <div className="flex flex-col items-start gap-2 w-full max-w-xs py-2">
                  {deviceCodeData ? (
                    <>
                      <div className="text-zinc-400 text-xs">
                        Go to{" "}
                        <a
                          href={deviceCodeData.verification_uri}
                          target="_blank"
                          className="text-white font-semibold hover:underline"
                        >
                          {deviceCodeData.verification_uri}
                        </a>
                      </div>
                      <div className="text-zinc-400 text-xs">Enter code:</div>
                      <div className="text-base font-bold tracking-wider bg-white/10 px-4 py-1.5 rounded-lg border border-white/25 text-white w-full text-center">
                        {deviceCodeData.user_code}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                        <svg
                          className="w-3.5 h-3.5 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        <span>Waiting for authorization...</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-400 text-xs py-1">
                      <svg
                        className="w-3.5 h-3.5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <span>Requesting code...</span>
                    </div>
                  )}
                </div>
              )}

              {authError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 text-left w-full max-w-xs break-all mt-1">
                  {authError}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between gap-4 py-2 border-b border-white/10 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={acc.avatarUrl}
                      className="w-8 h-8 rounded-full border border-white/15"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-white text-sm">
                        {acc.username}
                      </span>
                      <span className="text-zinc-400 text-[10px]">
                        Account ID: {acc.id}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    className="text-red-400 hover:text-red-300 font-medium transition-colors text-xs"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Panel: Repos */}
      {activeTab === "repos" && (
        <div className="flex flex-col gap-3">
          {!activeAccount ? (
            <div className="text-center text-zinc-400 py-8">
              Please connect a GitHub account first.
            </div>
          ) : (
            <>
              {/* Select Active Account (if multiple exist) */}
              {accounts.length > 1 && (
                <div className="flex items-center gap-3 justify-between pb-2 border-b border-white/10">
                  <span className="text-zinc-300 font-medium">
                    Active Account
                  </span>
                  <div className="relative">
                    <select
                      value={selectedAccountId || (activeAccount?.id ?? "")}
                      onChange={(e) => {
                        setSelectedAccountId(e.target.value);
                        setSelectedOrg("personal");
                      }}
                      className="appearance-none bg-[#121214] border border-white/20 hover:border-white/40 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white outline-none transition-all duration-100"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.username}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Select Organization */}
              <div className="flex items-center gap-3 justify-between">
                <span className="text-zinc-300 font-medium">
                  Select Organization
                </span>
                <div className="relative">
                  <select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="appearance-none bg-[#121214] border border-white/20 hover:border-white/40 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white outline-none transition-all duration-100"
                  >
                    {orgs.map((o) => (
                      <option key={o.id} value={o.login}>
                        {o.login === "personal" ? "Personal Account" : o.login}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Search input with search icon */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories..."
                  className="w-full bg-[#121214] border border-white/20 hover:border-white/40 focus:border-white/60 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-white/20 transition-all duration-100"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Repos list with dividers */}
              <div className="flex flex-col max-h-[220px] overflow-y-auto bg-black/40 border border-white/10 rounded-lg divide-y divide-white/10">
                {loadingRepos ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-zinc-400">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>Fetching repositories...</span>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <span className="text-zinc-400 text-center py-8">
                    {searchQuery
                      ? "No matching repositories found."
                      : "No repositories found."}
                  </span>
                ) : (
                  filteredRepos.map((repo) => {
                    const isChecked = tempSelectedRepos.some(
                      (r) => r.fullName === repo.full_name,
                    );
                    const [owner, name] = repo.full_name.split("/");
                    return (
                      <div
                        key={repo.id}
                        onClick={() => toggleRepo(repo.full_name)}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-white/5 transition-all duration-100"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="truncate text-white font-medium">
                            {name}
                          </span>
                          <span className="text-[10px] text-zinc-400 truncate">
                            {owner}
                          </span>
                        </div>
                        <CustomCheckbox checked={isChecked} />
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Panel: Settings */}
      {activeTab === "settings" && (
        <div className="flex flex-col gap-4">
          {/* Refresh Frequency option */}
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/10">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-white">
                Refresh Frequency
              </span>
              <span className="text-[10px] text-zinc-400">
                How often the pipeline checks for updates.
              </span>
            </div>
            <div className="relative">
              <select
                value={refreshInterval}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                className="appearance-none bg-[#121214] border border-white/20 hover:border-white/40 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white outline-none transition-all duration-100"
              >
                {[15, 30, 60, 120, 300].map((val) => (
                  <option key={val} value={val}>
                    {val}s
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* GitHub Client ID field */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-white">
                GitHub App Client ID
              </span>
              <span className="text-[10px] text-zinc-400">
                OAuth Client ID used for connecting GitHub accounts.
              </span>
            </div>
            <input
              type="text"
              value={inputClientId}
              onChange={(e) => setInputClientId(e.target.value)}
              onBlur={(e) => handleClientIdChange(e.target.value)}
              placeholder="e.g. Iv23lihsnIKVszmrHOp7"
              className="w-full bg-[#121214] border border-white/20 focus:border-white/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-white/20 transition-all duration-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
