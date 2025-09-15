const DEBUG = process.env.SOCKET_DEBUG === 'true' || process.env.DEBUG === 'true';

function info(...args) {
  if (DEBUG) console.log(...args);
}

function warn(...args) {
  console.warn(...args);
}

function error(...args) {
  console.error(...args);
}

module.exports = { info, warn, error };
