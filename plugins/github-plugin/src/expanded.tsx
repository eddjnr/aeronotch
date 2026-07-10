import { useState, useEffect, useMemo } from "react";
import { usePluginState } from "@aeronotch/plugin-sdk";

interface Run {
  id: number;
  repoFullName: string;
  status: string;
  conclusion: string | null;
  branch: string;
  commitMessage: string | null;
  author: string | null;
  htmlUrl: string;
  createdAt: string;
}

interface SelectedRepo {
  fullName: string;
  accountId: string;
}

interface PluginState {
  runs: Run[];
  selectedRepos: SelectedRepo[];
}

export default function Expanded() {
  const state: PluginState = usePluginState("github-plugin") || {
    runs: [],
    selectedRepos: [],
  };
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<
    string | null
  >(null);

  const runs = state.runs || [];
  const selectedRepos = state.selectedRepos || [];

  // Group runs by repository
  const runsByRepo = useMemo(() => {
    const map: Record<string, Run[]> = {};
    runs.forEach((run) => {
      if (!map[run.repoFullName]) {
        map[run.repoFullName] = [];
      }
      map[run.repoFullName].push(run);
    });
    return map;
  }, [runs]);

  // Set initial selected repo if none selected
  useEffect(() => {
    if (!selectedRepoFullName && selectedRepos.length > 0) {
      setSelectedRepoFullName(selectedRepos[0].fullName);
    }
  }, [selectedRepos, selectedRepoFullName]);

  const activeRepoRuns = selectedRepoFullName
    ? runsByRepo[selectedRepoFullName] || []
    : [];

  const handleOpenUrl = (url: string) => {
    // @ts-ignore
    const opener = window.__TAURI__?.opener;
    if (opener?.openUrl) {
      opener.openUrl(url).catch(console.error);
    } else {
      window.open(url, "_blank");
    }
  };

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === "in_progress" || status === "queued" || status === "running")
      return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    if (conclusion === "success")
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    if (conclusion === "failure")
      return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    return "bg-white/5 text-white/40 border border-white/10";
  };

  if (selectedRepos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/30 text-xs gap-1.5">
        <p>No repositories selected for monitoring.</p>
        <p className="text-[10px] text-white/20">
          Configure them in settings (Plugins {"=>"} GitHub {"=>"} Configure).
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[160px_1fr] h-full gap-3 overflow-hidden text-white">
      {/* Left: Repo List */}
      <div className="flex flex-col gap-1 overflow-y-auto border-r border-white/[0.06] pr-2 scrollbar-none">
        <span className="text-[9px] font-bold text-white/30 uppercase px-2 mb-1">
          Monitored Repos
        </span>
        {selectedRepos.map((repo) => {
          const repoRuns = runsByRepo[repo.fullName] || [];
          const hasActive = repoRuns.some(
            (r) =>
              r.status === "in_progress" ||
              r.status === "queued" ||
              r.status === "running",
          );
          const hasFailed = repoRuns.some((r) => r.conclusion === "failure");

          let statusDotColor = "bg-white/20";
          if (hasActive) statusDotColor = "bg-blue-400 animate-pulse";
          else if (hasFailed) statusDotColor = "bg-rose-500 animate-pulse";
          else if (repoRuns.length > 0) statusDotColor = "bg-emerald-500";

          return (
            <button
              key={repo.fullName}
              onClick={() => setSelectedRepoFullName(repo.fullName)}
              className={`flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors focus:outline-none cursor-pointer ${
                selectedRepoFullName === repo.fullName
                  ? "bg-white/[0.08] text-white font-semibold"
                  : "text-white/50 hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColor}`}
              />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="truncate">
                  {repo.fullName.split("/")[1] || repo.fullName}
                </span>
                <span className="text-[9px] text-white/30 truncate">
                  {repo.fullName.split("/")[0] || ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right: Runs list for selected repo */}
      <div className="flex flex-col gap-2 overflow-y-auto pr-1">
        {selectedRepoFullName ? (
          <>
            <span className="text-[9px] font-bold text-white/30 uppercase mb-1">
              Recent Workflow Runs
            </span>
            {activeRepoRuns.length === 0 ? (
              <div className="text-xs text-white/30 mt-4 text-center">
                No runs found for this repository.
              </div>
            ) : (
              activeRepoRuns.map((run) => {
                return (
                  <div
                    key={run.id}
                    onClick={() => handleOpenUrl(run.htmlUrl)}
                    className="bg-[#2c2c2e]/40 hover:bg-[#2c2c2e]/60 border border-white/[0.04] hover:border-white/[0.08] p-3 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <span className="text-xs font-semibold text-white truncate">
                        {run.commitMessage || "No commit message"}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                        <span className="font-mono">{run.branch}</span>
                        <span>by</span>
                        <span className="font-semibold">{run.author}</span>
                      </div>
                    </div>
                    <div
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusColor(run.status, run.conclusion)}`}
                    >
                      {run.status === "in_progress" || run.status === "running"
                        ? "Running"
                        : run.conclusion || run.status}
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-white/20 text-xs">
            Select a repository to view runs.
          </div>
        )}
      </div>
    </div>
  );
}
