export abstract class Batch<T> {
  protected _items: T[];
  constructor() {
    this._items = [];
  }

  abstract add(item: any): this;

  get items() {
    return this._items;
  }
}
