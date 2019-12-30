import { Result } from './check';

export function formatResults(locationPaths: string | undefined, results: Result[], label: string) {
  if (results.length === 0) return '';
  if (results.length > 10) {
    label += ' (first 10 only)';
    results = results.slice(0, 10);
  }
  let content = `\n\n**${label}:**\n`;
  for (const result of results) {
    if (result.location && locationPaths) {
      const url = locationPaths
        .replace('{path}', result.location.path)
        .replace('{line-start}', result.location.lineStart.toString())
        .replace('{line-end}', result.location.lineEnd.toString());
      content += `\n* [\`${result.label}\`](${url})`;
    } else {
      content += `\n* \`${result.label}\``;
    }
  }
  return content;
}