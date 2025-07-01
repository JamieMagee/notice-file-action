import fs from 'node:fs';
import path from 'node:path';
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
  console.log(`::warning::Unable to locate copyright for ${noCopyright}`);
}
for (const noDefinition of noticeResponse.summary.warnings.noDefinition) {
  console.log(`::warning::Unable to find package ${noDefinition}`);
}
for (const noLicense of noticeResponse.summary.warnings.noLicense) {
  console.log(`::warning::Unable to find locate license for ${noLicense}`);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const noticeFile = path.join(process.env['GITHUB_WORKSPACE']!, config.filename);

fs.writeFileSync(noticeFile, noticeResponse.content);

// Set output parameter to indicate the notice file path
console.log(
  `notice-file-path=${noticeFile}\nnotice-filename=${config.filename}`
);

// Use GITHUB_OUTPUT environment file to set outputs
const githubOutput = process.env['GITHUB_OUTPUT'];
if (githubOutput) {
  fs.appendFileSync(githubOutput, `notice-file-path=${noticeFile}\n`);
  fs.appendFileSync(githubOutput, `notice-filename=${config.filename}\n`);
}
