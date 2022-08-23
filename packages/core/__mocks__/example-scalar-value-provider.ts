import {ITransformable} from '@typedorm/common';

export class ExampleScalarValueProvider implements ITransformable {
  constructor(private value: number) {}
  toDynamoDB(): string {
    return 'DEMO#' + this.value;
  }
}
