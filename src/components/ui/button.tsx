import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// HelloSavvy v0.6: fully-rounded pills, lavender primary w/ soft glow, 3 tiers.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primary CTA — solid display brand color + soft lavender glow.
        default:
          "bg-primary text-primary-foreground shadow-[0_0_24px_0_rgba(124,111,224,0.35)] hover:bg-brand-primary-hover",
        // Secondary (ghost) — soft-lavender fill, lavender text, no shadow.
        secondary:
          "bg-brand-primary-soft text-brand-deep hover:bg-[#e2daf7] aria-expanded:bg-brand-primary-soft",
        outline:
          "border-brand-primary/30 bg-elevated text-display-lavender hover:bg-brand-primary-soft aria-expanded:bg-brand-primary-soft",
        ghost:
          "text-brand-deep hover:bg-brand-primary-soft aria-expanded:bg-brand-primary-soft",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
        // Tertiary — bare lavender text link.
        link: "rounded-none text-display-lavender underline-offset-4 hover:underline",
      },
      size: {
        // v0.6 sizing: small h36 · default h44 · large h52.
        default:
          "h-11 gap-2 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        xs: "h-8 gap-1 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-4 text-[0.8rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-13 gap-2 px-8 text-base",
        icon: "size-11",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-13",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
