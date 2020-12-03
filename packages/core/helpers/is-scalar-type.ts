export function isScalarType(item: unknown) {
  return (
    typeof item === 'string' ||
    typeof item === 'number' ||
    Buffer.isBuffer(item)
  );
}
