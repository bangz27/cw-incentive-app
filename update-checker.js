(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TBSUpdateChecker = api;
})(typeof window !== 'undefined' ? window : globalThis, function (global) {
  'use strict';

  const RELEASES_API = 'https://api.github.com/repos/bangz27/cw-incentive-app/releases/latest';
  const RELEASES_PAGE = 'https://github.com/bangz27/cw-incentive-app/releases';
  const CACHE_KEY = 'tbs_update_cache';
  const LAST_CHECK_KEY = 'lastUpdateCheck';
  const DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

  function parseVersion(value) {
    const text = String(value ?? '').trim().replace(/^v/i, '');
    const match = text.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$/);
    if (!match) return null;
    return [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)];
  }

  function compareVersions(left, right) {
    const a = Array.isArray(left) ? left : parseVersion(left);
    const b = Array.isArray(right) ? right : parseVersion(right);
    if (!a || !b) return null;
    for (let index = 0; index < 3; index += 1) {
      if (a[index] > b[index]) return 1;
      if (a[index] < b[index]) return -1;
    }
    return 0;
  }

  function normalizedVersion(value) {
    const parsed = parseVersion(value);
    return parsed ? parsed.join('.') : null;
  }

  function createBundledRelease(value) {
    const version = normalizedVersion(value);
    if (!version) return null;
    return Object.freeze({
      version,
      displayVersion: `V${version}`,
      tagName: `v${version}`,
      name: `TBS Incentive V${version}`,
      body: 'เวอร์ชันปัจจุบันของแอป',
      htmlUrl: RELEASES_PAGE,
      apkUrl: '',
      downloadUrl: RELEASES_PAGE,
      publishedAt: '',
      source: 'bundled-current'
    });
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }

  function normalizeRelease(raw) {
    if (!raw || typeof raw !== 'object' || raw.draft || raw.prerelease) return null;
    const version = normalizedVersion(raw.tag_name);
    if (!version) return null;
    const htmlUrl = isHttpUrl(raw.html_url) ? String(raw.html_url) : '';
    const assets = Array.isArray(raw.assets) ? raw.assets : [];
    const apkAsset = assets.find(asset => asset && /\.apk$/i.test(String(asset.name || '')) && isHttpUrl(asset.browser_download_url));
    const apkUrl = apkAsset ? String(apkAsset.browser_download_url) : '';
    if (!htmlUrl && !apkUrl) return null;
    return Object.freeze({
      version,
      displayVersion: `V${version}`,
      tagName: String(raw.tag_name),
      name: String(raw.name || raw.tag_name),
      body: typeof raw.body === 'string' ? raw.body : '',
      htmlUrl,
      apkUrl,
      downloadUrl: apkUrl || htmlUrl,
      publishedAt: raw.published_at ? String(raw.published_at) : '',
      source: raw.source ? String(raw.source) : 'github'
    });
  }

  function defaultStorage() {
    try {
      return global?.localStorage || null;
    } catch {
      return null;
    }
  }

  function safeGet(storage, key) {
    try {
      return storage?.getItem?.(key) || null;
    } catch {
      return null;
    }
  }

  function safeSet(storage, key, value) {
    try {
      storage?.setItem?.(key, value);
    } catch {
      // Storage may be disabled or full. Update checks must remain non-blocking.
    }
  }

  function safeRemove(storage, key) {
    try {
      storage?.removeItem?.(key);
    } catch {
      // Ignore storage failures; the network result is still usable.
    }
  }

  function createChecker(options = {}) {
    const fetchImpl = options.fetchImpl || global?.fetch?.bind(global);
    const storage = options.storage === undefined ? defaultStorage() : options.storage;
    const now = options.now || (() => Date.now());
    const cooldownMs = Number.isFinite(options.cooldownMs) ? options.cooldownMs : DEFAULT_COOLDOWN_MS;
    const getCurrentVersion = typeof options.currentVersion === 'function'
      ? options.currentVersion
      : () => options.currentVersion || global?.TBSAppVersion?.name || '1.9.0';
    const getBundledRelease = () => createBundledRelease(getCurrentVersion());

    const normalizeCachedRelease = value => {
      const normalized = normalizeRelease(value);
      if (normalized) return normalized;
      if (!value || typeof value !== 'object' || !value.version || !value.downloadUrl) return null;
      return normalizeRelease({
        tag_name: value.tagName || value.version,
        name: value.name,
        body: value.body,
        html_url: value.htmlUrl || value.downloadUrl,
        assets: value.apkUrl ? [{ name: 'cached-update.apk', browser_download_url: value.apkUrl }] : []
      });
    };

    const readCachedRelease = () => {
      const raw = safeGet(storage, CACHE_KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return normalizeCachedRelease(parsed?.release);
      } catch {
        return null;
      }
    };

    const writeCachedRelease = (release, checkedAt) => safeSet(storage, CACHE_KEY, JSON.stringify({ checkedAt, release }));
    const getLastCheckedAt = () => Number(safeGet(storage, LAST_CHECK_KEY) || 0);
    const saveLastCheckedAt = checkedAt => safeSet(storage, LAST_CHECK_KEY, String(checkedAt));

    async function check({ manual = false, online = true } = {}) {
      const checkedAt = Number(now()) || Date.now();
      const currentVersion = normalizedVersion(getCurrentVersion());
      if (!currentVersion) return { status: 'error', checked: false, release: null, error: new Error('Invalid current app version') };
      const cachedRelease = readCachedRelease();
      const lastCheckedAt = getLastCheckedAt();

      if (!online) return { status: 'offline', checked: false, release: null };
      if (!manual && lastCheckedAt > 0 && checkedAt - lastCheckedAt < cooldownMs) {
        const cachedComparison = cachedRelease ? compareVersions(cachedRelease.version, currentVersion) : null;
        if (cachedComparison === 1) {
          return { status: 'update-available', checked: false, fromCache: true, latestVersion: cachedRelease.version, release: cachedRelease };
        }
        const bundledRelease = getBundledRelease();
        if (bundledRelease) {
          writeCachedRelease(bundledRelease, checkedAt);
          return { status: 'latest', checked: false, fromCache: true, source: 'bundled-current', latestVersion: currentVersion, release: bundledRelease };
        }
        return { status: 'cooldown', checked: false, release: null };
      }
      if (typeof fetchImpl !== 'function') return { status: 'error', checked: false, release: null, error: new Error('Fetch is unavailable') };

      try {
        const response = await fetchImpl(RELEASES_API, {
          headers: { Accept: 'application/vnd.github+json' },
          cache: 'no-store'
        });
        if (!response || !response.ok) throw new Error(`GitHub API ${response?.status || 'request failed'}`);
        const raw = await response.json();
        saveLastCheckedAt(checkedAt);
        if (raw?.draft || raw?.prerelease) {
          safeRemove(storage, CACHE_KEY);
          return { status: 'latest', checked: true, release: null };
        }
        const release = normalizeRelease(raw);
        if (!release) throw new Error('Invalid GitHub release data');
        const comparison = compareVersions(release.version, currentVersion);
        if (comparison === null) throw new Error('Invalid current app version');
        if (comparison > 0) {
          writeCachedRelease(release, checkedAt);
          return { status: 'update-available', checked: true, latestVersion: release.version, release };
        }
        safeRemove(storage, CACHE_KEY);
        if (comparison < 0) {
          const bundledRelease = getBundledRelease();
          if (bundledRelease) {
            writeCachedRelease(bundledRelease, checkedAt);
            return { status: 'latest', checked: true, source: 'bundled-current', latestVersion: currentVersion, remoteRelease: release, release: bundledRelease };
          }
        }
        return { status: 'latest', checked: true, latestVersion: release.version, release };
      } catch (error) {
        return { status: 'error', checked: false, release: null, error };
      }
    }

    return Object.freeze({ check, readCachedRelease });
  }

  const defaultChecker = createChecker();
  return Object.freeze({
    RELEASES_API,
    RELEASES_PAGE,
    CACHE_KEY,
    LAST_CHECK_KEY,
    DEFAULT_COOLDOWN_MS,
    parseVersion,
    compareVersions,
    normalizedVersion,
    createBundledRelease,
    isNewerVersion: (candidate, current) => compareVersions(candidate, current) === 1,
    normalizeRelease,
    createChecker,
    check: (...args) => defaultChecker.check(...args)
  });
});
