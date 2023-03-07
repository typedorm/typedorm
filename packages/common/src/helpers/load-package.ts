import {MissingRequiredDependencyError} from './../error/missing-required-dep';
export function loadPackage(packageName: string) {
  try {
    return require(packageName);
  } catch (err) {
    throw new MissingRequiredDependencyError(packageName);
  }
}
