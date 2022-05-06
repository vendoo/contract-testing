import { Input, anyContract } from "../common";
import { ContractAdapter } from "./common";

export class RuntimeAdapter<
  T extends { [K in string]: anyContract } = {},
  M = {
    [k in keyof T]: (p: Input<T[k]>) => Promise<T[k]["Output"]>;
  } & { _adapter: ContractAdapter }
> {
  constructor(public contracts: T = {} as T) {}

  private _client?: M;
  public set client(c) {
    this._client = c;
  }
  public get client(): M {
    if (!this._client) throw new Error("This collection is not initialized");
    return this._client;
  }

  public adapter?: ContractAdapter;

  public add<C extends anyContract>(
    c: C
  ): RuntimeAdapter<T & { [k in C["key"]]: C }> {
    return new RuntimeAdapter<T & { [k in C["key"]]: C }>({
      ...this.contracts,
      [c.key]: c,
    });
  }

  public initialize<A extends ContractAdapter, P extends M>(adapter: A) {
    this.adapter = adapter;
    this.client = Object.keys(this.contracts).reduce((acc, k) => {
      acc[k] = this.contracts[k].adapter(adapter);
      return acc;
    }, {} as P);

    return this;
  }

  public reinitialize() {
    if (!this.adapter) throw new Error("Adapter isn't initialized yet");
    this.client = Object.keys(this.contracts).reduce((acc, k) => {
      acc[k] = this.contracts[k].adapter(this.adapter!);
      return acc;
    }, {} as M);

    return this;
  }
}
