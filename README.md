[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg?style=for-the-badge)](https://github.com/google/gts)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=for-the-badge)](https://github.com/semantic-release/semantic-release)

# TypeDORM

Object Relational mapper for DynamoDB, inspired by typeorm.

TypeDORM is an ORM built from ground up using typescript and latest javascript features to provide an easy gateway when doing complex highly relational data modeling in dynamoDB. TypeDORM is built with [single-table-design](https://www.youtube.com/watch?v=HaEPXoXVf2k) first in mind, but should work as smoothly with regular entity table <-> design pattern. TypeDORM would have not existed without [TypeORM](https://github.com/typeorm/typeorm) and [dynamodb-toolbox](https://github.com/jeremydaly/dynamodb-toolbox), big shout-out to these projects and their awesome contributors.

TypeDORM borrows decorator based syntax from TypeORM and provides fully type safe ORM to with dynamodb. TypeDORM currently only support [Data Mapper](https://en.wikipedia.org/wiki/Data_mapper_pattern).

## Stability

![Stability](https://img.shields.io/badge/Stability-Beta-orange?style=for-the-badge)

TypeDORM is currency in it's very early stage of development so breaking changes are likely. Consider this before using it in production.

## Features

- DataMapper development pattern
- Full type safety
- Declarative relational schema
- Entity manager
- Transaction manager
- Multiple connections support (Partial)
- Code follows all possible best practices when modeling for dynamodb
- Additional higher level features like, ability to declare non key attribute a unique
- Auto Generated values fro attributes
- Auto Update values on update
- Complex update, key condition and condition expression all made easy to work with (Partial)
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

```Typescript

import {Table} from '@typedorm/common';

// create table

const table = new Table({
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

// TODO: add docs

## Current Limitations

- TypDORM currently is not able to connect with dynamodb table using aws credentials and only works within environment like lambda/ec2 that already has access to dynamo table, but this will be resolved very soon.
- To keep things simple TypeDORM, at the moment WILL NOT create/update table configuration and must be done separately.
- There is very minimal support for providing different arguments to queries, and will be resolved soon.
