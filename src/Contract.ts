import yup from "yup";
import isMatch from "lodash/isMatch";
import { InferType } from "./utils/yup";
import { anyContract } from "./common";
import { ContractAdapter } from "./adapters/common";
import { getStub, Stub } from "./stub";

export type ContractRegister<T extends anyContract = anyContract> = (
  contract: T
) => any;

export type ContractParams<IT> = {
  onRegister?: ContractRegister<anyContract>;
  onBeforeSend?: (input: IT) => Promise<any> | any;
};

/** Defines the contract basis */
export class Contract<
  Key extends string,
  In extends yup.BaseSchema,
  InType extends InferType<In>,
  Out extends yup.BaseSchema,
  OutType extends InferType<Out>
> implements anyContract {
  constructor(
    public key: Key,
    public inputSchema: In,
    public outputSchema: Out,
    public params: ContractParams<InType> = {}
  ) {}

  /** Used internally to create instances immutably */
  protected decorate(props: ContractParams<InType>) {
    return new Contract(
      this.key,
      this.inputSchema,
      this.outputSchema,
      Object.assign({}, this.params, props)
    );
  }

  public onRegister(onRegister: ContractRegister) {
    return this.decorate({ onRegister });
  }

  public onBeforeSend(onBeforeSend: ContractParams<InType>["onBeforeSend"]) {
    return this.decorate({ onBeforeSend });
  }

  public Input: InType = null as never;
  public validateInput(input: InType) {
    return this.inputSchema.validateSync(input);
  }

  public Output: OutType = null as never;
  public validateOutput(input: OutType) {
    return this.outputSchema.validateSync(input);
  }

  public responseMock?: OutType;

  /** This function mutates the contract instance */
  public mock(responseMock: OutType, onRegister?: ContractRegister) {
    this.validateOutput(responseMock);
    this.responseMock = responseMock;
    if (onRegister) this.params.onRegister = onRegister;
    return this;
  }

  private matchSources: Partial<InType>[] = [];
  private stubs = new WeakMap<{}, any>();

  /** This function mutates the contract instance */
  public stub(source: Partial<InType> = {}) {
    this.matchSources.push(source);
    return this.getMatchStub(source);
  }
  private getMatchStub(key: {}) {
    const currentStub = this.stubs.get(key);
    if (currentStub) {
      return currentStub;
    } else {
      const stub = getStub();
      this.stubs.set(key, stub);
      return stub;
    }
  }

  public adapter(adapter: ContractAdapter) {
    const { onRegister, onBeforeSend } = this.params;
    const thisContract = this;

    if (onRegister) {
      onRegister(thisContract);
    }
    return async (input: InType): Promise<OutType> => {
      input = thisContract.validateInput(input);

      const params = onBeforeSend
        ? await Promise.resolve(onBeforeSend(input))
        : input;

      const source = this.matchSources.find(s => isMatch(input, s));
      const stub = source ? this.getMatchStub(source) : null;

      const res = await (stub
        ? Promise.resolve(stub(params))
        : adapter.send(params));

      try {
        thisContract.validateOutput(res);
      } catch (err) {
        // warning
        if (adapter.onError) adapter.onError(err, thisContract);
      }
      return res;
    };
  }
}
