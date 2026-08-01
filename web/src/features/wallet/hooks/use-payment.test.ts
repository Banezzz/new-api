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
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { PAYMENT_TYPES } from '../constants'
import { requestPaymentAmount } from './use-payment'

describe('payment amount routing', () => {
  test('uses the dedicated Waffo amount calculator', async () => {
    const calls: string[] = []
    const amount = await requestPaymentAmount(120, PAYMENT_TYPES.WAFFO, {
      regular: async () => {
        calls.push('regular')
        return { success: true, data: '1' }
      },
      stripe: async () => {
        calls.push('stripe')
        return { success: true, data: '2' }
      },
      waffo: async (request) => {
        calls.push(`waffo:${request.amount}`)
        return { success: true, data: '18.75' }
      },
      waffoPancake: async () => {
        calls.push('pancake')
        return { success: true, data: '4' }
      },
    })

    assert.equal(amount, 18.75)
    assert.deepEqual(calls, ['waffo:120'])
  })

  test('routes Infini and EZPay through their dedicated calculators', async () => {
    const calls: string[] = []
    const calculators = {
      regular: async () => ({ success: true, data: '1' }),
      stripe: async () => ({ success: true, data: '2' }),
      waffo: async () => ({ success: true, data: '3' }),
      waffoPancake: async () => ({ success: true, data: '4' }),
      infini: async (request: { amount: number; payment_method: string }) => {
        calls.push(`infini:${request.amount}:${request.payment_method}`)
        return { success: true, data: '5.5' }
      },
      ezpay: async (request: { amount: number }) => {
        calls.push(`ezpay:${request.amount}`)
        return { success: true, data: '6.5' }
      },
    }

    const infiniAmount = await requestPaymentAmount(
      80,
      PAYMENT_TYPES.INFINI,
      calculators
    )
    const ezpayAmount = await requestPaymentAmount(
      90,
      PAYMENT_TYPES.EZPAY,
      calculators
    )

    assert.equal(infiniAmount, 5.5)
    assert.equal(ezpayAmount, 6.5)
    assert.deepEqual(calls, ['infini:80:infini', 'ezpay:90'])
  })
})
