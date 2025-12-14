class ReactApp {
  COMPONENTS_TABLE = 'Application_Composants';
  AUTH_TABLE = 'AuthLink';

  constructor() {
    this.components = new Map();
    this.currentComponent = null;
    this.isReady = false;
    this.gristAPI = null;
    this.session = { auth: null, ready: false };
  }

  async init() {
    try {
      await grist.ready({ requiredAccess: 'full' });

      this.setupGristAPI();
      await this.loadAuth();            // 🔐 Auth stricte via AuthLink
      await this.loadComponents();      // 🧩 Charge tous les composants

      this.setupNavigation();           // 🧭 Nav filtrée (requires_auth)
      this.setupGlobalNavHooks();       // data-nav
      this.renderHeaderUser();          // 👤 entête connecté/déconnecté

      this.hideLoading();
      this.isReady = true;

      await this.loadDefaultComponent(); // ▶️ redirection par rôle si connecté
      console.log('✅ Système prêt');
    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
      this.showError('Erreur initialisation', error.message);
    }
  }

  // ---------- API exposée aux composants ----------
  setupGristAPI() {
    const self = this;

    const selection = { record: null, tableId: null, viewSectionId: null };
    grist.onRecord((rec, mappings) => {
      selection.record = rec || null;
      selection.tableId = (mappings && mappings.tableId) || null;
      selection.viewSectionId = (mappings && mappings.viewSectionId) || null;
    });

    const helpers = {
      toBool(v) {
        if (v === true || v === 1 || v === '1') return true;
        if (typeof v === 'string' && v.toLowerCase() === 'true') return true;
        return false;
      },
      asArray(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]); },
      includesIci(h, n) { return String(h||'').toLowerCase().includes(String(n||'').toLowerCase()); },
      emailLooksOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim()); },
      pickLabelField(rows) {
        if (!rows || !rows.length) return 'id';
        const s = rows[0] || {};
        const pref = ['label','name','Nom','nom','title','Title','Libellé','Libelle','libelle','Intitule','Intitulé'];
        for (const k of pref) if (k in s && typeof s[k] === 'string') return k;
        for (const k of Object.keys(s)) if (typeof s[k] === 'string') return k;
        return 'id';
      },
      toOptions(rows) {
        const k = helpers.pickLabelField(rows);
        return (rows||[])
          .filter(r => r && r.id != null)
          .map(r => ({ value: r.id, label: String(r[k] ?? r.id) }));
      },
      parseDate(v) {
        if (!v) return null;
        if (v instanceof Date) return v;
        if (typeof v === 'string') { const d = new Date(v); return isNaN(d) ? null : d; }
        if (typeof v === 'number') {
          if (v > 1e12) return new Date(v);
          if (v > 1e9)  return new Date(v * 1000);
          if (v > 1e4)  return new Date(v);
          return new Date(v * 24*60*60*1000);
        }
        return null;
      },
      formatDate(d) { return d ? d.toLocaleDateString('fr-FR') : '—'; },
      daysLeft(target) {
        const d = helpers.parseDate(target); if (!d) return null;
        const now = new Date();
        const ms = d.setHours(23,59,59,999) - now.getTime();
        return Math.ceil(ms / (24*60*60*1000));
      },
      isFiniteNumber(n) { return typeof n === 'number' && isFinite(n); },
      validLatLng(lat, lng) {
        return helpers.isFiniteNumber(lat) && helpers.isFiniteNumber(lng) &&
               lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      }
    };

    this.gristAPI = {
      // 🔐 Session
      getAuth: () => self.session.auth,
      isAuthenticated: () => !!self.session.auth,
      refreshAuth: async () => { await self.loadAuth(); return self.session.auth; },
      goToLanding: () => self.redirectToLanding(),

      // Sélection liée Grist
      getSelection: () => selection,
      onRecord: (handler) => grist.onRecord(handler),
      onRecords: (handler) => grist.onRecords(handler),

      // Navigation programmée
      navigate: (componentId) => self.loadComponent(componentId),

      // Composants enfants
      getChildComponent: async (templateId, overrides = {}) => {
        const templates = await self.gristAPI.getData(self.COMPONENTS_TABLE);
        const tpl = templates.find(t => t.template_id === templateId);
        if (!tpl) return null;
        return self.createChildComponent(tpl, overrides);
      },
      createChildComponent: (template, overrides = {}) =>
        self.createChildComponent(template, overrides),


      // Helpers communs
      helpers,

      // --- Data ---
      async getData(tableName) {
        const result = await grist.docApi.fetchTable(tableName);
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          const cols = Object.keys(result);
          const isColumnar = cols.some(c => Array.isArray(result[c]));
          if (isColumnar) {
            const firstArrayCol = cols.find(c => Array.isArray(result[c]));
            const rowCount = result[firstArrayCol]?.length || 0;
            const rows = [];
            for (let i = 0; i < rowCount; i++) {
              const row = {};
              cols.forEach(col => row[col] = Array.isArray(result[col]) ? result[col][i] : result[col]);
              rows.push(row);
            }
            return rows;
          }
          return [];
        }
        if (Array.isArray(result)) return result;
        if (result?.records) return result.records;
        if (result?.data) return result.data;
        return [];
      },

      async addRecord(tableName, record) {
        const result = await grist.docApi.applyUserActions([
          ['AddRecord', tableName, null, record]
        ]);
        return result[0];
      },

      async updateRecord(tableName, recordId, updates) {
        await grist.docApi.applyUserActions([
          ['UpdateRecord', tableName, recordId, updates]
        ]);
        return true;
      },

      async deleteRecord(tableName, recordId) {
        await grist.docApi.applyUserActions([
          ['RemoveRecord', tableName, recordId]
        ]);
        return true;
      },
    };
  }

  // ---------- Auth stricte (AuthLink) ----------
  async loadAuth() {
    try {
      const rows = await this.gristAPI.getData(this.AUTH_TABLE);
      // EXACTEMENT 1 ligne visible (ACL via LinkKey/Token)
      if (!Array.isArray(rows) || rows.length !== 1) {
        this.session.auth = null;
        this.session.ready = true;
        this.renderHeaderUser();
        this.setupNavigation();
        return null;
      }
      const row = rows[0];
      this.session.auth = {
        email: row.Email || null,
        token: row.Token || null,
        expiresAt: row.Expire_le || null,
        beneficiaireId: row.Beneficiaire || null,
        repondantId: row.Repondant || null,
        acheteurId: row.Acheteur || null,
        roles: Array.isArray(row.Roles) ? row.Roles : [], // ChoiceList()
      };
      this.session.ready = true;
      this.renderHeaderUser();
      this.setupNavigation();
      return this.session.auth;
    } catch (e) {
      console.warn('loadAuth error:', e);
      this.session.auth = null;
      this.session.ready = true;
      this.renderHeaderUser();
      this.setupNavigation();
      return null;
    }
  }

  // ---------- Hooks de nav globaux ----------
  setupGlobalNavHooks() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-nav]');
      if (!el) return;
      const id = el.getAttribute('data-nav');
      if (!id) return;
      e.preventDefault();
      this.loadComponent(id);
    });
    window.gristNavigate = (id) => this.loadComponent(id);
  }

  // ---------- En-tête utilisateur ----------
  renderHeaderUser() {
    const host = document.getElementById('header-user');
    if (!host) return;

    const auth = this.session?.auth || null;

    // Non connecté : bouton "Se connecter"
    if (!auth) {
      host.innerHTML = `
        <ul class="fr-btns-group">
          <li>
            <button class="fr-btn fr-icon-lock-line" data-nav="login">Se connecter</button>
          </li>
        </ul>
      `;
      return;
    }

    const email = auth.email || 'Compte';
    const menuId = 'user-menu';

    // Rôles et mapping rôle -> composant
    const roles = Array.isArray(auth.roles) ? auth.roles : [];
    const hasRole = (r) => roles.includes(r);

    const candidates = [
      { role: 'repondant',    id: 'espace-repondant',    label: 'Espace répondant'    },
      { role: 'beneficiaire', id: 'espace-beneficiaire', label: 'Espace bénéficiaire' },
      { role: 'acheteur',     id: 'espace-acheteur',     label: 'Espace acheteur'     },
    ];

    // On ne garde que (rôle présent) ET (composant réellement disponible)
    const spaces = candidates.filter(s => hasRole(s.role) && this.components.has(s.id));

    const spaceItems = spaces
      .map(s => `<li><a class="fr-nav__link" href="#" data-nav="${s.id}">${s.label}</a></li>`)
      .join('');

    host.innerHTML = `
      <div class="fr-nav__item">
        <button aria-controls="${menuId}" aria-expanded="false" type="button" class="fr-btn--account fr-btn" id="user-menu-btn">${email}</button>
        <div class="fr-collapse fr-menu" id="${menuId}">
          <ul class="fr-menu__list">
            ${spaceItems}
            ${spaces.length ? '<li><hr class="fr-hr fr-mx-1w" /></li>' : ''}
            <li><button class="fr-nav__link" id="btn-logout" type="button">Se déconnecter</button></li>
          </ul>
        </div>
      </div>
    `;

    // Toggle minimal si le JS DSFR ne rebinde pas dynamiquement
    const btn = document.getElementById('user-menu-btn');
    const menu = document.getElementById(menuId);
    if (btn && menu) {
      const close = (ev) => {
        if (!menu.contains(ev.target) && ev.target !== btn) {
          btn.setAttribute('aria-expanded', 'false');
          menu.style.display = 'none';
          document.removeEventListener('click', close, true);
        }
      };
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        menu.style.display = open ? 'none' : 'block';
        if (!open) setTimeout(() => document.addEventListener('click', close, true), 0);
      });
    }

    // Déconnexion
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  }

  logout() {
    try {
      this.session.auth = null;
      this.setupNavigation();
      this.renderHeaderUser();

      // Retire le paramètre Token_ de l’URL (révocation de l’accès par ACL)
      const topWin = window.top || window;
      const url = new URL(topWin.location.href);
      url.searchParams.delete('Token_');
      topWin.location.href = url.toString();
    } catch (e) {
      console.warn('logout reload:', e);
      location.reload();
    }
  }

  // ---------- Composants ----------
  createChildComponent(template, overrides = {}) {
    try {
      const transformedCode = Babel.transform(template.component_code, {
        presets: ['react'],
        plugins: ['proposal-class-properties']
      }).code;

      // ⚠️ API locale = API globale + overrides (ex: navigate local)
      const localAPI = Object.assign({}, this.gristAPI, overrides);

      const factory = new Function(
        'React','useState','useEffect','useCallback','gristAPI',
        `${transformedCode}\nreturn Component;`
      );
      return factory(
        React,
        React.useState,
        React.useEffect,
        React.useCallback,
        localAPI
      );
    } catch (err) {
      console.error(`Erreur création composant enfant ${template?.template_id}:`, err);
      return () => React.createElement('div', {className:'fr-alert fr-alert--error fr-p-2w'},
        `Erreur: ${template?.template_id || 'child'}`);
    }
  }

  async loadComponents() {
    const templatesData = await this.gristAPI.getData(this.COMPONENTS_TABLE);
    const templates = Array.isArray(templatesData) ? templatesData : [];

    if (!templates.length) {
      throw new Error(`Aucun composant trouvé dans ${this.COMPONENTS_TABLE}`);
    }

    this.components.clear();
    for (const template of templates) {
      const component = this.processComponent(template);
      this.components.set(component.id, component);
    }
  }

  toBool(v) {
    if (v === true || v === 1 || v === '1') return true;
    if (typeof v === 'string' && v.toLowerCase() === 'true') return true;
    return false;
  }

  processComponent(template) {
    const componentData = {
      id: template.template_id,
      name: template.template_name,
      type: template.component_type || 'functional',
      code: template.component_code,
      showInNav: this.toBool(template.show_in_nav),
      navOrder: Number(template.nav_order ?? 9999),
      isDefault: this.toBool(template.default_component),
      requiresAuth: this.toBool(template.requires_auth),
    };

    if (!componentData.id || !componentData.name || !componentData.code) {
      throw new Error(`Composant invalide (id/name/code manquant) : ${componentData.id || '(sans id)'}`);
    }

    const cleanCode = this.sanitizeCode(componentData.code);

    return {
      ...componentData,
      code: cleanCode,
      render: async (container) => {
        await this.renderReactComponent(container, cleanCode, componentData.id);
      }
    };
  }

  sanitizeCode(code) {
    return String(code)
      .replace(/\r\n/g, '\n')
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
      .trim();
  }

  async renderReactComponent(container, code, componentId) {
    try {
      container.innerHTML = '';

      const reactContainer = document.createElement('div');
      reactContainer.id = `react-container-${componentId}`;
      reactContainer.className = 'component-container fr-container--fluid';
      container.appendChild(reactContainer);

      const transformedCode = Babel.transform(code, {
        presets: ['react'],
        plugins: ['proposal-class-properties']
      }).code;

      const componentFactory = new Function(
        'React','gristAPI',
        `
        const { useState, useEffect, useMemo, useCallback } = React;
        ${transformedCode}
        if (typeof Component === 'undefined') {
          throw new Error("Composant non défini : déclare 'const Component = () => {...}' ou 'function Component() {...}'");
        }
        return Component;
        `
      );

      const Component = componentFactory(React, this.gristAPI);
      ReactDOM.render(React.createElement(Component), reactContainer);
    } catch (error) {
      console.error('Erreur rendu composant:', error);
      this.showComponentError(container, error, componentId);
    }
  }

  // ---------- Redirection par rôle (centrale) ----------
  pickLandingComponent() {
    if (!this.session.auth) return null;
    const roles = Array.isArray(this.session.auth.roles) ? this.session.auth.roles : [];

    // Priorité : beneficiaire → acheteur → repondant
    const ROLE_TO_COMP = {
      beneficiaire: 'espace-beneficiaire',
      acheteur: 'espace-acheteur',
      repondant: 'espace-repondant'
    };
    const PRIORITY = [ 'repondant','beneficiaire', 'acheteur',];

    for (const r of PRIORITY) {
      if (roles.includes(r)) {
        const compId = ROLE_TO_COMP[r];
        const comp = this.components.get(compId);
        if (!comp) {
          throw new Error(`Composant d’espace manquant pour le rôle "${r}" (attendu: "${compId}")`);
        }
        return comp;
      }
    }
    throw new Error('Aucun rôle reconnu pour déterminer la page d’atterrissage.');
  }

  async redirectToLanding() {
    const comp = this.pickLandingComponent();
    await this.loadComponent(comp.id);
  }

  // ---------- Navigation (sans hash) ----------
  setupNavigation() {
    const nav = document.getElementById('navigation');
    if (!nav) return;
    nav.innerHTML = '';

    const isAuth = !!this.session.auth;

    const comps = Array.from(this.components.values())
      .filter(c => c.showInNav && (!c.requiresAuth || isAuth))
      .sort((a, b) => a.navOrder - b.navOrder);

    comps.forEach(component => {
      const li = document.createElement('li');
      li.className = 'fr-nav__item';

      const a = document.createElement('a');
      a.className = 'fr-nav__link';
      a.href = '#';
      a.textContent = component.name;
      a.dataset.componentId = component.id;
      a.setAttribute('data-nav', component.id);

      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadComponent(component.id);
      });

      li.appendChild(a);
      nav.appendChild(li);
    });
  }

  isAuthenticated() {
    return !!this.session.auth;
  }

  renderAuthGate(container, targetComp = null) {
    const wants = targetComp ? `“${targetComp.name}”` : 'cette page';
    container.innerHTML = `
      <section class="fr-container fr-my-6w">
        <div class="fr-alert fr-alert--warning fr-mb-3w">
          <p><strong>Accès restreint.</strong> Vous devez être connecté pour accéder à ${wants}.</p>
        </div>
        <div class="fr-btns-group fr-btns-group--inline">
          <button class="fr-btn" data-nav="login">Se connecter</button>
          <button class="fr-btn fr-btn--secondary" id="auth-refresh">Réessayer</button>
        </div>
      </section>
    `;
    const btn = container.querySelector('#auth-refresh');
    if (btn) btn.addEventListener('click', async () => {
      await this.loadAuth();
      if (this.isAuthenticated() && targetComp) this.loadComponent(targetComp.id);
    });
  }

  async loadComponent(componentId) {
    if (!this.isReady) return;
    const component = this.components.get(componentId);
    if (!component) {
      this.showError('Composant introuvable', `ID: ${componentId}`);
      return;
    }

    // 🔐 Garde d’accès stricte
    if (component.requiresAuth && !this.isAuthenticated()) {
      this.renderAuthGate(document.getElementById('main-content'), component);
      this.currentComponent = null;
      return;
    }

    // Nettoyer l’ancienne root si présente
    if (this._currentRoot && this._currentRoot.unmount) {
      this._currentRoot.unmount();
      this._currentRoot = null;
    }

    const main = document.getElementById('main-content');
    await component.render(main);

    // Etat actif dans le menu
    document.querySelectorAll('#navigation .fr-nav__link').forEach(link => {
      link.classList.toggle('fr-nav__link--active', link.dataset.componentId === componentId);
      link.setAttribute('aria-current', link.dataset.componentId === componentId ? 'page' : 'false');
    });

    this.currentComponent = componentId;
  }

  async loadDefaultComponent() {
    if (this.components.size === 0) {
      this.showError('Configuration', `Aucun composant dans ${this.COMPONENTS_TABLE}.`);
      return;
    }

    // Si connecté → redirection immédiate vers l’espace en fonction du rôle
    if (this.isAuthenticated()) {
      await this.redirectToLanding();
      return;
    }

    // Sinon on exige un composant "public" marqué par défaut
    const defaultComp = Array.from(this.components.values()).find(c => c.isDefault);
    if (!defaultComp) {
      this.showError('Configuration', 'Aucun composant public marqué par défaut (colonne "default_component").');
      return;
    }
    if (defaultComp.requiresAuth) {
      this.renderAuthGate(document.getElementById('main-content'), defaultComp);
      return;
    }

    await this.loadComponent(defaultComp.id);
  }

  // ---------- UI utilitaires ----------
  showLoading(message) {
    const el = document.getElementById('loading');
    if (!el) return;
    const msg = el.querySelector('[data-loading-msg]');
    if (msg && message) msg.textContent = message;
    el.style.display = 'flex';
    el.setAttribute('aria-busy', 'true');
  }

  hideLoading() {
    const el = document.getElementById('loading');
    if (!el) return;
    el.style.display = 'none';
    el.setAttribute('aria-busy', 'false');
  }

  showError(title, message) {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <section class="fr-container fr-my-6w">
        <div class="fr-alert fr-alert--error">
          <p><strong>${title}</strong><br/>${message}</p>
        </div>
      </section>
    `;
  }

  showComponentError(container, error, componentId) {
    container.innerHTML = `
      <div class="error-container">
        <h3>🚨 Erreur Composant: ${componentId}</h3>
        <p><strong>Message:</strong> ${error.message}</p>
        <pre>${error.stack || 'Pas de stack trace'}</pre>
      </div>
    `;
  }
}

// Initialisation
window.react_app = new ReactApp();
document.addEventListener('DOMContentLoaded', () => {
  window.react_app.init();
});
