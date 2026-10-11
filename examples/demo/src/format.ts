export function describeCount(count: number): string {
  return `${count} ${count === 1 ? 'click' : 'clicks'}`;
}
