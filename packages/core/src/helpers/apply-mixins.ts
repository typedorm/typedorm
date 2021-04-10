export function applyMixins(derivedConstructor: any, baseConstructors: any[]) {
  baseConstructors.forEach(baseConstructor => {
    const baseProperties = Object.getOwnPropertyNames(
      baseConstructor.prototype
    );

    baseProperties.forEach(name => {
      const descriptor = Object.getOwnPropertyDescriptor(
        baseConstructor.prototype,
        name
      )!;
      Object.defineProperty(derivedConstructor.prototype, name, descriptor);
    });
  });
}
