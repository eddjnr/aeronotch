import {
  getPluginState,
  pluginStateActions,
  secureStorage,
  fileStorage,
  subscribePluginState,
  getActiveTab,
  isWindowFocused,
  subscribeActiveTab,
} from '@aeronotch/plugin-sdk';

const pluginId = 'github-plugin';

interface SelectedRepo {
  fullName: string;
  accountId: string;
}

interface PluginConfig {
  accounts: unknown[];
  selectedRepos: SelectedRepo[];
  refreshInterval: number;
  clientId: string;
}

// Polling Scheduler State
let timeoutId: ReturnType<typeof setTimeout> | null = null;
const etagCache: Record<string, string> = {};

export default async function init(): Promise<void> {
  console.log('[GitHubPlugin] Background Entry script running...');

  // 1. Load initial settings
  let config = await fileStorage.readJson<PluginConfig>(pluginId, 'settings.json');
  if (!config) {
    config = { accounts: [], selectedRepos: [], refreshInterval: 60, clientId: 'Iv23lihsnIKVszmrHOp7' };
    await fileStorage.writeJson(pluginId, 'settings.json', config);
  }

  // Register in memory store
  pluginStateActions.set(pluginId, {
    accounts: config.accounts || [],
    selectedRepos: config.selectedRepos || [],
    refreshInterval: config.refreshInterval || 60,
    clientId: config.clientId || 'Iv23lihsnIKVszmrHOp7',
    runs: [],
  });

  // Start polling scheduler
  startPollingLoop();

  // Subscribe to state changes to trigger immediate poll when selectedRepos changes (debounced)
  let prevReposKey = JSON.stringify(
    (config.selectedRepos || []).map((r) => r.fullName).sort()
  );
  let debounceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  subscribePluginState(pluginId, (newState: any) => {
    if (!newState) return;
    const nextRepos: SelectedRepo[] = newState.selectedRepos || [];
    const nextReposKey = JSON.stringify(nextRepos.map((r) => r.fullName).sort());

    if (nextReposKey !== prevReposKey) {
      prevReposKey = nextReposKey;

      // Clear ETag cache for repos that are no longer monitored
      const nextRepoSet = new Set(nextRepos.map((r) => r.fullName));
      Object.keys(etagCache).forEach((repo) => {
        if (!nextRepoSet.has(repo)) delete etagCache[repo];
      });

      if (debounceTimeoutId) clearTimeout(debounceTimeoutId);
      debounceTimeoutId = setTimeout(() => {
        console.log('[GitHubPlugin] Selected repos changed, polling immediately...');
        startPollingLoop();
      }, 500);
    }
  });

  // Subscribe to window focus to poll immediately
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      console.log('[GitHubPlugin] Window focused, polling immediately...');
      startPollingLoop();
    });
  }

  // Subscribe to active tab changes to poll immediately when switched to GitHub Actions
  subscribeActiveTab((tabId) => {
    if (tabId === pluginId) {
      console.log('[GitHubPlugin] Tab switched to GitHub Actions, polling immediately...');
      startPollingLoop();
    }
  });
}

async function startPollingLoop(): Promise<void> {
  if (timeoutId) clearTimeout(timeoutId);

  const poll = async (): Promise<void> => {
    // Read fresh state every poll to avoid stale closure data
    const freshState = getPluginState<any>(pluginId);
    if (!freshState) return;

    const selectedRepos: SelectedRepo[] = freshState.selectedRepos || [];

    if (selectedRepos.length === 0) {
      pluginStateActions.merge(pluginId, { runs: [] });
      scheduleNext(60000);
      return;
    }

    let hasActiveRuns = false;

    const promises = selectedRepos.map(async (repo) => {
      try {
        const token = await secureStorage.getToken(repo.accountId);
        if (!token) return null;

        const url = `https://api.github.com/repos/${repo.fullName}/actions/runs?per_page=5`;
        const headers: Record<string, string> = {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        };

        const cachedEtag = etagCache[repo.fullName];
        if (cachedEtag) {
          headers['If-None-Match'] = cachedEtag;
        }

        const res = await fetch(url, { headers });

        if (res.status === 304) {
          const currentState = getPluginState<any>(pluginId);
          const prevRuns = currentState?.runs || [];
          return prevRuns.filter((r: any) => r.repoFullName === repo.fullName);
        }

        if (res.status === 200) {
          const data = await res.json();
          const newEtag = res.headers.get('ETag');
          if (newEtag) {
            etagCache[repo.fullName] = newEtag;
          }

          const mappedRuns = (data.workflow_runs || []).map((run: any) => {
            if (run.status === 'in_progress' || run.status === 'queued' || run.status === 'running') {
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
              createdAt: run.created_at,
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

    const allRuns: unknown[] = [];
    results.forEach((repoRuns) => {
      if (Array.isArray(repoRuns)) {
        allRuns.push(...repoRuns);
      }
    });

    pluginStateActions.merge(pluginId, { runs: allRuns });

    let nextInterval = (freshState.refreshInterval || 60) * 1000;

    const activeTab = getActiveTab();
    const hasFocus = isWindowFocused();

    if (!hasFocus) {
      nextInterval = 60000;
    } else if (activeTab === pluginId) {
      nextInterval = 5000;
    } else if (hasActiveRuns) {
      nextInterval = 10000;
    }

    scheduleNext(nextInterval);
  };

  const scheduleNext = (ms: number): void => {
    timeoutId = setTimeout(poll, ms);
  };

  poll();
}
