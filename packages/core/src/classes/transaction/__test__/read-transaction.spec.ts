import {User} from '@typedorm/core/__mocks__/user';
import {ReadTransaction} from '../read-transaction';

test('creates a read transaction', () => {
  const readTransaction = new ReadTransaction()
    .addGetItem(User, {
      id: 1,
    })
    .addGetItem(User, {
      id: 2,
    });

  expect(readTransaction.items).toEqual([
    {
      get: {
        item: User,
        primaryKey: {
          id: 1,
        },
      },
    },
    {
      get: {
        item: User,
        primaryKey: {
          id: 2,
        },
      },
    },
  ]);
});

test('creates a read transaction from bulk input', () => {
  const readTransaction = new ReadTransaction().add([
    {
      get: {
        item: User,
        primaryKey: {id: 1},
      },
    },
    {
      get: {
        item: User,
        primaryKey: {id: 2},
      },
    },
  ]);

  expect(readTransaction.items).toEqual([
    {
      get: {
        item: User,
        primaryKey: {
          id: 1,
        },
      },
    },
    {
      get: {
        item: User,
        primaryKey: {
          id: 2,
        },
      },
    },
  ]);
});
