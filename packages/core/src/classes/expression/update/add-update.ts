import {UPDATE_KEYWORD} from '@typedorm/common';
import {BaseUpdateExpressionInput} from '../base-update-expression-input';

export class AddUpdate extends BaseUpdateExpressionInput {
  prefix = UPDATE_KEYWORD.ADD;
}
