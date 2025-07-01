import fs from 'node:fs';
import path from 'node:path';
import artifact from '@actions/artifact';
import core from '@actions/core';
import is from '@sindresorhus/is';
import { ActionConfig } from './action-config';
import { CoordinateUtils } from './coordinate-utils';
import { ClearlyDefinedClient } from './http/clearly-defined-client';
import { GitHubClient } from './http/github-client';

const config = new ActionConfig();
const ghClient = new GitHubClient(config.token);
const response = await ghClient.queryDependencyGraph(
  config.repoOwner,
  config.repoName
);

const coordinates = response.repository.dependencyGraphManifests.nodes
  .flatMap((manifest) =>
    manifest.dependencies.nodes.map(CoordinateUtils.convertToCoordinate)
  )
  .filter(is.nonEmptyString);

const clearlyDefinedClient = new ClearlyDefinedClient();
const noticeResponse = await clearlyDefinedClient.fetchNoticeFile(
  coordinates,
  config.format
);

for (const noCopyright of noticeResponse.summary.warnings.noCopyright) {
  core.warning(`Unable to locate copyright for ${noCopyright}`);
}
for (const noDefinition of noticeResponse.summary.warnings.noDefinition) {
  core.warning(`Unable to find package ${noDefinition}`);
}
for (const noLicense of noticeResponse.summary.warnings.noLicense) {
  core.warning(`Unable to find locate license for ${noLicense}`);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const noticeFile = path.join(process.env['GITHUB_WORKSPACE']!, config.filename);

fs.writeFileSync(noticeFile, noticeResponse.content);
await artifact.uploadArtifact(
  config.filename,
  [noticeFile],
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  process.env['GITHUB_WORKSPACE']!
);
