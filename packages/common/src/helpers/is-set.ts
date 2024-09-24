export function isSet(item: any): item is Set<any> {
  return item instanceof Set;
}
