import { memo, useCallback, useEffect, useState } from "react";
import { fetchLoginItem, setLoginItem } from "../lib/api";
import { redactEmail } from "../lib/format";
import { useRedactEmail, useShowOnDemand } from "../hooks/useLocalPref";
import { EyeIcon, EyeOffIcon } from "./icons";

type Props = {
  onBack: () => void;
  accountEmail?: string | null;
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

export const SettingsPanel = memo(function SettingsPanel({ onBack, accountEmail = null }: Props) {
  const { redacted, toggle: toggleRedacted } = useRedactEmail();
  const { show: showOnDemand, setShow: setShowOnDemand } = useShowOnDemand();
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

  const emailText = accountEmail
    ? redacted
      ? redactEmail(accountEmail)
      : accountEmail
    : "Not available";

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
        <div className="settings-row settings-account">
          <div className="settings-copy">
            <span className="settings-label">Account email</span>
            <p className="settings-account-email">{emailText}</p>
          </div>
          {accountEmail ? (
            <button
              type="button"
              className="settings-email-toggle"
              aria-label={redacted ? "Show email" : "Hide email"}
              aria-pressed={redacted}
              title={redacted ? "Show email" : "Hide email"}
              onClick={toggleRedacted}
            >
              {redacted ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          ) : null}
        </div>
        <div className="settings-divider" role="separator" />
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
          id="pref-show-ondemand"
          label="Show on-demand"
          hint="Shows the on-demand row when available, or No spend limit. Does not enable spend."
          checked={showOnDemand}
          onChange={setShowOnDemand}
        />
      </section>
    </div>
  );
});
