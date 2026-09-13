"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect, useRef } from "react";

const LazyImage = ({
  src,
  priority,
  loading,
  ...props
}: {
  src: string;
} & ImageProps) => {
  const eager = priority === true || loading === "eager";
  const imgRef = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(eager);

  useEffect(() => {
    const image = imgRef.current;
    if (!image) return;

    const handleLoadError = () => {
      setIsVisible(false);
    };

    image.addEventListener("error", handleLoadError);

    let observer: IntersectionObserver | undefined;
    if (!eager) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "100px" },
      );
      observer.observe(image);
    }

    return () => {
      image.removeEventListener("error", handleLoadError);
      observer?.disconnect();
    };
  }, [eager]);

  return (
    <Image
      {...props}
      ref={imgRef}
      src={isVisible ? src : "/back.png"}
      priority={priority}
      loading={eager ? "eager" : (loading ?? "lazy")}
      alt={props.alt ?? "Pokémon card"}
      onError={() => setIsVisible(false)}
    />
  );
};

export default LazyImage;
