import { InferType as yupInferType } from "yup";
import { TypedSchema } from "yup/lib/util/types";

type BaseTypes = number | string | Symbol | Date;

type isOptionalType<T> = undefined extends T
  ? true
  : T extends BaseTypes
  ? false
  : true; // Default type as optional;

type PickOptionalKeys<T extends Object> = {
  [K in keyof T]: isOptionalType<T[K]> extends true ? K : never;
}[keyof T];

type PickRequiredKeys<T extends Object> = {
  [K in keyof T]: isOptionalType<T[K]> extends true ? never : K;
}[keyof T];

type ReSpread<T> = T extends Object
  ? {
      [K in keyof T]: T[K];
    }
  : never;

export type ParseNullableRecursive<T> = T extends BaseTypes
  ? T
  : T extends {}
  ? ReSpread<
      {
        [K in PickOptionalKeys<T>]+?: ParseNullableRecursive<T[K]>;
      } &
        {
          [K in PickRequiredKeys<T>]-?: ParseNullableRecursive<T[K]>;
        }
    >
  : T;

/**
 * Fixes issues when inferring types using yup.\
 * Use this one instead of yup.
 *
 * **Why:**
 *
 * Currently object({ }) makes all properties required,\
 * which makes impossible to fix usage in places where we define those objects with optional keys
 *
 *
 * **Usage:**
 * ```
 * export const postRetrySyncSchema = object({
 *  syncStatusId: string().required(),
 * }).required();
 *
 * export type PostRetrySyncSchemaType = VInferType<typeof postRetrySyncSchema>;
 * ```
 *
 * **Notes:**
 * @TODO Point all references to this type instead of `import { InferType } from "yup";`\
 * To be done in a separate PR
 * @TODO Remove this file if the original yup InferType fixes the optional keys issue
 *
 * Follow-up: https://github.com/jquense/yup/issues/1274
 */
export type InferType<T extends TypedSchema> = ParseNullableRecursive<
  yupInferType<T>
>;
