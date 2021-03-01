import {
  Organisation,
  OrganisationPrimaryKey,
} from '@typedorm/core/__mocks__/organisation';
import {User, UserPrimaryKey} from '@typedorm/core/__mocks__/user';
import {ReadBatch} from '../batch/read-batch';

test('creates a read batch', () => {
  const readBatch = new ReadBatch()
    .addGet<User, UserPrimaryKey>(User, {
      id: '1',
    })
    .addGet<User, UserPrimaryKey>(User, {
      id: '2',
    })
    .addGet<Organisation, OrganisationPrimaryKey>(Organisation, {
      id: 'ORG_1',
    });

  expect(readBatch.items).toEqual([
    {
      item: User,

      primaryKey: {
        id: '1',
      },
    },
    {
      item: User,

      primaryKey: {
        id: '2',
      },
    },
    {
      item: Organisation,

      primaryKey: {
        id: 'ORG_1',
      },
    },
  ]);
});

test('creates a batch from bulk input', () => {
  const readBatch = new ReadBatch().add([
    {
      item: User,
      primaryKey: {
        id: '1',
      },
    },
    {
      item: Organisation,
      primaryKey: {
        id: '1',
      },
    },
  ]);

  expect(readBatch.items).toEqual([
    {
      item: User,
      primaryKey: {
        id: '1',
      },
    },
    {
      item: Organisation,
      primaryKey: {
        id: '1',
      },
    },
  ]);
});
