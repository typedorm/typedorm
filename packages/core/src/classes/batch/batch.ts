export abstract class Batch {
  constructor() {}

  abstract add(item: any): this;
}
