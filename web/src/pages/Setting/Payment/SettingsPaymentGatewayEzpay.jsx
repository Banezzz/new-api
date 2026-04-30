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
} from '../../../helpers';
import { useTranslation } from 'react-i18next';
import { BookOpen, TriangleAlert } from 'lucide-react';

const toBoolean = (value) => value === true || value === 'true';

export default function SettingsPaymentGatewayEpusdt(props) {
  const { t } = useTranslation();
  const sectionTitle = props.hideSectionTitle ? undefined : t('EPUSDT 设置');
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    EpusdtEnabled: false,
    EpusdtBaseURL: '',
    EpusdtPublicURL: '',
    EpusdtPID: '',
    EpusdtSecretKey: '',
    EpusdtNotifyURL: '',
    EpusdtReturnURL: '',
    EpusdtUnitPrice: 1,
    EpusdtMinTopUp: 1,
  });
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const currentInputs = {
        EpusdtEnabled: toBoolean(props.options.EpusdtEnabled),
        EpusdtBaseURL: props.options.EpusdtBaseURL || '',
        EpusdtPublicURL: props.options.EpusdtPublicURL || '',
        EpusdtPID: props.options.EpusdtPID || '',
        EpusdtSecretKey: '',
        EpusdtNotifyURL: props.options.EpusdtNotifyURL || '',
        EpusdtReturnURL: props.options.EpusdtReturnURL || '',
        EpusdtUnitPrice:
          props.options.EpusdtUnitPrice !== undefined
            ? parseFloat(props.options.EpusdtUnitPrice)
            : 1,
        EpusdtMinTopUp:
          props.options.EpusdtMinTopUp !== undefined
            ? parseInt(props.options.EpusdtMinTopUp)
            : 1,
      };
      setInputs(currentInputs);
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs(values);
  };

  const submitEpusdtSetting = async () => {
    const callbackAddress = removeTrailingSlash(
      props.options.CustomCallbackAddress || props.options.ServerAddress || '',
    );
    const notifyURL = removeTrailingSlash(inputs.EpusdtNotifyURL || '');
    const returnURL = removeTrailingSlash(inputs.EpusdtReturnURL || '');

    if (inputs.EpusdtEnabled && !notifyURL && !callbackAddress) {
      showError(
        t('启用 EPUSDT 前请先填写服务器地址、回调地址或 EPUSDT 自定义回调地址'),
      );
      return;
    }

    setLoading(true);
    try {
      const options = [
        {
          key: 'EpusdtEnabled',
          value: inputs.EpusdtEnabled ? 'true' : 'false',
        },
        {
          key: 'EpusdtBaseURL',
          value: removeTrailingSlash(inputs.EpusdtBaseURL || ''),
        },
        {
          key: 'EpusdtPublicURL',
          value: removeTrailingSlash(inputs.EpusdtPublicURL || ''),
        },
        {
          key: 'EpusdtPID',
          value: inputs.EpusdtPID || '',
        },
        {
          key: 'EpusdtNotifyURL',
          value: notifyURL,
        },
        {
          key: 'EpusdtReturnURL',
          value: returnURL,
        },
        {
          key: 'EpusdtUnitPrice',
          value: String(inputs.EpusdtUnitPrice || 1),
        },
        {
          key: 'EpusdtMinTopUp',
          value: String(inputs.EpusdtMinTopUp || 1),
        },
      ];

      if (inputs.EpusdtSecretKey) {
        options.push({
          key: 'EpusdtSecretKey',
          value: inputs.EpusdtSecretKey,
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
        setInputs((prev) => ({ ...prev, EpusdtSecretKey: '' }));
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
                {t('EPUSDT 内网 API 地址默认可使用')}：http://epusdt:8001
                <br />
                {t('Webhook 地址')}：
                {inputs.EpusdtNotifyURL ||
                  `${callbackAddress}/api/epusdt/webhook`}
                <br />
                {t('EPUSDT 收银台支持用户动态选择币种和网络，无需在此配置')}
              </>
            }
            style={{ marginBottom: 12 }}
          />
          <Banner
            type='warning'
            icon={<TriangleAlert size={16} />}
            description={t(
              'EPUSDT Secret Key 仅会保存在后端，保存后不会回显；如果 EPUSDT 容器只在内网访问，请将回调地址配置为容器可访问的内网地址。',
            )}
            style={{ marginBottom: 16 }}
          />
          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Form.Switch
                field='EpusdtEnabled'
                label={t('启用 EPUSDT')}
                checkedText='｜'
                uncheckedText='〇'
              />
            </Col>
            <Col xs={24} sm={12} md={9}>
              <Form.Input
                field='EpusdtBaseURL'
                label={t('内网 API 地址')}
                placeholder='http://epusdt:8001'
                extraText={t('new-api 后端访问 EPUSDT 容器的地址')}
              />
            </Col>
            <Col xs={24} sm={24} md={9}>
              <Form.Input
                field='EpusdtPublicURL'
                label={t('浏览器支付页地址')}
                placeholder={t('留空则使用 EPUSDT 返回的 payment_url')}
                extraText={t('需要经域名或反代打开收银台时填写')}
              />
            </Col>
          </Row>
          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={12} md={8}>
              <Form.Input
                field='EpusdtPID'
                label='PID'
                placeholder={t('EPUSDT API Key 的 PID')}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Input
                field='EpusdtSecretKey'
                label='Secret Key'
                placeholder={t('留空表示保持当前不变')}
                type='password'
                extraText={t('用于创建订单和校验回调签名')}
              />
            </Col>
          </Row>
          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={12}>
              <Form.Input
                field='EpusdtNotifyURL'
                label={t('自定义回调地址')}
                placeholder='http://new-api:3000/api/epusdt/webhook'
                extraText={t(
                  '留空则使用通用回调地址；Docker 内网建议填写容器地址',
                )}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Form.Input
                field='EpusdtReturnURL'
                label={t('支付后跳转地址')}
                placeholder={t('留空则默认跳转到 /console/topup')}
              />
            </Col>
          </Row>
          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={12}>
              <Form.InputNumber
                field='EpusdtUnitPrice'
                precision={6}
                label={t('每个充值单位对应的法币金额')}
                placeholder='1'
              />
            </Col>
            <Col xs={24} sm={12}>
              <Form.InputNumber
                field='EpusdtMinTopUp'
                precision={0}
                label={t('最低充值数量')}
                placeholder='1'
              />
            </Col>
          </Row>
          <Button onClick={submitEpusdtSetting} style={{ marginTop: 16 }}>
            {t('保存 EPUSDT 设置')}
          </Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}
