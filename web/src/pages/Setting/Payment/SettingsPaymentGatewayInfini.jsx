/*
Copyright (C) 2025 QuantumNous

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

import React, { useEffect, useRef, useState } from 'react';
import { Banner, Button, Col, Form, Row, Spin } from '@douyinfe/semi-ui';
import {
  API,
  removeTrailingSlash,
  showError,
  showSuccess,
  verifyJSON,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';
import { BookOpen, TriangleAlert } from 'lucide-react';

const toBoolean = (value) => value === true || value === 'true';

export default function SettingsPaymentGatewayInfini(props) {
  const { t } = useTranslation();
  const sectionTitle = props.hideSectionTitle ? undefined : t('Infini 设置');
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    InfiniEnabled: false,
    InfiniSandbox: false,
    InfiniBaseURL: '',
    InfiniKeyId: '',
    InfiniSecretKey: '',
    InfiniWebhookSecret: '',
    InfiniMerchantAlias: '',
    InfiniSuccessURL: '',
    InfiniFailureURL: '',
    InfiniUnitPrice: 1.0,
    InfiniMinTopUp: 1,
    InfiniOrderTTLSeconds: 0,
    InfiniPayMethods: '',
  });
  const [originInputs, setOriginInputs] = useState({});
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      let infiniPayMethods = props.options.InfiniPayMethods || '';
      try {
        infiniPayMethods = JSON.stringify(JSON.parse(infiniPayMethods), null, 2);
      } catch {
        infiniPayMethods = props.options.InfiniPayMethods || '';
      }

      const currentInputs = {
        InfiniEnabled: toBoolean(props.options.InfiniEnabled),
        InfiniSandbox: toBoolean(props.options.InfiniSandbox),
        InfiniBaseURL: props.options.InfiniBaseURL || '',
        InfiniKeyId: props.options.InfiniKeyId || '',
        InfiniSecretKey: '',
        InfiniWebhookSecret: '',
        InfiniMerchantAlias: props.options.InfiniMerchantAlias || '',
        InfiniSuccessURL: props.options.InfiniSuccessURL || '',
        InfiniFailureURL: props.options.InfiniFailureURL || '',
        InfiniUnitPrice:
          props.options.InfiniUnitPrice !== undefined
            ? parseFloat(props.options.InfiniUnitPrice)
            : 1.0,
        InfiniMinTopUp:
          props.options.InfiniMinTopUp !== undefined
            ? parseFloat(props.options.InfiniMinTopUp)
            : 1,
        InfiniOrderTTLSeconds:
          props.options.InfiniOrderTTLSeconds !== undefined
            ? parseInt(props.options.InfiniOrderTTLSeconds)
            : 0,
        InfiniPayMethods: infiniPayMethods,
      };
      setInputs(currentInputs);
      setOriginInputs({ ...currentInputs });
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs(values);
  };

  const submitInfiniSetting = async () => {
    const serverAddress = removeTrailingSlash(props.options.ServerAddress || '');
    const callbackAddress = removeTrailingSlash(
      props.options.CustomCallbackAddress || props.options.ServerAddress || '',
    );
    const successURL = removeTrailingSlash(inputs.InfiniSuccessURL || '');
    const failureURL = removeTrailingSlash(inputs.InfiniFailureURL || '');

    if (inputs.InfiniEnabled && !callbackAddress) {
      showError(t('启用 Infini 前请先在通用设置中填写服务器地址或回调地址'));
      return;
    }

    if (inputs.InfiniEnabled && !serverAddress && (!successURL || !failureURL)) {
      showError(
        t(
          '启用 Infini 前请先填写服务器地址，或分别填写支付成功和支付失败跳转地址',
        ),
      );
      return;
    }

    if (
      originInputs.InfiniPayMethods !== inputs.InfiniPayMethods &&
      !verifyJSON(inputs.InfiniPayMethods)
    ) {
      showError(t('Infini 支付方式配置不是合法的 JSON 字符串'));
      return;
    }

    setLoading(true);
    try {
      const options = [
        {
          key: 'InfiniEnabled',
          value: inputs.InfiniEnabled ? 'true' : 'false',
        },
        {
          key: 'InfiniSandbox',
          value: inputs.InfiniSandbox ? 'true' : 'false',
        },
        {
          key: 'InfiniBaseURL',
          value: removeTrailingSlash(inputs.InfiniBaseURL || ''),
        },
        {
          key: 'InfiniMerchantAlias',
          value: inputs.InfiniMerchantAlias || '',
        },
        {
          key: 'InfiniSuccessURL',
          value: successURL,
        },
        {
          key: 'InfiniFailureURL',
          value: failureURL,
        },
        {
          key: 'InfiniUnitPrice',
          value: String(inputs.InfiniUnitPrice || 1.0),
        },
        {
          key: 'InfiniMinTopUp',
          value: String(inputs.InfiniMinTopUp || 1),
        },
        {
          key: 'InfiniOrderTTLSeconds',
          value: String(inputs.InfiniOrderTTLSeconds || 0),
        },
        {
          key: 'InfiniPayMethods',
          value: inputs.InfiniPayMethods || '[]',
        },
      ];

      if (inputs.InfiniKeyId) {
        options.push({ key: 'InfiniKeyId', value: inputs.InfiniKeyId });
      }
      if (inputs.InfiniSecretKey) {
        options.push({
          key: 'InfiniSecretKey',
          value: inputs.InfiniSecretKey,
        });
      }
      if (inputs.InfiniWebhookSecret) {
        options.push({
          key: 'InfiniWebhookSecret',
          value: inputs.InfiniWebhookSecret,
        });
      }

      const results = await Promise.all(
        options.map((opt) =>
          API.put('/api/option/', {
            key: opt.key,
            value: opt.value,
          }),
        ),
      );

      const errorResults = results.filter((res) => !res.data.success);
      if (errorResults.length > 0) {
        errorResults.forEach((res) => showError(res.data.message));
      } else {
        showSuccess(t('更新成功'));
        setOriginInputs({
          ...inputs,
          InfiniSecretKey: '',
          InfiniWebhookSecret: '',
        });
        props.refresh?.();
      }
    } catch {
      showError(t('更新失败'));
    } finally {
      setLoading(false);
    }
  };

  const callbackAddress =
    removeTrailingSlash(
      props.options.CustomCallbackAddress || props.options.ServerAddress || '',
    ) || t('网站地址');

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={sectionTitle}>
          <Banner
            type='info'
            icon={<BookOpen size={16} />}
            description={
              <>
                Infini 开发者文档：
                <a
                  href='https://developer.infini.money'
                  target='_blank'
                  rel='noreferrer'
                >
                  developer.infini.money
                </a>
                <br />
                {t('Webhook 地址')}：{callbackAddress}/api/infini/webhook
              </>
            }
            style={{ marginBottom: 12 }}
          />
          <Banner
            type='warning'
            icon={<TriangleAlert size={16} />}
            description={t(
              'Infini Secret Key 与 Webhook Secret 仅会保存在后端，保存后不会回显；建议在 Infini 后台订阅 order.update 事件。',
            )}
            style={{ marginBottom: 16 }}
          />
          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Form.Switch
                field='InfiniEnabled'
                label={t('启用 Infini')}
                checkedText='｜'
                uncheckedText='〇'
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Switch
                field='InfiniSandbox'
                label={t('使用沙盒环境')}
                checkedText='｜'
                uncheckedText='〇'
              />
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Form.Input
                field='InfiniBaseURL'
                label={t('自定义 API 地址')}
                placeholder={t(
                  '留空则自动使用官方生产/沙盒地址，例如：https://openapi.infini.money',
                )}
              />
            </Col>
          </Row>
          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={12} md={8}>
              <Form.Input
                field='InfiniKeyId'
                label={t('Key ID / Public Key')}
                placeholder={t('Infini 开发者后台生成的 keyId / public key')}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Input
                field='InfiniSecretKey'
                label={t('Secret Key')}
                placeholder={t('留空表示保持当前不变')}
                type='password'
                extraText={t('仅首次展示的商户私钥，用于 API HMAC 签名')}
              />
            </Col>
            <Col xs={24} sm={24} md={8}>
              <Form.Input
                field='InfiniWebhookSecret'
                label={t('Webhook Secret')}
                placeholder={t('留空表示保持当前不变')}
                type='password'
                extraText={t('用于校验 X-Webhook-Signature，保存后不会回显')}
              />
            </Col>
          </Row>
          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={12} md={8}>
              <Form.Input
                field='InfiniMerchantAlias'
                label={t('账单名称')}
                placeholder={t('支付页面展示名称，例如：new-api')}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Input
                field='InfiniSuccessURL'
                label={t('支付成功跳转地址')}
                placeholder={t('留空则默认跳转到 /console/topup')}
              />
            </Col>
            <Col xs={24} sm={24} md={8}>
              <Form.Input
                field='InfiniFailureURL'
                label={t('支付失败跳转地址')}
                placeholder={t('留空则默认跳转到 /console/topup')}
              />
            </Col>
          </Row>
          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={8}>
              <Form.InputNumber
                field='InfiniUnitPrice'
                precision={6}
                label={t('每个充值单位对应的 USD 金额')}
                placeholder='1.0'
              />
            </Col>
            <Col xs={24} sm={8}>
              <Form.InputNumber
                field='InfiniMinTopUp'
                precision={0}
                label={t('最低充值数量')}
                placeholder='1'
              />
            </Col>
            <Col xs={24} sm={8}>
              <Form.InputNumber
                field='InfiniOrderTTLSeconds'
                precision={0}
                label={t('订单过期秒数')}
                placeholder={t('0 表示使用 Infini 后台默认值')}
              />
            </Col>
          </Row>
          <Row style={{ marginTop: 16 }}>
            <Col span={24}>
              <Form.TextArea
                field='InfiniPayMethods'
                label={t('Infini 支付方式配置')}
                autosize
                placeholder={t(
                  '为一个 JSON 数组，例如：[{"name":"Infini","type":"infini","color":"rgba(var(--semi-indigo-5), 1)"}]',
                )}
                extraText={t(
                  '省略 pay_methods 会继承 Infini 后台支付方式；需要限制时再填写 [1] 加密货币、[2] 卡支付等 Infini 支持的枚举。',
                )}
              />
            </Col>
          </Row>
          <Button onClick={submitInfiniSetting} style={{ marginTop: 16 }}>
            {t('保存 Infini 设置')}
          </Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}
