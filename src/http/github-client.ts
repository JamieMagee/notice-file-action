import { Octokit } from '@octokit/core';
import { paginateGraphql } from '@octokit/plugin-paginate-graphql';
import { DependencyGraphResponse } from '../schema';
import core from '@actions/core';

export class GitHubClient {
  private readonly octokit: Octokit;

  constructor(token: string) {
    this.octokit = new (Octokit.plugin(paginateGraphql))({
      auth: `token ${token}`,
      previews: ['hawkgirl'], // https://docs.github.com/en/graphql/overview/schema-previews#access-to-a-repositorys-dependency-graph-preview
    });
  }

  public async queryDependencyGraph(
    owner: string,
    name: string
  ): Promise<DependencyGraphResponse> {
    const rawResponse = await this.octokit.graphql(
      `query ($owner: String!, $name: String!) {
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
            }`,
      {
        owner,
        name,
      }
    );

    const res = await DependencyGraphResponse.safeParseAsync(rawResponse);
    if (!res.success) {
      core.error(`Invalid response: ${res.error}`);
      throw new Error();
    }

    return res.data;
  }
}
