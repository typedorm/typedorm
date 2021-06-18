export interface InvalidType<ErrorMessageT extends any[] | any> {
  /**
   * There should never be a value of this type
   */
  readonly message: ErrorMessageT;
  readonly __compileError: never;
}
