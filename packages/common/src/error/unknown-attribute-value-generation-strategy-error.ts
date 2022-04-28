import {AUTO_GENERATE_ATTRIBUTE_STRATEGY} from '../enums';

export class UnknownAttributeValueGenerationStrategyError extends Error {
  name = 'UnknownAttributeValueGenerationStrategyError';

  constructor(strategy: string) {
    super();
    this.message = `Unknown attribute value generation strategy provided: "${strategy}".
    Valid attribute value generation strategies are: ${Object.keys(
      AUTO_GENERATE_ATTRIBUTE_STRATEGY
    )
      .map(key => `"${key}"`)
      .join(', ')}`;
  }
}
