export class TransactionCancelledException extends Error {
  name = 'TransactionCancelledException';
  code: string;
  cancellationReasons: {code: string; message: string}[];

  constructor(
    code: string,
    cancellationReasons: TransactionCancelledException['cancellationReasons']
  ) {
    super();
    this.message =
      'Transaction request failed with one or more cancellation reasons.';
    this.code = code;
    this.cancellationReasons = cancellationReasons;
  }
}
