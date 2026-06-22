import Image from "next/image";
import { cn } from "@/lib/utils";

interface AyraLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function AyraLogo({ size = 36, className, priority = false }: AyraLogoProps) {
  return (
    <Image
      src="/ayra-logo.png"
      alt="AYRA Agent"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}
