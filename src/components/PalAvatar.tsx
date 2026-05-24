import Image from "next/image";
import { palIconUrl } from "@/lib/pal-data";
import type { Pal } from "@/lib/types";

interface Props {
  pal: Pal;
  size?: number;
  className?: string;
}

export function PalAvatar({ pal, size = 28, className = "" }: Props) {
  return (
    <span
      className={`relative inline-block shrink-0 rounded-full overflow-hidden bg-chillet-50 dark:bg-chillet-800/60 ring-1 ring-chillet-200/70 dark:ring-chillet-700/60 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={palIconUrl(pal)}
        alt=""
        fill
        sizes={`${size}px`}
        className="object-cover scale-110"
      />
    </span>
  );
}
