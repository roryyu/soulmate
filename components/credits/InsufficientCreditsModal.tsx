import { Button } from '@/components/ui/button'

export type InsufficientCreditsModalProps = {
  open: boolean
  title?: string
  description?: string
  /** 中文注释：点击“去购买/充值”后的处理（通常跳转到 /payment） */
  onGoPay: () => void
  /** 中文注释：仅关闭弹窗，不做跳转 */
  onClose: () => void
}

export function InsufficientCreditsModal({
  open,
  title = '积分不足',
  description = '当前积分不足以完成本次操作。您可以前往购买会员或充值积分后继续使用。',
  onGoPay,
  onClose,
}: InsufficientCreditsModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insufficient-credits-title"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
        <h2 id="insufficient-credits-title" className="text-lg font-semibold text-slate-800">
          {title}
        </h2>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" className="border-slate-200" onClick={onClose}>
            取消
          </Button>
          <Button type="button" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={onGoPay}>
            去购买/充值
          </Button>
        </div>
      </div>
    </div>
  )
}

