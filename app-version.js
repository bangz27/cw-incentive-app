(function (global) {
  'use strict';

  const version = '1.9.0';
  global.TBSAppVersion = Object.freeze({
    name: version,
    display: `V${version}`,
    code: 10
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = global.TBSAppVersion;
})(typeof window !== 'undefined' ? window : globalThis);
