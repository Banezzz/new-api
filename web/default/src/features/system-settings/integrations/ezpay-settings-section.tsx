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
  EzpayNotifyURL: string
  EzpayReturnURL: string
  EzpayUnitPrice: number
  EzpayMinTopUp: number
}

interface Props {
  defaultValues: EzpaySettingsValues
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
    return (
      removeTrailingSlash(
        props.defaultValues.CustomCallbackAddress ||
          props.defaultValues.ServerAddress ||
          ''
      ) || t('site address')
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

  return (
    <SettingsSection
      title={t('EZPay Payment Gateway')}
      description={t('Configure EZPay hosted checkout integration')}
    >
      <Alert>
        <AlertDescription className='text-xs'>
          {t('Webhook URL')}:{' '}
          {form.watch('EzpayNotifyURL') ||
            `${callbackAddress}/api/ezpay/webhook`}
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

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Custom notify URL')}</Label>
          <Input
            placeholder='http://new-api:3000/api/ezpay/webhook'
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
