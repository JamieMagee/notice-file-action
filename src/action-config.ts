import is from '@sindresorhus/is';
import { Format } from './schema';

function getInput(name: string): string {
  return process.env[`INPUT_${name.toUpperCase()}`] || '';
}

export class ActionConfig {
  readonly format: Format = 'text';
  readonly filename: string = 'NOTICE';
  readonly token: string;
  readonly repoOwner: string;
  readonly repoName: string;

  constructor() {
    const format = getInput('format');
    const formatResult = Format.safeParse(format);
    if (!formatResult.success) {
      console.log(`::error::Unknown format: ${format}`);
      throw new Error();
    }
    this.format = formatResult.data;

    this.filename = getInput('filename');
    if (is.emptyStringOrWhitespace(this.filename)) {
      console.log('::error::Invalid filename');
      throw new Error();
    }

    this.token = getInput('token');
    if (is.emptyStringOrWhitespace(this.token)) {
      console.log('::error::Invalid token');
      throw new Error();
    }

    const repository = process.env['GITHUB_REPOSITORY'];
    if (is.undefined(repository)) {
      console.log('::error::Invalid repository');
      throw new Error();
    }
    const [repoOwner, repoName] = repository.split('/');
    this.repoOwner = repoOwner!;
    this.repoName = repoName!;
  }
}
