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
import { Skeleton } from '@douyinfe/semi-ui';

const StatsCards = ({
  groupedStatsData,
  loading,
}) => {
  // Flatten all groups into a single array of stat items
  const allStats = groupedStatsData.flatMap((group) =>
    group.items.map((item) => ({
      label: item.title,
      value: item.value,
      onClick: item.onClick,
    }))
  );

  if (allStats.length === 0) return null;

  return (
    <div className="flex items-stretch border rounded-xl mb-4 overflow-hidden flex-wrap sm:flex-nowrap" style={{ borderColor: 'var(--semi-color-border)', backgroundColor: 'var(--semi-color-bg-0)' }}>
      {allStats.map((stat, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div className="w-px hidden sm:block" style={{ backgroundColor: 'var(--semi-color-border)' }} />}
          <div
            className="flex-1 px-4 py-3 min-w-0 basis-1/2 sm:basis-auto cursor-pointer hover:bg-semi-color-fill-0 transition-colors"
            onClick={stat.onClick}
          >
            <div className="text-xs text-semi-color-text-2 mb-1 truncate">{stat.label}</div>
            <div className="text-xl font-semibold text-semi-color-text-0 tabular-nums">
              {loading ? <Skeleton.Title style={{ width: 60, height: 24 }} /> : stat.value}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default StatsCards;
