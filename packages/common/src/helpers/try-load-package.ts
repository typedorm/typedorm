import {MissingRequiredDependencyError} from '../error/missing-required-dep';
import {loadPackage} from './load-package';

export function tryLoadPackage(packageName: string) {
  try {
    return loadPackage(packageName);
  } catch (err) {
    if (err instanceof MissingRequiredDependencyError) {
      return null;
    } else {
      throw err;
    }
  }
}
