# TypeDORM

[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg?style=for-the-badge)](https://github.com/google/gts)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=for-the-badge)](https://github.com/semantic-release/semantic-release)

Object Relational mapper for DynamoDB, inspired by typeorm.

TypeDORM is an ORM built from ground up using typescript and latest javascript features to provide an easy gateway when doing complex highly relational data modeling in dynamoDB. TypeDORM is built with [single-table-design](https://www.youtube.com/watch?v=HaEPXoXVf2k) first in mind, but should work as smoothly with regular entity table <-> design pattern. TypeDORM would have not existed without [TypeORM](https://github.com/typeorm/typeorm) and [dynamodb-toolbox](https://github.com/jeremydaly/dynamodb-toolbox), big shout-out to these projects and their awesome contributors.

TypeDORM borrows decorator based syntax from TypeORM and provides fully type safe ORM to with dynamodb. TypeDORM currently only support [Data Mapper](https://en.wikipedia.org/wiki/Data_mapper_pattern).

## Packages

| Package           | Latest Stable                                                                                                                         | Recent Beta                                                                                                                                | Recent Alpha                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| @typedorm/common  | [![NPM Release](https://img.shields.io/npm/v/@typedorm/common?style=for-the-badge)](https://www.npmjs.com/package/@typedorm/common)   | [![NPM Release](https://img.shields.io/npm/v/@typedorm/common/beta?style=for-the-badge)](https://www.npmjs.com/package/@typedorm/common)   | [![NPM Release](https://img.shields.io/npm/v/@typedorm/common/alpha?style=for-the-badge)](https://www.npmjs.com/package/@typedorm/common)   |
| @typedorm/core    | [![NPM Release](https://img.shields.io/npm/v/@typedorm/core?style=for-the-badge)](https://www.npmjs.com/package/@typedorm/core)       | [![NPM Release](https://img.shields.io/npm/v/@typedorm/core/beta?style=for-the-badge)](https://www.npmjs.com/package/@typedorm/core)       | [![NPM Release](https://img.shields.io/npm/v/@typedorm/core/alpha?style=for-the-badge)](https://www.npmjs.com/package/@typedorm/core)       |
| @typedorm/testing | [![NPM Release](https://img.shields.io/npm/v/@typedorm/testing?style=for-the-badge)](https://www.npmjs.com/package/@typedorm/testing) | [![NPM Release](https://img.shields.io/npm/v/@typedorm/testing/beta?style=for-the-badge)](https://www.npmjs.com/package/@typedorm/testing) | [![NPM Release](https://img.shields.io/npm/v/@typedorm/testing/alpha?style=for-the-badge)](https://www.npmjs.com/package/@typedorm/testing) |

## Branches

| Branches | Stability                                                                                 |
| -------- | ----------------------------------------------------------------------------------------- |
| main     | ![Stability](https://img.shields.io/badge/Stability-stable-blue?style=for-the-badge)      |
| beta     | ![Stability](https://img.shields.io/badge/Stability-preview-orange?style=for-the-badge)   |
| alpha    | ![Stability](https://img.shields.io/badge/Stability-experimental-red?style=for-the-badge) |

## Features

- Single table design first class support
- DataMapper development pattern
- Full type safety
- Declarative relational schema
- Entity manager
- Transaction manager
- Batch manager
- Multiple connections support
- Code follows all possible best practices when modeling for dynamodb
- Additional higher level features like, ability to declare non key attribute as unique, automatic retries
- Auto Generated values for attributes
- Auto update attribute values on UPDATE operations
- Dynamic & Static default values for attributes
- Complex update, key condition and condition expression all made easy to work with
- Powerful expression builder to auto generate expressions from input
- Typescript and javascript support

And many more to come.

## Getting Started

### Installation

1. Install core and common modules from npm.

   `npm install @typedorm/core @typedorm/common --save`

2. Install aws-sdk for nodejs, TypeDORM uses documentClient to interact with dynamodb.

   `npm install aws-sdk --save`

3. Install `reflect-metadata` shim

   `npm install reflect-metadata --save`

   and import it as the first thing in node entry file as

   `import 'reflect-metadata'`

### Typescript configuration

If you are using TypeDORM with typescript, make sure you also have below options enabled in `tsconfig.json`

```shell
"emitDecoratorMetadata": true,
"experimentalDecorators": true,
```

### Developing with TypeDORM

#### Creating Table

First thing to do when working with TypeDORM is to setup dynamodb table config. Currently this needs to be manually setup and have also have it configured in deployed table instance(s).

This guide shows how to setup single-table-design

`my-table.ts`

```typescript
import {Table} from '@typedorm/common';

// create table

const myGlobalTable = new Table({
  name: 'test-table',
  partitionKey: 'PK',
  sortKey: 'SK',
  indexes: {
    GSI1: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'GSI1PK',
      sortKey: 'GSI1SK',
    },
    GSI2: {
      type: INDEX_TYPE.GSI,
      partitionKey: 'GSI2PK',
      sortKey: 'GSI2SK',
    },
    LSI1: {
      type: INDEX_TYPE.LSI,
      sortKey: 'LSI1SK',
    },
  },
});
```

**Note:** _These indexes must match exactly to what is created in dynamo table instance hosted._

#### Creating an entity

`organisation.entity.ts`

```typescript
import {Attribute, Entity, AutoGeneratedAttribute} from '@typedorm/common';
import {AUTO_GENERATE_ATTRIBUTE_STRATEGY} from '@typedorm/common';

@Entity({
  name: 'organisation',
  primaryKey: {
    partitionKey: 'ORG#{{id}}',
    sortKey: 'ORG#{{id}}',
  },
  indexes: {
    // specify GSI1 key - "GSI1" named global secondary index needs to exist in above table declaration
    GSI1: {
      partitionKey: 'ORG#{{id}}#STATUS#{{status}}',
      sortKey: 'ORG#{{id}}#ACTIVE#{{active}}',
      type: INDEX_TYPE.GSI,
    },
    // specify LSI1 key
    LSI: {
      sortKey: 'TICKETS#UPDATED_AT#{{updatedAt}}'
      type: INDEX_TYPE.LSI
    }
  },
})
export class Organisation{

  @AutoGeneratedAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
  })
  id: string;

  @Attribute()
  name: string;

  @Attribute()
  status: string;

  @Attribute()
  active: boolean;

  @AutoGeneratedAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.EPOCH,
    autoUpdate: true // this will make this attribute and any indexes referencing it auto update for any write operation
  })
  updatedAt: number;
}
```

#### Initialize default connection

```typescript
import {createConnection} from '@typedorm/core';

// initialize with specifying list of entities
createConnection({
  table: myGlobalTable,
  entities: [Organisation],
});

// or initialize with specifying path match for entities
createConnection({
  table: myGlobalTable,
  entities: 'path-to-entities/*.entity.ts',
});
```

#### Working with entity manager

```typescript
import {getEntityManager} from '@typedorm/core';

const org = new Organisation();
org.name = 'My awesome org';
org.status = 'onboarding';
org.active = true;

const entityManger = getEntityManager();

// create item
const response = await entityManger.create(org);

// get item
const org = await entityManger.findOne(Organisation, {
  id: response.id,
  status: 'onboarding',
  active: true,
});

// delete item
await entityManger.delete(Organisation, {
  id: response.id,
  status: 'onboarding',
  active: true,
});
```

## Table of contents

- [How it works](./docs/how-it-works.md)
- [Step by step guide](./docs/guide.md)
- [Entity inheritance](./docs/entity-inheritance.md)
- [Working with multiple connections](./docs/multiple-connection.md)
- [How to recipes](./docs/how-to-recipes.md)
- [Debugging](./docs/debugging.md)
- [API](./docs/api.md)

## More

DynamoDB is different, different than most other no-sql databases, and therefore data in dynamodb should be stored the way dynamodb expects to get the most benefits out of it. While doing this development experience suffers and all data can become a huge mess very quickly, this is specially true with single-table-design patten. To resolve this, TypeDORM let's declaratively define schema and later takes control from there to provide best development experience possible.

To find out more about how the data looks like when it is stored in dynamo have a look at this detailed guide.

### [Step by step guide](./docs/guide.md)

## Current Limitations

- TypeDORM, at the moment WILL NOT create/update table configuration and must be done separately by the developer.

## Sponsors

[![Nextfaze](./docs/assets/nextfaze-logo.jpg)](https://www.nextfaze.com/)

## Contributions

Please submit an issue for any bugs or ideas [here](https://github.com/typedorm/typedorm/issues), or you can reach out to me on twitter [@whimzy_live](https://mobile.twitter.com/whimzy_live).
