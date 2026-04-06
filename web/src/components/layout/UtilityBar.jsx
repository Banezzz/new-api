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

import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Dropdown, Avatar } from '@douyinfe/semi-ui';
import { Sun, Moon, Monitor, Bell } from 'lucide-react';
import {
  IconExit,
  IconUserSetting,
  IconCreditCard,
  IconKey,
} from '@douyinfe/semi-icons';
import { stringToColor } from '../../helpers';

const ROUTE_LABELS = {
  '/console': '仪表盘',
  '/console/channel': '渠道管理',
  '/console/token': '令牌管理',
  '/console/log': '使用日志',
  '/console/midjourney': '绘图日志',
  '/console/task': '任务日志',
  '/console/topup': '钱包管理',
  '/console/user': '用户管理',
  '/console/setting': '系统设置',
  '/console/models': '模型管理',
  '/console/deployment': '模型部署',
  '/console/subscription': '订阅管理',
  '/console/redemption': '兑换码管理',
  '/console/playground': '操练场',
  '/console/personal': '个人设置',
  '/pricing': '接口目录',
  '/about': '关于',
  '/': '首页',
};

const UtilityBar = ({
  userState,
  isMobile,
  theme,
  currentLang,
  unreadCount,
  onNoticeOpen,
  onThemeToggle,
  onLanguageChange,
  isSelfUseMode,
  logout,
  navigate,
  t,
}) => {
  const location = useLocation();

  // Build breadcrumb from current path
  const buildBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return [{ label: t('首页'), active: true }];

    const parts = [];
    if (path.startsWith('/console')) {
      parts.push({ label: t('仪表盘'), path: '/console' });
      const routeLabel = ROUTE_LABELS[path];
      if (routeLabel && path !== '/console') {
        parts.push({ label: t(routeLabel), active: true });
      } else if (path !== '/console') {
        // Handle chat routes etc
        parts.push({ label: path.split('/').pop(), active: true });
      } else {
        parts[0].active = true;
      }
    } else {
      const routeLabel = ROUTE_LABELS[path];
      parts.push({ label: t(routeLabel || path.slice(1)), active: true });
    }
    return parts;
  };

  const breadcrumb = buildBreadcrumb();

  // Theme options
  const themeOptions = [
    { key: 'light', icon: <Sun size={14} />, label: t('浅色') },
    { key: 'dark', icon: <Moon size={14} />, label: t('深色') },
    { key: 'auto', icon: <Monitor size={14} />, label: t('跟随系统') },
  ];

  // Language options
  const languages = [
    { key: 'zh-CN', label: '简体中文' },
    { key: 'zh-TW', label: '繁體中文' },
    { key: 'en', label: 'English' },
    { key: 'ja', label: '日本語' },
    { key: 'fr', label: 'Français' },
    { key: 'ru', label: 'Русский' },
    { key: 'vi', label: 'Tiếng Việt' },
  ];

  return (
    <div className='utility-bar'>
      {/* Breadcrumb */}
      <div className='utility-bar-breadcrumb'>
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span className='text-semi-color-text-3'>/</span>
            )}
            <span
              className={
                crumb.active ? 'utility-bar-breadcrumb-active' : ''
              }
            >
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Actions */}
      <div className='utility-bar-actions'>
        {/* Notification */}
        <Button
          theme='borderless'
          type='tertiary'
          icon={<Bell size={16} />}
          className='!rounded-md relative'
          onClick={onNoticeOpen}
          size='small'
        />
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500' />
        )}

        {/* Theme Toggle */}
        <Dropdown
          position='bottomRight'
          render={
            <Dropdown.Menu className='!rounded-lg !shadow-lg'>
              {themeOptions.map((opt) => (
                <Dropdown.Item
                  key={opt.key}
                  onClick={() => onThemeToggle(opt.key)}
                  active={theme === opt.key}
                  className='!text-sm'
                >
                  <div className='flex items-center gap-2'>
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          }
        >
          <Button
            theme='borderless'
            type='tertiary'
            icon={
              theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />
            }
            className='!rounded-md'
            size='small'
          />
        </Dropdown>

        {/* Language */}
        <Dropdown
          position='bottomRight'
          render={
            <Dropdown.Menu className='!rounded-lg !shadow-lg'>
              {languages.map((lang) => (
                <Dropdown.Item
                  key={lang.key}
                  onClick={() => onLanguageChange(lang.key)}
                  active={currentLang === lang.key}
                  className='!text-sm'
                >
                  {lang.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          }
        >
          <Button
            theme='borderless'
            type='tertiary'
            className='!rounded-md !text-xs !font-medium'
            size='small'
          >
            {(currentLang || 'zh').toUpperCase()}
          </Button>
        </Dropdown>

        {/* User Area */}
        {userState?.user ? (
          <Dropdown
            position='bottomRight'
            render={
              <Dropdown.Menu className='!rounded-lg !shadow-lg'>
                <Dropdown.Item
                  onClick={() => navigate('/console/personal')}
                  className='!text-sm'
                >
                  <div className='flex items-center gap-2'>
                    <IconUserSetting size='small' />
                    <span>{t('个人设置')}</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => navigate('/console/token')}
                  className='!text-sm'
                >
                  <div className='flex items-center gap-2'>
                    <IconKey size='small' />
                    <span>{t('令牌管理')}</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => navigate('/console/topup')}
                  className='!text-sm'
                >
                  <div className='flex items-center gap-2'>
                    <IconCreditCard size='small' />
                    <span>{t('钱包管理')}</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item onClick={logout} className='!text-sm'>
                  <div className='flex items-center gap-2'>
                    <IconExit size='small' />
                    <span>{t('退出')}</span>
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            }
          >
            <Button
              theme='borderless'
              type='tertiary'
              className='!rounded-full !p-0.5'
              size='small'
            >
              <Avatar
                size='extra-small'
                color={stringToColor(userState.user.username)}
                style={{ width: 24, height: 24 }}
              >
                {userState.user.username[0].toUpperCase()}
              </Avatar>
            </Button>
          </Dropdown>
        ) : (
          <Button
            theme='solid'
            type='primary'
            size='small'
            className='!rounded-md !text-xs'
            onClick={() => navigate('/login')}
          >
            {t('登录')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default UtilityBar;
