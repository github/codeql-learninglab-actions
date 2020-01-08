type CountableType = 'query' | 'result';

export function pluralize(count: number, type: CountableType) {
  switch (type) {
    case 'query':
      return `${count} quer${count === 1 ? 'y' : 'ies'}`
    case 'result':
      return `${count} result${count === 1 ? '' : 's'}`
  }
};

export function list(strings: string[]) {
  if (strings.length === 1)
    return strings[0];
  return strings.slice(0, strings.length - 1).join(', ') +
    ' and ' + strings[strings.length - 1];
}
