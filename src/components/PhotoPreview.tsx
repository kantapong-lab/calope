// The object URL is created and revoked by the owner of the blob (CaptureFlow); nothing is persisted (AC-2, ADR 0002).
export function PhotoPreview({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="photo" src={src} alt={alt} />;
}
