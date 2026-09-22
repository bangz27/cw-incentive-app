/* TBS Incentive local profile store. No network or Firebase credentials are used here. */
(function (global) {
  const PROFILES_KEY = 'cw_profiles';
  const ACTIVE_KEY = 'cw_active_profile_id';
  const LEGACY_KEY = 'cw_profile';
  const now = () => new Date().toISOString();
  const readJson = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const id = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const normalize = (raw = {}) => {
    const createdAt = raw.createdAt || now();
    return {
      profileId: raw.profileId || id(), firebaseUid: raw.firebaseUid || '', email: raw.email || '',
      displayName: raw.displayName || raw.name || '', photoURL: raw.photoURL || '', customPhoto: raw.customPhoto || raw.photo || '',
      fullName: raw.fullName || raw.name || '', hub: raw.hub || '', position: raw.position || '',
      employeeId: raw.employeeId || '', driverId: raw.driverId || '', createdAt, updatedAt: raw.updatedAt || createdAt,
      isActive: Boolean(raw.isActive)
    };
  };
  function migrate() {
    let profiles = readJson(PROFILES_KEY, null);
    if (!Array.isArray(profiles)) {
      const legacy = readJson(LEGACY_KEY, null);
      profiles = legacy && Object.keys(legacy).length ? [normalize(legacy)] : [];
      if (profiles.length) write(PROFILES_KEY, profiles);
    }
    profiles = profiles.map(normalize);
    let activeId = localStorage.getItem(ACTIVE_KEY);
    if (!activeId || !profiles.some(p => p.profileId === activeId)) activeId = profiles[0]?.profileId || '';
    write(PROFILES_KEY, profiles);
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); else localStorage.removeItem(ACTIVE_KEY);
    return profiles;
  }
  function all() { return migrate(); }
  function active() { const profiles = all(); const activeId = localStorage.getItem(ACTIVE_KEY); return profiles.find(p => p.profileId === activeId) || null; }
  function save(input, profileId) {
    const profiles = all(); const existing = profiles.find(p => p.profileId === profileId);
    const profile = normalize({ ...(existing || {}), ...input, profileId: profileId || existing?.profileId || id(), updatedAt: now() });
    const next = existing ? profiles.map(p => p.profileId === profile.profileId ? profile : p) : [...profiles, profile];
    write(PROFILES_KEY, next); setActive(profile.profileId); return profile;
  }
  function setActive(profileId) {
    const profiles = all(); if (!profiles.some(p => p.profileId === profileId)) return null;
    write(PROFILES_KEY, profiles.map(p => ({ ...p, isActive: p.profileId === profileId })));
    localStorage.setItem(ACTIVE_KEY, profileId);
    // Keep legacy key as a compatibility mirror; existing records are untouched.
    const selected = profiles.find(p => p.profileId === profileId);
    write(LEGACY_KEY, selected || {});
    global.dispatchEvent(new CustomEvent('activeProfileChanged', { detail: selected }));
    return selected;
  }
  function remove(profileId) {
    const profiles = all(); const next = profiles.filter(p => p.profileId !== profileId); if (next.length) write(PROFILES_KEY, next); else localStorage.removeItem(PROFILES_KEY);
    if (localStorage.getItem(ACTIVE_KEY) === profileId) { const replacement = next[0]; if (replacement) setActive(replacement.profileId); else { localStorage.removeItem(ACTIVE_KEY); write(LEGACY_KEY, {}); global.dispatchEvent(new CustomEvent('activeProfileChanged', { detail: null })); } }
    return next;
  }
  function photo(profile) { return profile?.customPhoto || profile?.photoURL || ''; }
  global.TBSProfiles = { all, getActive: active, save, setActive, remove, photo, keys: { PROFILES_KEY, ACTIVE_KEY, LEGACY_KEY } };
  migrate();
})(window);
