import { useState, useCallback } from 'react'
import i18next from 'i18next'
import { toast } from 'sonner'
import {
  calculateAmount,
  calculateInfiniAmount,
  calculateEzpayAmount,
  calculateStripeAmount,
  calculateWaffoPancakeAmount,
  requestPayment,
  requestInfiniPayment,
  requestEzpayPayment,
  requestStripePayment,
  isApiSuccess,
} from '../api'
import {
  isEzpayPayment,
  isInfiniPayment,
  isStripePayment,
  isWaffoPancakePayment,
  submitPaymentForm,
} from '../lib'

// ============================================================================
// Payment Hook
// ============================================================================

function getHostedPaymentUrl(data: unknown): string | null {
  if (typeof data === 'string') {
    return data
  }

  if (!data || typeof data !== 'object') {
    return null
  }

  const payload = data as {
    checkout_url?: unknown
    payment_url?: unknown
    url?: unknown
  }

  if (typeof payload.checkout_url === 'string') {
    return payload.checkout_url
  }

  if (typeof payload.payment_url === 'string') {
    return payload.payment_url
  }

  if (typeof payload.url === 'string') {
    return payload.url
  }

  return null
}

function getStripePayLink(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const payload = data as { pay_link?: unknown }
  return typeof payload.pay_link === 'string' ? payload.pay_link : null
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

function getErrorMessage(message: string | undefined, data: unknown): string {
  if (typeof data === 'string' && data.trim()) {
    return data
  }

  return message || i18next.t('Payment request failed')
}

export function usePayment() {
  const [amount, setAmount] = useState<number>(0)
  const [calculating, setCalculating] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Calculate payment amount
  const calculatePaymentAmount = useCallback(
    async (topupAmount: number, paymentType: string) => {
      try {
        setCalculating(true)

        const isStripe = isStripePayment(paymentType)
        const isInfini = isInfiniPayment(paymentType)
        const isEzpay = isEzpayPayment(paymentType)
        const isPancake = isWaffoPancakePayment(paymentType)
        const response = isStripe
          ? await calculateStripeAmount({ amount: topupAmount })
          : isInfini
            ? await calculateInfiniAmount({
                amount: topupAmount,
                payment_method: paymentType,
              })
            : isEzpay
              ? await calculateEzpayAmount({ amount: topupAmount })
              : isPancake
                ? await calculateWaffoPancakeAmount({ amount: topupAmount })
                : await calculateAmount({ amount: topupAmount })

        if (isApiSuccess(response) && response.data) {
          const calculatedAmount = parseFloat(response.data)
          setAmount(calculatedAmount)
          return calculatedAmount
        }

        // Don't show error for calculation, just set to 0
        setAmount(0)
        return 0
      } catch (_error) {
        setAmount(0)
        return 0
      } finally {
        setCalculating(false)
      }
    },
    []
  )

  // Process payment
  const processPayment = useCallback(
    async (topupAmount: number, paymentType: string) => {
      try {
        setProcessing(true)

        const isStripe = isStripePayment(paymentType)
        const isInfini = isInfiniPayment(paymentType)
        const isEzpay = isEzpayPayment(paymentType)
        const amount = Math.floor(topupAmount)

        const response = isStripe
          ? await requestStripePayment({
              amount,
              payment_method: 'stripe',
            })
          : isInfini
            ? await requestInfiniPayment({
                amount,
                payment_method: paymentType,
              })
            : isEzpay
              ? await requestEzpayPayment({
                  amount,
                })
              : await requestPayment({
                  amount,
                  payment_method: paymentType,
                })

        if (!isApiSuccess(response)) {
          toast.error(getErrorMessage(response.message, response.data))
          return false
        }

        // Handle Stripe payment
        const stripePayLink = isStripe ? getStripePayLink(response.data) : null
        if (stripePayLink) {
          window.open(stripePayLink, '_blank')
          toast.success(i18next.t('Redirecting to payment page...'))
          return true
        }

        if ((isInfini || isEzpay) && response.data) {
          const hostedPaymentUrl = getHostedPaymentUrl(response.data)
          if (hostedPaymentUrl) {
            if (!isSafeHttpUrl(hostedPaymentUrl)) {
              toast.error(i18next.t('Invalid payment redirect URL'))
              return false
            }

            window.open(hostedPaymentUrl, '_blank', 'noopener,noreferrer')
            toast.success(i18next.t('Redirecting to payment page...'))
            return true
          }

          toast.error(i18next.t('Payment request failed'))
          return false
        }

        // Handle non-Stripe payment
        if (
          !isStripe &&
          !isInfini &&
          !isEzpay &&
          response.data &&
          typeof response.data === 'object'
        ) {
          const url = (response as unknown as { url?: string }).url
          if (url) {
            submitPaymentForm(url, response.data as Record<string, unknown>)
            toast.success(i18next.t('Redirecting to payment page...'))
            return true
          }
        }

        return false
      } catch (_error) {
        toast.error(i18next.t('Payment request failed'))
        return false
      } finally {
        setProcessing(false)
      }
    },
    []
  )

  return {
    amount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
    setAmount,
  }
}
