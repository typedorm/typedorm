import {MetadataStorage} from './metadata-storage';
const metadataKey = Symbol.for('DynamoDBMetadataStorageKey');

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      [metadataKey]: MetadataStorage;
    }
  }
}

export class MetadataManager {
  private constructor() {}

  public static createMetadataStorage() {
    if (!global[metadataKey]) {
      global[metadataKey] = new MetadataStorage();
    }
    return global[metadataKey];
  }

  public static get metadataStorage() {
    if (!global[metadataKey]) {
      return MetadataManager.createMetadataStorage();
    }
    return global[metadataKey];
  }

  static resetMetadata() {
    global[metadataKey];
  }
}
