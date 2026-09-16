import type { CliDistribution } from "@hypit/cli";
import {
  doctorProjectBuildResultRepository,
  openLocalRuntimeHost,
  openProjectBuildResultRepository,
} from "@hypit/runtime-local";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  createVideoCompiler,
} from "./compiler.js";

// The Distribution root is the replaceable Hypit tool checkout, not this
// package's source directory and never the author's project.
const packageRoot = resolve(import.meta.dirname, "../../..");
const defaultBuildResultRepository = {
  use: "@hypit/build-result-fs",
  config: { path: ".hypit/results" },
} as const;

/** Official video authoring assembly for the generic CLI engine. */
export const videoCliDistribution: CliDistribution = {
  packageRoot,
  bootstrapPackages: [],
  initialRuntimeProfile: {
    format: "hypit.runtime-local@1",
    dataRoot: ".hypit/runtimes/local",
    credentials: {
      os: { use: "@hypit/credential-store-os" },
    },
    endpoints: {
      "hypihub.default": {
        use: "@hypit/provider-hypihub",
        config: {
          baseUrl: "https://hypit.ai",
          apiKey: { store: "os", key: "hypihub.oauth" },
        },
      },
      "media.local": {
        use: "@hypit/provider-media-local",
      },
      "hyperframes.local": {
        use: "@hypit/provider-hyperframes-local",
      },
    },
  },
  createCompiler: createVideoCompiler,
  discoverSourcePackages: async (path, options) => {
    const { discoverVideoSourcePackages } = await import("./package-selection.js");
    return await discoverVideoSourcePackages(path, options);
  },
  openRuntimeHost: async (path, options) => await openLocalRuntimeHost(path, {
    packageRoot: options.packageRoot,
    ...(options.distributionPackageRoot === undefined
      ? {}
      : { distributionPackageRoot: options.distributionPackageRoot }),
    workerLaunch: {
      command: process.execPath,
      // The loaded Distribution owns its Worker entry and TypeScript/package resolution.
      args: [fileURLToPath(new URL("../../../bin/hypit.mjs", import.meta.url))],
    },
  }),
  openProjectResults: async (projectRoot, options) => {
    const opened = await openProjectBuildResultRepository(projectRoot, {
      ...options,
      distributionPackageRoot: options.distributionPackageRoot ?? packageRoot,
      defaultSelection: defaultBuildResultRepository,
    });
    return {
      location: opened.location,
      repository: opened.repository,
      close: async () => await opened.close?.(),
    };
  },
  diagnoseProjectResults: async (projectRoot, options) =>
    await doctorProjectBuildResultRepository(projectRoot, {
      ...options,
      distributionPackageRoot: options.distributionPackageRoot ?? packageRoot,
      defaultSelection: defaultBuildResultRepository,
    }),
};
