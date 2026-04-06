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
  copy,
  showError,
  showNotice,
  getLogo,
  getSystemName,
} from '../../helpers';
import { useSearchParams, Link } from 'react-router-dom';
import { Button, Form, Banner } from '@douyinfe/semi-ui';
import { IconMail, IconLock, IconCopy } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

const PasswordResetConfirm = () => {
  const { t } = useTranslation();
  const [inputs, setInputs] = useState({
    email: '',
    token: '',
  });
  const { email, token } = inputs;
  const isValidResetLink = email && token;

  const [loading, setLoading] = useState(false);
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [newPassword, setNewPassword] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [formApi, setFormApi] = useState(null);

  const logo = getLogo();
  const systemName = getSystemName();

  useEffect(() => {
    let token = searchParams.get('token');
    let email = searchParams.get('email');
    setInputs({
      token: token || '',
      email: email || '',
    });
    if (formApi) {
      formApi.setValues({
        email: email || '',
        newPassword: newPassword || '',
      });
    }
  }, [searchParams, newPassword, formApi]);

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

  async function handleSubmit(e) {
    if (!email || !token) {
      showError(t('无效的重置链接，请重新发起密码重置请求'));
      return;
    }
    setDisableButton(true);
    setLoading(true);
    const res = await API.post(`/api/user/reset`, {
      email,
      token,
    });
    const { success, message } = res.data;
    if (success) {
      let password = res.data.data;
      setNewPassword(password);
      await copy(password);
      showNotice(`${t('密码已重置并已复制到剪贴板：')} ${password}`);
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

          <h1 className='text-2xl font-bold text-semi-color-text-0 mb-2'>{t('确认密码重置')}</h1>
          <p className='text-sm text-semi-color-text-2 mb-8'>{t('密码重置确认')}</p>

          {!isValidResetLink && (
            <Banner
              type='danger'
              description={t('无效的重置链接，请重新发起密码重置请求')}
              className='mb-4 !rounded-lg'
              closeIcon={null}
            />
          )}

          <Form
            getFormApi={(api) => setFormApi(api)}
            initValues={{
              email: email || '',
              newPassword: newPassword || '',
            }}
            className='space-y-4'
          >
            <Form.Input
              field='email'
              label={t('邮箱')}
              name='email'
              disabled={true}
              prefix={<IconMail />}
              placeholder={email ? '' : t('等待获取邮箱信息...')}
            />

            {newPassword && (
              <Form.Input
                field='newPassword'
                label={t('新密码')}
                name='newPassword'
                disabled={true}
                prefix={<IconLock />}
                suffix={
                  <Button
                    icon={<IconCopy />}
                    type='tertiary'
                    theme='borderless'
                    onClick={async () => {
                      await copy(newPassword);
                      showNotice(
                        `${t('密码已复制到剪贴板：')} ${newPassword}`,
                      );
                    }}
                  >
                    {t('复制')}
                  </Button>
                }
              />
            )}

            <div className='space-y-2 pt-2'>
              <Button
                theme='solid'
                className='w-full !rounded-lg'
                type='primary'
                htmlType='submit'
                onClick={handleSubmit}
                loading={loading}
                disabled={
                  disableButton || newPassword || !isValidResetLink
                }
              >
                {newPassword ? t('密码重置完成') : t('确认重置密码')}
              </Button>
            </div>
          </Form>

          <p className='text-center text-sm text-semi-color-text-2 mt-6'>
            <Link to='/login' className='text-semi-color-primary font-medium hover:opacity-80'>
              {t('返回登录')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetConfirm;
