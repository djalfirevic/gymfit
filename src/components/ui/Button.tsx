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
        'rounded-card px-3.5 py-2 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-primary text-primary-fg hover:bg-primary-hover',
        variant === 'secondary' && 'border border-line text-fg hover:border-primary hover:text-primary',
        variant === 'danger' && 'bg-danger text-white hover:opacity-90',
        className,
      )}
      {...props}
    />
  )
}
