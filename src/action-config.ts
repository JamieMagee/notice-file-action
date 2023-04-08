import core from '@actions/core';
import is from '@sindresorhus/is';
import { Format } from './schema';

export class ActionConfig {
  readonly format: Format = 'text';
  readonly filename: string = 'NOTICE';
  readonly token: string;
  readonly repoOwner: string;
  readonly repoName: string;

  constructor() {
    const format = core.getInput('format');
    const formatResult = Format.safeParse(format);
    if (!formatResult.success) {
      console.error(`Unknown format: ${format}`);
      throw new Error();
    }
    this.format = formatResult.data;

    this.filename = core.getInput('filename');
    if (is.emptyStringOrWhitespace(this.filename)) {
      console.error('Invalid filename');
      throw new Error();
    }

    this.token = core.getInput('token');
    if (is.emptyStringOrWhitespace(this.token)) {
      console.error('Invalid token');
      throw new Error();
    }

    const repository = process.env['GITHUB_REPOSITORY'];
    if (is.undefined(repository)) {
      console.error('Invalid token');
      throw new Error();
    }
    const [repoOwner, repoName, ..._] = repository.split('/');
    this.repoOwner = repoOwner;
    this.repoName = repoName;
  }
}
