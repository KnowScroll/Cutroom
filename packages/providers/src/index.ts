// Adapters behind the ports. Every one is a stand-in: the model port, the image port and the sensor
// port. No real adapter exists, so nothing here can reach a paid service (docs/features/reel-plan.md
// and docs/features/reel-stills.md, Gate 2).

export {
  DEFAULT_ARTIFACT_ROOT,
  FAKE_IMAGE_MODEL,
  fakeImage,
  type FakeImage,
  type FakeImageEntry,
  type FakeImageScript,
} from './fake/image.ts'
export {
  fakeModel,
  type FakeAnswer,
  type FakeCall,
  type FakeCompareCall,
  type FakeJudgeCutCall,
  type FakeModel,
  type FakeObserveCall,
  type FakeObserveClipCall,
  type FakeScript,
} from './fake/model.ts'
export {
  fakeSensors,
  type FakeSensorCall,
  type FakeSensorEntry,
  type FakeSensors,
  type FakeSensorScript,
  type SensorMethod,
} from './fake/sensors.ts'
