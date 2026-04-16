import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        // WF: sharp 4px radius, #d8d8d8 border, transitions to blue on focus
        'flex min-h-[80px] w-full rounded bg-white',
        'border border-wf-border px-3 py-2',
        'text-sm font-medium text-wf-black placeholder:text-wf-gray-300 placeholder:font-normal',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:border-wf-blue focus-visible:ring-1 focus-visible:ring-wf-blue',
        'hover:border-wf-border-hover',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#f5f5f5]',
        'resize-y',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
