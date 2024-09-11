# TypeDORM public API

This section contains information on all the public apis that are available within TypeDORM, this is likely to change to a live generated documentation, but until that is done, this can be used as a starting point.

_Note: In an event of inconstancy between actual API and this document, API should looked as the source of truth, and also if possible, file an issue in this repository or submit a PR._

- [TypeDORM public API](#typedorm-public-api)
  - [Connection](#connection)
  - [Table](#table)
  - [Entity](#entity)
  - [Attribute](#attribute)
  - [AutoGenerateAttribute](#autogenerateattribute)
  - [EntityManager](#entitymanager)
    - [EntityManager.create](#entitymanagercreate)
    - [EntityManager.findOne](#entitymanagerfindone)
    - [EntityManager.exists](#entitymanagerexists)
    - [EntityManager.update](#entitymanagerupdate)
    - [EntityManager.delete](#entitymanagerdelete)
    - [EntityManager.find](#entitymanagerfind)
    - [EntityManager.count](#entitymanagercount)
  - [BatchManager](#batchmanager)
    - [BatchManager.write](#batchmanagerwrite)
    - [BatchManager.read](#batchmanagerread)
  - [TransactionManager](#transactionmanager)
    - [TransactionManager.write](#transactionmanagerwrite)
    - [TransactionManager.read](#transactionmanagerread)
  - [ScanManager](#scanmanager)
    - [ScanManager.find](#scanmanagerfind)
    - [ScanManager.count](#scanmanagercount)
    - [ScanManager.parallelScan](#scanmanagerparallelscan)
    - [ScanManager.scan](#scanmanagerscan)

## Connection

Defines connection container which will be the store all build metadatas and current operations.

```Typescript
createConnection({
  // Name of the connection, there cannot be multiple connections with same name
  // @default 'default'
  name

  // Global table to be used with table
  // @default none, if global table and entity specific table is defined, entity specific table will be used instead
  table

  // List of or path to entities
  entities

  // Max number of items to fetch when running a query
  // @default 3000
  dynamoQueryItemsImplicitLimit

  // Document client to register for current connection
  // When using AWS SDK V2 - This needs to be a valid DocumentClient instance from AWS SDK V2
  // When using AWS SDK V3 - This needs to be a valid DocumentClient instance from AWS SDK V3
  // @default new document client will be auto instantiated
  documentClient
})
```

_Note_: this does not actually create any table on cloud, it is purely for isolating all entities/operations from other connections.

## Table

Declares table to be used to store entity, can be per entity based on single table per connection.

```Typescript
Table({
  // Name of the table, must match exactly to what is provisioned on aws
  name

  // Partition key of table
  partitionKey // identifier of partition key

  // Sort key of table
  // @optional
  sortKey

  // Indexes if there are any
  indexes: {
    [indexName] : {
      partitionKey
      sortKey
      // Type of index: INDEX_TYPE
      type
    }
  }
})
```

_Note: ATM This does not actually provision any dynamodb table in aws, but it is on the road map, until that is implemented use cloudformation or similar infrastructure as code tools to provision actual dynamodb tables._

## Entity

Declare an entity to be registered in TypeDORM domain

```Typescript
@Entity({
  // Name of the entity that will be saved as __en attribute on each record
  name,

  // Table where the entity be saved
  // @optional
  // Required when no global table exits in connection
  table

  // primary key of entity, must adhere to table primary key
  primaryKey: {
    partitionKey
    // @optional
    // Required if table uses composite primary key
    sortKey
  }

  // Additional indexes to add to entity
  // @optional
  indexes: {
    // Each index specified here can only exist if it is also declared on attached table instance
    [indexName] : {
      // Partition key attribute pattern or alias schema for this entity
      // @optional
      // Required when index type is GSI
      partitionKey

      // Sort key attribute pattern or alias schema for this entity
      sortKey

      // Type of index: INDEX_TYPE
      type

      // Defines if the current index should be considered sparse
      // @default true - all indexes are marked sparse by default
      isSparse
    }
  }
})
```

## Attribute

Declare Attribute on an entity

```Typescript
@Attribute({

  // @optional
  // Can either be of type boolean or with primary key
  // When primary key is set to unique attribute, it can only reference it self
  // i.e `USER#{{email}}` on unique attribute named `email` is considered valid but not on `id`
  unique

  // @optional
  // Required when attribute type is enum and referenced in key schema
  isEnum

  // @optional
  // Define default value for current attribute
  default

  // @optional
  // Hides property from returned responses
  hidden
})
```

## AutoGenerateAttribute

Declare Auto generated attribute on an entity

```Typescript
@AutoGenerateAttribute({

  // Strategy to use when auto generating attribute
  // Valid values are of enum `AUTO_GENERATE_ATTRIBUTE_STRATEGY`
  strategy

  // @optional
  // When true, attribute will be auto updated on write request with specified strategy
  // Useful for defining attributes like `updatedAt`
  autoUpdate

  // @optional
  // Hides property from returned responses
  hidden
})
```

## EntityManager

To Manage entity with ease.

### EntityManager.create

Create entity with given params.

```Typescript
create(
  // Entity to put into db
  // Item will be created to table configured on @Entity or Connection
  entity

  // @optional;
  // Additional options
  options: {
    // @optional
    // condition based creates
    // when present, it must evaluate to true in order for operation to succeed.
    where
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

### EntityManager.findOne

Finds single item matching given primary key or returns undefined

```Typescript
findOne(
  // Entity class to resolve schema against
  entityClass

  // All attributes referenced in primary key
  primaryKeyAttributes

  // @optional
  // Get item options
  options: {
    // @optional
    // Specify attributes to get, only selected attributes are fetched
    // @default `ALL`
    select

    // @optional
    // Perform a consistent read on the table, consumes twice as much RCUs then normal
    // @default false
    consistentRead
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

### EntityManager.exists

Checks existence of item

```Typescript
exists(
  // Entity class to resolve schema against
  entityClass

  // Primary key attributes or unique attributes referenced in schemas
  attributes,

  // @optional
  options: {
    // @optional
    // Perform a consistent read on the table, consumes twice as much RCUs then normal
    // @default false
    consistentRead
  }

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

### EntityManager.update

Updates items and related items over document client's update API.

Some additional features that TypeDORM provides on top of Document Client's update api features:

- supports updating attributes that are referenced in primary key over transaction write API
- supports updating attributes that are marked as unique, again using document client's transaction write API
- handles updating all auto update attributes at the update time

_Notes: Primary key attributes and non-primary key attributes can not be updated in same request._

```Typescript
update(
  // Entity class to resolve schema against
  entityClass

  // Primary key attributes referenced in schemas
  primaryKeyAttributes

  // Attributes to update, if doesn't already exist,it will be created
  body

  // @optional;
  // Additional options
  options: {
    // @optional
    // Nested key separator to use, (i.e when updating user:{name},
    // body can include 'user$name' set to new value)
    // @default it '.'
    nestedKeySeparator

    // @optional
    // condition based updates
    // when present, it must evaluate to true in order for operation to succeed.
    where
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }

)
```

### EntityManager.delete

Delete item by key

```Typescript
delete(
  // Entity class to resolve schema against
  entityClass

  // Primary key attributes or unique attributes referenced in schemas
  primaryKeyAttributes

  // @optional;
  // Additional options
  options: {
    // @optional
    // condition based creates
    // when present, it must evaluate to true in order for operation to succeed.
    where
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

### EntityManager.find

Query items from db

```Typescript
find(
  // Entity class to resolve schema against
  entityClass

  // all attributes referenced in partition key
  partitionKeyAttributes

  // @optional
  // Entity manager query options
  // @default none - if non specified, query will be made using only partition key
  queryOptions: {
    // @optional
    // Name of the index if querying against GSI/LSI
    // @default - query will be run against main table
    queryIndex

    // @optional
    // Cursor to start querying from
    // @default - none
    cursor

    // Key condition to use when querying items
    // i.e this could be `{BEGINS_WITH: 'ORDER#'}`
    keyCondition

    // @optional
    // Total number of items to return
    // @default max limit configured in connection
    limit

    // @optional
    // Order in which to perform query
    // @default ASC
    orderBy

    // @optional
    // Filter returned items
    // Any conditions listed here will apply after items have been read from dynamodb and
    // therefore this should be avoided wherever possible, but can be helpful in some cases
    // see this https://www.alexdebrie.com/posts/dynamodb-filter-expressions/ for more details
    where

    // @optional
    // Specify attributes to get, only selected attributes are fetched
    // @default `ALL`
    select

    // @optional
    // Perform a consistent read on the table, consumes twice as much RCUs then normal
    // @default false
    consistentRead
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }

  // @optional
  // Additional limits for query to prevent full partition scanning
  // By default, `limit` refers to the desired number of items to return NOT number of items to search.
  // This can lead to full partition scan if limit is set to higher number than number of items matching
  // the search criteria or if the query is not selective enough and desired items are deep into the partition.
  metaLimitOptions:  {
    // Supports: 'capacityConsumed' or 'scannedCount'
    metaLimitType

    // The threshold to apply on meta limit type
    metaLimit
  }
)
```

### EntityManager.count

Counts items from db using over document client query items op

```Typescript
count(
  // Entity class to resolve schema against
  entityClass

  // all attributes referenced in partition key
  partitionKeyAttributes

  // @optional
  // Entity manager count options
  // @default none - if non specified, items will be queried using only partition key
  queryOptions: {

    // @optional
    // Name of the index if querying against GSI/LSI
    // @default - query will be run against main table
    queryIndex

    // Key condition to use when querying items
    // i.e this could be `{BEGINS_WITH: 'ORDER#'}`
    keyCondition

    // @optional
    // Filter returned items
    // Any conditions listed here will apply after items have been read from dynamodb and
    // therefore this should be avoided wherever possible, but can be helpful in some cases
    // see this https://www.alexdebrie.com/posts/dynamodb-filter-expressions/ for more details
    where

    // @optional
    // Perform a consistent read on the table, consumes twice as much RCUs then normal
    // @default false
    consistentRead
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

## BatchManager

Batch manager api. Simplify batch requests using easy to use interface

### BatchManager.write

Writes entities to dynamodb using document client batch manager api with
exponential backoff between retries.

```Typescript
write(
  // Write request input
  writeInput

  // @optional
  // batch write options
  options: {
    // @optional
    // Max number of retries to perform before returning to client
    // @default `BATCH_WRITE_MAX_ALLOWED_ATTEMPTS`
    maxRetryAttempts

    // @optional
    // Max number of requests to run in parallel
    // @default `BATCH_WRITE_CONCURRENCY_LIMIT`
    requestsConcurrencyLimit

    // @optional
    // Exponential backoff multiplication factor to apply on back off algorithm
    // Used to increase wait times between retries
    // @default `1`
    backoffMultiplicationFactor
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

### BatchManager.read

Reads entities from dynamodb using document client batch manager api with
exponential backoff between retries.

```Typescript
read(
  // read request input
  readInput

  // batch read options
  options?: {
    // @optional
    // Max number of retries to perform before returning to client
    // @default `BATCH_WRITE_MAX_ALLOWED_ATTEMPTS`
    maxRetryAttempts

    // @optional
    // Max number of requests to run in parallel
    // @default `BATCH_WRITE_CONCURRENCY_LIMIT`
    requestsConcurrencyLimit

    // @optional
    // Exponential backoff multiplication factor to apply on back off algorithm
    // Used to increase wait times between retries
    // @default `1`
    backoffMultiplicationFactor
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)

```

## TransactionManager

Transaction manager api.

### TransactionManager.write

Writes entities to dynamodb over document client transaction api.

```Typescript
write(
  // Write request input
  // Must be an instance of `WriteTransaction` class
  transaction,

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

### TransactionManager.read

Reads entities to from dynamodb over document client transaction api.

```Typescript
read(
  // Read request input
  // Must be an instance of `ReadTransaction` class
  transaction,

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

## ScanManager

Scan manager API. Works on top of Document Client's `scan` operation

### ScanManager.find

Finds entity from table by running a full table scan.

```Typescript
find(
  // Entity class to find from the table
  entityClass

  // @optional
  // Scan manager scan options
  // @default none
  scanOptions: {
    // @optional
    // Name of the index if running a scan against secondary indexes
    // @default - scan will be run against main table
    scanIndex

    // @optional
    // Total number of items to return
    // @default no limit is applied
    limit

    // @optional
    // Cursor to start scanning from
    // @default - none
    cursor

    // @optional
    // Filter returned items
    // Any conditions listed here will apply after items have been read from dynamodb and
    // therefore this should be avoided wherever possible, but can be helpful in some cases
    // see this https://www.alexdebrie.com/posts/dynamodb-filter-expressions/ for more details
    where

    // @optional
    // Specify attributes to get, only selected attributes are fetched
    // @default `ALL`
    select

    // @optional
    // Total segments to divide this scan in
    totalSegments

    // @optional
    // Item scan limit to apply per segment, this option is ignored when `totalSegments` is not provided
    limitPerSegment

    // @optional
    // maximum concurrency to apply, this option is ignored when `totalSegments` is not provided
    // @default PARALLEL_SCAN_CONCURRENCY_LIMIT
    requestConcurrencyLimit

  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

### ScanManager.count

Counts entity from table by running a full table scan.

```Typescript
count(
  // Entity class to count
  entityClass

  // @optional
  // Scan manager scan options
  // @default none
  scanOptions: {
    // @optional
    // Name of the index if running a scan against secondary indexes
    // @default - scan will be run against main table
    scanIndex

    // @optional
    // Filter returned items
    // Any conditions listed here will apply after items have been read from dynamodb and
    // therefore this should be avoided wherever possible, but can be helpful in some cases
    // see this https://www.alexdebrie.com/posts/dynamodb-filter-expressions/ for more details
    where
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

### ScanManager.parallelScan

You should always use `.find` unless trying to scan all items from the table

Returns all scanned items to the client that matches given filter, this is build on top of lower level `.scan` op but adds
safer concurrency control - also used by `.find`.

```Typescript
parallelScan(
  // @optional
  // Scan manager scan options
  // @default none
  scanOptions: {
    // @Optional
    // Entity to scan
    // @default - none
    entity

    // @optional
    // Name of the index if running a scan against secondary indexes
    // @default - scan will be run against main table
    scanIndex

    // @optional
    // Total number of items to return
    // @default no limit is applied
    limit

    // @optional
    // Cursor to start scanning from
    // @default - none
    cursor

    // @optional
    // Filter returned items
    // Any conditions listed here will apply after items have been read from dynamodb and
    // therefore this should be avoided wherever possible, but can be helpful in some cases
    // see this https://www.alexdebrie.com/posts/dynamodb-filter-expressions/ for more details
    where

    // @optional
    // Specify attributes to get, only selected attributes are fetched
    // @default `ALL`
    select

    // @optional
    // Current segment identified
    segment

    // @optional
    // Total segments to divide this scan in
    totalSegments

    // @optional
    // Item scan limit to apply per segment, this option is ignored when `totalSegments` is not provided
    limitPerSegment

    // @optional
    // maximum concurrency to apply, this option is ignored when `totalSegments` is not provided
    // @default PARALLEL_SCAN_CONCURRENCY_LIMIT
    requestConcurrencyLimit
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```

### ScanManager.scan

Low level scan api - returns all scanned items to the client that matches given filter - also used by `.find`.
You should always use `.find` unless trying to scan all items from the table.

_Scan manager `.scan` does not enforce concurrency limit, consider using `.parallelScan` to perform safer parallel scan._

```Typescript
scan(
  // @optional
  // Scan manager scan options
  // @default none
  scanOptions: {
    // @Optional
    // Entity to scan
    // @default - none
    entity

    // @optional
    // Name of the index if running a scan against secondary indexes
    // @default - scan will be run against main table
    scanIndex

    // @optional
    // Total number of items to return
    // @default no limit is applied
    limit

    // @optional
    // Cursor to start scanning from
    // @default - none
    cursor

    // @optional
    // Filter returned items
    // Any conditions listed here will apply after items have been read from dynamodb and
    // therefore this should be avoided wherever possible, but can be helpful in some cases
    // see this https://www.alexdebrie.com/posts/dynamodb-filter-expressions/ for more details
    where

    // @optional
    // Specify attributes to get, only selected attributes are fetched
    // @default `ALL`
    select

    // @optional
    // Current segment identified
    segment

    // @optional
    // Total segments to divide this scan in
    totalSegments

    // @optional
    // Item scan limit to apply per segment, this option is ignored when `totalSegments` is not provided
    limitPerSegment
  },

  // @optional
  // extra non-functional options
  metadataOptions: {
    // @optional
    // Unique request id to use, throughout the request processing,
    // @default a unique v4 uuid is set and used for all logs
    requestId

    // @optional
    // Sets ReturnConsumedCapacity param to given value when making a request via document client
    returnConsumedCapacity
  }
)
```
