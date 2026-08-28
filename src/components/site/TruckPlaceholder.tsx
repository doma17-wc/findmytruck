import { Truck } from "lucide-react";

/**
 * Branded stand-in shown instead of a photo — for unclaimed profiles (which have
 * no licensed imagery) and any truck that hasn't uploaded a cover yet.
 */
export default function TruckPlaceholder({
  name,
  className = "",
  compact = false,
}: {
  name: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-400 via-brand to-brand-600 px-5 text-center ${className}`}
    >
      <Truck
        className={`text-white/90 ${compact ? "h-7 w-7" : "h-11 w-11"}`}
        strokeWidth={2.25}
      />
      <span
        className={`font-extrabold leading-tight text-white drop-shadow-sm ${
          compact ? "text-sm" : "text-lg"
        }`}
      >
        {name}
      </span>
    </div>
  );
}
