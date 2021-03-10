export function createChunks<T>(fullArray: T[], chunkSize: number) {
  const chunkedArray = [];

  for (let index = 0; index < fullArray.length; index += chunkSize) {
    const chunk = fullArray.slice(index, index + chunkSize);
    chunkedArray.push(chunk);
  }
  return chunkedArray;
}
