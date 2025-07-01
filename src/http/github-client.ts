import { error } from '@actions/core';
import { Octokit } from '@octokit/core';
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';
import { DependencyGraphResponse } from '../schema';

export class GitHubClient {
  private readonly octokit: Octokit;

  constructor(token: string) {
    this.octokit = new (Octokit.plugin(paginateGraphQL))({
      auth: `token ${token}`,
      previews: ['hawkgirl'], // https://docs.github.com/en/graphql/overview/schema-previews#access-to-a-repositorys-dependency-graph-preview
      request: {
        timeout: 0,
      },
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
      error(`Invalid response: ${res.error}`);
      throw new Error();
    }

    return res.data;
  }
}
