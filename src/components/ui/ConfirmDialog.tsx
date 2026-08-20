'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

/**
 * Replaces the native confirm(), whose buttons are labelled by the browser in
 * the browser's own language -- so a Serbian UI still asked "OK / Cancel" --
 * and which some mobile browsers suppress entirely, which would have let a
 * delete through unconfirmed.
 *
 * Cancel is the primary-looking action here: the safe choice should be the
 * easy one to hit, especially with a thumb.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  pending = false,
}: {
  open: boolean
  title?: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
}) {
  const t = useTranslations('common')

  return (
    <Modal open={open} onClose={onCancel} title={title ?? t('confirmTitle')}>
      <p className="text-base text-fg">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          {t('no')}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={pending}>
          {pending ? t('deleting') : t('yes')}
        </Button>
      </div>
    </Modal>
  )
}
