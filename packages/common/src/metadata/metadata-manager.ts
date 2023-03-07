import {MetadataStorage} from './metadata-storage';
const metadataKey = Symbol.for('DynamoDBMetadataStorageKey');

export class MetadataManager {
  private constructor() {}

  public static createMetadataStorage(): MetadataStorage {
    if (!(global as any)[metadataKey]) {
      (global as any)[metadataKey] = new MetadataStorage();
    }
    return (global as any)[metadataKey];
  }

  public static get metadataStorage(): MetadataStorage {
    if (!(global as any)[metadataKey]) {
      return MetadataManager.createMetadataStorage();
    }
    return (global as any)[metadataKey];
  }

  static resetMetadata() {
    (global as any)[metadataKey];
  }
}
