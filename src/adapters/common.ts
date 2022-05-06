import { anyContract } from "../common";

export interface ContractAdapter {
  send(params: any): Promise<any>;
  onError?(e: Error, c: anyContract): any;
}
