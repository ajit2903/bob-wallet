require('./sentry');

// Need this to force bcrypto to use
// the JavaScript backend since native
// bindings are unsupported in Electron.
process.env.NODE_BACKEND = 'js';
const ipc = require('electron').ipcRenderer;
const FullNode = require('hsd/lib/node/fullnode');
const WalletPlugin = require('hsd/lib/wallet/plugin');

let started = false;
ipc.on('start', (_, prefix, net, seeds, apiKey) => {
  if (started) {
    ipc.send('started');
    return;
  }

  started = true;

  let hsd;
  try {
    hsd = new FullNode({
      config: true,
      argv: true,
      env: true,
      logFile: true,
      logConsole: false,
      logLevel: 'debug',
      memory: false,
      workers: false,
      network: net,
      loader: require,
      prefix: prefix,
      listen: true,
      bip37: true,
      indexAddress: true,
      indexTX: true,
      seeds: seeds || undefined,
      apiKey,
    });

    hsd.use(WalletPlugin);
  } catch (e) {
    ipc.send('error', e);
    return;
  }

  hsd.ensure()
    .then(() => hsd.open())
    .then(() => hsd.connect())
    .then(() => hsd.startSync())
    .then(() => ipc.send('started'))
    .catch((e) => ipc.send('error', e));
});
