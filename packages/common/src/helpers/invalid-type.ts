// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface InvalidType<ErrorMessageT extends any[] | any> {
  /**
   * There should never be a value of this type
   */
  readonly __compileError: never;
}
