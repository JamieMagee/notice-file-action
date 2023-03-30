import { Static, Type } from "@sinclair/typebox";

export const Dependency = Type.Object({
  repository: Type.Object({
    dependencyGraphManifests: Type.Object({
      edges: Type.Array(
        Type.Object({
          node: Type.Object({
            dependencies: Type.Object({
              nodes: Type.Array(
                Type.Object({
                  packageManager: Type.String(),
                  packageName: Type.String(),
                  requirements: Type.String(),
                })
              ),
            }),
          }),
        })
      ),
    }),
  }),
});

export const ClearlyDefinedNoticeRequest = Type.Intersect([
  Type.Object({
    coordinates: Type.Array(Type.String(), { maxItems: 5000 }),
  }),
  Type.Partial(
    Type.Union([
      Type.Object({ renderer: Type.Literal("text") }),
      Type.Object({
        renderer: Type.Literal("html"),
        options: Type.Object({ template: Type.Optional(Type.String()) }),
      }),
      Type.Object({
        renderer: Type.Literal("template"),
        options: Type.Object({ template: Type.String() }),
      }),
      Type.Object({ renderer: Type.Literal("json") }),
    ])
  ),
]);

export const ClearlyDefinedNoticeResponse = Type.Object({
  content: Type.String(),
  summary: Type.Object({
    total: Type.Integer(),
    warnings: Type.Object({
      noDefinition: Type.Array(Type.String()),
      noLicense: Type.Array(Type.String()),
      noCopyright: Type.Array(Type.String()),
    }),
  }),
});
