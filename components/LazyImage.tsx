"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect, useRef } from "react";

const LazyImage = ({
  src,
  ...props
}: {
  src: string;
} & ImageProps) => {
  const imgRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let observer: IntersectionObserver;
    let image: HTMLImageElement;

    if (imgRef.current) {
      image = imgRef.current;

      const handleLoadError = (event: ErrorEvent) => {
        console.error("Image failed to load:", event);
        setIsVisible(false);
      };

      image.addEventListener("error", handleLoadError);

      observer = new IntersectionObserver(
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

      return () => {
        // Cleanup event listener
        image.removeEventListener("error", handleLoadError);

        // Cleanup observer
        if (observer && image) {
          observer.unobserve(image);
          observer.disconnect();
        }
      };
    }
  }, []);

  return <Image ref={imgRef} src={isVisible ? src : "/back.png"} {...props} />;
};

export default LazyImage;
