import yup from "yup";
import { InferType } from "./utils/yup";
import { ContractAdapter } from "./adapters/common";

export interface anyContract<
  K = string,
  I extends yup.Schema = yup.Schema,
  IT = InferType<I>,
  O extends yup.Schema = yup.Schema,
  OT = InferType<O>
> {
  key: K;

  Input: IT;
  inputSchema: I;

  Output: OT;
  outputSchema: O;

  adapter(a: ContractAdapter): (p: IT) => Promise<OT>;

  responseMock?: OT;
  mock(o: OT): this;
}

export type Input<T> = T extends anyContract<any, any, infer IT, any, any>
  ? IT
  : never;

export type Output<T> = T extends anyContract<any, any, any, any, infer OT>
  ? OT
  : never;
