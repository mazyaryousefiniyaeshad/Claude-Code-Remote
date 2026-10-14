export interface EventStream {
  close: () => void;
}

export function openEventStream(
  url: string,
  headers: Record<string, string>,
  onData: (data: string) => void,
  onError: () => void,
): EventStream {
  const controller = new AbortController();
  let closed = false;

  const fail = () => {
    if (!closed) onError();
  };

  (async () => {
    const res = await fetch(url, {
      headers: { ...headers, Accept: "text/event-stream" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`Stream failed (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let cut = buffer.indexOf("\n\n");
      while (cut !== -1) {
        const block = buffer.slice(0, cut);
        buffer = buffer.slice(cut + 2);
        const data = block
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n");
        if (data && !closed) onData(data);
        cut = buffer.indexOf("\n\n");
      }
    }
    fail();
  })().catch(fail);

  return {
    close: () => {
      closed = true;
      controller.abort();
    },
  };
}
