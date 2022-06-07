declare module "./stub" {
  export interface Stub {}
}

const stub: Stub = { factory: null as never };

export const getStub = () => {
  if (!stub.factory) throw new Error("No stub registered.");
  return stub.factory();
};

export const registerStub = (factory: Stub["factory"]) => {
  stub.factory = factory;
};
