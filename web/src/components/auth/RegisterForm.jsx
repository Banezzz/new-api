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

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  API,
  getLogo,
  showError,
  showInfo,
  showSuccess,
  updateAPI,
  getSystemName,
  getOAuthProviderIcon,
  setUserData,
  onDiscordOAuthClicked,
  onCustomOAuthClicked,
} from '../../helpers';
import Turnstile from 'react-turnstile';
import {
  Button,
  Checkbox,
  Form,
  Icon,
  Modal,
} from '@douyinfe/semi-ui';
import {
  IconGithubLogo,
  IconMail,
  IconUser,
  IconLock,
  IconKey,
} from '@douyinfe/semi-icons';
import {
  onGitHubOAuthClicked,
  onLinuxDOOAuthClicked,
  onOIDCClicked,
} from '../../helpers';
import OIDCIcon from '../common/logo/OIDCIcon';
import LinuxDoIcon from '../common/logo/LinuxDoIcon';
import WeChatIcon from '../common/logo/WeChatIcon';
import TelegramLoginButton from 'react-telegram-login/src';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';
import { useTranslation } from 'react-i18next';
import { SiDiscord } from 'react-icons/si';

const RegisterForm = () => {
  let navigate = useNavigate();
  const { t } = useTranslation();
  const githubButtonTextKeyByState = {
    idle: '使用 GitHub 继续',
    redirecting: '正在跳转 GitHub...',
    timeout: '请求超时，请刷新页面后重新发起 GitHub 登录',
  };
  const [inputs, setInputs] = useState({
    username: '',
    password: '',
    password2: '',
    email: '',
    verification_code: '',
    wechat_verification_code: '',
  });
  const { username, password, password2 } = inputs;
  const [userState, userDispatch] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [showWeChatLoginModal, setShowWeChatLoginModal] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);
  const [linuxdoLoading, setLinuxdoLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [verificationCodeLoading, setVerificationCodeLoading] = useState(false);
  const [wechatCodeSubmitLoading, setWechatCodeSubmitLoading] = useState(false);
  const [customOAuthLoading, setCustomOAuthLoading] = useState({});
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasUserAgreement, setHasUserAgreement] = useState(false);
  const [hasPrivacyPolicy, setHasPrivacyPolicy] = useState(false);
  const [githubButtonState, setGithubButtonState] = useState('idle');
  const [githubButtonDisabled, setGithubButtonDisabled] = useState(false);
  const githubTimeoutRef = useRef(null);
  const githubButtonText = t(githubButtonTextKeyByState[githubButtonState]);

  const logo = getLogo();
  const systemName = getSystemName();

  let affCode = new URLSearchParams(window.location.search).get('aff');
  if (affCode) {
    localStorage.setItem('aff', affCode);
  }

  const status = useMemo(() => {
    if (statusState?.status) return statusState.status;
    const savedStatus = localStorage.getItem('status');
    if (!savedStatus) return {};
    try {
      return JSON.parse(savedStatus) || {};
    } catch (err) {
      return {};
    }
  }, [statusState?.status]);
  const hasCustomOAuthProviders =
    (status.custom_oauth_providers || []).length > 0;
  const hasOAuthRegisterOptions = Boolean(
    status.github_oauth ||
      status.discord_oauth ||
      status.oidc_enabled ||
      status.wechat_login ||
      status.linuxdo_oauth ||
      status.telegram_oauth ||
      hasCustomOAuthProviders,
  );

  const [showEmailVerification, setShowEmailVerification] = useState(false);

  useEffect(() => {
    setShowEmailVerification(!!status?.email_verification);
    if (status?.turnstile_check) {
      setTurnstileEnabled(true);
      setTurnstileSiteKey(status.turnstile_site_key);
    }

    // 从 status 获取用户协议和隐私政策的启用状态
    setHasUserAgreement(status?.user_agreement_enabled || false);
    setHasPrivacyPolicy(status?.privacy_policy_enabled || false);
  }, [status]);

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
    return () => clearInterval(countdownInterval); // Clean up on unmount
  }, [disableButton, countdown]);

  useEffect(() => {
    return () => {
      if (githubTimeoutRef.current) {
        clearTimeout(githubTimeoutRef.current);
      }
    };
  }, []);

  const onWeChatLoginClicked = () => {
    setWechatLoading(true);
    setShowWeChatLoginModal(true);
    setWechatLoading(false);
  };

  const onSubmitWeChatVerificationCode = async () => {
    if (turnstileEnabled && turnstileToken === '') {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    setWechatCodeSubmitLoading(true);
    try {
      const res = await API.get(
        `/api/oauth/wechat?code=${inputs.wechat_verification_code}`,
      );
      const { success, message, data } = res.data;
      if (success) {
        userDispatch({ type: 'login', payload: data });
        localStorage.setItem('user', JSON.stringify(data));
        setUserData(data);
        updateAPI();
        navigate('/');
        showSuccess('登录成功！');
        setShowWeChatLoginModal(false);
      } else {
        showError(message);
      }
    } catch (error) {
      showError('登录失败，请重试');
    } finally {
      setWechatCodeSubmitLoading(false);
    }
  };

  function handleChange(name, value) {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  }

  async function handleSubmit(e) {
    if (password.length < 8) {
      showInfo('密码长度不得小于 8 位！');
      return;
    }
    if (password !== password2) {
      showInfo('两次输入的密码不一致');
      return;
    }
    if (username && password) {
      if (turnstileEnabled && turnstileToken === '') {
        showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
        return;
      }
      setRegisterLoading(true);
      try {
        if (!affCode) {
          affCode = localStorage.getItem('aff');
        }
        inputs.aff_code = affCode;
        const res = await API.post(
          `/api/user/register?turnstile=${turnstileToken}`,
          inputs,
        );
        const { success, message } = res.data;
        if (success) {
          navigate('/login');
          showSuccess('注册成功！');
        } else {
          showError(message);
        }
      } catch (error) {
        showError('注册失败，请重试');
      } finally {
        setRegisterLoading(false);
      }
    }
  }

  const sendVerificationCode = async () => {
    if (inputs.email === '') return;
    if (turnstileEnabled && turnstileToken === '') {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    setVerificationCodeLoading(true);
    try {
      const res = await API.get(
        `/api/verification?email=${encodeURIComponent(inputs.email)}&turnstile=${turnstileToken}`,
      );
      const { success, message } = res.data;
      if (success) {
        showSuccess('验证码发送成功，请检查你的邮箱！');
        setDisableButton(true); // 发送成功后禁用按钮，开始倒计时
      } else {
        showError(message);
      }
    } catch (error) {
      showError('发送验证码失败，请重试');
    } finally {
      setVerificationCodeLoading(false);
    }
  };

  const handleGitHubClick = () => {
    if (githubButtonDisabled) {
      return;
    }
    setGithubLoading(true);
    setGithubButtonDisabled(true);
    setGithubButtonState('redirecting');
    if (githubTimeoutRef.current) {
      clearTimeout(githubTimeoutRef.current);
    }
    githubTimeoutRef.current = setTimeout(() => {
      setGithubLoading(false);
      setGithubButtonState('timeout');
      setGithubButtonDisabled(true);
    }, 20000);
    try {
      onGitHubOAuthClicked(status.github_client_id, { shouldLogout: true });
    } finally {
      setTimeout(() => setGithubLoading(false), 3000);
    }
  };

  const handleDiscordClick = () => {
    setDiscordLoading(true);
    try {
      onDiscordOAuthClicked(status.discord_client_id, { shouldLogout: true });
    } finally {
      setTimeout(() => setDiscordLoading(false), 3000);
    }
  };

  const handleOIDCClick = () => {
    setOidcLoading(true);
    try {
      onOIDCClicked(
        status.oidc_authorization_endpoint,
        status.oidc_client_id,
        false,
        { shouldLogout: true },
      );
    } finally {
      setTimeout(() => setOidcLoading(false), 3000);
    }
  };

  const handleLinuxDOClick = () => {
    setLinuxdoLoading(true);
    try {
      onLinuxDOOAuthClicked(status.linuxdo_client_id, { shouldLogout: true });
    } finally {
      setTimeout(() => setLinuxdoLoading(false), 3000);
    }
  };

  const handleCustomOAuthClick = (provider) => {
    setCustomOAuthLoading((prev) => ({ ...prev, [provider.slug]: true }));
    try {
      onCustomOAuthClicked(provider, { shouldLogout: true });
    } finally {
      setTimeout(() => {
        setCustomOAuthLoading((prev) => ({ ...prev, [provider.slug]: false }));
      }, 3000);
    }
  };


  const onTelegramLoginClicked = async (response) => {
    const fields = [
      'id',
      'first_name',
      'last_name',
      'username',
      'photo_url',
      'auth_date',
      'hash',
      'lang',
    ];
    const params = {};
    fields.forEach((field) => {
      if (response[field]) {
        params[field] = response[field];
      }
    });
    try {
      const res = await API.get(`/api/oauth/telegram/login`, { params });
      const { success, message, data } = res.data;
      if (success) {
        userDispatch({ type: 'login', payload: data });
        localStorage.setItem('user', JSON.stringify(data));
        showSuccess('登录成功！');
        setUserData(data);
        updateAPI();
        navigate('/');
      } else {
        showError(message);
      }
    } catch (error) {
      showError('登录失败，请重试');
    }
  };

  const renderOAuthCircles = () => {
    const oauthButtons = [];

    if (status.wechat_login) {
      oauthButtons.push(
        <button key='wechat' onClick={onWeChatLoginClicked} className='w-10 h-10 rounded-full border border-semi-color-border flex items-center justify-center hover:bg-semi-color-fill-1 transition-colors' title={t('使用 微信 继续')}>
          <Icon svg={<WeChatIcon />} style={{ color: '#07C160' }} />
        </button>
      );
    }

    if (status.github_oauth) {
      oauthButtons.push(
        <button key='github' onClick={handleGitHubClick} disabled={githubButtonDisabled} className='w-10 h-10 rounded-full border border-semi-color-border flex items-center justify-center hover:bg-semi-color-fill-1 transition-colors disabled:opacity-50' title={t('使用 GitHub 继续')}>
          <IconGithubLogo size='large' />
        </button>
      );
    }

    if (status.discord_oauth) {
      oauthButtons.push(
        <button key='discord' onClick={handleDiscordClick} className='w-10 h-10 rounded-full border border-semi-color-border flex items-center justify-center hover:bg-semi-color-fill-1 transition-colors' title={t('使用 Discord 继续')}>
          <SiDiscord style={{ color: '#5865F2', width: '18px', height: '18px' }} />
        </button>
      );
    }

    if (status.oidc_enabled) {
      oauthButtons.push(
        <button key='oidc' onClick={handleOIDCClick} className='w-10 h-10 rounded-full border border-semi-color-border flex items-center justify-center hover:bg-semi-color-fill-1 transition-colors' title={t('使用 OIDC 继续')}>
          <OIDCIcon style={{ color: '#1877F2', width: '18px', height: '18px' }} />
        </button>
      );
    }

    if (status.linuxdo_oauth) {
      oauthButtons.push(
        <button key='linuxdo' onClick={handleLinuxDOClick} className='w-10 h-10 rounded-full border border-semi-color-border flex items-center justify-center hover:bg-semi-color-fill-1 transition-colors' title={t('使用 LinuxDO 继续')}>
          <LinuxDoIcon style={{ color: '#E95420', width: '18px', height: '18px' }} />
        </button>
      );
    }

    if (status.custom_oauth_providers) {
      status.custom_oauth_providers.forEach((provider) => {
        oauthButtons.push(
          <button key={provider.slug} onClick={() => handleCustomOAuthClick(provider)} className='w-10 h-10 rounded-full border border-semi-color-border flex items-center justify-center hover:bg-semi-color-fill-1 transition-colors' title={t('使用 {{name}} 继续', { name: provider.name })}>
            {getOAuthProviderIcon(provider.icon || '', 18)}
          </button>
        );
      });
    }

    return oauthButtons;
  };

  const renderWeChatLoginModal = () => {
    return (
      <Modal
        title={t('微信扫码登录')}
        visible={showWeChatLoginModal}
        maskClosable={true}
        onOk={onSubmitWeChatVerificationCode}
        onCancel={() => setShowWeChatLoginModal(false)}
        okText={t('登录')}
        centered={true}
        okButtonProps={{
          loading: wechatCodeSubmitLoading,
        }}
      >
        <div className='flex flex-col items-center'>
          <img src={status.wechat_qrcode} alt='微信二维码' className='mb-4' />
        </div>

        <div className='text-center mb-4'>
          <p>
            {t('微信扫码关注公众号，输入「验证码」获取验证码（三分钟内有效）')}
          </p>
        </div>

        <Form>
          <Form.Input
            field='wechat_verification_code'
            placeholder={t('验证码')}
            label={t('验证码')}
            value={inputs.wechat_verification_code}
            onChange={(value) =>
              handleChange('wechat_verification_code', value)
            }
          />
        </Form>
      </Modal>
    );
  };

  const oauthCircles = renderOAuthCircles();
  const hasOAuthCircles = oauthCircles.length > 0;

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

          <h1 className='text-2xl font-bold text-semi-color-text-0 mb-2'>{t('注册')}</h1>
          <p className='text-sm text-semi-color-text-2 mb-8'>{t('注册以开始使用')}</p>

          {/* OAuth buttons as icon circles */}
          {hasOAuthCircles && (
            <>
              <div className='flex items-center gap-3 mb-6'>
                {oauthCircles}
              </div>

              {status.telegram_oauth && (
                <div className='flex justify-center mb-4'>
                  <TelegramLoginButton
                    dataOnauth={onTelegramLoginClicked}
                    botName={status.telegram_bot_name}
                  />
                </div>
              )}

              <div className='flex items-center gap-3 mb-6'>
                <div className='flex-1 h-px bg-semi-color-border' />
                <span className='text-xs text-semi-color-text-3'>{t('或')}</span>
                <div className='flex-1 h-px bg-semi-color-border' />
              </div>
            </>
          )}

          {/* Telegram (shown standalone when no other OAuth) */}
          {!hasOAuthCircles && status.telegram_oauth && (
            <div className='flex justify-center mb-6'>
              <TelegramLoginButton
                dataOnauth={onTelegramLoginClicked}
                botName={status.telegram_bot_name}
              />
            </div>
          )}

          {/* Registration form - always shown */}
          <Form className='space-y-3'>
            <Form.Input
              field='username'
              label={t('用户名')}
              placeholder={t('请输入用户名')}
              name='username'
              onChange={(value) => handleChange('username', value)}
              prefix={<IconUser />}
            />

            <Form.Input
              field='password'
              label={t('密码')}
              placeholder={t('输入密码，最短 8 位，最长 20 位')}
              name='password'
              mode='password'
              onChange={(value) => handleChange('password', value)}
              prefix={<IconLock />}
            />

            <Form.Input
              field='password2'
              label={t('确认密码')}
              placeholder={t('确认密码')}
              name='password2'
              mode='password'
              onChange={(value) => handleChange('password2', value)}
              prefix={<IconLock />}
            />

            {showEmailVerification && (
              <>
                <Form.Input
                  field='email'
                  label={t('邮箱')}
                  placeholder={t('输入邮箱地址')}
                  name='email'
                  type='email'
                  onChange={(value) => handleChange('email', value)}
                  prefix={<IconMail />}
                  suffix={
                    <Button
                      onClick={sendVerificationCode}
                      loading={verificationCodeLoading}
                      disabled={disableButton || verificationCodeLoading}
                    >
                      {disableButton
                        ? `${t('重新发送')} (${countdown})`
                        : t('获取验证码')}
                    </Button>
                  }
                />
                <Form.Input
                  field='verification_code'
                  label={t('验证码')}
                  placeholder={t('输入验证码')}
                  name='verification_code'
                  onChange={(value) =>
                    handleChange('verification_code', value)
                  }
                  prefix={<IconKey />}
                />
              </>
            )}

            {(hasUserAgreement || hasPrivacyPolicy) && (
              <div className='pt-4'>
                <Checkbox
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                >
                  <span className='text-xs text-semi-color-text-2'>
                    {t('我已阅读并同意')}
                    {hasUserAgreement && (
                      <a
                        href='/user-agreement'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='!text-semi-color-primary hover:opacity-80 mx-1'
                      >
                        {t('用户协议')}
                      </a>
                    )}
                    {hasUserAgreement && hasPrivacyPolicy && t('和')}
                    {hasPrivacyPolicy && (
                      <a
                        href='/privacy-policy'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='!text-semi-color-primary hover:opacity-80 mx-1'
                      >
                        {t('隐私政策')}
                      </a>
                    )}
                  </span>
                </Checkbox>
              </div>
            )}

            <div className='space-y-2 pt-2'>
              <Button
                theme='solid'
                className='w-full !rounded-lg'
                type='primary'
                htmlType='submit'
                onClick={handleSubmit}
                loading={registerLoading}
                disabled={
                  (hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms
                }
              >
                {t('注册')}
              </Button>
            </div>
          </Form>

          {/* Login link */}
          <p className='text-center text-sm text-semi-color-text-2 mt-6'>
            {t('已有账号？')}{' '}
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

      {renderWeChatLoginModal()}
    </div>
  );
};

export default RegisterForm;
