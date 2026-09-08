import { useToggleFavorite } from "../api/hooks";
import "./StarButton.css";

interface Props {
  sessionId: string;
  cwd: string;
  title: string;
  starred: boolean;
}

export function StarButton({ sessionId, cwd, title, starred }: Props) {
  const toggle = useToggleFavorite();

  return (
    <button
      className={`star${starred ? " is-on" : ""}`}
      aria-pressed={starred}
      aria-label={starred ? `Unstar ${title}` : `Star ${title}`}
      disabled={toggle.isPending}
      onClick={(event) => {
        event.stopPropagation();
        toggle.mutate({ sessionId, cwd, title, starred: !starred });
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
      </svg>
    </button>
  );
}
