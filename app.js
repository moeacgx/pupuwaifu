(() => {
    const cfg = window.LINKS_CONFIG || {};
    const params = new URLSearchParams(window.location.search);

    const profileId = (
        params.get('id') ||
        cfg.profileId ||
        window.PROFILE_ID ||
        document.body.dataset.profileId ||
        'default'
    ).trim();

    const baseOverride = (
        params.get('base')?.trim() ||
        cfg.dataBase ||
        window.DATA_BASE
    );

    const dataFile = cfg.dataFile || 'links.json';
    const dataUrlOverride = params.get('dataUrl')?.trim() || cfg.dataUrl;

    const candidates = [
        dataUrlOverride,
        baseOverride ? new URL(dataFile, baseOverride).href : null,
        new URL(`./${dataFile}`, window.location.href).href,
        new URL(`../${dataFile}`, window.location.href).href,
        new URL(`../data/pages/${dataFile}`, window.location.href).href,
        new URL(`../public/data/pages/${dataFile}`, window.location.href).href,
    ].filter(Boolean);

    const statusEl = document.getElementById('status');

    loadProfile(profileId, candidates).catch((err) => {
        console.error(err);
        showStatus(`配置加载失败：${err.message || err}`, true);
    });

    async function loadProfile(id, dataUrls) {
        let lastError;
        for (const dataUrl of dataUrls) {
            try {
                const res = await fetch(dataUrl, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                renderProfile(data, id, dataUrl);
                hideStatus();
                return;
            } catch (err) {
                lastError = err;
                console.warn(`无法从 ${dataUrl} 读取配置`, err);
            }
        }
        throw lastError || new Error('未找到可用的数据源');
    }

    function renderProfile(data, id, sourceUrl) {
        const common = data.common || {};
        const profiles = data.profiles || {};
        const profile = profiles[id] || data[id];

        if (!profile) {
            throw new Error(`未找到分组：${id}`);
        }

        applyTheme(profile.theme || common.theme);
        document.title = profile.title || profile.name || 'Links';

        setImage('avatar', profile.avatar || common.avatar || 'assets/profile.png');
        setText('name', profile.name || '未命名');
        setText('tagline', profile.tagline || common.tagline || '');

        const socials = [
            ...(profile.social || profile.links || []),
            ...(common.social || []),
        ];
        renderSocial(socials);

        renderButtons(profile.buttons || [], common.buttons || []);
        renderFooter(profile.footer || common.footer || {});
    }

    function renderSocial(list) {
        const holder = document.getElementById('social-links');
        holder.innerHTML = '';
        list.forEach((item) => {
            if (!item?.url) return;
            const a = document.createElement('a');
            a.href = item.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.className = 'social-link';
            a.ariaLabel = item.label || item.icon || 'social';
            a.innerHTML = iconFor(item.icon) || `<span>${(item.icon || '?')[0]}</span>`;
            holder.appendChild(a);
        });
        holder.classList.toggle('hidden', holder.childElementCount === 0);
    }

    function renderButtons(primaryButtons, commonButtons) {
        const list = document.getElementById('cta-list');
        list.innerHTML = '';

        const hasPrimary = Array.isArray(primaryButtons) && primaryButtons.length;
        const hasCommon = Array.isArray(commonButtons) && commonButtons.length;

        if (!hasPrimary && !hasCommon) {
            list.innerHTML = '<div class="status-chip error">暂无按钮，请补充 JSON 数据</div>';
            return;
        }

        if (hasPrimary) {
            primaryButtons.forEach((btn) => list.appendChild(buildButton(btn)));
        }

        if (hasPrimary && hasCommon) {
            list.appendChild(makeDivider());
        }

        if (hasCommon) {
            commonButtons.forEach((btn) => list.appendChild(buildButton(btn)));
        }
    }

    function makeDivider() {
        const div = document.createElement('div');
        div.className = 'cta-divider';
        return div;
    }

    function buildButton(btn) {
        const a = document.createElement('a');
        a.className = 'cta-card';
        if (btn.type === 'outline') a.classList.add('outline');

        const locked = btn.locked || btn.disabled;
        if (!locked && btn.url) {
            a.href = btn.url;
            a.target = '_blank';
            a.rel = 'noopener';
        } else {
            a.href = '#';
            a.setAttribute('aria-disabled', 'true');
            a.classList.add('locked');
        }

        a.textContent = btn.label || '未命名按钮';
        return a;
    }

    function renderFooter(footer) {
        const line1 = document.getElementById('footer-line-1');
        const line2 = document.getElementById('footer-line-2');
        const cta = document.getElementById('footer-cta');

        setText('footer-line-1', (footer.lines && footer.lines[0]) || '');
        setText('footer-line-2', (footer.lines && footer.lines[1]) || '');

        if (footer.cta?.url) {
            cta.textContent = footer.cta.label || footer.cta.url;
            cta.href = footer.cta.url;
            cta.classList.remove('hidden');
        } else {
            cta.classList.add('hidden');
        }

        const footerBlock = document.getElementById('footer');
        const hasFooterContent = line1.textContent || line2.textContent || !cta.classList.contains('hidden');
        footerBlock.classList.toggle('hidden', !hasFooterContent);
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        el.textContent = value || '';
        el.classList.toggle('hidden', !value);
    }

    function setImage(id, url) {
        const img = document.getElementById(id);
        img.src = url;
    }

    function showStatus(message, isError = false) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.toggle('error', isError);
        statusEl.classList.remove('hidden');
    }

    function hideStatus() {
        if (!statusEl) return;
        statusEl.classList.add('hidden');
    }

    function applyTheme(theme) {
        if (!theme) return;
        Object.entries(theme).forEach(([key, val]) => {
            document.documentElement.style.setProperty(`--${key}`, val);
        });
    }

    function shortenUrl(url) {
        try {
            const u = new URL(url);
            return `${u.hostname}${u.pathname}`;
        } catch (e) {
            return url;
        }
    }

    function iconFor(key = '') {
        const normalized = key.toLowerCase();
        const icons = {
            instagram: '<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm0 2h10c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3zm12 1a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z"/></svg>',
            tiktok: '<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path d="M17 3c.08 1.27.67 2.43 1.55 3.29A5.4 5.4 0 0021 7v3.07c-1.3-.04-2.6-.42-3.76-1.1v6.38c0 3.41-2.6 6.45-6.21 6.65A6.5 6.5 0 014.2 15.2a6.43 6.43 0 015.68-6.59c.38-.04.77-.05 1.15-.03v3.36a3.3 3.3 0 00-.9-.03 3.15 3.15 0 00-.66 6.22 3.22 3.22 0 003.76-3.17V2h3.77z"/></svg>',
            twitter: '<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path d="M22 5.8a7 7 0 01-2 .55 3.48 3.48 0 001.53-1.92 6.9 6.9 0 01-2.2.84A3.44 3.44 0 0015.3 4a3.48 3.48 0 00-3.45 4.27A9.79 9.79 0 013 5.16a3.48 3.48 0 001.07 4.65 3.4 3.4 0 01-1.56-.43v.04A3.48 3.48 0 005.46 13a3.42 3.42 0 01-1.55.06A3.48 3.48 0 006.8 14.7 6.9 6.9 0 012 16.57 9.76 9.76 0 007.29 18c6.95 0 10.76-5.77 10.76-10.77 0-.16 0-.33-.01-.49A7.7 7.7 0 0022 5.8z"/></svg>',
            x: '<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path d="M4 3h4.3l3.4 4.99L15.9 3H20l-6.4 7.2L20.5 21h-4.3l-3.8-5.3-4.3 5.3H4l6.6-7.6z"/></svg>',
            telegram: '<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path d="M9.5 16.9l-.4 5.1c.6 0 .9-.3 1.2-.7l2.9-3.6 6-4.6c.7-.5.3-.8-.4-.6l-7.3 2.9-3.1-1c-.7-.2-.7-.7.1-1.1l12.1-4.7c.5-.2 1 .1.8 1.1l-2.1 10.6c-.1.6-.5.8-1 .5l-4.2-3.1-2.6 2.5c-.3.3-.6.5-1.2.5z"/></svg>',
        };
        return icons[normalized] || '';
    }
})();
