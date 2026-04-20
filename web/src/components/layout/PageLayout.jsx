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

import NavigationRail from './NavigationRail';
import UtilityBar from './UtilityBar';
import BottomTabBar from './BottomTabBar';
import NoticeModal from './NoticeModal';
import App from '../../App';
import FooterBar from './Footer';
import { ToastContainer } from 'react-toastify';
import ErrorBoundary from '../common/ErrorBoundary';
import React, { useContext, useEffect } from 'react';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { useHeaderBar } from '../../hooks/common/useHeaderBar';
import { useNotifications } from '../../hooks/common/useNotifications';
import { useTranslation } from 'react-i18next';
import {
  API,
  getLogo,
  getSystemName,
  showError,
  setStatusData,
} from '../../helpers';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';
import { useLocation, Link } from 'react-router-dom';
import { Button, Dropdown } from '@douyinfe/semi-ui';
import { Bell, Sun, Moon, Monitor } from 'lucide-react';
import { normalizeLanguage } from '../../i18n/language';

const PageLayout = () => {
  const [userState, userDispatch] = useContext(UserContext);
  const [statusState, statusDispatch] = useContext(StatusContext);
  const isMobile = useIsMobile();
  const { i18n } = useTranslation();
  const location = useLocation();

  const headerBar = useHeaderBar({
    onMobileMenuToggle: () => {},
    drawerOpen: false,
  });

  const {
    noticeVisible,
    unreadCount,
    handleNoticeOpen,
    handleNoticeClose,
    getUnreadKeys,
  } = useNotifications(statusState);

  const cardProPages = [
    '/console/channel',
    '/console/log',
    '/console/redemption',
    '/console/user',
    '/console/token',
    '/console/midjourney',
    '/console/task',
    '/console/models',
    '/pricing',
  ];

  const shouldHideFooter = cardProPages.includes(location.pathname);

  const shouldInnerPadding =
    location.pathname.includes('/console') &&
    !location.pathname.startsWith('/console/chat') &&
    location.pathname !== '/console/playground';

  const isConsoleRoute = location.pathname.startsWith('/console');
  const isAuthRoute = ['/login', '/register', '/reset'].some((p) =>
    location.pathname.startsWith(p),
  );
  const showShell = isConsoleRoute;

  const loadUser = () => {
    let user = localStorage.getItem('user');
    if (user) {
      let data = JSON.parse(user);
      userDispatch({ type: 'login', payload: data });
    }
  };

  const loadStatus = async () => {
    try {
      const res = await API.get('/api/status');
      const { success, data } = res.data;
      if (success) {
        statusDispatch({ type: 'set', payload: data });
        setStatusData(data);
      } else {
        showError('Unable to connect to server');
      }
    } catch (error) {
      showError('Failed to load status');
    }
  };

  useEffect(() => {
    loadUser();
    loadStatus().catch(console.error);
    let systemName = getSystemName();
    if (systemName) {
      document.title = systemName;
    }
    let logo = getLogo();
    if (logo) {
      let linkElement = document.querySelector("link[rel~='icon']");
      if (linkElement) {
        linkElement.href = logo;
      }
    }
  }, []);

  useEffect(() => {
    let preferredLang;

    if (userState?.user?.setting) {
      try {
        const settings = JSON.parse(userState.user.setting);
        preferredLang = normalizeLanguage(settings.language);
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (!preferredLang) {
      const savedLang = localStorage.getItem('i18nextLng');
      if (savedLang) {
        preferredLang = normalizeLanguage(savedLang);
      }
    }

    if (preferredLang) {
      localStorage.setItem('i18nextLng', preferredLang);
      if (preferredLang !== i18n.language) {
        i18n.changeLanguage(preferredLang);
      }
    }
  }, [i18n, userState?.user?.setting]);

  return (
    <div className='flex flex-col h-screen overflow-hidden'>
      {/* NavigationRail - only on console routes, desktop only */}
      {showShell && !isMobile && (
        <NavigationRail
          userState={headerBar.userState}
          logo={headerBar.logo}
          systemName={headerBar.systemName}
          isMobile={isMobile}
          docsLink={headerBar.docsLink}
          headerNavModules={headerBar.headerNavModules}
          pricingRequireAuth={headerBar.pricingRequireAuth}
          isConsoleRoute={isConsoleRoute}
          navigate={headerBar.navigate}
          t={headerBar.t}
          onNavigate={() => {}}
        />
      )}

      {/* Public header - non-console, non-auth pages (home, pricing, about) */}
      {!showShell && !isAuthRoute && (
        <header className='sticky top-0 z-50 flex items-center justify-between h-14 px-4 md:px-8 bg-[var(--semi-color-nav-bg)] backdrop-blur-lg border-b border-semi-color-border'>
          <Link to='/' className='flex items-center gap-2'>
            <img
              src={headerBar.logo}
              alt=''
              className='w-7 h-7 rounded'
            />
            <span className='font-semibold text-sm text-semi-color-text-0'>
              {headerBar.systemName}
            </span>
          </Link>
          <nav className='hidden md:flex items-center gap-6 text-sm'>
            <Link
              to='/'
              className='text-semi-color-text-1 hover:text-semi-color-text-0 transition-colors'
            >
              {headerBar.t('首页')}
            </Link>
            <Link
              to='/console'
              className='text-semi-color-text-1 hover:text-semi-color-text-0 transition-colors'
            >
              {headerBar.t('仪表盘')}
            </Link>
            <Link
              to='/pricing'
              className='text-semi-color-text-1 hover:text-semi-color-text-0 transition-colors'
            >
              {headerBar.t('接口目录')}
            </Link>
            {headerBar.docsLink && (
              <a
                href={headerBar.docsLink}
                target='_blank'
                rel='noopener noreferrer'
                className='text-semi-color-text-1 hover:text-semi-color-text-0 transition-colors'
              >
                {headerBar.t('文档')}
              </a>
            )}
          </nav>
          <div className='flex items-center gap-1'>
            {/* Notification bell */}
            <Button
              theme='borderless'
              type='tertiary'
              icon={<Bell size={16} />}
              className='!rounded-md relative'
              onClick={handleNoticeOpen}
              size='small'
            />

            {/* Theme toggle */}
            <Dropdown
              position='bottomRight'
              render={
                <Dropdown.Menu className='!rounded-lg !shadow-lg'>
                  <Dropdown.Item onClick={() => headerBar.handleThemeToggle('light')} className='!text-sm'>
                    <div className='flex items-center gap-2'><Sun size={14} />{headerBar.t('浅色')}</div>
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => headerBar.handleThemeToggle('dark')} className='!text-sm'>
                    <div className='flex items-center gap-2'><Moon size={14} />{headerBar.t('深色')}</div>
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => headerBar.handleThemeToggle('auto')} className='!text-sm'>
                    <div className='flex items-center gap-2'><Monitor size={14} />{headerBar.t('跟随系统')}</div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              }
            >
              <Button
                theme='borderless'
                type='tertiary'
                icon={headerBar.theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                className='!rounded-md'
                size='small'
              />
            </Dropdown>

            {/* Language */}
            <Dropdown
              position='bottomRight'
              render={
                <Dropdown.Menu className='!rounded-lg !shadow-lg'>
                  {[
                    { key: 'zh-CN', label: '简体中文' },
                    { key: 'zh-TW', label: '繁體中文' },
                    { key: 'en', label: 'English' },
                    { key: 'ja', label: '日本語' },
                    { key: 'fr', label: 'Français' },
                    { key: 'ru', label: 'Русский' },
                    { key: 'vi', label: 'Tiếng Việt' },
                  ].map(lang => (
                    <Dropdown.Item key={lang.key} onClick={() => headerBar.handleLanguageChange(lang.key)} className='!text-sm'>
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
                {(headerBar.currentLang || 'zh').toUpperCase().slice(0, 2)}
              </Button>
            </Dropdown>

            {/* Login / Dashboard */}
            {headerBar.userState?.user ? (
              <Link to='/console'>
                <Button
                  theme='solid'
                  type='primary'
                  size='small'
                  className='!rounded-md !text-xs ml-1'
                >
                  {headerBar.t('仪表盘')}
                </Button>
              </Link>
            ) : (
              <Link to='/login'>
                <Button
                  theme='solid'
                  type='primary'
                  size='small'
                  className='!rounded-md !text-xs ml-1'
                >
                  {headerBar.t('登录')}
                </Button>
              </Link>
            )}
          </div>
        </header>
      )}

      {/* Main content area */}
      <div
        className='flex flex-col flex-1 min-h-0'
        style={{
          marginLeft:
            showShell && !isMobile ? 'var(--rail-current-width)' : 0,
        }}
      >
        {/* UtilityBar - only on console routes */}
        {showShell && (
          <UtilityBar
            userState={headerBar.userState}
            isMobile={isMobile}
            theme={headerBar.theme}
            currentLang={headerBar.currentLang}
            unreadCount={unreadCount}
            onNoticeOpen={handleNoticeOpen}
            onThemeToggle={headerBar.handleThemeToggle}
            onLanguageChange={headerBar.handleLanguageChange}
            isSelfUseMode={headerBar.isSelfUseMode}
            logout={headerBar.logout}
            navigate={headerBar.navigate}
            t={headerBar.t}
          />
        )}

        {/* Content */}
        <div
          className='flex-1 min-h-0 overflow-y-auto'
          style={{
            padding: shouldInnerPadding
              ? isMobile
                ? '16px'
                : '32px'
              : '0',
            paddingBottom: isMobile && showShell ? '72px' : '0',
          }}
        >
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          {/* Footer inside scroll area so it's reachable */}
          {!shouldHideFooter && <FooterBar />}
        </div>
      </div>

      {/* BottomTabBar - mobile only, console routes only */}
      {isMobile && showShell && <BottomTabBar />}

      {/* NoticeModal */}
      <NoticeModal
        visible={noticeVisible}
        onClose={handleNoticeClose}
        isMobile={isMobile}
        unreadKeys={getUnreadKeys()}
      />

      <ToastContainer />
    </div>
  );
};

export default PageLayout;
