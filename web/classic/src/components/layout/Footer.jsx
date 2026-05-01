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
import { useTranslation } from 'react-i18next';
import { Typography } from '@douyinfe/semi-ui';
import { getFooterHTML } from '../../helpers';

const FooterBar = () => {
  const { t } = useTranslation();
  const [footer, setFooter] = useState(getFooterHTML());
  const currentYear = new Date().getFullYear();

  const loadFooter = () => {
    let footer_html = localStorage.getItem('footer_html');
    if (footer_html) {
      setFooter(footer_html);
    }
  };

  useEffect(() => {
    loadFooter();
  }, []);

  return (
    <div className='w-full'>
      <footer className='relative h-auto py-4 px-6 md:px-24 w-full flex items-center justify-center overflow-hidden'>
        <div className='flex flex-col md:flex-row items-center justify-center w-full max-w-[1110px] gap-4'>
          {footer ? (
            <div
              className='custom-footer na-cb6feafeb3990c78 text-sm !text-semi-color-text-1'
              dangerouslySetInnerHTML={{ __html: footer }}
            />
          ) : (
            <Typography.Text className='text-sm !text-semi-color-text-1'>
              <a
                href='https://github.com/QuantumNous/new-api'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                NewAPI
              </a>{' '}
              &copy; {currentYear}{' '}
              <a
                href='https://github.com/QuantumNous'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                QuantumNous
              </a>{' '}
              {t('| 基于')}{' '}
              <a
                href='https://github.com/songquanpeng/one-api/releases/tag/v0.5.4'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                One API v0.5.4
              </a>{' '}
              © 2023{' '}
              <a
                href='https://github.com/songquanpeng'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                JustSong
              </a>
              <span className='mx-2'>|</span>
              <a
                href='https://docs.newapi.pro/wiki/project-introduction/'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                {t('关于项目')}
              </a>
              <span className='mx-2'>·</span>
              <a
                href='https://docs.newapi.pro/support/community-interaction/'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                {t('联系我们')}
              </a>
              <span className='mx-2'>·</span>
              <a
                href='https://docs.newapi.pro/wiki/features-introduction/'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                {t('功能介绍')}
              </a>
              <span className='mx-2'>·</span>
              <a
                href='https://docs.newapi.pro/getting-started/'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                {t('快速开始')}
              </a>
              <span className='mx-2'>·</span>
              <a
                href='https://docs.newapi.pro/installation/'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                {t('安装指南')}
              </a>
              <span className='mx-2'>·</span>
              <a
                href='https://docs.newapi.pro/api/'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                {t('API 文档')}
              </a>
              <span className='mx-2'>·</span>
              <a
                href='https://github.com/Calcium-Ion/new-api-horizon'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                new-api-horizon
              </a>
              <span className='mx-2'>·</span>
              <a
                href='https://github.com/Calcium-Ion/new-api-worker'
                target='_blank'
                rel='noopener noreferrer'
                className='!text-semi-color-primary'
              >
                new-api-worker
              </a>
            </Typography.Text>
          )}
        </div>
      </footer>
    </div>
  );
};

export default FooterBar;
