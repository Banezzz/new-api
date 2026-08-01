/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Crown, CalendarClock, Package } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { GroupBadge } from '@/components/group-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSystemConfig } from '@/hooks/use-system-config'
import { formatQuota } from '@/lib/format'
import { DEFAULT_CURRENCY_CONFIG } from '@/stores/system-config-store'

import {
  paySubscriptionStripe,
  paySubscriptionCreem,
  paySubscriptionEpay,
  paySubscriptionInfini,
  paySubscriptionEzpay,
  paySubscriptionWaffoPancake,
  paySubscriptionBalance,
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
  enableWaffoPancake?: boolean
  enableOnlineTopUp?: boolean
  enableInfiniTopUp?: boolean
  enableEzpayTopUp?: boolean
  epayMethods?: PaymentMethod[]
  infiniMethods?: PaymentMethod[]
  ezpayMethods?: PaymentMethod[]
  purchaseLimit?: number
  purchaseCount?: number
  userQuota?: number
  onPurchaseSuccess?: () => void | Promise<void>
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

function getSelectedPaymentMethodLabel(
  selected: string,
  methods: PaymentMethod[] | undefined,
  fallback: string
): string {
  return (
    methods?.find((method) => method.type === selected)?.name ||
    selected ||
    fallback
  )
}

export function SubscriptionPurchaseDialog(props: Props) {
  const { t } = useTranslation()
  const { currency } = useSystemConfig()
  const [paying, setPaying] = useState(false)
  const [selectedEpayMethod, setSelectedEpayMethod] = useState('')
  const [selectedInfiniMethod, setSelectedInfiniMethod] = useState('')
  const [selectedEzpayMethod, setSelectedEzpayMethod] = useState('')

  useEffect(() => {
    if (!props.open) {
      setSelectedEpayMethod('')
      setSelectedInfiniMethod('')
      setSelectedEzpayMethod('')
      return
    }

    setSelectedEpayMethod(props.epayMethods?.[0]?.type || '')
    setSelectedInfiniMethod(props.infiniMethods?.[0]?.type || '')
    setSelectedEzpayMethod(props.ezpayMethods?.[0]?.type || '')
  }, [props.open, props.epayMethods, props.infiniMethods, props.ezpayMethods])

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
  const hasWaffoPancake =
    props.enableWaffoPancake && !!plan.waffo_pancake_product_id
  const hasEpay =
    props.enableOnlineTopUp && (props.epayMethods || []).length > 0
  const hasInfini =
    props.enableInfiniTopUp && (props.infiniMethods || []).length > 0
  const hasEzpay =
    props.enableEzpayTopUp && (props.ezpayMethods || []).length > 0
  const hasAnyPayment =
    hasStripe || hasCreem || hasWaffoPancake || hasEpay || hasInfini || hasEzpay
  const selectedEpayMethodLabel = getSelectedPaymentMethodLabel(
    selectedEpayMethod,
    props.epayMethods,
    t('Select payment method')
  )
  const selectedInfiniMethodLabel = getSelectedPaymentMethodLabel(
    selectedInfiniMethod,
    props.infiniMethods,
    t('Select payment method')
  )
  const selectedEzpayMethodLabel = getSelectedPaymentMethodLabel(
    selectedEzpayMethod,
    props.ezpayMethods,
    t('Select payment method')
  )
  const totalAmount = Number(plan.total_amount || 0)
  const price = Number(plan.price_amount || 0).toFixed(2)
  const quotaPerUnit =
    currency?.quotaPerUnit && currency.quotaPerUnit > 0
      ? currency.quotaPerUnit
      : DEFAULT_CURRENCY_CONFIG.quotaPerUnit
  const balanceCost = Math.max(
    0,
    Math.ceil(Number(plan.price_amount || 0) * quotaPerUnit)
  )
  const userQuota = Math.max(0, Number(props.userQuota || 0))
  const allowBalancePay = plan.allow_balance_pay !== false
  const insufficientBalance = userQuota < balanceCost
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

  // In-tab redirect (not window.open) — user-gesture context is lost
  // across the await, so a popup would be blocked. Same as the wallet hook.
  const handlePayWaffoPancake = async () => {
    setPaying(true)
    try {
      const res = await paySubscriptionWaffoPancake({ plan_id: plan.id })
      if (res.message === 'success' && res.data?.checkout_url) {
        toast.success(t('Redirecting to payment page...'))
        window.location.href = res.data.checkout_url
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

  const handlePayBalance = async () => {
    if (!allowBalancePay) {
      toast.error(t('This plan does not allow balance redemption'))
      return
    }
    setPaying(true)
    try {
      const res = await paySubscriptionBalance({ plan_id: plan.id })
      if (res.success) {
        toast.success(t('Subscription purchased successfully'))
        void props.onPurchaseSuccess?.()
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
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={
        <>
          <Crown className='h-5 w-5' />
          {t('Purchase Subscription')}
        </>
      }
      contentClassName='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-md'
      titleClassName='flex items-center gap-2'
      contentHeight='auto'
      bodyClassName='space-y-4'
    >
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
              {t('Plan Quota')}
            </span>
            <span className='flex items-center gap-1 text-sm'>
              <Package className='h-3.5 w-3.5' />
              {totalAmount > 0 ? formatQuota(totalAmount) : t('Unlimited')}
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

        <div className='flex flex-col gap-2 rounded-md border p-3'>
          <div className='flex items-center justify-between gap-2 text-xs'>
            <span className='text-muted-foreground'>{t('Required')}</span>
            <span>{formatQuota(balanceCost)}</span>
          </div>
          <div className='flex items-center justify-between gap-2 text-xs'>
            <span className='text-muted-foreground'>{t('Available')}</span>
            <span>{formatQuota(userQuota)}</span>
          </div>
          {!allowBalancePay ? (
            <Alert variant='destructive'>
              <AlertDescription>
                {t('This plan does not allow balance redemption')}
              </AlertDescription>
            </Alert>
          ) : (
            insufficientBalance && (
              <Alert variant='destructive'>
                <AlertDescription>{t('Insufficient balance')}</AlertDescription>
              </Alert>
            )
          )}
          <Button
            variant='outline'
            onClick={handlePayBalance}
            disabled={
              paying || limitReached || !allowBalancePay || insufficientBalance
            }
          >
            {t('Pay with Balance')}
          </Button>
        </div>

        {hasAnyPayment && (
          <div className='space-y-3'>
            <p className='text-muted-foreground text-xs'>
              {t('Select payment method')}
            </p>
            {(hasStripe || hasCreem || hasWaffoPancake) && (
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
                {hasWaffoPancake && (
                  <Button
                    variant='outline'
                    className='flex-1'
                    onClick={handlePayWaffoPancake}
                    disabled={paying || limitReached}
                  >
                    Waffo Pancake
                  </Button>
                )}
              </div>
            )}
            {hasInfini && (
              <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
                <Select
                  items={(props.infiniMethods || []).map((m) => ({
                    value: m.type,
                    label: m.name || m.type,
                  }))}
                  value={selectedInfiniMethod}
                  onValueChange={(v) =>
                    v !== null && setSelectedInfiniMethod(v)
                  }
                  disabled={limitReached}
                >
                  <SelectTrigger className='flex-1'>
                    <SelectValue>{selectedInfiniMethodLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {(props.infiniMethods || []).map((m) => (
                        <SelectItem key={m.type} value={m.type}>
                          {m.name || m.type}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handlePayInfini}
                  disabled={paying || !selectedInfiniMethod || limitReached}
                >
                  Infini
                </Button>
              </div>
            )}
            {hasEzpay && (
              <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
                <Select
                  items={(props.ezpayMethods || []).map((m) => ({
                    value: m.type,
                    label: m.name || m.type,
                  }))}
                  value={selectedEzpayMethod}
                  onValueChange={(v) => v !== null && setSelectedEzpayMethod(v)}
                  disabled={limitReached}
                >
                  <SelectTrigger className='flex-1'>
                    <SelectValue>{selectedEzpayMethodLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {(props.ezpayMethods || []).map((m) => (
                        <SelectItem key={m.type} value={m.type}>
                          {m.name || m.type}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handlePayEzpay}
                  disabled={paying || !selectedEzpayMethod || limitReached}
                >
                  EZPay
                </Button>
              </div>
            )}
            {hasEpay && (
              <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
                <Select
                  items={(props.epayMethods || []).map((m) => ({
                    value: m.type,
                    label: m.name || m.type,
                  }))}
                  value={selectedEpayMethod}
                  onValueChange={(v) => v !== null && setSelectedEpayMethod(v)}
                  disabled={limitReached}
                >
                  <SelectTrigger className='flex-1'>
                    <SelectValue>{selectedEpayMethodLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {(props.epayMethods || []).map((m) => (
                        <SelectItem key={m.type} value={m.type}>
                          {m.name || m.type}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handlePayEpay}
                  disabled={paying || !selectedEpayMethod || limitReached}
                >
                  {t('Pay')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
