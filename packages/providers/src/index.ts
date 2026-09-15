// Adapters behind the ports. For reel-plan there is one: the stand-in LanguageModelPort. No real
// model adapter exists, so nothing here can reach a paid service (docs/features/reel-plan.md, Gate 2).

export {
  fakeModel,
  type FakeAnswer,
  type FakeCall,
  type FakeModel,
  type FakeScript,
} from './fake/model.ts'
