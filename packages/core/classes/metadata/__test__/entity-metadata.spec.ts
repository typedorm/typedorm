import {Attribute} from '@typedorm/common/decorators/attribute.decorator';
import {Entity} from '@typedorm/common/decorators/entity.decorator';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {Connection} from '../../connection/connection';
import {AttributeMetadata} from '../attribute-metadata';
import {EntityMetadata} from '../entity-metadata';
import {MetadataManager} from '@typedorm/common/metadata-manager';
import {Table} from '@typedorm/common/table';
import {INDEX_TYPE} from '@typedorm/common';

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
        connection,
        name: 'id',
        type: 'String',
      }),
    ],
  });

  expect(userEntityMetadata.schema).toEqual({
    indexes: {},
    primaryKey: {
      PK: 'USER#{{id}}',
      _interpolations: {
        PK: ['id'],
      },
    },
  });
});

test('creates entity metadata with global table config', () => {
  const globalTable = new Table({
    name: 'GlobalTable',
    partitionKey: 'PK',
  });
  @Entity({
    name: 'User',
    primaryKey: {
      partitionKey: 'USER#{{id}}',
    },
  })
  class GlobalUserEntity {
    @Attribute()
    id: string;
  }

  connection = createTestConnection({
    name: 'new-connection-0',
    table: globalTable,
    entities: [GlobalUserEntity],
  });

  const userEntityMetadata = new EntityMetadata({
    connection,
    name: 'user',
    primaryKey: {
      partitionKey: 'USER#{{id}}',
    },
    target: GlobalUserEntity,
    attributes: [
      new AttributeMetadata({
        connection,
        name: 'id',
        type: 'String',
      }),
    ],
  });

  expect(userEntityMetadata.schema).toEqual({
    indexes: {},
    primaryKey: {
      PK: 'USER#{{id}}',
      _interpolations: {
        PK: ['id'],
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
        connection,
        name: 'id',
        type: 'String',
      }),
      new AttributeMetadata({
        connection,
        name: 'name',
        type: 'String',
      }),
      new AttributeMetadata({
        connection,
        name: 'age',
        type: 'String',
      }),
    ],
  });

  expect(complexEntityMetadata.schema).toEqual({
    indexes: {
      GSI1: {
        GSI1PK: 'USER#{{id}}#NAME#{{name}}',
        GSI1SK: 'Name#{{name}}',
        _interpolations: {
          GSI1PK: ['id', 'name'],
          GSI1SK: ['name'],
        },
        _name: 'GSI1',
        type: 'GLOBAL_SECONDARY_INDEX',
      },
      LSI1: {
        LSI1SK: 'AGE#{{age}}',
        _interpolations: {
          LSI1SK: ['age'],
        },
        _name: 'LSI1',
        type: 'LOCAL_SECONDARY_INDEX',
      },
    },
    primaryKey: {
      PK: 'USER#{{id}}',
      SK: 'USER#{{id}}',
      _interpolations: {
        PK: ['id'],
        SK: ['id'],
      },
    },
  });
});
