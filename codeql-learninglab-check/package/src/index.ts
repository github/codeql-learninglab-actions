import * as child_process from 'child_process'
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as core from '@actions/core';
import Octokit from '@octokit/rest';
import { WebhookPayloadPush } from '@octokit/webhooks';

import { checkResults, ResultsCheck } from './check';
import { pluralize } from './l10n';
import { formatResults } from './formatting';

const access = promisify(fs.access);
const execFile = promisify(child_process.execFile);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);

/**
 * Must be "true" if all queries should be run (and not just changed queries)
 */
const RUN_ALL = process.env.RUN_ALL === 'true';

/**
 * The GITHUB_TOKEN secret
 */
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;
const GITHUB_EVENT_NAME = process.env.GITHUB_EVENT_NAME;

/**
 * Location where course configuration needs to be inserted
 */
const CODEQL_HOME = '/home/codeql';
const CONFIG_PATH = path.join(CODEQL_HOME, 'config');
const CONFIG_JSON = path.join(CONFIG_PATH, 'config.json');
const OUTPUT_PATH = path.join(CODEQL_HOME, 'output');

type Config = {
  snapshotPath: string;
  /**
   * If set, the locations of extra or missing results can be linked to from
   * comments. {path} and {line-start} placeholders need to be present
   * (and optionally {line-end}).
   */
  locationPaths?: string;
  /**
   * Mapping from query filename to expected results csv file
   */
  expectedResults: {[id: string]: string};
};

function isConfig(config: any): config is Config {
  if (!config)
    throw new Error('Configuration not specified');
  if (typeof config.snapshotPath !== 'string')
    throw new Error('Configuration must specify a valid snapshotPath');
  if (typeof config.expectedResults !== 'object')
    throw new Error('Configuration property expectedResults invalid');
  if (typeof config.locationPaths !== 'undefined') {
    if (typeof config.locationPaths !== 'string')
      throw new Error('Configuration property locationPaths must be a string');
    if (config.locationPaths.indexOf('{path}') === -1)
      throw new Error('Configuration property locationPaths must have the placeholder "{path}"');
    if (config.locationPaths.indexOf('{line-start}') === -1)
      throw new Error('Configuration property locationPaths must have the placeholder "{line-start}"');
  }
  for (const k of Object.keys(config.expectedResults)) {
    if (typeof config.expectedResults[k] !== 'string') {
      throw new Error(`Confiuration property "expectedResults" -> "${k}" must be a string`);
    }
  }
  return true;
}

(async () => {

  // Load configuration for course
  const config = JSON.parse((await readFile(CONFIG_JSON)).toString());
  if (!isConfig(config))
    throw new Error('invalid config');

  if (GITHUB_EVENT_NAME !== 'push')
    throw new Error('This action is only designed to be used with "push" events');

  if (!GITHUB_EVENT_PATH)
    throw new Error('Expected GITHUB_EVENT_PATH');

  if (!GITHUB_TOKEN)
    throw new Error('Expected GITHUB_TOKEN');

  const event: WebhookPayloadPush = JSON.parse((await readFile(GITHUB_EVENT_PATH)).toString());

  const api = new Octokit({ auth: GITHUB_TOKEN});

  let comment = '';

  const end = () =>
    api.repos.createCommitComment({
      body: comment,
      owner: event.repository.owner.login,
      repo: event.repository.name,
      commit_sha: event.after
    });

  /**
   * File paths changed by the user (if we're not just running all queries)
   *
   * This is used to reduce the number of queries we need to run to only those
   * that currently interest the user.
   */
  const queriesChanged = new Set<string>();
  let unableToGetChangedQueries = false;

  if (RUN_ALL) {

    /*
    * There are a few different ways in which we may determine which queries
    * are currently interesting to the user, in decreasing usefulness:
    *
    * * If the user just pushed to a branch that currently has an open pull
    *   request, the interesting queries are those that are changed in the pull
    *   request (and not just those changed in the most recent push).
    * * If there's no active pull request, then what's probably most interesting
    *   are the queries that have changed in the last push (i.e. between the
    *   previous head and the new head)
    * * If that's not possible (e.g. the push could have created the branch for
    *   the first time, and so there is no "previous ref"), then comparing this
    *   branch to the default branch of a repo will probably give the most
    *   accurate results.
    * * Finally, if all else fails (e.g. the push was the initial push to the
    *   default branch of the repo), then we should just run every query we
    *   recognize (as if RUN_ALL was true). We do this by setting
    *   unableToGetChangedQueries to true.
    */

    const {stdout: filesChangedRaw} = await execFile('git', ['diff', '--name-only', `${event.before}..${event.after}`]);
    filesChangedRaw.split('\n')
      .map(s => s.trim())
      .filter(s => s.endsWith('.ql'))
      .forEach(s => queriesChanged.add(s));
    console.log(`${pluralize(queriesChanged.size, 'query')} updated in this push`);
    comment += `${pluralize(queriesChanged.size, 'query')} changed `
    comment += `[between \`${event.before.substr(0, 7)}\` and \`${event.after.substr(0, 7)}\`]`
    comment += `(${event.repository.html_url}/compare/${event.before}...${event.after}) after push to \`${event.ref}\``;
    if (queriesChanged.size > 0) {
      comment += ':\n';
      for (const query of queriesChanged) {
        console.log(`- ${query}`);
        const exists = await access(query, fs.constants.R_OK).then(() => true, () => false);
        comment += `* \`${query}\`${exists ? '' : ' *(deleted)*'}\n`;
      }
    } else {
      comment += '\n';
    }
  }

  // Work out which queries to run, based on config and changed & existing queries
  const queriesToRun: string[] = [];
  for (const query of Object.keys(config.expectedResults)) {
    const exists = await access(query, fs.constants.R_OK).then(() => true, () => false);
    // Run the query if either it's changed, or runAll is true
    if (exists && (RUN_ALL || unableToGetChangedQueries || queriesChanged.has(query))) {
      queriesToRun.push(query);
    }
  }

  console.log(`${pluralize(queriesToRun.length, 'query')} to run:`);
  if (queriesToRun.length === 0) {
    console.log('...Exiting');
    if (RUN_ALL) {
      comment += `\n None of the paths for any of the queries in the repository `;
    } else {
      comment += `\n None of the paths for the queries that have been updated `;
    };
    comment += `are recognized as part of this course. `;
    comment += `Perhaps you need to rename or move a \`.ql\` file? `;
    comment += `The expected paths are: \n\n`;
    for (const query of Object.keys(config.expectedResults)) {
      comment += `* \`${query}\`\n`;
    }
    return await end();
  }
  for (const query of queriesToRun)
    console.log(`- ${query}`);

  // Upgrade the database if neccesary
  const databasePath = path.join(CONFIG_PATH, config.snapshotPath);
  console.log('Upgrading CodeQL Database');
  await execFile('codeql', ['database', 'upgrade', databasePath]);

  const csvPath = (queryPath: string) => path.join(OUTPUT_PATH, queryPath + '.csv');

  // For every query that has changed, run it, and check the results!
  const results = new Map<string, ResultsCheck>();
  await mkdir(OUTPUT_PATH);
  console.log('Running Queries')
  for (const query of queriesToRun) {
    console.log(`Running ${query}`);
    const bqrsOutput = path.join(OUTPUT_PATH, query + '.bqrs');
    const dir = path.dirname(bqrsOutput);
    await(mkdir(dir, {recursive: true}));
    const result = await execFile('codeql', ['query', 'run', '-d', databasePath, query, '-o', bqrsOutput]);
    console.log(result.stderr);
    console.log(result.stdout);
    `codeql bqrs decode --entities=url,string output/results.bqrs --format=csv --output=output/results.csv`
    const csvOutput = csvPath(query);
    await execFile('codeql', ['bqrs', 'decode', '--entities=url,string', bqrsOutput, '--format=csv', `--output=${csvOutput}`]);
    const expectedCSV = path.join(CONFIG_PATH, config.expectedResults[query]);
    results.set(query, await checkResults(expectedCSV, csvOutput));
  }

  for(const entry of results.entries()) {
    const query  =entry[0];
    const r = entry[1];
    comment += `\n\n Results for \`${query}\`: **${r.status}**`;
    if (r.status === 'correct') {
      comment += ` (${pluralize(r.count, 'result')})`;
    } else {
      if (r.results) {
        comment += ` (${pluralize(r.results.actualCount, 'result')}):\n\n`;
        comment += r.explanation;
        comment += `\nExpected query to produce ${r.results.expectedCount} results`;
        comment += formatResults(config.locationPaths, r.results.missingResults, 'Missing results');
        comment += formatResults(config.locationPaths, r.results.unexpectedResults, 'Unexpected results');
        comment += formatResults(config.locationPaths, r.results.extraResults, 'Results selected too many times');
      } else {
        comment += r.explanation;
      }
      // Print CSV in console
      core.setFailed(`Incorrect results for ${query}`);
      core.startGroup('Actual Results CSV:');
      console.log((await (readFile(csvPath(query)))).toString());
      core.endGroup();
    }
  }

  await end();

})().catch(err => {
  console.error(err);
  process.exit(1);
});