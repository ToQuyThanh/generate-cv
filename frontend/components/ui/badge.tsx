import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  // WF: sharp 4px radius, uppercase micro label, weight 600
  'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.6px] transition-colors',
  {
    variants: {
      variant: {
        // Blue tint — primary WF badge
        default:     'bg-[rgba(20,110,245,0.10)] text-wf-blue border border-[rgba(20,110,245,0.20)]',
        secondary:   'bg-[#f0f0f0] text-wf-gray-700 border border-wf-border',
        destructive: 'bg-[rgba(238,29,54,0.10)] text-wf-red border border-[rgba(238,29,54,0.20)]',
        outline:     'border border-wf-border text-wf-gray-700',
        success:     'bg-[rgba(0,215,34,0.10)] text-[#00a018] border border-[rgba(0,215,34,0.20)]',
        warning:     'bg-[rgba(255,174,19,0.15)] text-[#a06800] border border-[rgba(255,174,19,0.30)]',
        purple:      'bg-[rgba(122,61,255,0.10)] text-wf-purple border border-[rgba(122,61,255,0.20)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
