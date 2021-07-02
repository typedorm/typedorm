import {Transform} from 'class-transformer';
import {HeadType} from '../helpers/head-type';

/**
 * Simple @Transform wrapper to run when transforming items for to insert into DynamoDB
 * @param transformFn Transform function to run, this is passed to class-transformer without any modifications
 *
 * @see https://github.com/typestack/class-transformer#basic-usage for usage examples
 */
export const TransformToDynamo = (
  transformFn: HeadType<Parameters<typeof Transform>>
) => {
  return Transform(transformFn, {
    // run only for when transforming class instance to object literal
    toPlainOnly: true,
  });
};
