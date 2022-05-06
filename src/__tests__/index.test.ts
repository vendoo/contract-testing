import * as yup from "yup";
import { ContractAdapter, Contract, Input, Output, RuntimeAdapter } from "..";

import AxiosMockAdapter from "axios-mock-adapter";
import axios from "axios";

/**
 *
 *
 *
 *
 *
 *
 *
 *
 */
const object = yup.object({}).required();

export const sampleSchemaIn = object.shape({
  inputParam: yup.string().required(),
});
export const sampleSchemaOut = object.shape({
  outputParam: yup.string().required(),
});

const sampleContract1 = new Contract(
  "sample1",
  sampleSchemaIn,
  sampleSchemaOut
);

const sampleContract2 = new Contract(
  "sample2",
  sampleSchemaOut,
  sampleSchemaIn
);

/**
 * Contract testing is the methodology of testing our services isolated
 *   while making sure our mocks are correct using a "contract".
 *
 * See good explanations here:
 *    - https://docs.pact.io/
 *    - https://martinfowler.com/bliki/ContractTest.html
 */
describe("Contract testing internals", () => {
  it("Should validate input to the service based on schemas", () => {
    const sampleContract = new Contract(
      "sample",
      sampleSchemaIn,
      sampleSchemaOut
    );
    expect(() =>
      sampleContract.validateInput({ inputParam: "inputParam" })
    ).not.toThrowError();

    expect(() =>
      sampleContract.validateInput({ invalidParam: "invalidParam" } as any)
    ).toThrowError();
  });

  it("Should provide an easy way to type input and output based on schema types", () => {
    const sampleContract = new Contract(
      "sample",
      sampleSchemaIn,
      sampleSchemaOut
    );

    ({ inputParam: "inputParam" } as typeof sampleContract["Input"]);
    ({ inputParam: "inputParam" } as Input<typeof sampleContract>);

    ({ outputParam: "outputParam" } as typeof sampleContract["Output"]);
    ({ outputParam: "inputParam" } as Output<typeof sampleContract>);
  });

  it("Should assign and validate a mock response to a contract", () => {
    const sampleContract = new Contract(
      "sample",
      sampleSchemaIn,
      sampleSchemaOut
    );

    expect(() =>
      sampleContract.mock({ outputParam: "outputParam" })
    ).not.toThrowError();

    expect(() =>
      sampleContract.mock({ invalidParam: "invalidParam" } as any)
    ).toThrowError();
  });

  it("Aggregates contracts into an adapter", () => {
    const sampleAPI = new RuntimeAdapter()
      .add(sampleContract1.mock({ outputParam: "outputParam" }))
      .add(sampleContract2.mock({ inputParam: "inputParam" }));

    expect(Object.keys(sampleAPI.contracts)).toHaveLength(2);
  });

  it("Should allow contracts to initialize when provided an adapter", () => {
    const sampleContract = new Contract(
      "sample",
      sampleSchemaIn,
      sampleSchemaOut
    );
    const sampleContractMock = sampleContract.mock({
      outputParam: "outputParam",
    });

    // We expect mock to mutate the contract instance
    expect(sampleContract).toBe(sampleContractMock);

    const registeringSampleContract = sampleContract.onRegister(jest.fn());
    expect(registeringSampleContract).toBeInstanceOf(Contract);

    registeringSampleContract.adapter({ send: jest.fn() });
    expect(registeringSampleContract.params.onRegister).toHaveBeenCalled();
  });

  it("Should check the output to the service based on schemas. Output schemas doesn't throw", async () => {
    const adapter = {
      onError: jest.fn(),
      send: jest.fn().mockResolvedValue({ invalid: "invalid" }),
    };
    const sender = sampleContract1.adapter(adapter);

    const res = await sender({ inputParam: "inputParam" });
    expect(res).toMatchObject({ invalid: "invalid" });

    expect(adapter.onError).toHaveBeenCalled();
  });
});

describe("Contract adapters: runtime use-case", () => {
  const sampleAPI = new RuntimeAdapter()
    .add(sampleContract1.mock({ outputParam: "outputParam" }))
    .add(sampleContract2.mock({ inputParam: "inputParam" }));

  const runtimeMockContractAdapter = { send: jest.fn() };

  const runtime = sampleAPI.initialize(runtimeMockContractAdapter);

  beforeEach(() => {
    (runtimeMockContractAdapter.send as jest.Mock).mockReset();
  });

  it("Should provide and validate a runtime service mock with expected result", async () => {
    const validReq = runtime.client.sample1({ inputParam: "inputParam" });
    await expect(validReq).resolves.not.toThrow();

    expect(runtimeMockContractAdapter.send).toHaveBeenCalledTimes(1);

    const invalidReq = runtime.client.sample1({ invalid: "invalid" } as any);
    await expect(invalidReq).rejects.toThrow();
  });
});

describe("Contract adapters: http use-case", () => {
  const axiosInstance = axios.create();
  const axiosAdapter = new AxiosMockAdapter(axiosInstance);

  const httpMock: ContractAdapter = { send: jest.fn(axiosInstance.request) };

  const sampleHttpSchemaIn = object.shape({
    url: yup
      .string()
      .oneOf(["/sample1"])
      .required(),
  });

  const httpContractSample1 = new Contract(
    "sample1",
    sampleHttpSchemaIn,
    sampleSchemaOut
  );

  const sampleAPI = new RuntimeAdapter().add(httpContractSample1);

  httpContractSample1.mock({ outputParam: "outputParam" }, contract => {
    axiosAdapter.onAny("/sample1").reply(200, contract.responseMock);
  });

  beforeAll(() => {
    sampleAPI.initialize(httpMock);
  });

  beforeEach(() => {
    axiosAdapter.reset();
    sampleAPI.reinitialize();
  });

  it("Should provide and validate an http service mock with expected result", async () => {
    const validReq = sampleAPI.client.sample1({ url: "/sample1" });
    await expect(validReq).resolves.not.toThrow();
    await expect(validReq).resolves.toMatchObject({
      data: sampleAPI.contracts.sample1.responseMock,
    });

    expect(httpMock.send).toHaveBeenCalledTimes(1);

    const invalidReq = sampleAPI.client.sample1({ invalid: "invalid" } as any);
    await expect(invalidReq).rejects.toThrow();
  });
});

describe("How to implement a real API client and mock", () => {
  /** Usual runtime API sample */

  // The first thing to do is to define all contracts
  const getItem = new Contract(
    "getItem", // Contract identifier
    object.shape({
      listingId: yup.string().required(),
    }),
    object.shape({
      listing: object.shape({
        sku: yup.string().required(),
      }),
    })
  ).onBeforeSend(input => ({
    url: "/item",
    method: "POST",
    body: input,
  }));

  const postListing = new Contract(
    "postListing",
    object.shape({
      account_id: yup.string().required(),
      marketplace_id: yup.string().required(),
      data: object.shape({
        title: yup.string().required(),
        price: yup.string().required(),
      }),
    }),
    object.shape({
      listingId: yup.string().required(),
    })
  ).onBeforeSend(input => ({
    url: "/listing",
    method: "POST",
    body: input,
  }));

  // Then we create a production adapter
  // Since this is an HTTP integration we use axios
  const httpProductionAxios = axios.create();
  // Ignore this mock adapter. Imagine this is a prod. axios instance
  const axiosAdapter = new AxiosMockAdapter(httpProductionAxios);

  // If the response from the server doesn't match our schema we need to notify ourselves
  const onError = jest.fn();

  // This is the client we should use in production, per service
  const productionAPI = new RuntimeAdapter()
    .add(getItem)
    .add(postListing)
    .initialize({
      send: httpProductionAxios.request,
      onError,
    } as ContractAdapter);

  beforeEach(() => {
    axiosAdapter.reset();

    // Before running tests we need to call this function
    // to make sure all mocks register to our testing tools
    productionAPI.reinitialize();
  });

  test("The production contract collection adapter", async () => {
    axiosAdapter.onAny().reply(200, { listingId: "123" });

    // One function is available for each contract
    expect(productionAPI.client.getItem).toBeDefined();
    expect(productionAPI.client.postListing).toBeDefined();

    // We'll call the api. The input will be statically typed
    const invalidPostListingReq = productionAPI.client.postListing({} as any);
    // This call will fail since the input is invalid
    // Consumers will always be required to send valid params
    await expect(invalidPostListingReq).rejects.toThrow();

    // Given correct params, the request will pass
    const postListingReq = productionAPI.client.postListing({
      account_id: "123",
      marketplace_id: "321",
      data: { price: "100", title: "The title" },
    });
    await expect(postListingReq).resolves.toMatchObject({
      data: {
        listingId: expect.any(String),
      },
    });
  });

  test("Runtime response verification", async () => {
    // If our schema is outdated
    axiosAdapter.onAny().reply(200, { newResponseType: "newResponseType" });

    const postListingReq = productionAPI.client.postListing({
      account_id: "123",
      marketplace_id: "321",
      data: { price: "100", title: "The title" },
    });

    expect(onError).toHaveBeenCalled();

    await expect(postListingReq).resolves.not.toThrow();
    await expect(postListingReq).resolves.toMatchObject({
      data: { newResponseType: "newResponseType" },
    });
  });

  // When testing the feature, we will need to create a mock API client
  const getItemMock = {
    listing: { sku: "sku" },
  };
  // To do that we need to provide mocks for the runtimeAdapter
  // To provide the mock, we select the existing contract and provide the static mock
  productionAPI.contracts.getItem.mock(
    getItemMock,
    // And then we need to register it using our standard testing tools
    c => axiosAdapter.onPost("/item").reply(200, c.responseMock)
  );

  test("Mocking the API during integration tests", async () => {
    const req = productionAPI.client.getItem({
      listingId: "123",
    });
    // The call above will resolve to the mock using the axios adapter
    await expect(req).resolves.toMatchObject({
      data: getItemMock,
    });
  });

  test("Outdated mocks", async () => {
    // If the mock is not accurate with the schema, the framework should notify
    const invalidPostListingMock = { foo: "bar" } as any;

    const registerInvalidMock = () =>
      productionAPI.contracts.postListing.mock(invalidPostListingMock, () =>
        axiosAdapter.onPost("/item").reply(200, invalidPostListingMock)
      );

    expect(registerInvalidMock).toThrow();
  });
});
