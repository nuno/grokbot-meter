import { Activity } from "react";
import "./App.css";
import { AppHeader } from "./components/AppHeader";
import { AppFooter } from "./components/AppFooter";
import { WeeklyCard } from "./components/WeeklyCard";
import { TodayCard } from "./components/TodayCard";
import { AboutPanel } from "./components/AboutPanel";
import { useGrokPolling } from "./hooks/useGrokPolling";
import { useAboutController } from "./hooks/useAbout";
import { selectAgents, selectIsLoading, selectTodayStats } from "./lib/grok";

export default function App() {
  const { about, open, close, resetOnHide, quit } = useAboutController();
  const { status, weekly, error } = useGrokPolling(resetOnHide);

  const agents = selectAgents(status);
  const { todayMessageCount, todayAgentCount } = selectTodayStats(status);
  const isLoading = selectIsLoading(status, error);

  // Activity keeps both trees mounted and preserves WeeklyCard/TodayCard state
  // when toggling About. AboutPanel is stateless, but this avoids remount
  // cost and keeps scroll position. Hidden tree is display:none.
  return (
    <>
      <Activity mode={about ? "hidden" : "visible"}>
        <div className="panel">
          <AppHeader />
          <WeeklyCard weekly={weekly} />
          <TodayCard
            agents={agents}
            todayMessageCount={todayMessageCount}
            todayAgentCount={todayAgentCount}
            isLoading={isLoading}
            error={error}
          />
          <AppFooter onAbout={open} onQuit={quit} />
        </div>
      </Activity>
      <Activity mode={about ? "visible" : "hidden"}>
        <AboutPanel onBack={close} />
      </Activity>
    </>
  );
}
