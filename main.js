const Polarity = require('polarity-node-rest-api');
const PGClient = require('./lib/pg');
const Stopwatch = require('statman-stopwatch');
const cliProgress = require('cli-progress');

const stopwatch = new Stopwatch();
const { getLogger } = require('./lib/logger');

const deleteCmd = {
  command: 'delete',
  desc: 'Delete annotations in a specified channel that are past their end DOI',
  builder: (yargs) => {
    return yargs
      .option('username', {
        type: 'string',
        nargs: 1,
        describe: 'Username to login as'
      })
      .option('password', {
        type: 'string',
        nargs: 1,
        describe: 'Password for the given Polarity username'
      })
      .option('url', {
        type: 'string',
        demand: 'You must provide Polarity url to include schema (e.g., https://my.polarity.internal)',
        nargs: 1,
        describe: 'Polarity server url to include schema'
      })
      .option('config', {
        type: 'string',
        demand: "You must provide a path to the server's config.js",
        default: '/app/polarity-server/config/config.js',
        nargs: 1,
        describe: "Path to the server's config.js"
      })
      .option('channel', {
        type: 'string',
        demand: 'You must provide the name of the channel to delete annotations from',
        nargs: 1,
        describe: 'The name of the channel to delete annotations from'
      })
      .option('simulate', {
        type: 'boolean',
        default: true,
        describe: 'By default, the tool will log a preview of the actions it would take but no actions will be taken.'
      })
      .option('rejectUnauthorized', {
        type: 'boolean',
        default: true,
        describe: 'If provided, the loader will reject unauthorized SSL connections'
      })
      .option('progressBar', {
        type: 'boolean',
        default: true,
        describe:
          'If provided, the manager will show a progress bar.  If not provided, progress will be logged.  Set to `false` for non-interactive usage.'
      })
      .option('proxy', {
        type: 'string',
        default: '',
        nargs: 1,
        describe: 'If provided, the connection to the Polarity server will use the provided proxy setting'
      })
      .option('logging', {
        type: 'string',
        default: 'info',
        choices: ['error', 'warn', 'info', 'debug'],
        nargs: 1,
        describe: 'The logging level for the script.'
      });
  },
  handler: async (argv) => {
    stopwatch.start();

    // create a new progress bar instance and use shades_classic theme
    const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    const {
      url,
      username: cliUsername,
      password: cliPassword,
      config,
      simulate,
      rejectUnauthorized,
      proxy,
      logging,
      channel,
      progressBar
    } = argv;

    const Logger = getLogger(logging);

    let envUsername = process.env.POLARITY_USERNAME;
    let envPassword = process.env.POLARITY_PASSWORD;

    const username = envUsername ? envUsername : cliUsername;
    const password = envPassword ? envPassword : cliPassword;

    if (!username || !password) {
      Logger.error('You must provide a username and password');
      return;
    }

    Logger.info('Starting Polarity Annotation Manager', {
      url,
      username,
      password: '*******',
      config,
      simulate,
      rejectUnauthorized,
      proxy,
      logging,
      channel,
      progressBar
    });

    const polarity = new Polarity(Logger);
    const client = new PGClient(config);
    const simulateText = simulate ? 'Simulate: ' : '';

    try {
      await client.connect();

      const connectOptions = {
        host: url,
        username: username,
        password: password
      };

      if (typeof rejectUnauthorized !== 'undefined' || typeof proxy !== 'undefined') {
        connectOptions.request = {};
      }

      if (typeof rejectUnauthorized !== 'undefined') {
        connectOptions.request.rejectUnauthorized = rejectUnauthorized;
      }

      if (typeof proxy !== 'undefined' && proxy && proxy.length > 0) {
        connectOptions.request.proxy = proxy;
      }

      Logger.info(`${simulateText}Polarity Connection Options`, { ...connectOptions, password: '*******' });

      await polarity.connect(connectOptions);

      const channelObject = await polarity.getChannel(channel);
      if (!channelObject) {
        throw new Error(`${simulateText}Unable to find channel ${channel}`);
      }

      const annotations = await client.getAnnotationsToDelete(channelObject.id);

      if (annotations.rows.length === 0) {
        Logger.info(`${simulateText}No annotations found to delete`);
      } else {
        Logger.info(`${simulateText}Deleting ${annotations.rows.length} annotations from channel "${channel}"`, {
          channel: channelObject.attributes
        });
        if (progressBar) {
          progress.start(annotations.rows.length, 0);
        }
      }

      for (let index = 0; index < annotations.rows.length; index++) {
        const id = annotations.rows[index].id;
        if (!simulate) {
          const results = await polarity.deleteAnnotationById(id);
          Logger.debug(`${simulateText}Deleted annotation ${id}`, { results });
        } else {
          Logger.debug(`${simulateText}Simulating deletion of annotation ${id}`);
        }
        if (progressBar) {
          progress.update(index + 1);
        } else if (index % Math.round(annotations.rows.length / 10) === 0) {
          Logger.info(`Finished deleting ${index + 1} out of ${annotations.rows.length} annotations`);
        }
      }

      if (progressBar) {
        progress.stop();
      } else {
        Logger.info(`Finished deleting ${annotations.rows.length} out of ${annotations.rows.length} annotations`);
      }
    } catch (e) {
      Logger.error(`${simulateText}Error Deleting Annotations: `, e);
    } finally {
      Logger.info(`${simulateText}Total Run Time: ${stopwatch.read()}`);

      if (polarity && polarity.isConnected) {
        Logger.info(`${simulateText}Disconnecting from Polarity`);
        await polarity.disconnect();
      }
      Logger.info(`${simulateText}Disconnecting from Database`);
      await client.disconnect();
    }
  }
};

require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command(deleteCmd)
  .help()
  .wrap(null)
  .version('Polarity Annotation Manager v' + require('./package.json').version)
  // help
  .epilog('(C) 2022 Polarity.io, Inc.').argv;
