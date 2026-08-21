import { memo } from "react";
import { GrokMark2Icon } from "./icons";

export const AppHeader = memo(function AppHeader() {
  return (
    <header className="header">
      <h1 className="title">
        <GrokMark2Icon className="title-icon" />
        Grok Bot Bar
      </h1>
    </header>
  );
});
