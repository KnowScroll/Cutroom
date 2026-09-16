/**
 * Module boundaries.
 *
 * Every rule below is an architectural invariant that a code review would not see and
 * production would. They are asserted by `pnpm drift`, and `pnpm drift --prove` builds a
 * deliberate violation of each one at run time and fails if the rule does not catch it.
 *
 * The authority for these is steering/DECISIONS.md in the KnowScroll repository, which does
 * not live here (D-088). `pnpm decisions` tells you which commit of it this repo is pinned to.
 */
module.exports = {
  forbidden: [
    {
      name: 'pipeline-no-domain',
      severity: 'error',
      comment:
        'A stage must not touch the database. This is what makes "the pipeline is pure functions" ' +
        'true rather than intended: a stage takes inputs and returns a record, and something else ' +
        'decides what becomes durable state. Without this rule, a stage cannot be tested without a ' +
        'database and the worker stops owning the write path.',
      from: { path: '^packages/pipeline' },
      to: { path: '^packages/domain' },
    },
    {
      name: 'pipeline-no-providers',
      severity: 'error',
      comment:
        'A stage must not reach a provider adapter. It depends on a PORT TYPE from contracts and is ' +
        'handed an implementation; that is the single thing keeping the framework question cheap to ' +
        'answer later (D-006, D-084), and it is why the pipeline tests need no network.',
      from: { path: '^packages/pipeline' },
      to: { path: '^packages/providers' },
    },
    {
      name: 'pipeline-no-apps',
      severity: 'error',
      comment:
        'A step that makes a plan must not know whether a queued job or a person typing called it. ' +
        'Importing an app would make the stage unrunnable in a test and untestable without a server.',
      from: { path: '^packages/pipeline' },
      to: { path: '^apps/' },
    },
    {
      name: 'pipeline-no-io',
      severity: 'error',
      comment:
        'The pipeline does no input or output of its own: no filesystem, no network, no processes, ' +
        'no database driver. Anything touching the outside world sits behind a named port. A stage ' +
        'that reads a file is a stage whose test needs that file to exist.',
      from: { path: '^packages/pipeline' },
      to: {
        dependencyTypes: ['core'],
        path: '^(node:)?(fs|fs/promises|child_process|net|http|https|http2|dgram|tls|dns|cluster|worker_threads|sqlite|repl|readline)$',
      },
    },
    {
      name: 'api-no-providers',
      severity: 'error',
      comment:
        'The API never calls a provider SDK. All provider calls live in the worker, so a slow or ' +
        'failing provider degrades a job rather than an HTTP request, and no provider key is ever ' +
        'needed by the process that serves requests (D-005).',
      from: { path: '^apps/api' },
      to: { path: '^packages/providers' },
    },
    {
      name: 'worker-no-providers',
      severity: 'error',
      comment:
        'S-038: the worker is HANDED its model, image and sensor ports and never constructs one ' +
        '(S-021). S-021 recorded this import as not caught, and with an image port in reach it is ' +
        'exactly how a run would come to spend: a worker that can import an adapter can import a ' +
        'real one, and then "no connection to any paid service" is a habit rather than a structure.',
      from: { path: '^apps/worker' },
      to: { path: '^packages/providers' },
    },
    {
      name: 'providers-no-domain',
      severity: 'error',
      comment:
        'An adapter has no database access. It returns a typed result; the worker decides what is ' +
        'written, which is what makes every model call accountable to exactly one model_receipt row ' +
        '(D-005) instead of to whatever the adapter felt like persisting.',
      from: { path: '^packages/providers' },
      to: { path: '^(packages/domain|db/)' },
    },
    {
      name: 'providers-no-pipeline',
      severity: 'error',
      comment:
        'Adapters are called BY stages, never the other way round. An adapter importing a stage is ' +
        'the dependency inverted, and it puts the decision of what to do next inside the thing whose ' +
        'only job is to talk to the outside world.',
      from: { path: '^packages/providers' },
      to: { path: '^packages/pipeline' },
    },
    {
      name: 'domain-no-pipeline-or-providers',
      severity: 'error',
      comment:
        'The domain owns tables, the queue and the ledger. If it could import a stage or an adapter, ' +
        'a migration could run a model call, and the budget ledger would no longer be the thing that ' +
        'decides whether a call is allowed to happen.',
      from: { path: '^packages/domain' },
      to: { path: '^packages/(pipeline|providers)' },
    },
    {
      name: 'contracts-are-a-leaf',
      severity: 'error',
      comment:
        'packages/contracts is imported by everything, so it must import nothing internal. The ports ' +
        'live here as types precisely so that pipeline can name a port without depending on the code ' +
        'that implements it. One exception, D-099: the caller-facing types PlanVaryOn and Criterion ' +
        'are declared only in @cutroom/reel-contract, and contracts reuses them from there.',
      from: { path: '^packages/contracts' },
      to: { path: '^(apps|packages)/(?!contracts/|reel-contract/)' },
    },
    {
      name: 'reel-contract-is-a-leaf',
      severity: 'error',
      comment:
        'D-094: @cutroom/reel-contract is what a caller such as the orchestrator depends on, and the ' +
        'only engine package anything outside the engine may depend on (D-099). It imports no other ' +
        'engine package, so installing it gives a caller the contract and nothing of the engine.',
      from: { path: '^packages/reel-contract/' },
      to: { path: '^(apps|packages)/(?!reel-contract/)' },
    },
    {
      name: 'no-reaching-into-internals',
      severity: 'error',
      comment:
        'A package is used through its src/index.ts and nothing else. A deep import into a sibling ' +
        "ties you to that package's internal file layout, which is the thing a package boundary " +
        'exists to hide.',
      from: { path: '^(apps|packages)/([^/]+)/' },
      to: {
        path: '^(apps|packages)/([^/]+)/src/(?!index\\.ts$).+',
        // $1 and $2 are the groups from `from.path`: a deep import WITHIN one's own
        // package is not reaching into anyone's internals.
        pathNot: '^$1/$2/',
      },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'A cycle between modules means neither one owns its write path.',
      from: {},
      to: { circular: true },
    },

    // ---------------------------------------------------------------------------------
    // Rules BETWEEN TWO FOLDERS OF ONE PACKAGE.
    //
    // These are the rules the steering repository's `drift` could not express, because it
    // matches the TEXT of an import specifier against a prefix: it sees
    // `from '@knowscroll/domain'` and is blind to `from '../../domain'`. Inside one package
    // every import between folders is relative, so no specifier prefix can ever match one.
    //
    // dependency-cruiser resolves each import to a file path, so the spelling does not
    // matter. That is the whole reason these four exist here and could not exist there.
    //
    // The folder names come from the decisions (D-073) and reel-plan's Gate 3, which creates
    // split/ and plan/ together in its Slice 3. `drift --audit` reports every rule whose folders
    // are absent, and FAILS once the package has source files and the folder a rule names is
    // still missing, which is what a rename would look like.
    //
    // `plan-no-epistemic` (D-085's backstop) was deleted by reel-plan: D-096 keeps the epistemic
    // layer in KnowScroll, and D-103 retired D-085. `split-no-cinematic` was replaced by the rule
    // below it, because it could not fire — see that rule's comment (S-020).
    // ---------------------------------------------------------------------------------
    {
      name: 'split-imports-only-itself',
      severity: 'error',
      comment:
        'D-073: the splitter is told only how many sentences there are and how many units to make, ' +
        'and knows nothing about shots, cameras, claims or text. So it imports nothing outside its ' +
        'own folder — no contracts, no npm package, no core module. This replaces a rule matching ' +
        '"cinematic" in the imported path, which could never fire: every import of ' +
        '@cutroom/contracts resolves to its index.ts, whose path never contains the word. A ' +
        'splitter that imports nothing outside its folder imports no cinematic type by any path.',
      from: { path: '^packages/pipeline/src/split/' },
      to: { pathNot: '^packages/pipeline/src/split/' },
    },
    {
      name: 'split-imported-only-by-plan',
      severity: 'error',
      comment:
        'D-073: the planner calls the splitter, with a target unit count. Nothing else imports it. ' +
        'A second caller means a second authority over where a narration unit begins, which is the ' +
        'shape D-045 removed from the keyframe scorer.',
      from: {
        path: '^(packages|apps)/',
        pathNot: '^packages/pipeline/src/(plan|split)/',
      },
      to: { path: '^packages/pipeline/src/split/' },
    },
    {
      name: 'split-entered-through-its-index',
      severity: 'error',
      comment:
        'D-073: the planner MAY CALL the splitter and MAY NOT REACH INSIDE it. The module-level ' +
        'rule above this one only guards package boundaries; inside a package a deep import is ' +
        'relative, and this is the folder-level equivalent. Enter through split/index.ts.',
      from: { path: '^packages/pipeline/src/plan/' },
      to: { path: '^packages/pipeline/src/split/(?!index\\.ts$).+' },
    },

    // ---------------------------------------------------------------------------------
    // Rules about npm packages (reel-plan, Gate 2). Each sees an npm import only because
    // `node_modules` is NOT in `options.exclude` below. The patterns are flat alternations:
    // the tool refuses a repeat inside a repeated group as an unsafe regular expression.
    // ---------------------------------------------------------------------------------
    {
      name: 'pipeline-npm-only-zod',
      severity: 'error',
      comment:
        'The pipeline is pure functions, and zod is the one npm package it may use — to describe the ' +
        'shape a model call must answer in. A database driver, an ORM or a model client imported ' +
        'here passes every rule about folders, because none of them lives in one.',
      from: { path: '^packages/pipeline/' },
      to: { path: 'node_modules/', pathNot: 'node_modules/zod/|node_modules/\\.pnpm/zod@' },
    },
    {
      name: 'model-client-only-in-providers',
      severity: 'error',
      comment:
        'D-084: no module outside packages/providers constructs a model client, and D-005 names the ' +
        'layer the one client would come from. Matched by package name as well as by path, so an ' +
        'import of a client that is not installed is caught too.',
      from: { pathNot: '^packages/providers/' },
      to: {
        path: '^ai$|^@ai-sdk/|node_modules/ai/|node_modules/@ai-sdk/|node_modules/\\.pnpm/ai@|node_modules/\\.pnpm/@ai-sdk\\+',
      },
    },
  ],
  options: {
    // The tool does not walk inside an npm package, but it does record the edge to one: without
    // that, a rule about npm imports can never fire. So `node_modules` is here and not in
    // `exclude`, which would remove every such path from the graph (reel-plan, Gate 2).
    //
    // `dist` is anchored to this repository's own tsc output, at the root and in each package.
    // Unanchored it also matched `node_modules/ai/dist/index.mjs` — where most npm packages keep
    // their entry — and removed that edge from the graph, so both npm rules were silent on `ai`
    // once it resolved. Found by reel-plan's Slice 2 (S-020).
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^dist/|^(apps|packages)/[^/]+/dist/|\\.tmp|\\.artifacts|steering-ref)' },

    // Type-only imports count. A boundary crossed by `import type` is still a boundary
    // crossed: it means the module was designed against the wrong thing.
    tsPreCompilationDeps: true,

    // Resolve a workspace import by PACKAGE NAME. Every package here declares only
    // `exports` — no `main` — and without this the resolver never reads it, so an import of
    // `@cutroom/domain` stays unresolved and every cross-package rule is silent on it, while
    // the relative-path --prove cases still pass. Found by an experiment from the steering
    // repository on 2026-09-14; `drift --prove` now has by-name cases that go SILENT if this
    // line is ever removed. Tested alone, this setting is sufficient; `conditionNames` alone
    // and `extensions` alone are not.
    //
    // `conditionNames` is what resolves an npm package whose `exports` name only conditions —
    // zod and ai declare `types`, `import` and `require`, and no `default`. Without it such an
    // import stays unresolved, reaches no rule as a node_modules path, and
    // `pipeline-npm-only-zod` is silent on `ai` from the pipeline. Found by reel-plan's Slice 2,
    // whose --prove cases copy real manifests' shapes; its legal cases must resolve (S-020).
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
}
