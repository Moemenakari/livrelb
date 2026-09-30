import { CedarMark } from "@/components/icons/cedar-mark";

// The LIVRE mark for the admin (the storefront logo needs the locale routes).
export function AdminLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-logo font-semibold leading-none ${className}`}>
      <CedarMark className="h-[0.9em] w-auto text-cedar" />
      <span className="tracking-[0.2em] text-gold">LIVRE</span>
    </span>
  );
}
