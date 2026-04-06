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

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Tag,
  BookOpen,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { getLucideIcon } from '../../helpers/render';
import { useSidebarCollapsed } from '../../hooks/common/useSidebarCollapsed';
import { useSidebar } from '../../hooks/common/useSidebar';
import { isAdmin, isRoot, showError } from '../../helpers';

const routerMap = {
  home: '/',
  channel: '/console/channel',
  token: '/console/token',
  redemption: '/console/redemption',
  topup: '/console/topup',
  user: '/console/user',
  subscription: '/console/subscription',
  log: '/console/log',
  midjourney: '/console/midjourney',
  setting: '/console/setting',
  about: '/about',
  detail: '/console',
  pricing: '/pricing',
  task: '/console/task',
  models: '/console/models',
  deployment: '/console/deployment',
  playground: '/console/playground',
  personal: '/console/personal',
};

const mainNavIconMap = {
  home: Home,
  console: LayoutDashboard,
  pricing: Tag,
  docs: BookOpen,
  about: Info,
};

const NavigationRail = ({
  userState,
  logo,
  systemName,
  isMobile,
  docsLink,
  headerNavModules,
  pricingRequireAuth,
  isConsoleRoute,
  navigate,
  t,
  onNavigate,
}) => {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const {
    isModuleVisible,
    hasSectionVisibleModules,
  } = useSidebar();

  const location = useLocation();
  const [chatItems, setChatItems] = useState([]);
  const [routerMapState, setRouterMapState] = useState(routerMap);

  // Sync body class for expanded/collapsed rail
  useEffect(() => {
    if (!collapsed) {
      document.body.classList.add('rail-expanded');
    } else {
      document.body.classList.remove('rail-expanded');
    }
    // Clean up on unmount
    return () => {
      document.body.classList.remove('rail-expanded');
    };
  }, [collapsed]);

  // Load chat items from localStorage
  useEffect(() => {
    let chats = localStorage.getItem('chats');
    if (chats) {
      try {
        chats = JSON.parse(chats);
        if (Array.isArray(chats)) {
          const items = [];
          const newRouterMap = { ...routerMap };
          for (let i = 0; i < chats.length; i++) {
            let shouldSkip = false;
            let chat = {};
            for (let key in chats[i]) {
              let link = chats[i][key];
              if (typeof link !== 'string') continue;
              if (link.startsWith('fluent') || link.startsWith('ccswitch')) {
                shouldSkip = true;
                break;
              }
              chat.text = key;
              chat.itemKey = 'chat' + i;
              chat.to = '/console/chat/' + i;
            }
            if (shouldSkip || !chat.text) continue;
            items.push(chat);
            newRouterMap['chat' + i] = '/console/chat/' + i;
          }
          setChatItems(items);
          setRouterMapState(newRouterMap);
        }
      } catch (e) {
        showError('聊天数据解析失败');
      }
    }
  }, []);

  // Build main nav links (top-level: home, console, pricing, docs, about)
  const mainNavLinks = useMemo(() => {
    const defaultModules = {
      home: true,
      console: true,
      pricing: true,
      docs: true,
      about: true,
    };
    const modules = headerNavModules || defaultModules;

    const allLinks = [
      { text: t('首页'), itemKey: 'home', to: '/' },
      { text: t('仪表盘'), itemKey: 'console', to: '/console' },
      { text: t('接口目录'), itemKey: 'pricing', to: '/pricing' },
      ...(docsLink
        ? [
            {
              text: t('文档'),
              itemKey: 'docs',
              isExternal: true,
              externalLink: docsLink,
            },
          ]
        : []),
      { text: t('关于'), itemKey: 'about', to: '/about' },
    ];

    return allLinks.filter((link) => {
      if (link.itemKey === 'docs') {
        return docsLink && modules.docs;
      }
      if (link.itemKey === 'pricing') {
        return typeof modules.pricing === 'object'
          ? modules.pricing.enabled
          : modules.pricing;
      }
      return modules[link.itemKey] === true;
    });
  }, [t, docsLink, headerNavModules]);

  // Overview items
  const overviewItems = useMemo(() => {
    const items = [
      {
        text: t('数据看板'),
        itemKey: 'detail',
        to: routerMap.detail,
        hidden:
          localStorage.getItem('enable_data_export') === 'true' ? false : true,
      },
    ];
    return items.filter(
      (item) => !item.hidden && isModuleVisible('overview', item.itemKey),
    );
  }, [t, isModuleVisible]);

  // Services items (admin only)
  const servicesItems = useMemo(() => {
    const items = [
      { text: t('渠道管理'), itemKey: 'channel', to: routerMap.channel, adminOnly: true },
      { text: t('模型管理'), itemKey: 'models', to: routerMap.models, adminOnly: true },
      { text: t('模型部署'), itemKey: 'deployment', to: routerMap.deployment, adminOnly: true },
      { text: t('订阅管理'), itemKey: 'subscription', to: routerMap.subscription, adminOnly: true },
    ];
    return items.filter(
      (item) =>
        (!item.adminOnly || isAdmin()) &&
        isModuleVisible('services', item.itemKey),
    );
  }, [t, isModuleVisible]);

  // API items (playground, client apps, token)
  const apiItems = useMemo(() => {
    const items = [];

    if (isModuleVisible('api', 'playground')) {
      items.push({
        text: t('操练场'),
        itemKey: 'playground',
        to: routerMap.playground,
      });
    }

    // Single "Client Apps" entry — shows a page listing all third-party clients
    if (isModuleVisible('api', 'chat') && chatItems.length > 0) {
      items.push({
        text: t('客户端应用'),
        itemKey: 'chat',
        to: '/console/chat',
      });
    }

    if (isModuleVisible('api', 'token')) {
      items.push({
        text: t('令牌管理'),
        itemKey: 'token',
        to: routerMap.token,
      });
    }

    return items;
  }, [chatItems, t, isModuleVisible]);

  // Monitoring items
  const monitoringItems = useMemo(() => {
    const items = [
      { text: t('使用日志'), itemKey: 'log', to: routerMap.log },
      {
        text: t('绘图日志'),
        itemKey: 'midjourney',
        to: routerMap.midjourney,
        hidden: localStorage.getItem('enable_drawing') !== 'true',
      },
      {
        text: t('任务日志'),
        itemKey: 'task',
        to: routerMap.task,
        hidden: localStorage.getItem('enable_task') !== 'true',
      },
    ];
    return items.filter(
      (item) => !item.hidden && isModuleVisible('monitoring', item.itemKey),
    );
  }, [t, isModuleVisible]);

  // Billing items
  const billingItems = useMemo(() => {
    const items = [
      { text: t('钱包管理'), itemKey: 'topup', to: routerMap.topup },
      {
        text: t('兑换码管理'),
        itemKey: 'redemption',
        to: routerMap.redemption,
        adminOnly: true,
      },
    ];
    return items.filter(
      (item) =>
        (!item.adminOnly || isAdmin()) &&
        isModuleVisible('billing', item.itemKey),
    );
  }, [t, isModuleVisible]);

  // Account items
  const accountItems = useMemo(() => {
    const items = [
      { text: t('个人设置'), itemKey: 'personal', to: routerMap.personal },
      {
        text: t('用户管理'),
        itemKey: 'user',
        to: routerMap.user,
        adminOnly: true,
      },
      {
        text: t('系统设置'),
        itemKey: 'setting',
        to: routerMap.setting,
        rootOnly: true,
      },
    ];
    return items.filter((item) => {
      if (item.rootOnly && !isRoot()) return false;
      if (item.adminOnly && !isAdmin()) return false;
      return isModuleVisible('account', item.itemKey);
    });
  }, [t, isModuleVisible]);

  // Determine active state
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/console') return location.pathname === '/console';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isItemActive = (itemKey, to) => {
    // Chat items: match by route
    if (itemKey.startsWith('chat')) {
      const chatTo = routerMapState[itemKey] || to;
      return chatTo && location.pathname === chatTo;
    }
    // Standard items
    if (to) return isActive(to);
    return false;
  };

  // Render a single rail item
  const renderRailItem = (item) => {
    const active = isItemActive(item.itemKey, item.to);
    const icon = getLucideIcon(item.itemKey, active);

    return (
      <Link
        key={item.itemKey}
        to={item.to}
        className={`rail-item ${active ? 'rail-item-active' : ''}`}
        onClick={onNavigate}
      >
        <div className="rail-item-icon">{icon}</div>
        <span className="rail-item-label">{item.text}</span>
      </Link>
    );
  };

  // Render a main nav link (with lucide icon from the mainNavIconMap)
  const renderMainNavItem = (link) => {
    if (link.isExternal) {
      const IconComponent = mainNavIconMap[link.itemKey] || Info;
      return (
        <a
          key={link.itemKey}
          href={link.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rail-item"
          onClick={onNavigate}
        >
          <div className="rail-item-icon">
            <IconComponent size={16} strokeWidth={2} />
          </div>
          <span className="rail-item-label">{link.text}</span>
        </a>
      );
    }

    const active = isActive(link.to);
    const IconComponent = mainNavIconMap[link.itemKey] || Info;

    return (
      <Link
        key={link.itemKey}
        to={link.to}
        className={`rail-item ${active ? 'rail-item-active' : ''}`}
        onClick={onNavigate}
      >
        <div className="rail-item-icon">
          <IconComponent
            size={16}
            strokeWidth={2}
            color={active ? 'rgb(var(--semi-blue-5))' : 'currentColor'}
          />
        </div>
        <span className="rail-item-label">{link.text}</span>
      </Link>
    );
  };

  // Don't render on mobile -- BottomTabBar handles navigation
  if (isMobile) return null;

  return (
    <div className="rail-container">
      {/* Logo */}
      <Link
        to="/"
        className="rail-logo"
        style={{ textDecoration: 'none' }}
        onClick={onNavigate}
      >
        <img src={logo} alt="" className="w-7 h-7 rounded" />
        <span className="rail-item-label ml-2 font-semibold text-sm truncate">
          {systemName}
        </span>
      </Link>

      {/* Navigation items */}
      <nav className="rail-nav">
        {/* Main nav links (always shown) */}
        {mainNavLinks.map((link) => renderMainNavItem(link))}

        {/* Console sub-items (shown when on /console/* routes) */}
        {isConsoleRoute && (
          <>
            <div className="rail-spacer" />

            {/* Overview section */}
            {hasSectionVisibleModules('overview') && overviewItems.length > 0 && (
              <>
                <div className="rail-group-label">{t('概览')}</div>
                {overviewItems.map((item) => renderRailItem(item))}
              </>
            )}

            {/* Services section (admin only) */}
            {isAdmin() &&
              hasSectionVisibleModules('services') &&
              servicesItems.length > 0 && (
                <>
                  <div className="rail-group-label">{t('服务')}</div>
                  {servicesItems.map((item) => renderRailItem(item))}
                </>
              )}

            {/* API section */}
            {hasSectionVisibleModules('api') && apiItems.length > 0 && (
              <>
                <div className="rail-group-label">{t('接口')}</div>
                {apiItems.map((item) => renderRailItem(item))}
              </>
            )}

            {/* Monitoring section */}
            {hasSectionVisibleModules('monitoring') &&
              monitoringItems.length > 0 && (
                <>
                  <div className="rail-group-label">{t('监控')}</div>
                  {monitoringItems.map((item) => renderRailItem(item))}
                </>
              )}

            {/* Billing section */}
            {hasSectionVisibleModules('billing') && billingItems.length > 0 && (
              <>
                <div className="rail-group-label">{t('账务')}</div>
                {billingItems.map((item) => renderRailItem(item))}
              </>
            )}

            {/* Account section */}
            {hasSectionVisibleModules('account') &&
              accountItems.length > 0 && (
                <>
                  <div className="rail-group-label">{t('账户')}</div>
                  {accountItems.map((item) => renderRailItem(item))}
                </>
              )}
          </>
        )}
      </nav>

      {/* Bottom: expand/collapse toggle */}
      <div className="rail-bottom">
        <div className="rail-expand-btn" onClick={toggleCollapsed}>
          {collapsed ? (
            <PanelLeftOpen size={18} strokeWidth={2} />
          ) : (
            <PanelLeftClose size={18} strokeWidth={2} />
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationRail;
