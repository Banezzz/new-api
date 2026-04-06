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

import React, { useEffect, useState } from 'react';
import {
  API,
  getLogo,
  showError,
  showInfo,
  showSuccess,
  getSystemName,
} from '../../helpers';
import Turnstile from 'react-turnstile';
import { Button, Form } from '@douyinfe/semi-ui';
import { IconMail } from '@douyinfe/semi-icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PasswordResetForm = () => {
  const { t } = useTranslation();
  const [inputs, setInputs] = useState({
    email: '',
  });
  const { email } = inputs;

  const [loading, setLoading] = useState(false);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const logo = getLogo();
  const systemName = getSystemName();

  useEffect(() => {
    let status = localStorage.getItem('status');
    if (status) {
      status = JSON.parse(status);
      if (status.turnstile_check) {
        setTurnstileEnabled(true);
        setTurnstileSiteKey(status.turnstile_site_key);
      }
    }
  }, []);

  useEffect(() => {
    let countdownInterval = null;
    if (disableButton && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      setDisableButton(false);
      setCountdown(30);
    }
    return () => clearInterval(countdownInterval);
  }, [disableButton, countdown]);

  function handleChange(value) {
    setInputs((inputs) => ({ ...inputs, email: value }));
  }

  async function handleSubmit(e) {
    if (!email) {
      showError(t('请输入邮箱地址'));
      return;
    }
    if (turnstileEnabled && turnstileToken === '') {
      showInfo(t('请稍后几秒重试，Turnstile 正在检查用户环境！'));
      return;
    }
    setDisableButton(true);
    setLoading(true);
    const res = await API.get(
      `/api/reset_password?email=${email}&turnstile=${turnstileToken}`,
    );
    const { success, message } = res.data;
    if (success) {
      showSuccess(t('重置邮件发送成功，请检查邮箱！'));
      setInputs({ ...inputs, email: '' });
    } else {
      showError(message);
    }
    setLoading(false);
  }

  return (
    <div className='min-h-screen flex'>
      {/* Left: Branding Panel (hidden on mobile) */}
      <div className='hidden lg:flex lg:w-1/2 home-hero-bg home-grid-overlay items-center justify-center p-12'>
        <div className='text-center'>
          <img src={logo} alt='' className='w-16 h-16 rounded-xl mx-auto mb-6' />
          <h2 className='text-2xl font-bold text-white mb-2'>{systemName}</h2>
          <p className='text-white/50 text-sm'>{t('统一的 AI 模型聚合与分发网关')}</p>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className='w-full lg:w-1/2 flex items-center justify-center bg-semi-color-bg-0 p-6 md:p-12'>
        <div className='w-full max-w-sm'>
          {/* Logo (mobile only) */}
          <div className='lg:hidden flex items-center gap-3 mb-8'>
            <img src={logo} alt='' className='w-10 h-10 rounded-lg' />
            <span className='font-semibold text-semi-color-text-0'>{systemName}</span>
          </div>

          <h1 className='text-2xl font-bold text-semi-color-text-0 mb-2'>{t('重置您的密码')}</h1>
          <p className='text-sm text-semi-color-text-2 mb-8'>{t('输入邮箱以接收重置链接')}</p>

          <Form className='space-y-3'>
            <Form.Input
              field='email'
              label={t('邮箱')}
              placeholder={t('请输入您的邮箱地址')}
              name='email'
              value={email}
              onChange={handleChange}
              prefix={<IconMail />}
            />

            <div className='space-y-2 pt-2'>
              <Button
                theme='solid'
                className='w-full !rounded-lg'
                type='primary'
                htmlType='submit'
                onClick={handleSubmit}
                loading={loading}
                disabled={disableButton}
              >
                {disableButton
                  ? `${t('重试')} (${countdown})`
                  : t('提交')}
              </Button>
            </div>
          </Form>

          <p className='text-center text-sm text-semi-color-text-2 mt-6'>
            {t('想起来了？')}{' '}
            <Link to='/login' className='text-semi-color-primary font-medium hover:opacity-80'>
              {t('登录')}
            </Link>
          </p>

          {turnstileEnabled && (
            <div className='flex justify-center mt-6'>
              <Turnstile
                sitekey={turnstileSiteKey}
                onVerify={(token) => {
                  setTurnstileToken(token);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordResetForm;
