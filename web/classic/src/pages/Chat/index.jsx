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

import React, { useMemo } from 'react';
import { useTokenKeys } from '../../hooks/chat/useTokenKeys';
import { Button, Spin, Empty } from '@douyinfe/semi-ui';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { IllustrationNoContent } from '@douyinfe/semi-illustrations';

const ChatPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { keys, serverAddress, isLoading } = useTokenKeys(id || '0');

  // Parse all chat/client apps from localStorage
  const clientApps = useMemo(() => {
    const apps = [];
    try {
      const chats = JSON.parse(localStorage.getItem('chats') || '[]');
      if (Array.isArray(chats)) {
        chats.forEach((chat, index) => {
          for (const name in chat) {
            const linkTemplate = chat[name];
            if (typeof linkTemplate !== 'string') continue;
            if (linkTemplate.startsWith('fluent') || linkTemplate.startsWith('ccswitch')) continue;
            apps.push({ name, linkTemplate, index });
          }
        });
      }
    } catch (e) {
      // ignore parse errors
    }
    return apps;
  }, []);

  // Build a launch URL for a given app
  const buildUrl = (linkTemplate) => {
    if (!serverAddress || keys.length === 0) return '';
    let url = linkTemplate;
    url = url.replaceAll('{address}', encodeURIComponent(serverAddress));
    url = url.replaceAll('{key}', 'sk-' + keys[0]);
    return url;
  };

  // ===== If an id is provided, keep the original iframe behavior =====
  if (id !== undefined) {
    const iframeSrc = (() => {
      if (!serverAddress || keys.length === 0) return '';
      try {
        const chats = JSON.parse(localStorage.getItem('chats') || '[]');
        if (Array.isArray(chats) && chats[id]) {
          for (const k in chats[id]) {
            let link = chats[id][k];
            link = link.replaceAll('{address}', encodeURIComponent(serverAddress));
            link = link.replaceAll('{key}', 'sk-' + keys[0]);
            return link;
          }
        }
      } catch (e) {
        // ignore
      }
      return '';
    })();

    return !isLoading && iframeSrc ? (
      <iframe
        src={iframeSrc}
        style={{
          width: '100%',
          height: 'calc(100vh - 64px)',
          border: 'none',
          marginTop: '64px',
        }}
        title='Client App'
        allow='camera;microphone'
      />
    ) : (
      <div className='fixed inset-0 w-screen h-screen flex items-center justify-center bg-white/80 z-[1000] mt-[60px]'>
        <div className='flex flex-col items-center'>
          <Spin size='large' spinning={true} tip={null} />
          <span className='whitespace-nowrap mt-2 text-center' style={{ color: 'var(--semi-color-primary)' }}>
            {t('正在跳转...')}
          </span>
        </div>
      </div>
    );
  }

  // ===== No id — show the client apps gallery =====
  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Spin size='large' />
      </div>
    );
  }

  if (clientApps.length === 0) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Empty
          image={<IllustrationNoContent style={{ width: 120, height: 120 }} />}
          description={t('暂无可用的客户端应用')}
        />
      </div>
    );
  }

  const hasKey = keys.length > 0;

  return (
    <div className='mt-[60px] px-4 md:px-8 py-6 max-w-4xl mx-auto'>
      <div className='mb-6'>
        <h1 className='text-xl font-semibold text-semi-color-text-0 mb-1'>
          {t('客户端应用')}
        </h1>
        <p className='text-sm text-semi-color-text-2'>
          {t('使用以下第三方客户端配合您的 API Key 进行对话')}
        </p>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {clientApps.map((app) => {
          const url = buildUrl(app.linkTemplate);
          return (
            <div
              key={app.index}
              className='flex flex-col justify-between p-5 rounded-xl border bg-semi-color-bg-0 hover:bg-semi-color-bg-1 transition-colors'
              style={{ borderColor: 'var(--semi-color-border)' }}
            >
              <div className='mb-4'>
                <h3 className='text-base font-medium text-semi-color-text-0 mb-1'>
                  {app.name}
                </h3>
                <p className='text-xs text-semi-color-text-2'>
                  {t('第三方客户端')}
                </p>
              </div>
              <div className='flex gap-2'>
                <Button
                  theme='solid'
                  type='primary'
                  size='small'
                  className='!rounded-md flex-1'
                  icon={<ExternalLink size={14} />}
                  disabled={!hasKey || !url}
                  onClick={() => url && window.open(url, '_blank')}
                >
                  {t('新窗口打开')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {!hasKey && (
        <p className='mt-4 text-xs text-semi-color-danger'>
          {t('请先创建令牌才能使用客户端应用')}
        </p>
      )}
    </div>
  );
};

export default ChatPage;
