declare global {
  export interface Stub {
    factory(): (...args: any[]) => any;
  }
}

export type StubType = ReturnType<Stub["factory"]>;

const stub: Stub = {} as Stub;

/**
 * Ignoring the stub type here because we want to allow module augmentation
 * for the factory result
 */
export const getStub = (): StubType => {
  if (!stub.factory) throw new Error("No stub registered.");
  return stub.factory();
};
export const registerStub = (factory: () => StubType) => {
  stub.factory = factory;
};
