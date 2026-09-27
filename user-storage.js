/* TBS Incentive V1.6 user-scoped storage. Legacy data is never auto-assigned. */
(function (global) {
  'use strict';
  const PREFIX = 'tbs:v1.6:';
  const LEGACY_KEYS = ['cw_profile', 'cw_profiles', 'cw_active_profile_id', 'incentive_history'];
  let currentUserId = null;

  const read = key => { try { return global.localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { global.localStorage.setItem(key, String(value)); return true; } catch { return false; } };
  const remove = key => { try { global.localStorage.removeItem(key); } catch {} };
  const KEY_ALIASES = { incentive_history: 'history', cw_profiles: 'profiles', cw_active_profile_id: 'active-profile-id', cw_profile: 'profile' };
  const normalizeKey = key => KEY_ALIASES[key] || key;
  const scopedKey = key => currentUserId ? `${PREFIX}${currentUserId}:${normalizeKey(key)}` : null;
  const scoped = key => scopedKey(key);
  const getItem = key => { const k = scopedKey(key); return k ? read(k) : null; };
  const setItem = (key, value) => { const k = scopedKey(key); return k ? write(k, value) : false; };
  const removeItem = key => { const k = scopedKey(key); if (k) remove(k); };
  const getJson = (key, fallback) => { try { const value = JSON.parse(getItem(key)); return value ?? fallback; } catch { return fallback; } };
  const setJson = (key, value) => setItem(key, JSON.stringify(value));
  const legacyGet = key => read(key);
  const legacyJson = (key, fallback) => { try { const value = JSON.parse(legacyGet(key)); return value ?? fallback; } catch { return fallback; } };
  const hasLegacyData = () => LEGACY_KEYS.some(key => {
    const value = legacyGet(key);
    if (!value) return false;
    if (key === 'incentive_history') { try { return Array.isArray(JSON.parse(value)) && JSON.parse(value).length > 0; } catch { return false; } }
    try { return Object.keys(JSON.parse(value) || {}).length > 0 || (Array.isArray(JSON.parse(value)) && JSON.parse(value).length > 0); } catch { return false; }
  });
  const migrationKey = uid => `${PREFIX}${uid}:legacy-migration`;
  const migrationState = uid => read(migrationKey(uid));
  const markMigration = (uid, state) => write(migrationKey(uid), state);
  const migrateLegacy = uid => {
    if (!uid) return false;
    const keys = {
      cw_profile: 'profile',
      cw_profiles: 'profiles',
      cw_active_profile_id: 'active-profile-id',
      incentive_history: 'history'
    };
    Object.entries(keys).forEach(([legacyKey, userKey]) => {
      const value = legacyGet(legacyKey);
      if (value !== null) write(`${PREFIX}${uid}:${userKey}`, value);
    });
    markMigration(uid, 'imported');
    return true;
  };
  const skipLegacy = uid => Boolean(uid && markMigration(uid, 'skipped'));
  const clearUserData = () => {
    if (!currentUserId) return;
    const prefix = `${PREFIX}${currentUserId}:`;
    try { Object.keys(global.localStorage).filter(key => key.startsWith(prefix) && key !== migrationKey(currentUserId)).forEach(key => global.localStorage.removeItem(key)); } catch {}
  };
  const setUser = uid => { currentUserId = uid ? String(uid) : null; global.dispatchEvent(new CustomEvent('userStorageReady', { detail: { userId: currentUserId } })); return currentUserId; };
  const clearUser = () => { currentUserId = null; };
  const storage = { getItem, setItem, removeItem };

  global.TBSUserStorage = {
    PREFIX, LEGACY_KEYS, storage, scoped, getItem, setItem, removeItem, getJson, setJson,
    legacyGet, legacyJson, hasLegacyData, migrationState, migrateLegacy, skipLegacy,
    setUser, clearUser, clearUserData, getUserId: () => currentUserId
  };
})(window);
