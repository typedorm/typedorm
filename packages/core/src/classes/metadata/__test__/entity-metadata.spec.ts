import {Attribute, Entity, INDEX_TYPE, Table} from '@typedorm/common';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {Connection} from '../../connection/connection';
import {AttributeMetadata} from '../attribute-metadata';
import {EntityMetadata} from '../entity-metadata';

let connection: Connection;
const table = new Table({
  name: 'global',
  partitionKey: 'PK',
});
@Entity({
  name: 'User',
  primaryKey: {
    partitionKey: 'USER#{{id}}',
  },
  table,
})
class UserEntity {
  @Attribute()
  id: string;
}

beforeEach(() => {
  connection = createTestConnection({
    entities: [UserEntity],
  });
});

afterEach(() => {
  resetTestConnection();
});

test('create entity metadata for per entity table', () => {
  const userEntityMetadata = new EntityMetadata({
    connection,
    table,
    name: 'user',
    primaryKey: {
      partitionKey: 'USER#{{id}}',
    },
    target: UserEntity,
    attributes: [
      new AttributeMetadata({
        name: 'id',
        type: 'String',
        table,
        entityClass: UserEntity,
      }),
    ],
  });

  expect(userEntityMetadata.schema).toEqual({
    indexes: {},
    primaryKey: {
      attributes: {
        PK: 'USER#{{id}}',
      },
      metadata: {
        _interpolations: {
          PK: ['id'],
        },
      },
    },
  });
});

test('creates entity metadata with complex composite and indexes key', () => {
  const complexTable = new Table({
    name: 'Table',
    partitionKey: 'PK',
    sortKey: 'SK',
    indexes: {
      GSI1: {
        partitionKey: 'GSI1PK',
        sortKey: 'GSI1SK',
        type: INDEX_TYPE.GSI,
      },
      LSI1: {
        sortKey: 'LSI1SK',
        type: INDEX_TYPE.LSI,
      },
    },
  });

  class ComplexUserEntity {}

  const complexEntityMetadata = new EntityMetadata({
    connection,
    table: complexTable,
    name: 'user',
    primaryKey: {
      partitionKey: 'USER#{{id}}',
      sortKey: 'USER#{{id}}',
    },
    indexes: {
      GSI1: {
        partitionKey: 'USER#{{id}}#NAME#{{name}}',
        sortKey: 'Name#{{name}}',
        type: INDEX_TYPE.GSI,
      },
      LSI1: {
        sortKey: 'AGE#{{age}}',
        type: INDEX_TYPE.LSI,
      },
    },
    target: ComplexUserEntity,
    attributes: [
      new AttributeMetadata({
        name: 'id',
        type: 'String',
        table: complexTable,
        entityClass: ComplexUserEntity,
      }),
      new AttributeMetadata({
        name: 'name',
        type: 'String',
        table: complexTable,
        entityClass: ComplexUserEntity,
      }),
      new AttributeMetadata({
        name: 'age',
        type: 'String',
        table: complexTable,
        entityClass: ComplexUserEntity,
      }),
    ],
  });

  expect(complexEntityMetadata.schema).toEqual({
    indexes: {
      GSI1: {
        attributes: {
          GSI1PK: 'USER#{{id}}#NAME#{{name}}',
          GSI1SK: 'Name#{{name}}',
        },
        metadata: {
          isSparse: false,
          _interpolations: {
            GSI1PK: ['id', 'name'],
            GSI1SK: ['name'],
          },
          _name: 'GSI1',
          type: 'GLOBAL_SECONDARY_INDEX',
        },
      },
      LSI1: {
        attributes: {
          LSI1SK: 'AGE#{{age}}',
        },
        metadata: {
          isSparse: false,
          _interpolations: {
            LSI1SK: ['age'],
          },
          _name: 'LSI1',
          type: 'LOCAL_SECONDARY_INDEX',
        },
      },
    },
    primaryKey: {
      attributes: {
        PK: 'USER#{{id}}',
        SK: 'USER#{{id}}',
      },
      metadata: {
        _interpolations: {
          PK: ['id'],
          SK: ['id'],
        },
      },
    },
  });
});
