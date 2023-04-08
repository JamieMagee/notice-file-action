import { DependencyGraphPackage } from './schema';

export class CoordinateUtils {
  static convertToCoordinate(
    _package: DependencyGraphPackage
  ): string | undefined {
    switch (_package.packageManager) {
      case 'NPM':
        return CoordinateUtils.#convertNpm(_package);
      default:
        console.warn(`Unknown package manager: ${_package.packageManager}`);
    }

    return undefined;
  }

  static #convertNpm(_package: DependencyGraphPackage): string {
    return `npm/npmjs/-/${
      _package.packageName
    }/${_package.requirements.substring(2)}`;
  }
}
