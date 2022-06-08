declare module "./stub" {
  export interface Stub {
    factory(): never;
  }
}

const stub: Stub = {} as Stub;

/**
 * Ignoring the stub type here because we want to allow module augmentation
 * for the factory result
 */
export const getStub = (): ReturnType<Stub["factory"]> => {
  if (!(stub as any).factory) throw new Error("No stub registered.");
  return (stub as any).factory();
};
export const registerStub = (factory: any) => {
  (stub as any).factory = factory;
};
