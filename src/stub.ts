declare module "./stub" {
  export interface Stub {}
}

const stub: Stub = {} as Stub;

/**
 * Ignoring the stub type here because we want to allow module augmentation
 * for the factory result
 */
export const getStub = () => {
  if (!(stub as any).factory) throw new Error("No stub registered.");
  return (stub as any).factory();
};

export const registerStub = (factory: Stub["factory"]) => {
  (stub as any).factory = factory;
};
