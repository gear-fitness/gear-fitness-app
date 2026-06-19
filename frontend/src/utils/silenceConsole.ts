/** Silence non-error console output in production builds. `__DEV__` is true in
 *  development (Metro / dev client) and false in release/EAS production builds,
 *  so dev logging is untouched while the shipped binary stays quiet. console.error
 *  is intentionally kept so genuine failures still surface (and can be routed to a
 *  crash reporter later). Imported first in index.tsx so it runs before any module
 *  that logs during evaluation. */
if (!__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
}
