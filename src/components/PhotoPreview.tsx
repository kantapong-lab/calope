"use client";

import { useEffect, useState } from "react";

// Object URL lives only for this view; the blob is never persisted (AC-2, ADR 0002).
export function PhotoPreview({ blob, alt }: { blob: Blob; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img className="photo" src={url} alt={alt} /> : <div className="photo skeleton" />;
}
