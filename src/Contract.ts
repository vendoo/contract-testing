import yup from "yup";
import { InferType } from "./utils/yup";
import { anyContract } from "./common";
import { ContractAdapter } from "./adapters/common";

export type ContractRegister<T extends anyContract = anyContract> = (
  contract: T
) => any;

export type ContractParams<IT> = {
  onRegister?: ContractRegister<anyContract>;
  onBeforeSend?: (input: IT) => Promise<any> | any;
};

/** Defines the contract basis */
export class Contract<
  K extends string,
  I extends yup.BaseSchema,
  IT extends InferType<I>,
  O extends yup.BaseSchema,
  OT extends InferType<O>
> implements anyContract {
  constructor(
    public key: K,
    public inputSchema: I,
    public outputSchema: O,
    public params: ContractParams<IT> = {}
  ) {}

  /** Used internally to create instances immutably */
  protected decorate(props: ContractParams<IT>) {
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

  public onBeforeSend(onBeforeSend: ContractParams<IT>["onBeforeSend"]) {
    return this.decorate({ onBeforeSend });
  }

  public Input: IT = null as never;
  public validateInput(input: IT) {
    return this.inputSchema.validateSync(input);
  }

  public Output: OT = null as never;
  public validateOutput(input: OT) {
    return this.outputSchema.validateSync(input);
  }

  public responseMock?: OT;
  /** This function mutates the contract instance */
  public mock(responseMock: OT, onRegister?: ContractRegister) {
    this.validateOutput(responseMock);
    this.responseMock = responseMock;
    if (onRegister) this.params.onRegister = onRegister;
    return this;
  }

  public adapter(adapter: ContractAdapter) {
    const { onRegister, onBeforeSend } = this.params;
    const thisContract = this;

    if (onRegister) {
      onRegister(thisContract);
    }
    return async (input: IT): Promise<OT> => {
      input = thisContract.validateInput(input);

      const params = onBeforeSend
        ? await Promise.resolve(onBeforeSend(input))
        : input;

      const res = await adapter.send(params);

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
