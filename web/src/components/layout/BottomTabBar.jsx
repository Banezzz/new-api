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
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, Tag, CreditCard, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const tabs = [
  { key: 'home', icon: Home, path: '/', label: '首页' },
  { key: 'console', icon: LayoutDashboard, path: '/console', label: '仪表盘' },
  { key: 'pricing', icon: Tag, path: '/pricing', label: '接口目录' },
  { key: 'topup', icon: CreditCard, path: '/console/topup', label: '钱包' },
  { key: 'personal', icon: User, path: '/console/personal', label: '我的' },
];

const BottomTabBar = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="bottom-tab-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);
        return (
          <Link
            key={tab.key}
            to={tab.path}
            className={`bottom-tab-item ${isActive ? 'bottom-tab-item-active' : ''}`}
          >
            <Icon size={20} />
            <span>{t(tab.label)}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomTabBar;
