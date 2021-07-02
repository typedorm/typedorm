import {Transform} from 'class-transformer';
import {HeadType} from '../helpers/head-type';

/**
 * Simple @Transform Wrapper to only run when transforming items from DynamoDB
 * @param transformFn Transform function to run, this is passed to class-transformer without any modifications
 *
 * @see https://github.com/typestack/class-transformer#basic-usage for usage examples
 */
export const TransformFromDynamo = (
  transformFn: HeadType<Parameters<typeof Transform>>
) => {
  return Transform(transformFn, {
    // run only for when transforming object literals to class type
    toClassOnly: true,
  });
};
