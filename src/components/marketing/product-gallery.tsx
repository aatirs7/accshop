"use client";

import { useState } from "react";

export interface GalleryImage {
  id: string;
  url: string;
}

export function ProductGallery({
  images,
  tierLabel,
  alt,
}: {
  images: GalleryImage[];
  tierLabel: string;
  alt: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="bg-atmosphere flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-border/60">
        <div className="text-center">
          <span className="font-display text-6xl text-brand-gold/40">
            {tierLabel}
          </span>
          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
            follower account
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/60 bg-brand-raised">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active].url}
          alt={alt}
          className="h-full w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === active ? "border-brand-gold" : "border-border/60"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
