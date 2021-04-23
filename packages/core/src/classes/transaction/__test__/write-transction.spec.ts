import {User} from '@typedorm/core/__mocks__/user';
import {WriteTransaction} from '../write-transaction';

test('create a write transaction', () => {
  const user = new User();
  user.name = 'user1';

  const writeTransaction = new WriteTransaction()
    .addCreateItem(user)
    .addUpdateItem(
      User,
      {
        id: 1,
      },
      {name: 'updated name'}
    )
    .addDeleteItem(User, {
      id: 11,
    });

  expect(writeTransaction.items).toEqual([
    {create: {item: user}},
    {
      update: {
        body: {name: 'updated name'},
        item: User,
        options: undefined,
        primaryKey: {id: 1},
      },
    },
    {delete: {item: User, primaryKey: {id: 11}}},
  ]);
});

test('create a write transaction form bulk input', () => {
  const user = new User();
  user.name = 'user1';

  const writeTransaction = new WriteTransaction().add([
    {
      create: {
        item: user,
      },
    },
    {
      delete: {
        item: User,
        primaryKey: {
          id: '1',
        },
      },
    },
    {
      update: {
        item: User,
        primaryKey: {
          id: '1',
        },
        body: {
          'user.name': 'new name',
        },
      },
    },
  ]);

  expect(writeTransaction.items).toEqual([
    {
      create: {
        item: user,
      },
    },
    {
      delete: {
        item: User,
        primaryKey: {
          id: '1',
        },
      },
    },
    {
      update: {
        body: {
          'user.name': 'new name',
        },
        item: User,
        primaryKey: {
          id: '1',
        },
      },
    },
  ]);
});
