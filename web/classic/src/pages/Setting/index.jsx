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
import { Select } from '@douyinfe/semi-ui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import SystemSetting from '../../components/settings/SystemSetting';
import { isRoot } from '../../helpers';
import OtherSetting from '../../components/settings/OtherSetting';
import OperationSetting from '../../components/settings/OperationSetting';
import RateLimitSetting from '../../components/settings/RateLimitSetting';
import ModelSetting from '../../components/settings/ModelSetting';
import DashboardSetting from '../../components/settings/DashboardSetting';
import RatioSetting from '../../components/settings/RatioSetting';
import ChatsSetting from '../../components/settings/ChatsSetting';
import DrawingSetting from '../../components/settings/DrawingSetting';
import PaymentSetting from '../../components/settings/PaymentSetting';
import ModelDeploymentSetting from '../../components/settings/ModelDeploymentSetting';
import PerformanceSetting from '../../components/settings/PerformanceSetting';

const Setting = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [tabActiveKey, setTabActiveKey] = useState('operation');

  const panes = useMemo(() => {
    if (!isRoot()) return [];
    return [
      {
        label: t('运营设置'),
        content: <OperationSetting />,
        itemKey: 'operation',
        group: 'general',
      },
      {
        label: t('仪表盘设置'),
        content: <DashboardSetting />,
        itemKey: 'dashboard',
        group: 'general',
      },
      {
        label: t('系统设置'),
        content: <SystemSetting />,
        itemKey: 'system',
        group: 'general',
      },
      {
        label: t('聊天设置'),
        content: <ChatsSetting />,
        itemKey: 'chats',
        group: 'ai',
      },
      {
        label: t('绘图设置'),
        content: <DrawingSetting />,
        itemKey: 'drawing',
        group: 'ai',
      },
      {
        label: t('模型相关设置'),
        content: <ModelSetting />,
        itemKey: 'models',
        group: 'ai',
      },
      {
        label: t('模型部署设置'),
        content: <ModelDeploymentSetting />,
        itemKey: 'model-deployment',
        group: 'ai',
      },
      {
        label: t('支付设置'),
        content: <PaymentSetting />,
        itemKey: 'payment',
        group: 'billing',
      },
      {
        label: t('分组与模型定价设置'),
        content: <RatioSetting />,
        itemKey: 'ratio',
        group: 'billing',
      },
      {
        label: t('速率限制设置'),
        content: <RateLimitSetting />,
        itemKey: 'ratelimit',
        group: 'billing',
      },
      {
        label: t('性能设置'),
        content: <PerformanceSetting />,
        itemKey: 'performance',
        group: 'billing',
      },
      {
        label: t('其他设置'),
        content: <OtherSetting />,
        itemKey: 'other',
        group: 'advanced',
      },
    ];
  }, [t]);

  const groups = useMemo(() => [
    { key: 'general', label: t('通用') },
    { key: 'ai', label: t('AI 与模型') },
    { key: 'billing', label: t('账务与限制') },
    { key: 'advanced', label: t('高级') },
  ], [t]);

  const onChangeTab = (key) => {
    setTabActiveKey(key);
    navigate(`?tab=${key}`);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setTabActiveKey(tab);
    } else {
      onChangeTab('operation');
    }
  }, [location.search]);

  const activePane = panes.find((p) => p.itemKey === tabActiveKey);

  return (
    <div className='mt-[60px] px-2'>
      <div className='flex gap-6'>
        {/* Left: Vertical Navigation (hidden on mobile) */}
        <div className='hidden md:block w-[200px] flex-shrink-0'>
          <nav className='sticky top-4 space-y-1'>
            {groups.map((group) => {
              const groupPanes = panes.filter((p) => p.group === group.key);
              if (groupPanes.length === 0) return null;
              return (
                <React.Fragment key={group.key}>
                  <div className='text-xs font-medium text-semi-color-text-3 uppercase tracking-wider px-3 py-2 mt-4 first:mt-0'>
                    {group.label}
                  </div>
                  {groupPanes.map((pane) => (
                    <button
                      key={pane.itemKey}
                      onClick={() => onChangeTab(pane.itemKey)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        tabActiveKey === pane.itemKey
                          ? 'bg-semi-color-primary-light-default text-semi-color-primary font-medium'
                          : 'text-semi-color-text-1 hover:bg-semi-color-fill-0'
                      }`}
                    >
                      {pane.label}
                    </button>
                  ))}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Mobile: Dropdown selector */}
        <div className='md:hidden w-full mb-4'>
          <Select
            value={tabActiveKey}
            onChange={(val) => onChangeTab(val)}
            className='w-full'
          >
            {panes.map((pane) => (
              <Select.Option key={pane.itemKey} value={pane.itemKey}>
                {pane.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* Right: Content */}
        <div className='flex-1 min-w-0'>
          {activePane?.content}
        </div>
      </div>
    </div>
  );
};

export default Setting;
