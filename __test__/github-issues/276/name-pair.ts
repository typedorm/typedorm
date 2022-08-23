import {ITransformable} from '@typedorm/common';

export class NamePair implements ITransformable {
  firstName: string;
  lastName: string;

  constructor(firstName: string, lastName: string) {
    this.firstName = firstName;
    this.lastName = lastName;
  }

  static fromDynamoDB(value: string): NamePair {
    const id = value.split('/');
    return new this(id[0], id[1]);
  }

  toDynamoDB(): string {
    return `${this.firstName}/${this.lastName}`;
  }
}
