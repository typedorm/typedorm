# Upgrading the TypeDORM to use the AWS SDK V3

_Note: If you are using the Document Client with AWS SDK V2, then upgrading to latest TypeDORM version does not require any code changes._

TypeDORM provides unified support for working with AWS SDK V2 and V3. This means you can use the same version of TypeDORM with AWS SDK V2 and V3.

To make use of this, you need to provide the appropriate wrapper instances of document client to the connection.

From the release 1.15.0, TypeDORM has introduced a new helper package `@typedorm/document-client` - A very lightweight Document Client helper to make interactions with DynamoDB less painful across the AWS SDK v2 and AWS SDK v3.
From version 1.15.0, this gets automatically installed when installing the `@typedorm/core`, so you do not need to change anything here.

## Installing required AWS SDK libs

TypeDORM uses native document client provided by AWS SDK to interact with DynamoDB. Therefor, when wanting to use TypeDORM with AWS SDK V3, you also need to install the following.

- @aws-sdk/client-dynamodb
- @aws-sdk/lib-dynamodb

This packages can be installed by running the following command:

`npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb --save`

## Setting up a new connection

Creating connection is simple and works the same way it did with AWS SDK version 2, with a slight change of how the document client instance is instantiated.

```typescript
import {createConnection} from '@typedorm/core';
import {DocumentClientV3} from '@typedorm/document-client';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';

const documentClient = new DocumentClientV3(new DynamoDBClient({}));

// initialize with specifying list of entities
createConnection({
  table: myGlobalTable,
  entities: [Organisation],
  documentClient, // <-- When documentClient is not provided, TypeDORM defaults to use the DocumentClientV2
});

// or initialize with specifying path match for entities
createConnection({
  table: myGlobalTable,
  entities: 'path-to-entities/*.entity.ts',
  documentClient, // <-- When documentClient is not provided, TypeDORM defaults to use the DocumentClientV2
});
```

Yes, this is the only change required to start working with AWS SDK V3. 🙂️
