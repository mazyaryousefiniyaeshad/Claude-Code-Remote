import { dequeueMessage } from "../../api/hooks";
import type { QueuedMessage } from "../../api/types";
import { directionOf } from "../../lib/direction";

interface Props {
  runId: string;
  items: QueuedMessage[];
  onDrop: (id: string) => void;
}

export function QueueStrip({ runId, items, onDrop }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="queue-strip">
      <p className="queue-label">
        Queued <span className="num">{items.length}</span>
      </p>
      {items.map((item, index) => (
        <div key={item.id} className="queue-item">
          <span className="queue-index num">{index + 1}</span>
          <span className="queue-text" dir={directionOf(item.prompt)} style={{ unicodeBidi: "plaintext" }}>
            {item.prompt}
          </span>
          <button
            className="queue-drop"
            aria-label="Remove from queue"
            onClick={async () => {
              await dequeueMessage(runId, item.id).catch(() => undefined);
              onDrop(item.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
