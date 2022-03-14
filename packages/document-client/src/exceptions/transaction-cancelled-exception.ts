import {DocumentClientTypes} from '@typedorm/document-client';
export class TransactionCancelledException extends Error {
  name = 'TransactionCancelledException';
  code: string;
  cancellationReasons: {
    code?: string;
    message?: string;
    item?: DocumentClientTypes.AttributeMap;
  }[];

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
