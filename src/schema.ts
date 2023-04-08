import { z } from 'zod';

const DependencyGraphPackage = z.object({
  packageManager: z.string(),
  packageName: z.string(),
  requirements: z.string(),
});
export type DependencyGraphPackage = z.infer<typeof DependencyGraphPackage>;

export const DependencyGraphResponse = z.object({
  repository: z.object({
    dependencyGraphManifests: z.object({
      nodes: z.array(
        z.object({
          blobPath: z.string(),
          dependencies: z.object({
            nodes: z.array(DependencyGraphPackage),
          }),
          dependenciesCount: z.number(),
          exceedsMaxSize: z.boolean(),
          filename: z.string(),
          parseable: z.boolean(),
        })
      ),
    }),
  }),
});
export type DependencyGraphResponse = z.infer<typeof DependencyGraphResponse>;

export const ClearlyDefinedNoticeRequest = z.intersection(
  z.object({
    coordinates: z.array(z.string()),
  }),
  z.union([
    z.object({
      renderer: z.literal('html'),
      options: z.object({ template: z.string().optional() }),
    }),
    z.object({ renderer: z.literal('json') }),
    z.object({
      renderer: z.literal('template'),
      options: z.object({ template: z.string() }),
    }),
    z.object({ renderer: z.literal('text') }),
  ])
);

export const ClearlyDefinedNoticeResponse = z.object({
  content: z.string(),
  summary: z.object({
    total: z.number(),
    warnings: z.object({
      noDefinition: z.array(z.string()),
      noLicense: z.array(z.string()),
      noCopyright: z.array(z.string()),
    }),
  }),
});
export type ClearlyDefinedNoticeResponse = z.infer<
  typeof ClearlyDefinedNoticeResponse
>;

export const Format = z.union([
  z.literal('html'),
  z.literal('json'),
  z.literal('markdown'),
  z.literal('text'),
]);
export type Format = z.infer<typeof Format>;
