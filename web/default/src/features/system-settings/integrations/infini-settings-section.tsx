import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import { formatJsonForEditor, removeTrailingSlash } from './utils'

export interface InfiniSettingsValues {
  ServerAddress: string
  CustomCallbackAddress: string
  InfiniEnabled: boolean
  InfiniSandbox: boolean
  InfiniBaseURL: string
  InfiniKeyId: string
  InfiniSecretKey: string
  InfiniWebhookSecret: string
  InfiniMerchantAlias: string
  InfiniSuccessURL: string
  InfiniFailureURL: string
  InfiniUnitPrice: number
  InfiniMinTopUp: number
  InfiniOrderTTLSeconds: number
  InfiniPayMethods: string
}

interface Props {
  defaultValues: InfiniSettingsValues
}

function isJsonArray(value: string): boolean {
  try {
    return Array.isArray(JSON.parse(value || '[]'))
  } catch {
    return false
  }
}

export function InfiniSettingsSection(props: Props) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [loading, setLoading] = useState(false)
  const form = useForm<InfiniSettingsValues>({
    defaultValues: {
      ...props.defaultValues,
      InfiniSecretKey: '',
      InfiniWebhookSecret: '',
      InfiniPayMethods: formatJsonForEditor(
        props.defaultValues.InfiniPayMethods
      ),
    },
  })

  useEffect(() => {
    form.reset({
      ...props.defaultValues,
      InfiniSecretKey: '',
      InfiniWebhookSecret: '',
      InfiniPayMethods: formatJsonForEditor(
        props.defaultValues.InfiniPayMethods
      ),
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
    const serverAddress = removeTrailingSlash(values.ServerAddress || '')
    const successURL = removeTrailingSlash(values.InfiniSuccessURL || '')
    const failureURL = removeTrailingSlash(values.InfiniFailureURL || '')
    const payMethods = values.InfiniPayMethods.trim() || '[]'

    if (values.InfiniEnabled && !callbackBase) {
      toast.error(
        t('Set a server address or callback address before enabling Infini')
      )
      return
    }

    if (
      values.InfiniEnabled &&
      !serverAddress &&
      (!successURL || !failureURL)
    ) {
      toast.error(
        t(
          'Set a server address, or provide both success and failure redirect URLs'
        )
      )
      return
    }

    if (!isJsonArray(payMethods)) {
      toast.error(t('Infini payment methods must be a JSON array'))
      return
    }

    setLoading(true)
    try {
      const options: { key: string; value: string }[] = [
        { key: 'InfiniEnabled', value: String(values.InfiniEnabled) },
        { key: 'InfiniSandbox', value: String(values.InfiniSandbox) },
        {
          key: 'InfiniBaseURL',
          value: removeTrailingSlash(values.InfiniBaseURL || ''),
        },
        { key: 'InfiniKeyId', value: values.InfiniKeyId || '' },
        { key: 'InfiniMerchantAlias', value: values.InfiniMerchantAlias || '' },
        { key: 'InfiniSuccessURL', value: successURL },
        { key: 'InfiniFailureURL', value: failureURL },
        {
          key: 'InfiniUnitPrice',
          value: String(values.InfiniUnitPrice || 1),
        },
        {
          key: 'InfiniMinTopUp',
          value: String(values.InfiniMinTopUp || 1),
        },
        {
          key: 'InfiniOrderTTLSeconds',
          value: String(values.InfiniOrderTTLSeconds || 0),
        },
        { key: 'InfiniPayMethods', value: payMethods },
      ]

      if (values.InfiniSecretKey) {
        options.push({
          key: 'InfiniSecretKey',
          value: values.InfiniSecretKey,
        })
      }

      if (values.InfiniWebhookSecret) {
        options.push({
          key: 'InfiniWebhookSecret',
          value: values.InfiniWebhookSecret,
        })
      }

      for (const option of options) {
        await updateOption.mutateAsync(option)
      }

      form.setValue('InfiniSecretKey', '')
      form.setValue('InfiniWebhookSecret', '')
      toast.success(t('Updated successfully'))
    } catch {
      toast.error(t('Update failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsSection
      title={t('Infini Payment Gateway')}
      description={t('Configure Infini hosted checkout integration')}
    >
      <Alert>
        <AlertDescription className='text-xs'>
          {t('Webhook URL')}: {callbackAddress}/api/infini/webhook
        </AlertDescription>
      </Alert>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='flex items-center gap-2'>
          <Switch
            checked={form.watch('InfiniEnabled')}
            onCheckedChange={(value) => form.setValue('InfiniEnabled', value)}
          />
          <Label>{t('Enable Infini')}</Label>
        </div>
        <div className='flex items-center gap-2'>
          <Switch
            checked={form.watch('InfiniSandbox')}
            onCheckedChange={(value) => form.setValue('InfiniSandbox', value)}
          />
          <Label>{t('Sandbox mode')}</Label>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Custom API base URL')}</Label>
          <Input
            placeholder='https://openapi.infini.money'
            {...form.register('InfiniBaseURL')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Bill display name')}</Label>
          <Input {...form.register('InfiniMerchantAlias')} />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-1.5'>
          <Label>{t('Key ID / Public Key')}</Label>
          <Input autoComplete='off' {...form.register('InfiniKeyId')} />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Secret Key')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Leave blank to keep unchanged')}
            {...form.register('InfiniSecretKey')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Webhook Secret')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Leave blank to keep unchanged')}
            {...form.register('InfiniWebhookSecret')}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Success redirect URL')}</Label>
          <Input
            placeholder={t('Leave blank to use /console/topup')}
            {...form.register('InfiniSuccessURL')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Failure redirect URL')}</Label>
          <Input
            placeholder={t('Leave blank to use /console/topup')}
            {...form.register('InfiniFailureURL')}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-1.5'>
          <Label>{t('Unit price (USD / top-up unit)')}</Label>
          <Input
            type='number'
            min={0}
            step='0.000001'
            {...form.register('InfiniUnitPrice', { valueAsNumber: true })}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Minimum top-up')}</Label>
          <Input
            type='number'
            min={0}
            step='1'
            {...form.register('InfiniMinTopUp', { valueAsNumber: true })}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Order TTL seconds')}</Label>
          <Input
            type='number'
            min={0}
            step='1'
            placeholder='0'
            {...form.register('InfiniOrderTTLSeconds', {
              valueAsNumber: true,
            })}
          />
        </div>
      </div>

      <div className='grid gap-1.5'>
        <Label>{t('Infini payment methods')}</Label>
        <Textarea
          rows={6}
          className='font-mono text-xs'
          placeholder='[{"name":"Infini","type":"infini","color":"#4F46E5"}]'
          {...form.register('InfiniPayMethods')}
        />
        <p className='text-muted-foreground text-xs'>
          {t(
            'Use a JSON array. Optional pay_methods values can restrict Infini checkout methods.'
          )}
        </p>
      </div>

      <Button type='button' onClick={handleSave} disabled={loading}>
        {loading ? t('Saving...') : t('Save Infini settings')}
      </Button>
    </SettingsSection>
  )
}
