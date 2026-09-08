import type { ReactNode, RefObject, UIEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LiveSwitcher } from "./LiveSwitcher";
import { StarSwitcher } from "./StarSwitcher";
import "./Screen.css";

interface ScreenProps {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  bodyRef?: RefObject<HTMLElement | null>;
  onBodyScroll?: (event: UIEvent<HTMLElement>) => void;
  bodyClassName?: string;
}

export function Screen({
  title,
  subtitle,
  back,
  actions,
  children,
  footer,
  bodyRef,
  onBodyScroll,
  bodyClassName,
}: ScreenProps) {
  const navigate = useNavigate();
  const goBack = () => {
    if (typeof back === "string") navigate(back);
    else navigate(-1);
  };

  return (
    <div className="screen">
      <header className="screen-bar">
        {back ? (
          <button className="icon-btn" onClick={goBack} aria-label="Back">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : null}
        <div className="screen-heading">
          <h1>{title}</h1>
          {subtitle ? <p className="mono">{subtitle}</p> : null}
        </div>
        <div className="screen-actions">
          <LiveSwitcher />
          <StarSwitcher />
          {actions}
        </div>
      </header>
      <main
        ref={bodyRef}
        onScroll={onBodyScroll}
        className={`screen-body scroll${bodyClassName ? ` ${bodyClassName}` : ""}`}
      >
        {children}
      </main>
      {footer}
    </div>
  );
}
