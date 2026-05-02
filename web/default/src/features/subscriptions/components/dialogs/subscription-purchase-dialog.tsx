import { useState } from 'react'
import { Crown, CalendarClock, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { GroupBadge } from '@/components/group-badge'
import {
  paySubscriptionStripe,
  paySubscriptionCreem,
  paySubscriptionEpay,
  paySubscriptionInfini,
  paySubscriptionEzpay,
} from '../../api'
import { formatDuration, formatResetPeriod } from '../../lib'
import type { PlanRecord } from '../../types'

interface PaymentMethod {
  type: string
  name?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: PlanRecord | null
  enableStripe?: boolean
  enableCreem?: boolean
  enableOnlineTopUp?: boolean
  enableInfiniTopUp?: boolean
  enableEzpayTopUp?: boolean
  epayMethods?: PaymentMethod[]
  infiniMethods?: PaymentMethod[]
  ezpayMethods?: PaymentMethod[]
  purchaseLimit?: number
  purchaseCount?: number
}

function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }

  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function getHostedPaymentUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const payload = data as {
    checkout_url?: unknown
    payment_url?: unknown
  }

  if (typeof payload.checkout_url === 'string') {
    return payload.checkout_url
  }

  if (typeof payload.payment_url === 'string') {
    return payload.payment_url
  }

  return null
}

function resolveSelectedPaymentMethod(
  selected: string,
  methods: PaymentMethod[] | undefined
): string {
  if (selected && methods?.some((method) => method.type === selected)) {
    return selected
  }

  return methods?.[0]?.type || ''
}

export function SubscriptionPurchaseDialog(props: Props) {
  const { t } = useTranslation()
  const [paying, setPaying] = useState(false)
  const [selectedEpayMethod, setSelectedEpayMethod] = useState('')
  const [selectedInfiniMethod, setSelectedInfiniMethod] = useState('')
  const [selectedEzpayMethod, setSelectedEzpayMethod] = useState('')

  const plan = props.plan?.plan
  if (!plan) return null

  const effectiveEpayMethod = resolveSelectedPaymentMethod(
    selectedEpayMethod,
    props.epayMethods
  )
  const effectiveInfiniMethod = resolveSelectedPaymentMethod(
    selectedInfiniMethod,
    props.infiniMethods
  )
  const effectiveEzpayMethod = resolveSelectedPaymentMethod(
    selectedEzpayMethod,
    props.ezpayMethods
  )
  const hasStripe = props.enableStripe && !!plan.stripe_price_id
  const hasCreem = props.enableCreem && !!plan.creem_product_id
  const hasEpay =
    props.enableOnlineTopUp && (props.epayMethods || []).length > 0
  const hasInfini =
    props.enableInfiniTopUp && (props.infiniMethods || []).length > 0
  const hasEzpay =
    props.enableEzpayTopUp && (props.ezpayMethods || []).length > 0
  const hasAnyPayment =
    hasStripe || hasCreem || hasEpay || hasInfini || hasEzpay
  const totalAmount = Number(plan.total_amount || 0)
  const price = Number(plan.price_amount || 0).toFixed(2)
  const limitReached =
    (props.purchaseLimit || 0) > 0 &&
    (props.purchaseCount || 0) >= (props.purchaseLimit || 0)

  const handlePayStripe = async () => {
    setPaying(true)
    try {
      const res = await paySubscriptionStripe({ plan_id: plan.id })
      if (res.message === 'success' && res.data?.pay_link) {
        window.open(res.data.pay_link, '_blank')
        toast.success(t('Payment page opened'))
        props.onOpenChange(false)
      } else {
        toast.error(
          res.message && res.message !== 'success'
            ? res.message
            : t('Payment request failed')
        )
      }
    } catch {
      toast.error(t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const handlePayCreem = async () => {
    setPaying(true)
    try {
      const res = await paySubscriptionCreem({ plan_id: plan.id })
      if (res.message === 'success' && res.data?.checkout_url) {
        window.open(res.data.checkout_url, '_blank')
        toast.success(t('Payment page opened'))
        props.onOpenChange(false)
      } else {
        toast.error(
          res.message && res.message !== 'success'
            ? res.message
            : t('Payment request failed')
        )
      }
    } catch {
      toast.error(t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const isSafari =
    typeof navigator !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  const handlePayEpay = async () => {
    if (!effectiveEpayMethod) {
      toast.error(t('Please select a payment method'))
      return
    }
    setPaying(true)
    try {
      const res = await paySubscriptionEpay({
        plan_id: plan.id,
        payment_method: effectiveEpayMethod,
      })
      if (res.message === 'success' && res.url) {
        const form = document.createElement('form')
        form.action = res.url
        form.method = 'POST'
        if (!isSafari) {
          form.target = '_blank'
        }
        Object.entries(res.data || {}).forEach(([key, value]) => {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = String(value)
          form.appendChild(input)
        })
        document.body.appendChild(form)
        form.submit()
        document.body.removeChild(form)
        toast.success(t('Payment initiated'))
        props.onOpenChange(false)
      } else {
        toast.error(
          res.message && res.message !== 'success'
            ? res.message
            : t('Payment request failed')
        )
      }
    } catch {
      toast.error(t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const handlePayInfini = async () => {
    if (!effectiveInfiniMethod) {
      toast.error(t('Please select a payment method'))
      return
    }

    setPaying(true)
    try {
      const res = await paySubscriptionInfini({
        plan_id: plan.id,
        payment_method: effectiveInfiniMethod,
      })

      if (res.message === 'success') {
        const checkoutUrl = getHostedPaymentUrl(res.data)
        if (!checkoutUrl) {
          toast.error(t('Payment request failed'))
          return
        }

        if (!isSafeHttpUrl(checkoutUrl)) {
          toast.error(t('Invalid payment redirect URL'))
          return
        }

        window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
        toast.success(t('Payment page opened'))
        props.onOpenChange(false)
      } else {
        toast.error(
          res.message && res.message !== 'success'
            ? res.message
            : t('Payment request failed')
        )
      }
    } catch {
      toast.error(t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const handlePayEzpay = async () => {
    if (!effectiveEzpayMethod) {
      toast.error(t('Please select a payment method'))
      return
    }

    setPaying(true)
    try {
      const res = await paySubscriptionEzpay({ plan_id: plan.id })

      if (res.message === 'success') {
        const paymentUrl = getHostedPaymentUrl(res.data)
        if (!paymentUrl) {
          toast.error(t('Payment request failed'))
          return
        }

        if (!isSafeHttpUrl(paymentUrl)) {
          toast.error(t('Invalid payment redirect URL'))
          return
        }

        window.open(paymentUrl, '_blank', 'noopener,noreferrer')
        toast.success(t('Payment page opened'))
        props.onOpenChange(false)
      } else {
        toast.error(
          res.message && res.message !== 'success'
            ? res.message
            : t('Payment request failed')
        )
      }
    } catch {
      toast.error(t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Crown className='h-5 w-5' />
            {t('Purchase Subscription')}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-3 sm:space-y-4'>
          <div className='bg-muted/50 space-y-2.5 rounded-lg border p-3 sm:space-y-3 sm:p-4'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground text-sm'>
                {t('Plan Name')}
              </span>
              <span className='max-w-[200px] truncate text-sm font-medium'>
                {plan.title}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>
                {t('Validity Period')}
              </span>
              <span className='flex items-center gap-1 text-sm'>
                <CalendarClock className='h-3.5 w-3.5' />
                {formatDuration(plan, t)}
              </span>
            </div>
            {formatResetPeriod(plan, t) !== t('No Reset') && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground text-sm'>
                  {t('Reset Period')}
                </span>
                <span className='text-sm'>{formatResetPeriod(plan, t)}</span>
              </div>
            )}
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>
                {t('Total Quota')}
              </span>
              <span className='flex items-center gap-1 text-sm'>
                <Package className='h-3.5 w-3.5' />
                {totalAmount > 0 ? totalAmount : t('Unlimited')}
              </span>
            </div>
            {plan.upgrade_group && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground text-sm'>
                  {t('Upgrade Group')}
                </span>
                <GroupBadge group={plan.upgrade_group} />
              </div>
            )}
            <Separator />
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>{t('Amount Due')}</span>
              <span className='text-primary text-lg font-bold'>${price}</span>
            </div>
          </div>

          {limitReached && (
            <Alert variant='destructive'>
              <AlertDescription>
                {t('Purchase limit reached')} ({props.purchaseCount}/
                {props.purchaseLimit})
              </AlertDescription>
            </Alert>
          )}

          {hasAnyPayment ? (
            <div className='space-y-3'>
              <p className='text-muted-foreground text-xs'>
                {t('Select payment method')}
              </p>
              {(hasStripe || hasCreem) && (
                <div className='grid grid-cols-2 gap-2 sm:flex'>
                  {hasStripe && (
                    <Button
                      variant='outline'
                      className='flex-1'
                      onClick={handlePayStripe}
                      disabled={paying || limitReached}
                    >
                      Stripe
                    </Button>
                  )}
                  {hasCreem && (
                    <Button
                      variant='outline'
                      className='flex-1'
                      onClick={handlePayCreem}
                      disabled={paying || limitReached}
                    >
                      Creem
                    </Button>
                  )}
                </div>
              )}
              {hasInfini && (
                <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
                  <Select
                    value={effectiveInfiniMethod}
                    onValueChange={setSelectedInfiniMethod}
                    disabled={limitReached}
                  >
                    <SelectTrigger className='flex-1'>
                      <SelectValue placeholder={t('Select payment method')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(props.infiniMethods || []).map((m) => (
                        <SelectItem key={m.type} value={m.type}>
                          {m.name || m.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handlePayInfini}
                    disabled={paying || !effectiveInfiniMethod || limitReached}
                  >
                    Infini
                  </Button>
                </div>
              )}
              {hasEzpay && (
                <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
                  <Select
                    value={effectiveEzpayMethod}
                    onValueChange={setSelectedEzpayMethod}
                    disabled={limitReached}
                  >
                    <SelectTrigger className='flex-1'>
                      <SelectValue placeholder={t('Select payment method')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(props.ezpayMethods || []).map((m) => (
                        <SelectItem key={m.type} value={m.type}>
                          {m.name || m.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handlePayEzpay}
                    disabled={paying || !effectiveEzpayMethod || limitReached}
                  >
                    EZPay
                  </Button>
                </div>
              )}
              {hasEpay && (
                <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
                  <Select
                    value={effectiveEpayMethod}
                    onValueChange={setSelectedEpayMethod}
                    disabled={limitReached}
                  >
                    <SelectTrigger className='flex-1'>
                      <SelectValue placeholder={t('Select payment method')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(props.epayMethods || []).map((m) => (
                        <SelectItem key={m.type} value={m.type}>
                          {m.name || m.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handlePayEpay}
                    disabled={paying || !effectiveEpayMethod || limitReached}
                  >
                    {t('Pay')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                {t(
                  'Online payment is not enabled. Please contact the administrator.'
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
