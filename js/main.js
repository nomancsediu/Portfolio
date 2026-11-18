(() => {
  const root = document.documentElement;
  root.classList.add('js');

  /* ---------------- Theme ---------------- */
  const toggle = document.querySelector('.theme-toggle');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
  };

  function isDark() {
    const chosen = root.dataset.theme;
    return chosen ? chosen === 'dark' : systemDark.matches;
  }

  function paintTheme() {
    const dark = isDark();
    root.classList.toggle('is-dark', dark);
    toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  toggle.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set('theme', next);
    paintTheme();
  });
  systemDark.addEventListener('change', paintTheme);
  paintTheme();

  /* ---------------- Tabs (hash-linked) ---------------- */
  const tabs = [...document.querySelectorAll('.tab')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const ids = panels.map((p) => p.id);
  const tabBar = document.querySelector('.tabs');

  function select(id, { focus = false, scroll = false } = {}) {
    if (!ids.includes(id)) id = ids[0];
    tabs.forEach((tab, i) => {
      const on = ids[i] === id;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
      if (on && focus) tab.focus();
      if (on) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    if (scroll) {
      // Bring the tab bar to the top only if the reader has scrolled past it.
      const top = tabBar.getBoundingClientRect().top + window.scrollY;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'auto' });
    }
  }

  function fromHash() {
    return decodeURIComponent(location.hash.slice(1));
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      history.replaceState(null, '', '#' + ids[i]);
      select(ids[i], { scroll: true });
    });
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
      if (!(e.key in keys)) return;
      e.preventDefault();
      let next = keys[e.key] === -Infinity ? 0 : keys[e.key] === Infinity ? ids.length - 1 : (i + keys[e.key] + ids.length) % ids.length;
      history.replaceState(null, '', '#' + ids[next]);
      select(ids[next], { focus: true });
    });
  });

  // In-page links to a panel (e.g. "BoardSnap" in Achievements) switch tabs too.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('tab') || a.classList.contains('skip')) return;
    const id = a.getAttribute('href').slice(1);
    if (!ids.includes(id)) return;
    e.preventDefault();
    history.replaceState(null, '', '#' + id);
    select(id, { scroll: true });
  });

  window.addEventListener('hashchange', () => select(fromHash(), { scroll: true }));
  select(fromHash());
  // Panels are tabs, not anchors: a deep link opens the tab but keeps the profile header in view.
  if (location.hash) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const toTop = () => window.scrollTo(0, 0);
    toTop();
    window.addEventListener('load', () => requestAnimationFrame(toTop), { once: true });
  }

  /* ---------------- Live Cloudflare stats (Admission Informer) ---------------- */
  // Shows only real numbers from /api/stats. If the function is missing or
  // fails, the box stays hidden and the all-time figures above still show.
  const live = document.querySelector('.live-stats');

  function renderStats(d) {
    const ok = d && [d.requests, d.visits, d.errorRate, d.days].every((n) => typeof n === 'number' && isFinite(n));
    if (!live || !ok || d.requests <= 0) return false;
    const fmt = new Intl.NumberFormat('en-US');
    const pct = d.errorRate * 100;
    const set = (k, v) => document.querySelectorAll(`[data-stat="${k}"]`).forEach((el) => { el.textContent = v; });
    set('days', String(d.days));
    set('requests', fmt.format(d.requests));
    set('visits', fmt.format(d.visits));
    set('errorRate', pct > 0 && pct < 0.01 ? '<0.01%' : `${pct.toFixed(2)}%`);
    live.hidden = false;
    document.querySelectorAll('[data-live]').forEach((el) => { el.hidden = false; });
    return true;
  }
  window.__renderStats = renderStats; // handy for checking the layout by hand

  if (live && location.protocol !== 'file:') {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    fetch('/api/stats', { signal: ctrl.signal, headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then(renderStats)
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  }

  /* ---------------- Copy email address ---------------- */
  const copyStatus = document.querySelector('.copy-status');
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        // Older browsers or blocked clipboard: fall back to a hidden textarea.
        const ta = Object.assign(document.createElement('textarea'), { value: text });
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.append(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch {}
        ta.remove();
      }
      btn.textContent = ok ? 'Copied' : label;
      if (copyStatus) {
        copyStatus.textContent = ok ? `Copied ${text} to the clipboard.` : `Couldn't copy. Select the address above instead.`;
      }
      setTimeout(() => { btn.textContent = label; }, 2000);
    });
  });

  /* ---------------- Back to top ---------------- */
  const toTop = document.querySelector('.to-top');
  const heading = document.querySelector('h1');
  if (toTop && heading) {
    heading.tabIndex = -1;
    toTop.addEventListener('click', () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      heading.focus({ preventScroll: true });
    });
  }

  /* ---------------- Certificate viewer ---------------- */
  const viewer = document.querySelector('.viewer');
  const viewerImg = viewer.querySelector('.viewer__img');
  const viewerTitle = viewer.querySelector('.viewer__title');

  document.querySelectorAll('.cert').forEach((btn) => {
    btn.addEventListener('click', () => {
      viewerImg.src = btn.dataset.cert;
      viewerImg.alt = btn.dataset.title + ' certificate';
      viewerTitle.textContent = btn.dataset.title;
      viewer.showModal();
    });
  });
  // Click on the backdrop closes it.
  viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });

  /* ---------------- Contact form (EmailJS) ---------------- */
  const form = document.getElementById('contact-form');
  const status = form.querySelector('.form__status');
  const submit = form.querySelector('button[type="submit"]');
  const EMAIL = 'abdnoman093@gmail.com';

  function say(text, kind) {
    status.textContent = text;
    status.className = 'form__status' + (kind ? ' is-' + kind : '');
  }

  form.addEventListener('input', (e) => {
    if (e.target.matches('[aria-invalid="true"]') && e.target.checkValidity()) {
      e.target.removeAttribute('aria-invalid');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fields = [...form.querySelectorAll('input, textarea')];
    const bad = fields.filter((f) => !f.checkValidity());
    fields.forEach((f) => (f.checkValidity() ? f.removeAttribute('aria-invalid') : f.setAttribute('aria-invalid', 'true')));
    if (bad.length) {
      const first = bad[0];
      const label = form.querySelector(`label[for="${first.id}"]`).textContent.toLowerCase();
      say(first.validity.typeMismatch ? 'Enter an email address like name@example.com.' : `Add ${label} before sending.`, 'error');
      first.focus();
      return;
    }

    if (!window.emailjs) {
      say(`The form couldn't load. Email me at ${EMAIL} instead.`, 'error');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending…';
    say('');

    try {
      emailjs.init({ publicKey: 'cYe5ss-oo4adWD9u8' });
      await emailjs.sendForm('service_qx5qtrd', 'template_tg96xss', form);
      form.reset();
      say('Message sent. I’ll reply by email.', 'ok');
    } catch {
      say(`Couldn't send the message. Try again, or email me at ${EMAIL}.`, 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Send message';
    }
  });
})();
