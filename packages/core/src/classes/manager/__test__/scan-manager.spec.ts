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
test('scans table with simple options', async () => {
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

test('scans table with parallel scan options', async () => {
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
    limitPerSegment: 1000,
    segment: 0,
    totalSegments: 2,
    limit: 2000,
  });

  expect(dcMock.scan).toHaveBeenCalledTimes(1);
  expect(dcMock.scan).toHaveBeenCalledWith({
    Limit: 1000,
    TableName: 'test-table',
    Segment: 0,
    TotalSegments: 2,
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
 * @group parallelScan
 */
test('runs parallel scan requests for each segment', async () => {
  const callIndex = {
    0: 0,
    1: 1,
  };
  dcMock.scan.mockImplementation(({Segment}: {Segment: 0 | 1}) => {
    callIndex[Segment] = callIndex[Segment] + 1;
    return {
      promise: () => ({
        Items: new Array(10).fill({
          id: Segment,
          __en: 'user',
        }),
        LastEvaluatedKey: {
          PK: callIndex[Segment],
        },
      }),
    };
  });

  const response = await manager.parallelScan({
    totalSegments: 2,
    limitPerSegment: 10,
    limit: 20,
  });

  // Here, we are still making extra one request even tho we managed to get 20 items from the
  // first requests on each segment, this is not 100% ideal but the only way possible to handle
  // parallel requests, as we do not upfront know, what request will have how many items.
  // However, we did manage to kill of further request from second segment
  expect(dcMock.scan).toHaveBeenCalledTimes(3);
  expect(response.cursor).toEqual({
    '0': {
      PK: 1,
    },
    '1': {
      PK: 2,
    },
  });
  expect(response.items?.length).toEqual(20);
  expect(dcMock.scan.mock.calls).toEqual([
    [
      {
        Limit: 10,
        Segment: 0,
        TableName: 'test-table',
        TotalSegments: 2,
      },
    ],
    [
      {
        Limit: 10,
        Segment: 1,
        TableName: 'test-table',
        TotalSegments: 2,
      },
    ],
    [
      {
        // request was rerun for that segment with pk
        ExclusiveStartKey: {PK: 1},
        Limit: 10,
        Segment: 0,
        TableName: 'test-table',
        TotalSegments: 2,
      },
    ],
  ]);
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
