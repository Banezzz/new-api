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
import { Button } from '@douyinfe/semi-ui';
import { RefreshCw, Search } from 'lucide-react';

const DashboardHeader = ({
  showSearchModal,
  refresh,
  loading,
  t,
}) => {
  return (
    <div className='flex items-center justify-end gap-2 mb-3'>
      <Button
        theme='borderless'
        type='tertiary'
        size='small'
        icon={<Search size={15} />}
        onClick={showSearchModal}
        className='!rounded-md'
      >
        {t('搜索')}
      </Button>
      <Button
        theme='borderless'
        type='tertiary'
        size='small'
        icon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />}
        onClick={refresh}
        loading={loading}
        className='!rounded-md'
      >
        {t('刷新')}
      </Button>
    </div>
  );
};

export default DashboardHeader;
