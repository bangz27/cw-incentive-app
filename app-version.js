(function (global) {
  'use strict';

  const version = '2.0.0';
  global.TBSAppVersion = Object.freeze({
    name: version,
    display: `V${version}`,
    code: 11
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = global.TBSAppVersion;
})(typeof window !== 'undefined' ? window : globalThis);
