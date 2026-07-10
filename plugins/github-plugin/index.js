const sdk = window.WinotchSDK;
sdk.usePluginState;
const getPluginState = sdk.getPluginState;
const subscribePluginState = sdk.subscribePluginState;
const pluginStateActions = sdk.pluginStateActions;
const secureStorage = sdk.secureStorage;
const fileStorage = sdk.fileStorage;
sdk.oauth;
const getActiveTab = sdk.getActiveTab;
const isWindowFocused = sdk.isWindowFocused;
const subscribeActiveTab = sdk.subscribeActiveTab;
sdk.openInBrowser;
const pluginId = "github-plugin";
let timeoutId = null;
const etagCache = {};
async function init() {
  console.log("[GitHubPlugin] Background Entry script running...");
  let config = await fileStorage.readJson(pluginId, "settings.json");
  if (!config) {
    config = { accounts: [], selectedRepos: [], refreshInterval: 60, clientId: "Iv23lihsnIKVszmrHOp7" };
    await fileStorage.writeJson(pluginId, "settings.json", config);
  }
  pluginStateActions.set(pluginId, {
    accounts: config.accounts || [],
    selectedRepos: config.selectedRepos || [],
    refreshInterval: config.refreshInterval || 60,
    clientId: config.clientId || "Iv23lihsnIKVszmrHOp7",
    runs: []
  });
  startPollingLoop();
  let prevReposKey = JSON.stringify(
    (config.selectedRepos || []).map((r) => r.fullName).sort()
  );
  let debounceTimeoutId = null;
  subscribePluginState(pluginId, (newState) => {
    if (!newState) return;
    const nextRepos = newState.selectedRepos || [];
    const nextReposKey = JSON.stringify(nextRepos.map((r) => r.fullName).sort());
    if (nextReposKey !== prevReposKey) {
      prevReposKey = nextReposKey;
      const nextRepoSet = new Set(nextRepos.map((r) => r.fullName));
      Object.keys(etagCache).forEach((repo) => {
        if (!nextRepoSet.has(repo)) delete etagCache[repo];
      });
      if (debounceTimeoutId) clearTimeout(debounceTimeoutId);
      debounceTimeoutId = setTimeout(() => {
        console.log("[GitHubPlugin] Selected repos changed, polling immediately...");
        startPollingLoop();
      }, 500);
    }
  });
  if (typeof window !== "undefined") {
    window.addEventListener("focus", () => {
      console.log("[GitHubPlugin] Window focused, polling immediately...");
      startPollingLoop();
    });
  }
  subscribeActiveTab((tabId) => {
    if (tabId === pluginId) {
      console.log("[GitHubPlugin] Tab switched to GitHub Actions, polling immediately...");
      startPollingLoop();
    }
  });
}
async function startPollingLoop() {
  if (timeoutId) clearTimeout(timeoutId);
  const poll = async () => {
    const freshState = getPluginState(pluginId);
    if (!freshState) return;
    const selectedRepos = freshState.selectedRepos || [];
    if (selectedRepos.length === 0) {
      pluginStateActions.merge(pluginId, { runs: [] });
      scheduleNext(6e4);
      return;
    }
    let hasActiveRuns = false;
    const promises = selectedRepos.map(async (repo) => {
      try {
        const token = await secureStorage.getToken(repo.accountId);
        if (!token) return null;
        const url = `https://api.github.com/repos/${repo.fullName}/actions/runs?per_page=5`;
        const headers = {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json"
        };
        const cachedEtag = etagCache[repo.fullName];
        if (cachedEtag) {
          headers["If-None-Match"] = cachedEtag;
        }
        const res = await fetch(url, { headers });
        if (res.status === 304) {
          const currentState = getPluginState(pluginId);
          const prevRuns = currentState?.runs || [];
          return prevRuns.filter((r) => r.repoFullName === repo.fullName);
        }
        if (res.status === 200) {
          const data = await res.json();
          const newEtag = res.headers.get("ETag");
          if (newEtag) {
            etagCache[repo.fullName] = newEtag;
          }
          const mappedRuns = (data.workflow_runs || []).map((run) => {
            if (run.status === "in_progress" || run.status === "queued" || run.status === "running") {
              hasActiveRuns = true;
            }
            return {
              id: run.id,
              repoFullName: repo.fullName,
              status: run.status,
              conclusion: run.conclusion,
              branch: run.head_branch,
              commitMessage: run.head_commit?.message,
              author: run.head_commit?.author?.name,
              htmlUrl: run.html_url,
              createdAt: run.created_at
            };
          });
          return mappedRuns;
        }
        return null;
      } catch (e) {
        console.error(`[GitHubPlugin] Polling failed for ${repo.fullName}:`, e);
        return null;
      }
    });
    const results = await Promise.all(promises);
    const allRuns = [];
    results.forEach((repoRuns) => {
      if (Array.isArray(repoRuns)) {
        allRuns.push(...repoRuns);
      }
    });
    pluginStateActions.merge(pluginId, { runs: allRuns });
    let nextInterval = (freshState.refreshInterval || 60) * 1e3;
    const activeTab = getActiveTab();
    const hasFocus = isWindowFocused();
    if (!hasFocus) {
      nextInterval = 6e4;
    } else if (activeTab === pluginId) {
      nextInterval = 5e3;
    } else if (hasActiveRuns) {
      nextInterval = 1e4;
    }
    scheduleNext(nextInterval);
  };
  const scheduleNext = (ms) => {
    timeoutId = setTimeout(poll, ms);
  };
  poll();
}
export {
  init as default
};
