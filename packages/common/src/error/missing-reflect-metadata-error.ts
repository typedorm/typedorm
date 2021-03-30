export class MissingReflectMetadataError extends Error {
  name = 'MissingReflectMetadata';

  constructor(tsMetadataType: string) {
    super();
    this.message = `Could not reflect metadata of type ${tsMetadataType}, did you forget to enable "emitDecoratorMetadata" on compiler options?`;
  }
}
