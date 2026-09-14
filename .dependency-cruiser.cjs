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
        'that implements it.',
      from: { path: '^packages/contracts' },
      to: { path: '^(apps|packages)/(?!contracts)' },
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
    // The folder names come from the decisions (D-067, D-073, D-085). None of these folders
    // exists yet — the gates that create them are still in review. `drift --audit` reports
    // every rule whose folders are absent, and FAILS once the package has source files and
    // the folder a rule names is still missing, which is what a rename would look like.
    // ---------------------------------------------------------------------------------
    {
      name: 'plan-no-epistemic',
      severity: 'error',
      comment:
        'D-085: the planning and cinematic code receives a NARROWED VIEW of the script, with the ' +
        'epistemic (truth) fields absent, so reading or writing one is a compile error. The type is ' +
        'the real enforcement and this rule is the backstop — it catches the case the type cannot: ' +
        'a plan module importing the epistemic module directly and reaching the full script through ' +
        'it. D-067 put both layers in one package, so this import is relative and the steering ' +
        "repository's specifier matching could never see it. That is why D-085 had to replace the " +
        'rule D-034 asked for rather than build it.',
      from: { path: '^packages/pipeline/src/(plan|cinematic)/' },
      to: { path: '^packages/pipeline/src/epistemic/' },
    },
    {
      name: 'split-no-cinematic',
      severity: 'error',
      comment:
        'D-073: the splitter cuts claim-referenced prose into narration units and knows nothing ' +
        'about shots, cameras or styles. A cinematic type reaching it would let a cut be decided by ' +
        'how it will be filmed, which is what makes two storyboards of ONE script comparable ' +
        "(D-062's shotCount axis). Matched anywhere in the path, so it holds whether the cinematic " +
        'types end up in contracts or in pipeline.',
      from: { path: '^packages/pipeline/src/split/' },
      to: { path: 'cinematic' },
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
      from: { path: '^packages/pipeline/src/(plan|cinematic)/' },
      to: { path: '^packages/pipeline/src/split/(?!index\\.ts$).+' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(node_modules|dist|\\.tmp|\\.artifacts|steering-ref)' },

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
    enhancedResolveOptions: {
      exportsFields: ['exports'],
    },
  },
}
