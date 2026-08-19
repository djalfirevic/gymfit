import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return (
    <button
      className={clsx(
        'rounded-md px-4 py-2 text-sm font-medium transition-colors',
        variant === 'primary' && 'bg-white text-black hover:bg-neutral-200',
        variant === 'secondary' && 'border border-neutral-700 text-white hover:bg-neutral-800',
        variant === 'danger' && 'bg-red-900 text-white hover:bg-red-800',
        className,
      )}
      {...props}
    />
  )
}
