import * as child_process from 'child_process'
import * as fs from 'fs';
import * as path from 'path';
import {homedir} from 'os';
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
const writeFile = promisify(fs.writeFile);

/**
 * RUN_ALL must be "true" if all queries should be run (and not just changed queries)
 * If specific queries should be run, RUN_ALL cannot be true
 */
const RUN_ALL = process.env.RUN_ALL === 'true';
const QUERY_PATTERN: RegExp | null = process.env.QUERY_PATTERN ? RegExp(process.env.QUERY_PATTERN) : null;

/**
 * Set to true to avoid using the GitHub API to post a comment
 * (used when running the script in CI)
 */
const SKIP_COMMENT = process.env.SKIP_COMMENT === 'true';

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
  databasePath: string;
  /**
   * If set, the locations of extra or missing results can be linked to from
   * comments. {path} and {line-start} placeholders need to be present
   * (and optionally {line-end}).
   */
  locationPaths?: string;
  /**
   * Mapping from query filename to expected results csv file
   */
  expectedResults: {[id: string]: string | false};
};

function isConfig(config: any): config is Config {
  if (!config)
    throw new Error('Configuration not specified');
  if (typeof config.databasePath !== 'string')
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
    if (typeof config.expectedResults[k] !== 'string' && config.expectedResults[k] !== false) {
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

  const end = () => {
    if (!SKIP_COMMENT) {
      api.repos.createCommitComment({
        body: comment,
        owner: event.repository.owner.login,
        repo: event.repository.name,
        commit_sha: event.after
      });
    }
  }

  /**
   * File paths changed by the user (if we're not just running all queries or a specific ones)
   *
   * This is used to reduce the number of queries we need to run to only those
   * that currently interest the user.
   */
  const queriesChanged = new Set<string>();
  let unableToGetChangedQueries = false;

  if (!RUN_ALL && !QUERY_PATTERN) {

   /*
    * There are a few different ways in which we may determine which queries
    * are currently interesting to the user, in decreasing usefulness:
    *
    * 1. If the user just pushed to a branch that currently has an open pull
    *    request, the interesting queries are those that are changed in the pull
    *    request (and not just those changed in the most recent push).
    * 2. If there's no active pull request, then what's probably most
    *    interesting are the queries that have changed in the last push (i.e.
    *    between the previous head and the new head)
    * 3. If that's not possible (e.g. the push could have created the branch for
    *    the first time, and so there is no "previous ref"), then comparing this
    *    branch to the default branch of a repo will probably give the most
    *    accurate results.
    * 4. Finally, if all else fails (e.g. the push was the initial push to the
    *    default branch of the repo), then we should just run every query we
    *    recognize (as if RUN_ALL was true). We do this by setting
    *    unableToGetChangedQueries to true.
    * 5. In this last case, if there is no changed query in the repo
    *    then it means that this is just the course creation first workflow trigger.
    */

    /*
     * Before we can run `git fetch` in the CWD,
     * we need to add the authentication details for the remote for https
     */
    await execFile('git', ['config', '--global', 'credential.helper', 'store']);
    // Write the required information to ~/.git-credentials
    const credentials = `https://x-access-token:${GITHUB_TOKEN}@github.com`;
    const credentialsPath = path.join(homedir(), '.git-credentials');
    await writeFile(credentialsPath, credentials);

    /**
     * The output from a successful call to `git diff --name-only`
     */
    let diff: {
      baseSha: string;
      filesChangedRaw: string;
    } | null = null;

    // Try (1) - find any PR associated with the branch of this push

    // Get branch name
    // This is expected to fail if e.g. the push was to a tag not a branch
    const branch = /^refs\/heads\/(.*)$/.exec(event.ref)?.[1];

    if (branch) {
      try {
        const pulls = await api.pulls.list({
          owner: event.repository.owner.login,
          repo: event.repository.name,
          head: `${event.repository.owner.login}:${branch}`
        });
        if (pulls && pulls.data.length > 0) {
          // Just use first PR
          const pr = pulls.data[0];
          const baseBranch = pr.base.ref;
          // Ensure we have the commits from that ref
          await execFile('git', ['fetch', 'origin', baseBranch]);
          const baseSha = await (await execFile(
            'git', ['rev-parse', `refs/remotes/origin/${baseBranch}`]
          )).stdout.trim();
          diff = {
            baseSha,
            filesChangedRaw: (await execFile(
              'git', ['diff', '--name-only', `${baseSha}..${event.after}`]
            )).stdout
          }
        } else {
          console.log('No pull requests associated with the current push');
        }
      } catch (err) {
        console.warn(err);
        console.log(`Failed to use PRs to calculate changed files branch ${branch}.`);
      }
    } else {
      console.log(
        'Push was not for a branch, calculating changed files differently'
      );
    }

    // Try (2) - see what files have changed in the last push

    if (!diff) {
      try {
        const result = await execFile(
          'git', ['diff', '--name-only', `${event.before}..${event.after}`]
        );
        if (result)
          diff = {
            baseSha: event.before,
            filesChangedRaw: result.stdout
          };
      } catch (err) {
        console.warn(err);
        console.log('Failed to get diff for push');
      }
    }

    // Try (3) - see how the current HEAD differs from the default branch

    if (!diff) {
      try {
        await execFile('git', ['fetch', 'origin', 'HEAD']);
        const defaultBranchSha = await (await execFile(
          'git', ['rev-parse', `refs/remotes/origin/HEAD`]
        )).stdout.trim();
        const result = await execFile(
          'git', ['diff', '--name-only', `${defaultBranchSha}..${event.after}`]
        );
        if (result)
          diff = {
            baseSha: defaultBranchSha,
            filesChangedRaw: result.stdout
          }
      } catch (err) {
        console.warn(err);
        console.log('Failed to diff against default branch');
      }
    }

    if (!diff) {
      unableToGetChangedQueries = true;
    } else {
      // We have successfully obtained the diff for this push
      diff.filesChangedRaw.split('\n')
      .map(s => s.trim())
      .filter(s => s.endsWith('.ql'))
      .forEach(s => queriesChanged.add(s));
      console.log(`${pluralize(queriesChanged.size, 'query')} updated in this push`);
      comment += `${pluralize(queriesChanged.size, 'query')} changed `
      comment += `[between \`${diff.baseSha.substr(0, 7)}\` and \`${event.after.substr(0, 7)}\`]`
      comment += `(${event.repository.html_url}/compare/${diff.baseSha}...${event.after}) after push to \`${event.ref}\``;
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
  }

  // Work out which queries to run, based on config and changed & existing queries
  const queriesToRun: string[] = [];
  for (const query of Object.keys(config.expectedResults)) {
    const exists = await access(query, fs.constants.R_OK).then(() => true, () => false);
    // Run the query if either it's changed, or runAll is true
    if (exists && (RUN_ALL || unableToGetChangedQueries || queriesChanged.has(query)) || (QUERY_PATTERN && QUERY_PATTERN.test(query))) {
      queriesToRun.push(query);
    }
  }

  console.log(`${pluralize(queriesToRun.length, 'query')} to run:`);
  if (queriesToRun.length === 0) {
    console.log('...Exiting');
    if (unableToGetChangedQueries) {
      // There are no changed queries and we didn't find any git diff
      // It's just the first run of the action
      comment += `\n Hey, I am the CodeQL <span class="x x-first x-last">Learning Lab</span> bot :robot:`
      comment += `\n I'm looking forward to <span class="x x-first x-last">checking</span> your queries<span class="x x-first x-last"> as you go through this course</span>.\n`
    } else {
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
    }
    return await end();
  }
  for (const query of queriesToRun)
    console.log(`- ${query}`);

  // Upgrade the database if neccesary
  const databasePath = path.join(CONFIG_PATH, config.databasePath);
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
    const csvOutput = csvPath(query);
    await execFile('codeql', ['bqrs', 'decode', '--entities=url,string', bqrsOutput, '--format=csv', `--output=${csvOutput}`]);
    const relativeExpectedCSV = config.expectedResults[query];
    if (relativeExpectedCSV) {
      const expectedCSV = path.join(CONFIG_PATH, relativeExpectedCSV);
      results.set(query, await checkResults(expectedCSV, csvOutput));
    } else {
      results.set(query, {status: 'undefined'});
    }
  }

  for(const entry of results.entries()) {
    const query  =entry[0];
    const r = entry[1];
    comment += `\n\n Results for \`${query}\`: **${r.status}**`;
    if (r.status === 'correct') {
      comment += ` (${pluralize(r.count, 'result')})`;
    } else {
      if (r.status === 'incorrect') {
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
        core.setFailed(`Incorrect results for ${query}`);
      } else {
        console.log(`No CSV defined for ${query}:`);
      }
      // Print CSV in console
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
