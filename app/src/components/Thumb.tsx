import { useEffect, useState } from "react";
import { fetchThumb } from "../api/client";

export function Thumb({ path, className, alt = "" }: { path: string; className?: string; alt?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let url: string | null = null;
    fetchThumb(path, controller.signal)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  return src ? <img className={className} src={src} alt={alt} /> : <span className={className} aria-hidden="true" />;
}
