export class MissingRequiredDependencyError extends Error {
  name = 'MissingRequiredDependencyError';

  constructor(packageName: string) {
    super();

    this.message = `The "${packageName}" package is missing. 
    Please, make sure to install this library ($ npm install ${packageName}).`;
  }
}
