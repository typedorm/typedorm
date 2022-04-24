import KSUID from 'ksuid';
import {
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
  UnknownAttributeValueGenerationStrategyError,
} from '@typedorm/common';
import {v4} from 'uuid';

export function autoGenerateValue(strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY) {
  switch (strategy) {
    case AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4: {
      return v4();
    }
    case AUTO_GENERATE_ATTRIBUTE_STRATEGY.KSUID: {
      return KSUID.randomSync(new Date()).string;
    }
    case AUTO_GENERATE_ATTRIBUTE_STRATEGY.ISO_DATE: {
      return new Date().toISOString();
    }
    case AUTO_GENERATE_ATTRIBUTE_STRATEGY.EPOCH_DATE: {
      return Math.ceil(new Date().valueOf() / 1000);
    }
    default: {
      throw new UnknownAttributeValueGenerationStrategyError(strategy);
    }
  }
}
