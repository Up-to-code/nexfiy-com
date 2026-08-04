/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as contentApi from "../contentApi.js";
import type * as databases from "../databases.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as lib_billingDomain from "../lib/billingDomain.js";
import type * as lib_childPageDomain from "../lib/childPageDomain.js";
import type * as lib_databaseDomain from "../lib/databaseDomain.js";
import type * as lib_databaseViewEngine from "../lib/databaseViewEngine.js";
import type * as lib_formulaEngine from "../lib/formulaEngine.js";
import type * as lib_pageBlockEditingDomain from "../lib/pageBlockEditingDomain.js";
import type * as lib_pageContentDomain from "../lib/pageContentDomain.js";
import type * as lib_pageTemplateDomain from "../lib/pageTemplateDomain.js";
import type * as lib_pageWriteDomain from "../lib/pageWriteDomain.js";
import type * as lib_syncedBlockDomain from "../lib/syncedBlockDomain.js";
import type * as lib_workspace from "../lib/workspace.js";
import type * as mcpActions from "../mcpActions.js";
import type * as mcpEnvironments from "../mcpEnvironments.js";
import type * as mcpServers from "../mcpServers.js";
import type * as organizationWorkspaces from "../organizationWorkspaces.js";
import type * as pageBlocks from "../pageBlocks.js";
import type * as pageContentMigrations from "../pageContentMigrations.js";
import type * as pageTemplates from "../pageTemplates.js";
import type * as syncedBlocks from "../syncedBlocks.js";
import type * as userSettings from "../userSettings.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  billing: typeof billing;
  contentApi: typeof contentApi;
  databases: typeof databases;
  documents: typeof documents;
  http: typeof http;
  "lib/billingDomain": typeof lib_billingDomain;
  "lib/childPageDomain": typeof lib_childPageDomain;
  "lib/databaseDomain": typeof lib_databaseDomain;
  "lib/databaseViewEngine": typeof lib_databaseViewEngine;
  "lib/formulaEngine": typeof lib_formulaEngine;
  "lib/pageBlockEditingDomain": typeof lib_pageBlockEditingDomain;
  "lib/pageContentDomain": typeof lib_pageContentDomain;
  "lib/pageTemplateDomain": typeof lib_pageTemplateDomain;
  "lib/pageWriteDomain": typeof lib_pageWriteDomain;
  "lib/syncedBlockDomain": typeof lib_syncedBlockDomain;
  "lib/workspace": typeof lib_workspace;
  mcpActions: typeof mcpActions;
  mcpEnvironments: typeof mcpEnvironments;
  mcpServers: typeof mcpServers;
  organizationWorkspaces: typeof organizationWorkspaces;
  pageBlocks: typeof pageBlocks;
  pageContentMigrations: typeof pageContentMigrations;
  pageTemplates: typeof pageTemplates;
  syncedBlocks: typeof syncedBlocks;
  userSettings: typeof userSettings;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
