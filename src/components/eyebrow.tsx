import { cn } from "@/lib/utils";

// v0.6 §7 — the eyebrow: soft-lavender pill, uppercase, tight tracking. The
// "most-used atom on the site." Sits above a page title or section head to give
// the warm cream canvas a confident lavender accent without leaning on gradients.
export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full items-center truncate rounded-full bg-brand-primary-soft px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-brand-deep uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
