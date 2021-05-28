import {table} from '@typedorm/core/__mocks__/table';
import {User} from '@typedorm/core/__mocks__/user';
import {UserAutoGenerateAttributes} from '@typedorm/core/__mocks__/user-auto-generate-attributes';
import {UserUniqueEmail} from '@typedorm/core/__mocks__/user-unique-email';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import {Connection} from '../../connection/connection';
import {ScanManager} from '../scan-manager';

let manager: ScanManager;
let connection: Connection;
const dcMock = {
  scan: jest.fn(),
};

beforeEach(() => {
  connection = createTestConnection({
    entities: [User, UserUniqueEmail, UserAutoGenerateAttributes],
    table,
    documentClient: dcMock,
  });

  manager = new ScanManager(connection);
});

afterEach(() => {
  resetTestConnection();
});

test('scan manager works', () => {
  expect(manager).toBeTruthy();
});

/**
 * @group scan
 */
test('scans table with given options', async () => {
  dcMock.scan.mockReturnValue({
    promise: () => ({
      Items: [
        {
          id: '1',
          PK: 'USER#1',
          __en: 'user',
        },
        {
          id: '2',
          PK: 'USER#1',
          __en: 'user',
        },
      ],
    }),
  });
  const response = await manager.scan({
    limit: 1000,
    scanIndex: 'GSI1',
  });

  expect(dcMock.scan).toHaveBeenCalledTimes(1);
  expect(dcMock.scan).toHaveBeenCalledWith({
    Limit: 1000,
    TableName: 'test-table',
  });
  expect(response).toEqual({
    items: [
      {
        id: '1',
      },
      {
        id: '2',
      },
    ],
  });
  expect(
    response.items?.forEach(item => {
      expect(item).toBeInstanceOf(User);
    })
  );
});

test('scans table with multiple requests', async () => {
  dcMock.scan
    .mockImplementationOnce(() => ({
      promise: () => ({
        Items: [
          {
            id: '1',
            __en: 'user',
          },
        ],
        LastEvaluatedKey: {
          PK: '1',
        },
      }),
    }))
    .mockImplementationOnce(() => ({
      promise: () => ({
        Items: [
          {
            id: '2',
            __en: 'user',
          },
        ],
      }),
    }));
  const response = await manager.scan({
    limit: 1000,
  });

  expect(dcMock.scan).toHaveBeenCalledTimes(2);
  expect(dcMock.scan.mock.calls).toEqual([
    [
      {
        Limit: 1000,
        TableName: 'test-table',
      },
    ],
    [
      {
        ExclusiveStartKey: {
          PK: '1',
        },
        Limit: 1000,
        TableName: 'test-table',
      },
    ],
  ]);
  expect(response).toEqual({
    items: [
      {
        id: '1',
      },
      {
        id: '2',
      },
    ],
  });
});

test('scans table with given options and returns deserialized and unknown items', async () => {
  dcMock.scan.mockReturnValue({
    promise: () => ({
      Items: [
        {
          id: '1',
          PK: 'USER#1',
          __en: 'user',
        },
        {
          id: '2',
          data: '0x0000',
        },
      ],
    }),
  });
  const response = await manager.scan({
    limit: 1000,
    scanIndex: 'GSI1',
  });

  expect(dcMock.scan).toHaveBeenCalledTimes(1);
  expect(dcMock.scan).toHaveBeenCalledWith({
    Limit: 1000,
    TableName: 'test-table',
  });
  expect(response).toEqual({
    items: [
      {
        id: '1',
      },
    ],
    unknownItems: [
      {
        id: '2',
        data: '0x0000',
      },
    ],
  });

  response.items?.forEach(item => {
    expect(item).toBeInstanceOf(User);
  });
  response.unknownItems?.forEach(item => {
    expect(item).not.toBeInstanceOf(User);
  });
});

/**
 * @group find
 */
test('finds items from table with over the scan api', async () => {
  dcMock.scan.mockReturnValue({
    promise: () => ({
      Items: [
        {
          id: '1',
          PK: 'USER#1',
          __en: 'user',
        },
        {
          id: '2',
          PK: 'USER#1',
          __en: 'user',
        },
      ],
    }),
  });
  const response = await manager.find(User);

  expect(dcMock.scan).toHaveBeenCalledTimes(1);
  expect(dcMock.scan).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#FE___en': '__en',
    },
    ExpressionAttributeValues: {
      ':FE___en': 'user',
    },
    FilterExpression: '#FE___en = :FE___en',
    TableName: 'test-table',
  });
  expect(response).toEqual({
    items: [
      {
        id: '1',
      },
      {
        id: '2',
      },
    ],
  });
});

test('finds items from table with over the scan api with given options', async () => {
  dcMock.scan.mockReturnValue({
    promise: () => ({
      Items: [
        {
          id: '1',
          PK: 'USER#1',
          __en: 'user',
        },
        {
          id: '2',
          PK: 'USER#1',
          __en: 'user',
        },
      ],
    }),
  });
  const response = await manager.find(User, {
    where: {
      age: {
        GE: 1,
      },
    },
  });

  expect(dcMock.scan).toHaveBeenCalledTimes(1);
  expect(dcMock.scan).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#FE___en': '__en',
      '#FE_age': 'age',
    },
    ExpressionAttributeValues: {
      ':FE___en': 'user',
      ':FE_age': 1,
    },
    FilterExpression: '(#FE___en = :FE___en) AND (#FE_age >= :FE_age)',
    TableName: 'test-table',
  });
  expect(response).toEqual({
    items: [
      {
        id: '1',
      },
      {
        id: '2',
      },
    ],
  });
});

/**
 * @group count
 */
test('counts all entity items in the table', async () => {
  dcMock.scan.mockReturnValue({
    promise: () => ({
      Count: 7,
    }),
  });
  const response = await manager.count(User, {
    where: {
      name: {
        CONTAINS: 'LAL',
      },
    },
  });

  expect(dcMock.scan).toHaveBeenCalledTimes(1);
  expect(dcMock.scan).toHaveBeenCalledWith({
    ExpressionAttributeNames: {
      '#FE___en': '__en',
      '#FE_name': 'name',
    },
    ExpressionAttributeValues: {
      ':FE___en': 'user',
      ':FE_name': 'LAL',
    },
    FilterExpression:
      '(#FE___en = :FE___en) AND (contains(#FE_name, :FE_name))',
    Select: 'COUNT',
    TableName: 'test-table',
  });
  expect(response).toEqual(7);
});

test('counts all entity items recursively with multiple requests', async () => {
  dcMock.scan
    .mockReturnValueOnce({
      promise: () => ({
        Count: 7,
        LastEvaluatedKey: {
          PK: 'USER#8',
        },
      }),
    })
    .mockReturnValueOnce({
      promise: () => ({
        Count: 100,
        LastEvaluatedKey: {
          PK: 'USER#100',
        },
      }),
    })
    .mockReturnValueOnce({
      promise: () => ({
        Count: 8,
      }),
    });

  const response = await manager.count(User);

  expect(dcMock.scan).toHaveBeenCalledTimes(3);
  expect(dcMock.scan.mock.calls).toEqual([
    [
      {
        ExpressionAttributeNames: {
          '#FE___en': '__en',
        },
        ExpressionAttributeValues: {
          ':FE___en': 'user',
        },
        FilterExpression: '#FE___en = :FE___en',
        Select: 'COUNT',
        TableName: 'test-table',
      },
    ],
    [
      {
        ExclusiveStartKey: {
          PK: 'USER#8',
        },
        ExpressionAttributeNames: {
          '#FE___en': '__en',
        },
        ExpressionAttributeValues: {
          ':FE___en': 'user',
        },
        FilterExpression: '#FE___en = :FE___en',
        Select: 'COUNT',
        TableName: 'test-table',
      },
    ],
    [
      {
        ExclusiveStartKey: {
          PK: 'USER#100',
        },
        ExpressionAttributeNames: {
          '#FE___en': '__en',
        },
        ExpressionAttributeValues: {
          ':FE___en': 'user',
        },
        FilterExpression: '#FE___en = :FE___en',
        Select: 'COUNT',
        TableName: 'test-table',
      },
    ],
  ]);
  expect(response).toEqual(115);
});
