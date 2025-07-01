import type { DependencyGraphPackage } from './schema';

export class CoordinateUtils {
  static convertToCoordinate(
    _package: DependencyGraphPackage
  ): string | undefined {
    switch (_package.packageManager) {
      case 'NPM':
        return CoordinateUtils.convertNpm(_package);
      case 'MAVEN':
        return CoordinateUtils.convertMaven(_package);
      case 'NUGET':
        return CoordinateUtils.convertNuGet(_package);
      case 'RUBYGEMS':
        return CoordinateUtils.convertRubyGems(_package);
      case 'PIP':
        return CoordinateUtils.convertPyPI(_package);
      case 'CARGO':
        return CoordinateUtils.convertCargo(_package);
      case 'COMPOSER':
        return CoordinateUtils.convertComposer(_package);
      case 'GO':
        return CoordinateUtils.convertGo(_package);
      case 'PUB':
        return CoordinateUtils.convertPub(_package);
      case 'SWIFT':
        return CoordinateUtils.convertSwift(_package);
      default:
        console.warn(`Unknown package manager: ${_package.packageManager}`);
    }

    return undefined;
  }

  private static convertNpm(_package: DependencyGraphPackage): string {
    // Format: npm/npmjs/namespace/name/version
    // For scoped packages (e.g., @scope/package), namespace is the scope
    // For unscoped packages, namespace is "-"
    const version = _package.requirements.substring(2); // Remove "^" or "~" prefix

    if (_package.packageName.includes('/')) {
      // Scoped package: @scope/name
      const [scope, name] = _package.packageName.split('/');
      return `npm/npmjs/${scope?.substring(1)}/${name}/${version}`;
    }
    // Unscoped package
    return `npm/npmjs/-/${_package.packageName}/${version}`;
  }

  private static convertMaven(_package: DependencyGraphPackage): string {
    // Format: maven/mavencentral/groupId/artifactId/version
    // Package name format: groupId:artifactId
    const [groupId, artifactId] = _package.packageName.split(':');
    const version = _package.requirements;
    return `maven/mavencentral/${groupId}/${artifactId}/${version}`;
  }

  private static convertNuGet(_package: DependencyGraphPackage): string {
    // Format: nuget/nuget/-/packageName/version
    const version = _package.requirements;
    return `nuget/nuget/-/${_package.packageName}/${version}`;
  }

  private static convertRubyGems(_package: DependencyGraphPackage): string {
    // Format: gem/rubygems/-/gemName/version
    const version = _package.requirements.replace(/[~^>=<]/, '').trim();
    return `gem/rubygems/-/${_package.packageName}/${version}`;
  }

  private static convertPyPI(_package: DependencyGraphPackage): string {
    // Format: pypi/pypi/-/packageName/version
    const version = _package.requirements.replace(/[~^>=<]/, '').trim();
    return `pypi/pypi/-/${_package.packageName}/${version}`;
  }

  private static convertCargo(_package: DependencyGraphPackage): string {
    // Format: crate/cratesio/-/crateName/version
    const version = _package.requirements.replace(/[~^>=<]/, '').trim();
    return `crate/cratesio/-/${_package.packageName}/${version}`;
  }

  private static convertComposer(_package: DependencyGraphPackage): string {
    // Format: composer/packagist/vendor/package/version
    // Package name format: vendor/package
    const version = _package.requirements.replace(/[~^>=<]/, '').trim();

    if (_package.packageName.includes('/')) {
      const [vendor, packageName] = _package.packageName.split('/');
      return `composer/packagist/${vendor}/${packageName}/${version}`;
    }
    // Fallback for packages without vendor
    return `composer/packagist/-/${_package.packageName}/${version}`;
  }

  private static convertGo(_package: DependencyGraphPackage): string {
    // Format: go/golang/namespace/name/version
    // Go modules often have domain-based names like github.com/user/repo
    const version = _package.requirements.replace(/^v/, ''); // Remove "v" prefix if present

    // Extract namespace and name from the module path
    const parts = _package.packageName.split('/');
    if (parts.length >= 3) {
      // github.com/user/repo -> namespace: github.com/user, name: repo
      const name = parts[parts.length - 1];
      const namespace = parts.slice(0, -1).join('/');
      return `go/golang/${namespace}/${name}/${version}`;
    }
    // Fallback for simple module names
    return `go/golang/-/${_package.packageName}/${version}`;
  }

  private static convertPub(_package: DependencyGraphPackage): string {
    // Format: pub/pub/-/packageName/version
    const version = _package.requirements.replace(/[~^>=<]/, '').trim();
    return `pub/pub/-/${_package.packageName}/${version}`;
  }

  private static convertSwift(_package: DependencyGraphPackage): string {
    // Format: swift/swiftpm/namespace/name/version
    // Swift packages often have GitHub URLs, extract relevant parts
    const version = _package.requirements.replace(/[~^>=<]/, '').trim();

    if (_package.packageName.includes('/')) {
      const [namespace, name] = _package.packageName.split('/');
      return `swift/swiftpm/${namespace}/${name}/${version}`;
    }
    return `swift/swiftpm/-/${_package.packageName}/${version}`;
  }
}
