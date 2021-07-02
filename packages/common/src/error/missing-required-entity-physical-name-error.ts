export class MissingRequiredEntityPhysicalNameError extends Error {
  name = 'MissingRequiredEntityPhysicalNameError';

  constructor(className: string) {
    super();
    this.message = `Missing required entity physical name for entity "${className}". Physical names must be non empty and unique.`;
  }
}
