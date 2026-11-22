"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect, useRef } from "react";

/** Card back shown until the real image is near the viewport, or if it fails. */
const PLACEHOLDER_SRC = "/back.png";

const LazyImage = ({
  src,
  priority,
  loading,
  unoptimized,
  onError,
  ...props
}: {
  src: string;
} & ImageProps) => {
  const eager = priority === true || loading === "eager";
  const imgRef = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(eager);
  // The src that failed to load, so a new src gets its own try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showReal = isVisible && failedSrc !== src;

  useEffect(() => {
    if (eager) return;
    const image = imgRef.current;
    if (!image) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "100px" },
    );
    observer.observe(image);

    return () => observer.disconnect();
  }, [eager]);

  return (
    <Image
      {...props}
      ref={imgRef}
      src={showReal ? src : PLACEHOLDER_SRC}
      // The placeholder is a local static file: serve it as-is rather than
      // through the image optimizer.
      unoptimized={showReal ? unoptimized : true}
      priority={priority}
      loading={eager ? "eager" : (loading ?? "lazy")}
      alt={props.alt ?? "Pokémon card"}
      onError={(event) => {
        onError?.(event);
        // Fall back to the placeholder once. If the placeholder itself fails,
        // stay put instead of swapping src again.
        if (showReal) setFailedSrc(src);
      }}
    />
  );
};

export default LazyImage;
