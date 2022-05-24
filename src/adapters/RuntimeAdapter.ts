import { Input, anyContract } from "../common";
import { ContractAdapter } from "./common";

export class RuntimeAdapter<
  Contracts extends { [K in string]: anyContract } = {},
  Adapter extends ContractAdapter = ContractAdapter,
  Client = {
    [k in keyof Contracts]: (
      p: Input<Contracts[k]>
    ) => Promise<Contracts[k]["Output"]>;
  }
> {
  constructor(
    public contracts: Contracts = {} as Contracts,
    public adapter?: Adapter
  ) {
    if (adapter) this.client = this.bind(adapter);
  }

  private _client?: Client;
  public set client(c) {
    this._client = c;
  }
  public get client(): Client {
    if (!this._client) throw new Error("This collection is not initialized");
    return this._client;
  }

  private bind<A extends ContractAdapter, P extends Client>(adapter: A) {
    const contracts = this.contracts;
    return Object.keys(contracts).reduce((acc: any, k) => {
      acc[k] = contracts[k].adapter(adapter);
      return acc;
    }, {} as P);
  }

  public add<C extends anyContract>(
    c: C
  ): RuntimeAdapter<Contracts & { [k in C["key"]]: C }> {
    return new RuntimeAdapter<Contracts & { [k in C["key"]]: C }>({
      ...this.contracts,
      [c.key]: c,
    });
  }

  public initialize<A extends ContractAdapter, P extends Client>(adapter: A) {
    return new RuntimeAdapter<Contracts, A, P>(this.contracts, adapter);
  }

  public reinitialize() {
    if (!this.adapter) throw new Error("Adapter isn't initialized yet");
    this.client = this.bind(this.adapter);
    return this;
  }
}
