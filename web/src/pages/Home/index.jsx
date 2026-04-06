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

import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { API, showError, copy, showSuccess } from '../../helpers';
import { API_ENDPOINTS } from '../../constants/common.constant';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { IconCopy } from '@douyinfe/semi-icons';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import {
  Moonshot, OpenAI, XAI, Zhipu, Volcengine, Cohere, Claude, Gemini,
  Suno, Minimax, Wenxin, Spark, Qingyan, DeepSeek, Qwen, Midjourney,
  Grok, AzureAI, Hunyuan, Xinference,
} from '@lobehub/icons';
import { Shield, Gauge, Fingerprint, Headset } from 'lucide-react';

const PROVIDERS = [
  { name: 'OpenAI', icon: <OpenAI size={28} /> },
  { name: 'Claude', icon: <Claude.Color size={28} /> },
  { name: 'Gemini', icon: <Gemini.Color size={28} /> },
  { name: 'DeepSeek', icon: <DeepSeek.Color size={28} /> },
  { name: 'Qwen', icon: <Qwen.Color size={28} /> },
  { name: 'Moonshot', icon: <Moonshot size={28} /> },
  { name: 'Zhipu', icon: <Zhipu.Color size={28} /> },
  { name: 'Volcengine', icon: <Volcengine.Color size={28} /> },
  { name: 'Cohere', icon: <Cohere.Color size={28} /> },
  { name: 'Minimax', icon: <Minimax.Color size={28} /> },
  { name: 'Wenxin', icon: <Wenxin.Color size={28} /> },
  { name: 'Spark', icon: <Spark.Color size={28} /> },
  { name: 'XAI', icon: <XAI size={28} /> },
  { name: 'Grok', icon: <Grok size={28} /> },
  { name: 'Azure AI', icon: <AzureAI.Color size={28} /> },
  { name: 'Hunyuan', icon: <Hunyuan.Color size={28} /> },
  { name: 'Midjourney', icon: <Midjourney size={28} /> },
  { name: 'Suno', icon: <Suno size={28} /> },
  { name: 'Qingyan', icon: <Qingyan.Color size={28} /> },
  { name: 'Xinference', icon: <Xinference.Color size={28} /> },
];

// ==================== Data Stream Particle Field ====================
const GLYPHS = '0123456789ABCDEFabcdef∑∆Ωλπ∞αβγδ{}[]<>⟨⟩∂∇≈≠±∫⊕⊗';

const DataField = ({ isDark }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const nodesRef = useRef([]);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const timeRef = useRef(0);

  const initNodes = useCallback((w, h) => {
    const count = Math.min(Math.floor((w * h) / 6000), 200);
    const nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        charTick: Math.floor(Math.random() * 120),
        size: 10 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
        freq: 0.2 + Math.random() * 0.3,
      });
    }
    nodesRef.current = nodes;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const t = timeRef.current;
    const mouse = mouseRef.current;

    ctx.clearRect(0, 0, w, h);

    const nodes = nodesRef.current;
    const linkDist = 110;
    const mouseRadius = 250;
    const pr = isDark ? 139 : 124;
    const pg = isDark ? 92 : 58;
    const pb = isDark ? 246 : 237;
    const lineAlphaBase = isDark ? 0.08 : 0.03;
    const charAlphaBase = isDark ? 0.2 : 0.07;
    const charAlphaBright = isDark ? 0.55 : 0.18;

    // Update nodes
    for (const n of nodes) {
      // Organic drift
      n.x += n.vx + Math.sin(t * 0.005 * n.freq + n.phase) * 0.3;
      n.y += n.vy + Math.cos(t * 0.005 * n.freq + n.phase + 1.5) * 0.3;

      // Mouse attraction
      if (mouse.active) {
        const mdx = mouse.x - n.x;
        const mdy = mouse.y - n.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < mouseRadius && mDist > 1) {
          const force = (1 - mDist / mouseRadius) * 0.8;
          n.x += (mdx / mDist) * force;
          n.y += (mdy / mDist) * force;
        }
      }

      // Wrap
      if (n.x < -30) n.x += w + 60;
      if (n.x > w + 30) n.x -= w + 60;
      if (n.y < -30) n.y += h + 60;
      if (n.y > h + 30) n.y -= h + 60;

      // Cycle character
      n.charTick--;
      if (n.charTick <= 0) {
        n.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        n.charTick = 60 + Math.floor(Math.random() * 120);
      }
    }

    // Draw connections
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const bb = nodes[j];
        const dx = a.x - bb.x;
        const dy = a.y - bb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDist) {
          const fade = 1 - dist / linkDist;
          // Brighten lines near mouse
          let boost = 1;
          if (mouse.active) {
            const mx = (a.x + bb.x) / 2;
            const my = (a.y + bb.y) / 2;
            const mDist = Math.sqrt((mouse.x - mx) ** 2 + (mouse.y - my) ** 2);
            if (mDist < mouseRadius) boost = 1 + (1 - mDist / mouseRadius) * 2;
          }
          ctx.strokeStyle = `rgba(${pr},${pg},${pb},${lineAlphaBase * fade * boost})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(bb.x, bb.y);
          ctx.stroke();
        }
      }
    }

    // Draw characters
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of nodes) {
      // Proximity to mouse boosts alpha
      let alpha = charAlphaBase;
      if (mouse.active) {
        const mDist = Math.sqrt((mouse.x - n.x) ** 2 + (mouse.y - n.y) ** 2);
        if (mDist < mouseRadius) {
          alpha = charAlphaBase + (charAlphaBright - charAlphaBase) * (1 - mDist / mouseRadius);
        }
      }
      ctx.font = `${n.size}px monospace`;
      ctx.fillStyle = `rgba(${pr},${pg},${pb},${alpha})`;
      ctx.fillText(n.char, n.x, n.y);
    }

    timeRef.current++;
    animRef.current = requestAnimationFrame(draw);
  }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;

    const resize = () => {
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      initNodes(canvas.width, canvas.height);
      timeRef.current = 0;
    };

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const onMouseLeave = () => {
      mouseRef.current = { ...mouseRef.current, active: false };
    };

    resize();
    window.addEventListener('resize', resize);
    parent.addEventListener('mousemove', onMouseMove);
    parent.addEventListener('mouseleave', onMouseLeave);
    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      parent.removeEventListener('mousemove', onMouseMove);
      parent.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animRef.current);
    };
  }, [draw, initNodes]);

  return <canvas ref={canvasRef} className='absolute inset-0' />;
};

// ==================== Mouse-Tracking Orbs ====================
const FloatingOrbs = ({ isDark }) => {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const posRef = useRef({ x: 0.5, y: 0.5 });
  const orbsRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const handleMove = (e) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    };

    const animate = () => {
      // Smooth lerp towards mouse
      posRef.current.x += (mouseRef.current.x - posRef.current.x) * 0.03;
      posRef.current.y += (mouseRef.current.y - posRef.current.y) * 0.03;

      if (orbsRef.current) {
        const px = posRef.current.x * 100;
        const py = posRef.current.y * 100;
        orbsRef.current.style.background = `
          radial-gradient(600px circle at ${px}% ${py}%, rgba(139,92,246,${isDark ? 0.12 : 0.04}) 0%, transparent 60%),
          radial-gradient(400px circle at ${px + 15}% ${py - 20}%, rgba(59,130,246,${isDark ? 0.08 : 0.02}) 0%, transparent 50%),
          radial-gradient(350px circle at ${px - 10}% ${py + 25}%, rgba(168,85,247,${isDark ? 0.06 : 0.015}) 0%, transparent 50%)
        `;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isDark]);

  return (
    <div ref={containerRef} className='absolute inset-0 overflow-hidden pointer-events-none'>
      <div ref={orbsRef} className='absolute inset-0 transition-none' />
    </div>
  );
};

// ==================== Advantage Card ====================
const AdvantageCard = ({ icon, title, desc, index }) => (
  <div
    className={`group relative p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-violet-500/30 transition-all duration-500 ${
      index % 2 === 1 ? 'md:translate-y-8' : ''
    }`}
    style={{ animationDelay: `${index * 150}ms` }}
  >
    <div className='w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 group-hover:scale-110 transition-all duration-300'>
      {icon}
    </div>
    <h3 className='text-lg font-semibold text-white mb-2'>{title}</h3>
    <p className='text-sm text-white/50 leading-relaxed'>{desc}</p>
    <div className='absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
  </div>
);

// ==================== Home ====================
const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const isDark = actualTheme === 'dark';
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const docsLink = statusState?.status?.docs_link || '';
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);
      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent('加载首页内容失败...');
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(serverAddress);
    if (ok) showSuccess(t('已复制到剪切板'));
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') setNoticeVisible(true);
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };
    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  const advantages = [
    {
      icon: <Shield size={24} className='text-violet-400' />,
      title: t('企业级官方渠道'),
      desc: t('绝对稳定的官方直连通道，确保每一次请求都可靠送达'),
    },
    {
      icon: <Gauge size={24} className='text-violet-400' />,
      title: t('高 SLA 保证'),
      desc: t('99.9%+ 可用性承诺，关键业务场景的坚实保障'),
    },
    {
      icon: <Fingerprint size={24} className='text-violet-400' />,
      title: t('模型不掺假'),
      desc: t('100% 原版模型输出，拒绝代理转发劣化，配合丰富的运维经验'),
    },
    {
      icon: <Headset size={24} className='text-violet-400' />,
      title: t('专业客服团队'),
      desc: t('7×24 小时专业技术支持，快速响应每一个需求'),
    },
  ];

  // Light/dark adaptive colors
  const dk = isDark;
  const heroBg = dk ? 'bg-[#0a0a0f]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100';
  const heroText = dk ? 'text-white' : 'text-gray-900';
  const heroSubtext = dk ? 'text-white/55' : 'text-gray-500';
  const heroBorder = dk ? 'border-white/10' : 'border-gray-200/80';
  const heroCardBg = dk ? 'bg-white/5' : 'bg-white/80';
  const heroMutedText = dk ? 'text-white/65' : 'text-gray-500';
  const termBg = dk ? 'bg-black/40' : 'bg-white';
  const advBorder = dk ? 'border-white/8' : 'border-gray-200/60';
  const advCardBg = dk ? 'bg-white/[0.03]' : 'bg-white';
  const advCardHover = dk ? 'hover:bg-white/[0.07]' : 'hover:bg-gray-50/80';
  const advShadow = dk ? '' : 'shadow-[0_1px_3px_rgba(0,0,0,0.04)]';
  const advTitle = dk ? 'text-white' : 'text-gray-900';
  const advDesc = dk ? 'text-white/45' : 'text-gray-500';

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
      />

      {homePageContentLoaded && homePageContent === '' ? (
        <div className='w-full'>
          {/* ===== Section 1: Hero ===== */}
          <section className={`relative ${heroBg} min-h-screen flex items-center justify-center px-4 overflow-hidden`}>
            <DataField isDark={isDark} />
            <FloatingOrbs isDark={isDark} />

            <div className='relative z-10 max-w-4xl mx-auto text-center'>
              {/* Pill badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${heroBorder} ${heroCardBg} text-sm ${heroMutedText} mb-8 backdrop-blur-sm animate-[fadeInDown_0.8s_ease-out]`}>
                <span className='w-2 h-2 rounded-full bg-violet-400 animate-pulse' />
                {t('官方直连 · 40+ 模型供应商')}
              </div>

              {/* Headline */}
              <h1 className={`text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold ${heroText} leading-tight mb-6 animate-[fadeInUp_0.8s_ease-out_0.2s_both]`}>
                {t('每一次调用')}
                <br />
                <span className='gradient-text'>{t('都值得信赖')}</span>
              </h1>

              {/* Subtitle */}
              <p className={`text-lg md:text-xl ${heroSubtext} max-w-xl mx-auto mb-10 animate-[fadeInUp_0.8s_ease-out_0.4s_both]`}>
                {t('不只是 API 转发——官方渠道直连、模型原装输出、企业级 SLA，让你的每一个 Token 都花在刀刃上')}
              </p>

              {/* CTA Buttons */}
              <div className='flex items-center justify-center gap-4 mb-14 animate-[fadeInUp_0.8s_ease-out_0.6s_both]'>
                <Link to='/console'>
                  <Button
                    theme='solid'
                    type='primary'
                    size='large'
                    className='!rounded-lg !px-8 !py-3 !text-base shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow'
                  >
                    {t('开始使用')}
                  </Button>
                </Link>
                {docsLink && (
                  <Button
                    theme='borderless'
                    size='large'
                    className={`!rounded-lg !px-8 !py-3 !text-base !${heroMutedText} !border !${heroBorder} hover:!bg-white/5`}
                    onClick={() => window.open(docsLink, '_blank')}
                  >
                    {t('查看文档')}
                  </Button>
                )}
              </div>

              {/* Terminal code snippet */}
              <div className={`max-w-xl mx-auto ${termBg} border ${dk ? 'border-white/10' : 'border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'} rounded-xl p-5 backdrop-blur-sm text-left animate-[fadeInUp_0.8s_ease-out_0.8s_both]`}>
                <div className='flex items-center gap-2 mb-3'>
                  <div className={`w-3 h-3 rounded-full ${dk ? 'bg-red-500/70' : 'bg-red-400'}`} />
                  <div className={`w-3 h-3 rounded-full ${dk ? 'bg-yellow-500/70' : 'bg-yellow-400'}`} />
                  <div className={`w-3 h-3 rounded-full ${dk ? 'bg-green-500/70' : 'bg-green-400'}`} />
                  <span className={`ml-auto text-xs font-mono ${dk ? 'text-white/30' : 'text-gray-400'}`}>bash</span>
                </div>
                <div className='font-mono text-sm leading-6'>
                  <span className={dk ? 'text-green-400' : 'text-green-600'}>$</span>{' '}
                  <span className={dk ? 'text-white/80' : 'text-gray-800'}>curl</span>{' '}
                  <span className={dk ? 'text-violet-300' : 'text-violet-600'}>{serverAddress}/v1/chat/completions</span>{' '}
                  <span className={dk ? 'text-white/30' : 'text-gray-400'}>\</span>
                  <br />
                  <span className={`${dk ? 'text-white/30' : 'text-gray-400'} ml-4`}>-H</span>{' '}
                  <span className={dk ? 'text-amber-300' : 'text-amber-700'}>&quot;Authorization: Bearer sk-***&quot;</span>{' '}
                  <span className={dk ? 'text-white/30' : 'text-gray-400'}>\</span>
                  <br />
                  <span className={`${dk ? 'text-white/30' : 'text-gray-400'} ml-4`}>-d</span>{' '}
                  <span className={dk ? 'text-amber-300' : 'text-amber-700'}>
                    &#39;{'{"model":"gpt-4o","messages":[{"role":"user","content":"Hi"}]}'}&#39;
                  </span>
                </div>
                <div className='flex justify-end mt-3'>
                  <Button
                    type='tertiary'
                    theme='borderless'
                    icon={<IconCopy />}
                    size='small'
                    className={dk ? '!text-white/40 hover:!text-white/70' : '!text-gray-400 hover:!text-gray-600'}
                    onClick={handleCopyBaseURL}
                  >
                    {t('复制地址')}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* ===== Section 2: Advantages (asymmetric grid) ===== */}
          <section className={`relative ${heroBg} py-24 px-4 overflow-hidden`}>
            <FloatingOrbs isDark={isDark} />
            <div className='relative z-10 max-w-5xl mx-auto'>
              <div className='text-center mb-16'>
                <h2 className={`text-3xl md:text-4xl font-bold ${heroText} mb-4`}>
                  {t('我们做到了什么')}
                </h2>
                <p className={`text-base ${heroSubtext} max-w-lg mx-auto`}>
                  {t('不是又一个中转站，而是你业务背后的基础设施')}
                </p>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5'>
                {advantages.map((adv, i) => (
                  <div
                    key={i}
                    className={`group relative p-6 rounded-2xl border ${advBorder} ${advCardBg} ${advShadow} backdrop-blur-sm ${advCardHover} hover:border-violet-500/30 transition-all duration-500 ${
                      i % 2 === 1 ? 'md:translate-y-6' : ''
                    }`}
                  >
                    <div className='w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 group-hover:scale-110 transition-all duration-300'>
                      {adv.icon}
                    </div>
                    <h3 className={`text-lg font-semibold ${advTitle} mb-2`}>{adv.title}</h3>
                    <p className={`text-sm ${advDesc} leading-relaxed`}>{adv.desc}</p>
                    <div className='absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== Section 3: Endpoint Ticker + Features ===== */}
          <section className='py-20 px-4 bg-semi-color-bg-0'>
            {/* Auto-scrolling endpoint ticker */}
            <div className='overflow-hidden mb-16'>
              <div className='flex gap-3 animate-[scroll_40s_linear_infinite]'>
                {[...API_ENDPOINTS, ...API_ENDPOINTS, ...API_ENDPOINTS].map(
                  (ep, i) => (
                    <span
                      key={i}
                      className='flex-shrink-0 px-3 py-1.5 rounded-md bg-semi-color-fill-0 border border-semi-color-border font-mono text-xs text-semi-color-text-2'
                    >
                      {ep}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Feature cards */}
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6'>
              {[
                {
                  title: t('一键替换基址'),
                  desc: t('兼容 OpenAI / Claude / Gemini 格式，已有代码只需改一行 base_url'),
                  icon: '{ }',
                },
                {
                  title: t('自动容灾切换'),
                  desc: t('多渠道优先级调度，单一供应商故障时无感切换，业务零中断'),
                  icon: '↻',
                },
                {
                  title: t('费用透明可控'),
                  desc: t('逐笔调用明细、按模型分账、预算预警，钱花到哪里一清二楚'),
                  icon: '¥',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className={`p-6 rounded-xl border border-semi-color-border bg-semi-color-bg-1 hover:bg-semi-color-bg-2 transition-colors ${dk ? '' : 'shadow-[0_1px_3px_rgba(0,0,0,0.04)]'}`}
                >
                  <div className='text-2xl mb-4 font-mono text-semi-color-primary font-bold'>{feature.icon}</div>
                  <h3 className='text-lg font-semibold text-semi-color-text-0 mb-2'>
                    {feature.title}
                  </h3>
                  <p className='text-sm text-semi-color-text-2 leading-relaxed'>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ===== Section 4: Provider Grid ===== */}
          <section className='py-20 px-4 bg-semi-color-bg-1'>
            <div className='max-w-5xl mx-auto'>
              <div className='flex items-center justify-center gap-3 mb-12'>
                <h2 className='text-2xl md:text-3xl font-bold text-semi-color-text-0'>
                  {t('支持的模型供应商')}
                </h2>
                <span className='px-2.5 py-1 rounded-full bg-semi-color-primary-light-default text-semi-color-primary text-sm font-medium'>
                  40+
                </span>
              </div>
              <div className='grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-3'>
                {PROVIDERS.map((p, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border border-semi-color-border bg-semi-color-bg-0 hover:bg-semi-color-bg-2 hover:scale-105 transition-all duration-200 ${dk ? '' : 'shadow-[0_1px_2px_rgba(0,0,0,0.03)]'}`}
                  >
                    <div className='w-8 h-8 flex items-center justify-center'>
                      {p.icon}
                    </div>
                    <span className='text-[10px] text-semi-color-text-2 text-center truncate w-full'>
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== Section 5: CTA ===== */}
          <section className={`relative ${heroBg} py-24 px-4 overflow-hidden`}>
            <FloatingOrbs isDark={isDark} />
            <div className='relative z-10 max-w-2xl mx-auto text-center'>
              <h2 className={`text-3xl md:text-4xl font-bold ${heroText} mb-4`}>
                {t('五分钟接入，零风险试用')}
              </h2>
              <p className={`text-base ${heroSubtext} mb-8`}>
                {t('注册即送额度')} · {t('按量计费')} · {t('无绑定无合约')}
              </p>
              <Link to='/console'>
                <Button
                  theme='solid'
                  type='primary'
                  size='large'
                  className='!rounded-lg !px-10 !py-3 !text-base shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow'
                >
                  {t('获取 API 密钥')}
                </Button>
              </Link>
            </div>
          </section>
        </div>
      ) : (
        <div className='overflow-x-hidden w-full'>
          {homePageContent.startsWith('https://') ? (
            <iframe src={homePageContent} className='w-full h-screen border-none' />
          ) : (
            <div className='mt-[60px]' dangerouslySetInnerHTML={{ __html: homePageContent }} />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
