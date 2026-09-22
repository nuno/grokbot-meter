import { Activity } from "react";
import "./App.css";
import { AppHeader } from "./components/AppHeader";
import { AppFooter } from "./components/AppFooter";
import { WeeklyCard } from "./components/WeeklyCard";
import { TodayCard } from "./components/TodayCard";
import { AboutPanel } from "./components/AboutPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { useGrokPolling } from "./hooks/useGrokPolling";
import { usePanelController } from "./hooks/useAbout";
import { usePanelHeight } from "./hooks/usePanelHeight";
import { useShowWeeklyTrend } from "./hooks/useLocalPref";
import { useWeeklyPctHistory } from "./hooks/useWeeklyPctHistory";
import { hideWindow } from "./lib/api";
import { selectAgents, selectIsLoading, selectTodayStats } from "./lib/grok";
import { PREVIEW_LONG_AGENT_LIST, previewPadAgents, previewWeeklyWithOnDemand } from "./lib/previewMocks";

export default function App() {
  const { mode, openAbout, openSettings, close, resetOnHide, quit } = usePanelController();
  const { status, weekly, weeklyUpdatedAt, error, refreshing, refresh } = useGrokPolling(resetOnHide);
  const { show: showWeeklyTrend } = useShowWeeklyTrend();
  const livePct = typeof weekly?.usagePercent === "number" ? weekly.usagePercent : null;
  const trendPoints = useWeeklyPctHistory(weeklyUpdatedAt, livePct);

  const liveAgents = selectAgents(status);
  const liveStats = selectTodayStats(status);
  const preview = PREVIEW_LONG_AGENT_LIST ? previewPadAgents(liveAgents) : null;
  const agents = preview?.agents ?? liveAgents;
  const todayMessageCount = preview?.todayMessageCount ?? liveStats.todayMessageCount;
  const todayAgentCount = preview?.todayAgentCount ?? liveStats.todayAgentCount;
  // Local mock only — never enables on-demand on the account.
  const weeklyForUi = previewWeeklyWithOnDemand(weekly);
  const isLoading = selectIsLoading(status, error);
  usePanelHeight(mode, [
    agents.length,
    todayMessageCount,
    todayAgentCount,
    Boolean(weeklyForUi),
    Boolean(error),
    showWeeklyTrend,
    trendPoints.length,
  ]);

  return (
    <>
      <Activity mode={mode === "main" ? "visible" : "hidden"}>
        <div className="panel">
          <AppHeader onClose={hideWindow} onSettings={openSettings} />
          <WeeklyCard
            weekly={weeklyForUi}
            updatedAt={weeklyUpdatedAt}
            trendPoints={trendPoints}
            showTrend={showWeeklyTrend}
            isLoading={weeklyForUi == null}
          />
          <TodayCard
            agents={agents}
            todayMessageCount={todayMessageCount}
            todayAgentCount={todayAgentCount}
            isLoading={isLoading}
            error={error}
          />
          <AppFooter onAbout={openAbout} onRefresh={() => void refresh()} onQuit={quit} refreshing={refreshing} />
        </div>
      </Activity>
      <Activity mode={mode === "about" ? "visible" : "hidden"}>
        <AboutPanel onBack={close} />
      </Activity>
      <Activity mode={mode === "settings" ? "visible" : "hidden"}>
        <SettingsPanel onBack={close} accountEmail={weeklyForUi?.accountEmail ?? null} />
      </Activity>
    </>
  );
}
