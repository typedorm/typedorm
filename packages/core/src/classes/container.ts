type Parameters<T> = T extends (...args: infer K) => any ? K : never;

export class Container {
  private static _instance: Container;
  private modules: Map<Function, any>;
  private constructor() {
    this.modules = new Map<Function, any>();
  }

  static get<T>(anyClass: new (...args: any) => T, ...args: Parameters<T>): T {
    if (!this._instance) {
      this._instance = new Container();
    }

    const modules = this._instance.modules;

    if (!modules.has(anyClass)) {
      modules.set(anyClass, new anyClass(...args));
    }

    return modules.get(anyClass);
  }
}
