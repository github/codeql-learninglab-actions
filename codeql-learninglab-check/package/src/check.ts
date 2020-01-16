import csvParse from 'csv-parse';
import * as fs from 'fs';
import { promisify, inspect } from 'util';

import * as l10n from './l10n';
import { filterFalsey } from './util';

const readFile = promisify(fs.readFile);

/**
 * Regular expression that matches only when the location is within the source
 * root, extracting the path and start and end lines
 * TODO: allow the source root to be configured
 * (for when snapshots are built outside LGTM)
 */
const SOURCE_REGEX = /^file\:\/\/\/opt\/src\/(.*)\:([0-9]+)\:[0-9]+\:([0-9]+)\:[0-9]+$/;

const loadCsv = async (file: string) => {
  const contents = await readFile(file);
  return new Promise<string[][]>(resolve =>
    csvParse(contents, {

    }, (err, output) => {
      resolve(output);
    })
  );
}

interface Location {
  path: string;
  lineStart: number;
  lineEnd: number;
}

export interface Result {
  label: string;
  location?: Location
}

export type ResultsCheck = {
  // CSV file has not been defined for this query yet
  status: 'undefined';
} | {
  status: 'correct';
  count: number;
} | {
  status: 'incorrect';
  explanation: string;
  results?: {
    actualCount: number;
    expectedCount: number;
    /**
     * Results that are missing
     */
    missingResults: Result[];
    /**
     * Results that are not expected to appear at all
     */
    unexpectedResults: Result[];
    /**
     * Results that appeared more times than they should
     */
    extraResults: Result[];
  }
}

function getLocationFromURL(url: string): Location | undefined {
  const r = SOURCE_REGEX.exec(url);
  if (r) {
    return {
      path: '/' + r[1],
      lineStart: parseInt(r[2]),
      lineEnd: parseInt(r[3])
    }
  }
}

interface Columns {
  /**
   * The column index used for the URLs of an entry
   */
  url: number;
  /**
   * The column index used for the label of an entry
   */
  label: number;
}

/**
 * Given the CSV header, determine which columns are used for the labels, and
 * which are used for the URLs;
 */
function extractColumns(header: string[]): Columns | null {
  if (header[0] === `URL for ${header[1]}`) {
    return {
      url: 0,
      label: 1
    }
  } else if (header[1] === `URL for ${header[0]}`) {
    return {
      url: 1,
      label: 0
    }
  }
  return null;
}

function explanation(
    {missing, unexpected, extra}:
    {missing: boolean, unexpected: boolean, extra: boolean}
  ): string {
  const problem = l10n.list(filterFalsey([
    missing && 'missing some results',
    unexpected && 'selecting unexpected results',
    extra && 'selecting certain results too many times'
  ]))
  return `Your query is ${problem}`;
}

/**
 * Validate the results of the CSV
 */
export async function checkResults(expectedCSV: string, actualCSV: string): Promise<ResultsCheck> {
  let columns: Columns | null;

  // Store counts of each label, location pair in the expected results

  /**
   * toString label -> location (URL) -> count
   */
  const expectedResults = new Map<string, Map<string, number>>();
  columns = null;
  let expectedCount = 0;
  for (const row of await loadCsv(expectedCSV)) {
    if (row.length < 2) {
      return {
        status: 'incorrect',
        explanation: 'Invalid number of columns in expected CSV'
      };
    }
    if (!columns) {
      // If columns is not set, must be first (header) row
      columns = extractColumns(row);
      if (!columns) {
        // Unable to work out columns
        return {
          status: 'incorrect',
          explanation: 'Unable to extract columns from expected results'
        };
      }
      continue;
    }
    expectedCount++;
    let locationURLs = expectedResults.get(row[columns.label]);
    if (!locationURLs) {
      locationURLs = new Map();
      expectedResults.set(row[columns.label], locationURLs);
    }
    const count = locationURLs.get(row[columns.url]) || 0;
    locationURLs.set(row[columns.url], count + 1);
  }

  // Go through the actual results and check them against expected
  // TODO: optimize this to not require loading the entire CSV into memory

  columns = null;

  const missingResults: Result[] = [];
  const unexpectedResults: Result[] = [];
  const extraResults: Result[] = [];
  let actualCount = 0;
  for (const row of await loadCsv(actualCSV)) {
    if (row.length < 2) {
      return {
        status: 'incorrect',
        explanation: 'Invalid number of columns in results CSV'
      };
    }
    if (!columns) {
      // If columns is not set, must be first (header) row
      columns = extractColumns(row);
      if (!columns) {
        // Unable to work out columns
        return {
          status: 'incorrect',
          explanation: (
            'Unexpected columns selected in results, make sure that the ' +
            'first expression in your select clause is a code element.'
          )
        };
      }
      continue;
    }
    actualCount++;
    const label = row[columns.label];
    const url = row[columns.url];
    const locationURLs = expectedResults.get(label);
    if (locationURLs) {
      const count = locationURLs.get(url);
      if (count === undefined) {
        // Result is unexpected
        unexpectedResults.push({
          label,
          location: getLocationFromURL(url)
        });
      } else if (count === 0) {
        // Result appears too many times
        extraResults.push({
          label,
          location: getLocationFromURL(url)
        });
      } else {
        // Result expected
        locationURLs.set(url, count - 1);
      }
    } else {
      // Result is unexpected
      unexpectedResults.push({
        label,
        location: getLocationFromURL(url)
      });
    }
  }

  // Add missing results
  for (const labelEntry of expectedResults.entries()) {
    for (const urlEntry of labelEntry[1].entries()) {
      if (urlEntry[1] > 0) {
        missingResults.push({
         label: labelEntry[0],
          location: getLocationFromURL(urlEntry[0])
        });
      }
    }
  }

  if (missingResults.length === 0 &&
      unexpectedResults.length === 0 &&
      extraResults.length === 0) {
    return {
      status: 'correct',
      count: actualCount
    }
  }

  return {
    status: 'incorrect',
    explanation: explanation({
      missing: missingResults.length > 0,
      unexpected: unexpectedResults.length > 0,
      extra: extraResults.length > 0
    }),
    results: {
      actualCount,
      expectedCount,
      missingResults,
      unexpectedResults,
      extraResults,
    }
  }
}
