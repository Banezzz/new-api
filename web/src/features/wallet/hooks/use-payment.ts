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
import i18next from 'i18next'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

import {
  calculateAmount,
  calculateInfiniAmount,
  calculateEzpayAmount,
  calculateStripeAmount,
  calculateWaffoAmount,
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
  isWaffoPayment,
  isWaffoPancakePayment,
  submitPaymentForm,
} from '../lib'
import type {
  AmountRequest,
  AmountResponse,
  ApiResponse,
  PaymentRequest,
} from '../types'

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

type AmountCalculator = (request: AmountRequest) => Promise<AmountResponse>
type PaymentAmountCalculator = (
  request: PaymentRequest
) => Promise<AmountResponse>

export interface PaymentAmountCalculators {
  regular: AmountCalculator
  stripe: AmountCalculator
  waffo: AmountCalculator
  waffoPancake: AmountCalculator
  infini?: PaymentAmountCalculator
  ezpay?: AmountCalculator
}

const defaultPaymentAmountCalculators: PaymentAmountCalculators = {
  regular: calculateAmount,
  stripe: calculateStripeAmount,
  waffo: calculateWaffoAmount,
  waffoPancake: calculateWaffoPancakeAmount,
  infini: calculateInfiniAmount,
  ezpay: calculateEzpayAmount,
}

export async function requestPaymentAmount(
  topupAmount: number,
  paymentType: string,
  calculators: PaymentAmountCalculators = defaultPaymentAmountCalculators
): Promise<number> {
  let response: AmountResponse
  if (isInfiniPayment(paymentType)) {
    const calculator = calculators.infini ?? calculateInfiniAmount
    response = await calculator({
      amount: topupAmount,
      payment_method: paymentType,
    })
  } else if (isEzpayPayment(paymentType)) {
    const calculator = calculators.ezpay ?? calculateEzpayAmount
    response = await calculator({ amount: topupAmount })
  } else {
    let calculator = calculators.regular
    if (isStripePayment(paymentType)) {
      calculator = calculators.stripe
    } else if (isWaffoPayment(paymentType)) {
      calculator = calculators.waffo
    } else if (isWaffoPancakePayment(paymentType)) {
      calculator = calculators.waffoPancake
    }
    response = await calculator({ amount: topupAmount })
  }

  if (!isApiSuccess(response) || !response.data) {
    return 0
  }

  return Number.parseFloat(response.data)
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
        const calculatedAmount = await requestPaymentAmount(
          topupAmount,
          paymentType
        )
        setAmount(calculatedAmount)
        return calculatedAmount
      } catch {
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

        let response: ApiResponse
        if (isStripe) {
          response = await requestStripePayment({
            amount,
            payment_method: 'stripe',
          })
        } else if (isInfini) {
          response = await requestInfiniPayment({
            amount,
            payment_method: paymentType,
          })
        } else if (isEzpay) {
          response = await requestEzpayPayment({ amount })
        } else {
          response = await requestPayment({
            amount,
            payment_method: paymentType,
          })
        }

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
      } catch {
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
