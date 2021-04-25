export class WriteTransactionCancelledException extends Error {
  name = 'WriteTransactionCancelledException';
  code: string;
  cancellationReasons: {code: string; message: string}[];

  constructor(
    code: string,
    cancellationReasons: WriteTransactionCancelledException['cancellationReasons']
  ) {
    super();
    this.message =
      'Write Transaction request failed with one or more cancellation reasons.';
    this.code = code;
    this.cancellationReasons = cancellationReasons;
  }
}
