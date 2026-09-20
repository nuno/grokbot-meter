import { memo, useCallback, useEffect, useState } from "react";
import { fetchLoginItem, setLoginItem } from "../lib/api";
import { useRedactEmail, useShowOnDemand, useShowWeeklyTrend } from "../hooks/useLocalPref";

type Props = {
  onBack: () => void;
};

type ToggleProps = {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
};

const PrefToggle = memo(function PrefToggle({ id, label, hint, checked, disabled, onChange }: ToggleProps) {
  return (
    <div className="settings-row">
      <div className="settings-copy">
        <label className="settings-label" htmlFor={id}>
          {label}
        </label>
        {hint ? <p className="settings-hint">{hint}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        className={`settings-switch${checked ? " is-on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-switch-knob" aria-hidden="true" />
      </button>
    </div>
  );
});

export const SettingsPanel = memo(function SettingsPanel({ onBack }: Props) {
  const { redacted, setRedacted } = useRedactEmail();
  const { show: showOnDemand, setShow: setShowOnDemand } = useShowOnDemand();
  const { show: showWeeklyTrend, setShow: setShowWeeklyTrend } = useShowWeeklyTrend();
  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [loginSupported, setLoginSupported] = useState(false);
  const [loginReady, setLoginReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchLoginItem()
      .then((s) => {
        if (cancelled) return;
        setOpenAtLogin(s.openAtLogin);
        setLoginSupported(s.supported);
        setLoginReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoginSupported(false);
        setLoginReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onLoginToggle = useCallback(async (next: boolean) => {
    setOpenAtLogin(next);
    try {
      const s = await setLoginItem(next);
      setOpenAtLogin(s.openAtLogin);
      setLoginSupported(s.supported);
    } catch {
      setOpenAtLogin(!next);
    }
  }, []);

  return (
    <div className="panel">
      <header className="header header-row">
        <button type="button" className="back" onClick={onBack} title="Back (Esc)">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M7.5 9L4.5 6 7.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <h1 className="title settings-title">Settings</h1>
      </header>
      <section className="card settings">
        <PrefToggle
          id="pref-open-at-login"
          label="Open at login"
          hint={loginSupported || !loginReady ? "Launch GrokBar when you sign in to this Mac." : "macOS only."}
          checked={openAtLogin}
          disabled={!loginReady || !loginSupported}
          onChange={(next) => void onLoginToggle(next)}
        />
        <div className="settings-divider" role="separator" />
        <PrefToggle
          id="pref-redact-email"
          label="Redact account email"
          hint="Hide the email on the Weekly card."
          checked={redacted}
          onChange={setRedacted}
        />
        <div className="settings-divider" role="separator" />
        <PrefToggle
          id="pref-show-ondemand"
          label="Show on-demand"
          hint="Show the on-demand row when usage data is available. Does not enable on-demand spend."
          checked={showOnDemand}
          onChange={setShowOnDemand}
        />
        <div className="settings-divider" role="separator" />
        <PrefToggle
          id="pref-show-weekly-trend"
          label="Show weekly trend"
          hint="Small chart of included usage this period."
          checked={showWeeklyTrend}
          onChange={setShowWeeklyTrend}
        />
      </section>
    </div>
  );
});
