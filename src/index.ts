import path from "node:path";
import fs from "node:fs";
import artifact from "@actions/artifact";
import core from "@actions/core";
import { Value } from "@sinclair/typebox/value";
import {
  ClearlyDefinedNoticeRequest,
  ClearlyDefinedNoticeResponse,
  Dependency,
} from "./schema.ts";
import got from "got";
import { Static } from "@sinclair/typebox";
import is from "@sindresorhus/is";
import { Octokit } from "@octokit/core";
import { paginateGraphql } from "@octokit/plugin-paginate-graphql";

const githubRepository = process.env["GITHUB_REPOSITORY"];

if (is.undefined(githubRepository)) {
  core.error("Unable to determine repository");
  process.exit(-1);
}

const [owner, name, ..._] = githubRepository.split("/");

const octokit = new (Octokit.plugin(paginateGraphql))({
  auth: `token ${process.env["GITHUB_TOKEN"]}`,
  previews: ["hawkgirl"], // https://docs.github.com/en/graphql/overview/schema-previews#access-to-a-repositorys-dependency-graph-preview
});

const res = await octokit.graphql(
  `
    query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        dependencyGraphManifests {
          nodes {
            blobPath
            dependencies {
              nodes {
                packageManager
                packageName
                requirements
              }
            }
            dependenciesCount
            exceedsMaxSize
            filename
            parseable
          }
        }
      }
    }
  `,
  {
    owner,
    name,
  }
);

if (!Value.Check(Dependency, res)) {
  process.exit(0);
}

let coordinates: string[] = [];
for (const dependencyGraphManifest of res.repository.dependencyGraphManifests
  .nodes) {
  for (const dependencies of dependencyGraphManifest.dependencies.nodes) {
    if (
      dependencies.packageManager === "NPM" &&
      dependencies.requirements.startsWith("= ")
    ) {
      coordinates.push(
        `npm/npmjs/-/${
          dependencies.packageName
        }/${dependencies.requirements.substring(2)}`
      );
    } else {
      console.log(`${dependencies.packageName}, ${dependencies.requirements}`);
    }
  }
}

const req: Static<typeof ClearlyDefinedNoticeRequest> = {
  coordinates,
  renderer: "html",
};
const noticeRes = await got
  .post<Static<typeof ClearlyDefinedNoticeResponse>>(
    "https://api.clearlydefined.io/notices",
    {
      json: req,
    }
  )
  .json();

if (!Value.Check(ClearlyDefinedNoticeResponse, noticeRes)) {
  process.exit(0);
}

const noticeFile = path.join(process.env["RUNNER_TEMP"]!, "notice.html");

fs.writeFileSync(noticeFile, noticeRes.content);
const artifactClient = artifact.create();
await artifactClient.uploadArtifact(
  "notice.html",
  [noticeFile],
  process.env["RUNNER_TEMP"]!
);
