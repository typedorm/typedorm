export class DuplicateEntityPhysicalNameError extends Error {
  name = 'DuplicateEntityPhysicalNameError';

  constructor(physicalName: string) {
    super();
    this.message = `Entity physical name must be unique for all entities. 
    Physical name "${physicalName}" already exists.`;
  }
}
