import * as React from 'react'
import * as Slot from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base — WF sharp corners, weight 500, smooth translate transition
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'text-sm font-medium tracking-[-0.01em]',
    'rounded transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wf-blue focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-40',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary — Webflow Blue, translate-up on hover
        default: [
          'bg-wf-blue text-white shadow-wf-sm',
          'hover:-translate-y-[2px] hover:bg-[#0055d4] hover:shadow-wf',
          'active:translate-y-0',
        ].join(' '),

        // Destructive
        destructive: [
          'bg-wf-red text-white shadow-wf-sm',
          'hover:-translate-y-[2px] hover:bg-[#cc1028] hover:shadow-wf',
          'active:translate-y-0',
        ].join(' '),

        // Outline — WF border, no bg
        outline: [
          'border border-wf-border bg-white text-wf-black shadow-wf-sm',
          'hover:border-wf-border-hover hover:bg-[#f5f5f5] hover:-translate-y-[2px]',
          'active:translate-y-0',
        ].join(' '),

        // Secondary — light gray
        secondary: [
          'bg-[#f0f0f0] text-wf-black',
          'hover:bg-[#e4e4e4] hover:-translate-y-[2px]',
          'active:translate-y-0',
        ].join(' '),

        // Ghost — no border, no bg
        ghost: [
          'text-wf-gray-700',
          'hover:bg-[rgba(20,110,245,0.06)] hover:text-wf-blue',
        ].join(' '),

        // Link
        link: 'text-wf-blue underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm:      'h-8 px-3 text-xs',
        lg:      'h-11 px-6 text-base',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </>
        ) : children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
