import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import { removeTrailingSlash } from './utils'

export interface EzpaySettingsValues {
  ServerAddress: string
  CustomCallbackAddress: string
  EzpayEnabled: boolean
  EzpayBaseURL: string
  EzpayPublicURL: string
  EzpayPID: string
  EzpaySecretKey: string
  EzpayCurrency: string
  EzpayToken: string
  EzpayNetwork: string
  EzpayPaymentType: string
  EzpayNotifyURL: string
  EzpayReturnURL: string
  EzpayUnitPrice: number
  EzpayMinTopUp: number
}

interface Props {
  defaultValues: EzpaySettingsValues
}

function isLikelyPublicHttpUrl(value: string) {
  try {
    const parsedUrl = new URL(value)
    const scheme = parsedUrl.protocol.toLowerCase()
    const host = parsedUrl.hostname.toLowerCase().replace(/\.$/, '')

    if (scheme !== 'http:' && scheme !== 'https:') {
      return false
    }
    if (
      !host ||
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false
    }
    if (
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false
    }

    return host.includes('.')
  } catch {
    return false
  }
}

export function EzpaySettingsSection(props: Props) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [loading, setLoading] = useState(false)
  const form = useForm<EzpaySettingsValues>({
    defaultValues: {
      ...props.defaultValues,
      EzpaySecretKey: '',
    },
  })

  useEffect(() => {
    form.reset({
      ...props.defaultValues,
      EzpaySecretKey: '',
    })
  }, [props.defaultValues, form])

  const callbackAddress = useMemo(() => {
    const customCallbackAddress = removeTrailingSlash(
      props.defaultValues.CustomCallbackAddress || ''
    )
    const serverAddress = removeTrailingSlash(
      props.defaultValues.ServerAddress || ''
    )

    return (
      (isLikelyPublicHttpUrl(customCallbackAddress) && customCallbackAddress) ||
      (isLikelyPublicHttpUrl(serverAddress) && serverAddress) ||
      customCallbackAddress ||
      serverAddress ||
      t('site address')
    )
  }, [
    props.defaultValues.CustomCallbackAddress,
    props.defaultValues.ServerAddress,
    t,
  ])

  const handleSave = async () => {
    const values = form.getValues()
    const callbackBase = removeTrailingSlash(
      values.CustomCallbackAddress || values.ServerAddress || ''
    )
    const notifyURL = removeTrailingSlash(values.EzpayNotifyURL || '')
    const returnURL = removeTrailingSlash(values.EzpayReturnURL || '')
    const currency = values.EzpayCurrency?.trim() || ''
    const token = values.EzpayToken?.trim() || ''
    const network = values.EzpayNetwork?.trim() || ''
    const paymentType = values.EzpayPaymentType?.trim() || ''

    if (values.EzpayEnabled && !notifyURL && !callbackBase) {
      toast.error(
        t(
          'Set a server address, callback address, or custom EZPay notify URL before enabling EZPay'
        )
      )
      return
    }

    setLoading(true)
    try {
      const options: { key: string; value: string }[] = [
        { key: 'EzpayEnabled', value: String(values.EzpayEnabled) },
        {
          key: 'EzpayBaseURL',
          value: removeTrailingSlash(values.EzpayBaseURL || ''),
        },
        {
          key: 'EzpayPublicURL',
          value: removeTrailingSlash(values.EzpayPublicURL || ''),
        },
        { key: 'EzpayPID', value: values.EzpayPID || '' },
        { key: 'EzpayCurrency', value: currency },
        { key: 'EzpayToken', value: token },
        { key: 'EzpayNetwork', value: network },
        { key: 'EzpayPaymentType', value: paymentType },
        { key: 'EzpayNotifyURL', value: notifyURL },
        { key: 'EzpayReturnURL', value: returnURL },
        { key: 'EzpayUnitPrice', value: String(values.EzpayUnitPrice || 1) },
        { key: 'EzpayMinTopUp', value: String(values.EzpayMinTopUp || 1) },
      ]

      if (values.EzpaySecretKey) {
        options.push({
          key: 'EzpaySecretKey',
          value: values.EzpaySecretKey,
        })
      }

      for (const option of options) {
        await updateOption.mutateAsync(option)
      }

      form.setValue('EzpaySecretKey', '')
      toast.success(t('Updated successfully'))
    } catch {
      toast.error(t('Update failed'))
    } finally {
      setLoading(false)
    }
  }

  const configuredNotifyURL = removeTrailingSlash(
    form.watch('EzpayNotifyURL') || ''
  )
  const webhookURL = isLikelyPublicHttpUrl(configuredNotifyURL)
    ? configuredNotifyURL
    : `${callbackAddress}/api/ezpay/webhook`

  return (
    <SettingsSection title={t('EZPay Payment Gateway')}>
      <p className='text-muted-foreground text-sm'>
        {t('Configure EZPay hosted checkout integration')}
      </p>

      <Alert>
        <AlertDescription className='text-xs'>
          {t('Webhook URL')}: {webhookURL}
        </AlertDescription>
      </Alert>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='flex items-center gap-2'>
          <Switch
            checked={form.watch('EzpayEnabled')}
            onCheckedChange={(value) => form.setValue('EzpayEnabled', value)}
          />
          <Label>{t('Enable EZPay')}</Label>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Internal API base URL')}</Label>
          <Input
            placeholder='http://ezpay:8001'
            {...form.register('EzpayBaseURL')}
          />
          <p className='text-muted-foreground text-xs'>
            {t('Address used by the backend to reach the EZPay service')}
          </p>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Browser checkout base URL')}</Label>
          <Input
            placeholder={t('Leave blank to use the URL returned by EZPay')}
            {...form.register('EzpayPublicURL')}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>PID</Label>
          <Input autoComplete='off' {...form.register('EzpayPID')} />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Secret Key')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Leave blank to keep unchanged')}
            {...form.register('EzpaySecretKey')}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <div className='grid gap-1.5'>
          <Label>{t('Initial fiat currency')}</Label>
          <Input placeholder='usd' {...form.register('EzpayCurrency')} />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Initial payment token')}</Label>
          <Input placeholder='usdt' {...form.register('EzpayToken')} />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Initial payment network')}</Label>
          <Input placeholder='tron' {...form.register('EzpayNetwork')} />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Payment type')}</Label>
          <Input placeholder='GMPAY' {...form.register('EzpayPaymentType')} />
        </div>
        <p className='text-muted-foreground text-xs md:col-span-4'>
          {t(
            'Used only for the initial EZPay order. The EZPay checkout can still show other enabled chains and tokens.'
          )}
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Custom notify URL')}</Label>
          <Input
            placeholder='https://console.example.com/api/ezpay/webhook'
            {...form.register('EzpayNotifyURL')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Return URL')}</Label>
          <Input
            placeholder={t('Leave blank to use /console/topup')}
            {...form.register('EzpayReturnURL')}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Unit price (fiat / top-up unit)')}</Label>
          <Input
            type='number'
            min={0}
            step='0.000001'
            {...form.register('EzpayUnitPrice', { valueAsNumber: true })}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Minimum top-up')}</Label>
          <Input
            type='number'
            min={0}
            step='1'
            {...form.register('EzpayMinTopUp', { valueAsNumber: true })}
          />
        </div>
      </div>

      <Button type='button' onClick={handleSave} disabled={loading}>
        {loading ? t('Saving...') : t('Save EZPay settings')}
      </Button>
    </SettingsSection>
  )
}
