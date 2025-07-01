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
        timeout: 30000, // 30 second timeout instead of 0 (infinite)
      },
    });
  }

  public async queryDependencyGraph(
    owner: string,
    name: string
  ): Promise<DependencyGraphResponse> {
    try {
      // Use a more efficient approach: fetch manifests with limited dependencies first
      const initialResponse = (await this.octokit.graphql(
        `query ($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            dependencyGraphManifests(first: 50) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                blobPath
                dependencies(first: 100) {
                  totalCount
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
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
      )) as any;

      let allManifests =
        initialResponse.repository.dependencyGraphManifests.nodes;

      // If there are more manifests, fetch them with pagination
      let hasNextPage =
        initialResponse.repository.dependencyGraphManifests.pageInfo
          .hasNextPage;
      let cursor =
        initialResponse.repository.dependencyGraphManifests.pageInfo.endCursor;

      while (hasNextPage) {
        console.log('::debug::Fetching additional dependency manifests...');
        const nextResponse = (await this.octokit.graphql(
          `query ($owner: String!, $name: String!, $cursor: String!) {
            repository(owner: $owner, name: $name) {
              dependencyGraphManifests(first: 50, after: $cursor) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  blobPath
                  dependencies(first: 100) {
                    totalCount
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
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
            cursor,
          }
        )) as any;

        allManifests = allManifests.concat(
          nextResponse.repository.dependencyGraphManifests.nodes
        );
        hasNextPage =
          nextResponse.repository.dependencyGraphManifests.pageInfo.hasNextPage;
        cursor =
          nextResponse.repository.dependencyGraphManifests.pageInfo.endCursor;
      }

      // Process manifests that may have truncated dependencies
      const processedManifests = await Promise.all(
        allManifests.map(async (manifest: any) => {
          // If dependencies are truncated (more than 100), we need to fetch them separately
          if (manifest.dependencies.pageInfo?.hasNextPage) {
            console.log(
              `::debug::Fetching additional dependencies for ${manifest.filename} (${manifest.dependencies.totalCount} total)`
            );

            try {
              let allDependencies = [...manifest.dependencies.nodes];
              let depHasNextPage = manifest.dependencies.pageInfo.hasNextPage;
              let depCursor = manifest.dependencies.pageInfo.endCursor;

              while (depHasNextPage) {
                const depsResponse = (await this.octokit.graphql(
                  `query ($owner: String!, $name: String!, $blobPath: String!, $cursor: String!) {
                    repository(owner: $owner, name: $name) {
                      object(expression: "HEAD") {
                        ... on Commit {
                          file(path: $blobPath) {
                            dependencyGraphManifest {
                              dependencies(first: 100, after: $cursor) {
                                pageInfo {
                                  hasNextPage
                                  endCursor
                                }
                                nodes {
                                  packageManager
                                  packageName
                                  requirements
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }`,
                  {
                    owner,
                    name,
                    blobPath: manifest.blobPath,
                    cursor: depCursor,
                  }
                )) as any;

                const newDeps =
                  depsResponse.repository.object.file.dependencyGraphManifest
                    .dependencies.nodes;
                allDependencies = allDependencies.concat(newDeps);
                depHasNextPage =
                  depsResponse.repository.object.file.dependencyGraphManifest
                    .dependencies.pageInfo.hasNextPage;
                depCursor =
                  depsResponse.repository.object.file.dependencyGraphManifest
                    .dependencies.pageInfo.endCursor;
              }

              // Replace the truncated dependencies with the complete list
              manifest.dependencies.nodes = allDependencies;
            } catch (depError: any) {
              console.log(
                `::warning::Could not fetch all dependencies for ${manifest.filename}: ${depError.message}`
              );
              // Keep the truncated list rather than failing entirely
            }
          }
          return manifest;
        })
      );

      const formattedResponse = {
        repository: {
          dependencyGraphManifests: {
            nodes: processedManifests,
          },
        },
      };

      const res =
        await DependencyGraphResponse.safeParseAsync(formattedResponse);
      if (!res.success) {
        console.log(`::error::Invalid response: ${res.error}`);
        throw new Error(`Schema validation failed: ${res.error.message}`);
      }

      return res.data;
    } catch (error: any) {
      if (error.status === 403 && error.message?.includes('rate limit')) {
        console.log(
          '::error::GitHub API rate limit exceeded. Please try again later.'
        );
        throw new Error('Rate limit exceeded');
      }
      if (error.status === 502 || error.status === 504) {
        console.log(
          '::error::GitHub API timeout. The repository may have too many dependencies.'
        );
        throw new Error('API timeout - repository too large');
      }
      if (
        error.name === 'GraphqlResponseError' &&
        error.message?.includes('timeout')
      ) {
        console.log(
          '::error::GraphQL query timeout. Try reducing the scope or contact support.'
        );
        throw new Error('GraphQL timeout');
      }
      console.log(`::error::GitHub API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Alternative method for very large repositories - fetches only essential manifests
   * and limits dependencies per manifest to prevent timeouts
   */
  public async queryDependencyGraphLimited(
    owner: string,
    name: string,
    maxManifests: number = 20,
    maxDependenciesPerManifest: number = 50
  ): Promise<DependencyGraphResponse> {
    try {
      console.log(
        `::debug::Using limited query mode (max ${maxManifests} manifests, ${maxDependenciesPerManifest} deps each)`
      );

      const response = (await this.octokit.graphql(
        `query ($owner: String!, $name: String!, $maxManifests: Int!, $maxDeps: Int!) {
          repository(owner: $owner, name: $name) {
            dependencyGraphManifests(first: $maxManifests) {
              totalCount
              nodes {
                blobPath
                dependencies(first: $maxDeps) {
                  totalCount
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
          maxManifests,
          maxDeps: maxDependenciesPerManifest,
        }
      )) as any;

      const manifests = response.repository.dependencyGraphManifests.nodes;
      const totalManifests =
        response.repository.dependencyGraphManifests.totalCount;

      if (totalManifests > maxManifests) {
        console.log(
          `::warning::Repository has ${totalManifests} manifests, only processing first ${maxManifests} to prevent timeout`
        );
      }

      // Count truncated dependencies
      let truncatedCount = 0;
      manifests.forEach((manifest: any) => {
        if (manifest.dependencies.totalCount > maxDependenciesPerManifest) {
          truncatedCount++;
          console.log(
            `::warning::${manifest.filename} has ${manifest.dependencies.totalCount} dependencies, only processing first ${maxDependenciesPerManifest}`
          );
        }
      });

      if (truncatedCount > 0) {
        console.log(
          `::warning::${truncatedCount} manifest(s) had dependencies truncated to prevent timeout`
        );
      }

      const formattedResponse = {
        repository: {
          dependencyGraphManifests: {
            nodes: manifests,
          },
        },
      };

      const res =
        await DependencyGraphResponse.safeParseAsync(formattedResponse);
      if (!res.success) {
        console.log(`::error::Invalid response: ${res.error}`);
        throw new Error(`Schema validation failed: ${res.error.message}`);
      }

      return res.data;
    } catch (error: any) {
      console.log(`::error::Limited query failed: ${error.message}`);
      throw error;
    }
  }
}
