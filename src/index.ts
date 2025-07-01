import fs from 'node:fs';
import path from 'node:path';
import { DefaultArtifactClient } from '@actions/artifact';
import is from '@sindresorhus/is';
import { ActionConfig } from './action-config';
import { CoordinateUtils } from './coordinate-utils';
import { ClearlyDefinedClient } from './http/clearly-defined-client';
import { GitHubClient } from './http/github-client';

const config = new ActionConfig();
const ghClient = new GitHubClient(config.token);

// biome-ignore lint/suspicious/noImplicitAnyLet: Too complex to type
let response;
try {
  console.log('::debug::Attempting full dependency graph query...');
  response = await ghClient.queryDependencyGraph(
    config.repoOwner,
    config.repoName
  );
} catch (error: any) {
  if (
    error.message?.includes('timeout') ||
    error.message?.includes('too large')
  ) {
    console.log(
      '::warning::Full query timed out, falling back to limited query...'
    );
    try {
      response = await ghClient.queryDependencyGraphLimited(
        config.repoOwner,
        config.repoName,
        15, // max manifests
        30 // max dependencies per manifest
      );
    } catch (limitedError: any) {
      console.log('::error::Both full and limited queries failed');
      throw limitedError;
    }
  } else {
    throw error;
  }
}

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

const noticeFile = path.join(process.env['GITHUB_WORKSPACE']!, config.filename);

fs.writeFileSync(noticeFile, noticeResponse.content);

const artifactClient = new DefaultArtifactClient();
await artifactClient.uploadArtifact(
  config.filename,
  [noticeFile],
  process.env['GITHUB_WORKSPACE']!
);
