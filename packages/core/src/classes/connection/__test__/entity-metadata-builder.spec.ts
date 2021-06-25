import {User} from '../../../../__mocks__/user';
import {UserSparseIndexes} from '../../../../__mocks__/user-sparse-indexes';
import {EntityMetadataBuilder} from '../entity-metadata-builder';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {
  Attribute,
  AutoGenerateAttribute,
  AUTO_GENERATE_ATTRIBUTE_STRATEGY,
  Entity,
  MissingRequiredTableConfig,
  Table,
} from '@typedorm/common';
import {table} from '../../../../__mocks__/table';
import {UserAttrAlias} from '@typedorm/core/__mocks__/user-with-attribute-alias';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('12-3-1-23-12'),
}));

abstract class BaseUser {
  @Attribute()
  id: string;

  @Attribute()
  name: string;
}

abstract class UserWithAccount extends BaseUser {
  @Attribute()
  username: string;

  @Attribute()
  password: string;
}

let metadataBuilder: EntityMetadataBuilder;
beforeEach(() => {
  const connection = createTestConnection({
    table,
    entities: [],
  });
  metadataBuilder = new EntityMetadataBuilder(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('builds simple entity metadata', () => {
  const [metadata] = metadataBuilder.build([User]);
  expect(metadata.schema).toEqual({
    indexes: {
      GSI1: {
        attributes: {
          GSI1PK: 'USER#STATUS#{{status}}',
          GSI1SK: 'USER#{{name}}',
        },
        metadata: {
          isSparse: false,
          _interpolations: {
            GSI1PK: ['status'],
            GSI1SK: ['name'],
          },
          _name: 'GSI1',
          type: 'GLOBAL_SECONDARY_INDEX',
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

test('builds entity metadata with aliased attributes', () => {
  const [metadata] = metadataBuilder.build([UserAttrAlias]);
  expect(metadata.schema).toEqual({
    indexes: {
      GSI1: {
        attributes: {
          GSI1PK: {
            alias: 'status',
          },
          GSI1SK: 'USER#{{name}}',
        },
        metadata: {
          _interpolations: {
            GSI1PK: ['status'],
            GSI1SK: ['name'],
          },
          _name: 'GSI1',
          isSparse: true,
          type: 'GLOBAL_SECONDARY_INDEX',
        },
      },
      LSI1: {
        attributes: {
          LSI1SK: {
            alias: 'age',
          },
        },
        metadata: {
          _interpolations: {
            LSI1SK: ['age'],
          },
          _name: 'LSI1',
          isSparse: true,
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

test('builds metadata for entity with sparse indexes', () => {
  const [metadata] = metadataBuilder.build([UserSparseIndexes]);
  expect(metadata.schema).toEqual({
    indexes: {
      GSI1: {
        attributes: {
          GSI1PK: 'USER_SPARSE_INDEXES#STATUS#{{status}}',
          GSI1SK: 'USER_SPARSE_INDEXES#{{name}}',
        },
        metadata: {
          isSparse: true,
          _interpolations: {
            GSI1PK: ['status'],
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
          _interpolations: {
            LSI1SK: ['age'],
          },
          _name: 'LSI1',
          isSparse: true,
          type: 'LOCAL_SECONDARY_INDEX',
        },
      },
    },
    primaryKey: {
      attributes: {
        PK: 'USER_SPARSE_INDEXES#{{id}}',
        SK: 'USER_SPARSE_INDEXES#{{id}}',
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

test('builds metadata of derived entity with multiple levels of inheritance', () => {
  @Entity({
    name: 'customer',
    primaryKey: {
      partitionKey: 'customer#1',
      sortKey: 'customer#1',
    },
  })
  class Customer extends UserWithAccount {
    @Attribute()
    email: string;
  }

  const [entityMetadata] = metadataBuilder.build([Customer]);
  expect(entityMetadata.attributes.map(obj => Object.assign({}, obj))).toEqual([
    {
      name: 'email',
      type: 'String',
      entityClass: Customer,
      table,
    },
    {
      name: 'password',
      type: 'String',
      entityClass: Customer,
      table,
    },
    {
      name: 'username',
      type: 'String',
      entityClass: Customer,
      table,
    },
    {
      name: 'name',
      type: 'String',
      entityClass: Customer,
      table,
    },
    {
      name: 'id',
      type: 'String',
      entityClass: Customer,
      table,
    },
  ]);
});

/**
 * Issue #138
 */
test('builds metadata of derived entity where derived entity does not have any explicit metadata defined', () => {
  abstract class BaseEntity {
    @Attribute()
    id: string;
  }

  @Entity({
    name: 'SubEntity',
    primaryKey: {
      partitionKey: 'SubEntity#{{id}}',
      sortKey: 'SubEntity#{{id}}',
    },
  })
  class SubEntity extends BaseEntity {
    // no attributes
  }

  const [entityMetadata] = metadataBuilder.build([SubEntity]);

  expect(entityMetadata.attributes).toEqual([
    {
      entityClass: SubEntity,
      name: 'id',
      table,
      type: 'String',
    },
  ]);
});

test('builds entity metadata with global table config', () => {
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

  const newConnection = createTestConnection({
    name: 'new-connection-0',
    table: globalTable,
    entities: [GlobalUserEntity],
  });

  const globalMetaBuilder = new EntityMetadataBuilder(newConnection);
  const [entityMetadata] = globalMetaBuilder.build([GlobalUserEntity]);

  expect(entityMetadata.schema).toEqual({
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

test('overrides property of base class if it is defined again on derived class with diff annotation', () => {
  @Entity({
    name: 'customer',
    primaryKey: {
      partitionKey: 'customer#1',
      sortKey: 'customer#1',
    },
  })
  class Customer extends UserWithAccount {
    @AutoGenerateAttribute({
      strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
    })
    username: string;
  }

  const [entityMetadata] = metadataBuilder.build([Customer]);
  expect(entityMetadata.attributes.map(obj => Object.assign({}, obj))).toEqual([
    {
      name: 'password',
      type: 'String',
      table,
      entityClass: Customer,
    },
    {
      name: 'username',
      type: 'String',
      autoUpdate: false,
      strategy: 'UUID4',
    },
    {
      name: 'name',
      type: 'String',
      table,
      entityClass: Customer,
    },
    {
      name: 'id',
      type: 'String',
      table,
      entityClass: Customer,
    },
  ]);
});

/**
 * Issue #60
 */
test('throws user friendly error when no table config is found for entity', () => {
  @Entity({
    name: 'no-table-entity',
    primaryKey: {
      partitionKey: 'id',
    },
  })
  class NoTableEntity {
    @Attribute()
    id: string;
  }

  const tempConnection = () =>
    createTestConnection({
      name: 'temp',
      entities: [NoTableEntity],
    });

  expect(tempConnection).toThrow(MissingRequiredTableConfig);
});
