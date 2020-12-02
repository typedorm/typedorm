# How it works under the hood 🕵️

## On these page

- [Creating a record](#creating-a-record)
- [Updating a record](#updating-a-record)
- [Querying items](#querying-items)
- [Deleting a record](#deleting-a-record)

## Creating a record

Continuing our earlier example from [step by step guide](./guide.md), number of things happen before item is actually saved in table.

### tl;dr

#### Given

```Typescript
const user = new User();
user.name = 'Loki';
user.status = 'active';
user.email = 'loki@asgard.com'
```

#### Persisted

```Typescript
{
  TransactionItems : [
    {
      Put: {
        Item: {
          PK: 'USER#0000-111-21ssa2-1111',
          SK: 'USER#0000-111-21ssa2-1111',
          GSI1PK: 'USER#0000-111-21ssa2-1111',
          GSI1SK: 'USER#0000-111-21ssa2-1111#STATUS#active',
          id: '0000-111-21ssa2-1111',
          name: 'Loki',
          status: 'active',
          email: 'loki@asgard.com',
          updatedAt: 1600009090
        },
        ConditionExpression: 'attribute_not_exists(#CE_PK)',
        ExpressionAttributeNames: {
          '#CE_PK': 'PK',
        },
        TableName: 'my-table'
      }
    }, {
      Put: {
        Item: {
          PK: 'DRM_GEN_USER.EMAIL#loki@asgard.com',
          SK: 'DRM_GEN_USER.EMAIL#loki@asgard.com',
        },
        ConditionExpression: 'attribute_not_exists(#CE_PK)',
        ExpressionAttributeNames: {
          '#CE_PK': 'PK',
        },
        TableName: 'my-table'
      }
    }
  ]
}
```

Here is the detailed explanation to what steps TypeDORM takes to generate above item input, these are the some of many steps TypeDORM takes to transform simple dev friendly model to dynamoDB friendly entity.

### Infer all indexes, keys and pre define auto generated attributes

First of all, we fetch all the indexes, key configuration for given entity, in this case `User`, after this step our simple user model looks like this:

```Typescript
{
  primaryKey: {
   PK: 'USER#{{id}}',
   SK: 'USER#{{id}}'
  },
  GSI1: {
    GSI1PK: 'USER#{{id}}',
    GSI1SK: 'USER#{{id}}#STATUS#{{status}}'
    type: 'GSI'
  },
  id: '0000-111-21ssa2-1111',
  name: 'Loki',
  status: 'active',
  email: 'loki@asgard.com',
  updatedAt: 1600009090
}
```

### Replace attribute placeholders in key, indexes with found value

Next step is to replace all interpolations in schema with actual value, typeDORM looks for `{{ }}` pattern, and will try to replace anything in between with matching property on object, once this is done, item to create looks something like this.

```Typescript
{
  PK: 'USER#0000-111-21ssa2-1111',
  SK: 'USER#0000-111-21ssa2-1111',
  GSI1PK: 'USER#0000-111-21ssa2-1111',
  GSI1SK: 'USER#0000-111-21ssa2-1111#STATUS#active',
  id: '0000-111-21ssa2-1111',
  name: 'Loki',
  status: 'active',
  email: 'loki@asgard.com',
  updatedAt: 1600009090
}
```

### Generate Document client put item object

Since TypeDORM uses Document client to communicate with dynamoDB, it needs to transform item to document client input object. which will end up, looking something like this.

```Typescript
{
  Item: {
    PK: 'USER#0000-111-21ssa2-1111',
    SK: 'USER#0000-111-21ssa2-1111',
    GSI1PK: 'USER#0000-111-21ssa2-1111',
    GSI1SK: 'USER#0000-111-21ssa2-1111#STATUS#active',
    id: '0000-111-21ssa2-1111',
    name: 'Loki',
    status: 'active',
    email: 'loki@asgard.com',
    updatedAt: 1600009090
  },
  ConditionExpression: 'attribute_not_exists(#CE_PK)',
  ExpressionAttributeNames: {
    '#CE_PK': 'PK',
  },
  TableName: 'my-table'
}
```

Looks familiar right, but We are not done yet, `email` attribute on `User`, is marked as to be made unique, and to make this possible, TypeDORM follows a [unique attribute design pattern](https://aws.amazon.com/blogs/database/simulating-amazon-dynamodb-unique-constraints-using-transactions/), where attributes marked as unique will be created as a separate record, and both original and unique records will be written to table as a single transaction. So final item input to document client will look like this:

```Typescript
{
  TransactionItems : [
    {
      Put: {
        Item: {
          PK: 'USER#0000-111-21ssa2-1111',
          SK: 'USER#0000-111-21ssa2-1111',
          GSI1PK: 'USER#0000-111-21ssa2-1111',
          GSI1SK: 'USER#0000-111-21ssa2-1111#STATUS#active',
          id: '0000-111-21ssa2-1111',
          name: 'Loki',
          status: 'active',
          email: 'loki@asgard.com',
          updatedAt: 1600009090
        },
        ConditionExpression: 'attribute_not_exists(#CE_PK)',
        ExpressionAttributeNames: {
          '#CE_PK': 'PK',
        },
        TableName: 'my-table'
      }
    }, {
      Put: {
        Item: {
          PK: 'DRM_GEN_USER.EMAIL#loki@asgard.com',
          SK: 'DRM_GEN_USER.EMAIL#loki@asgard.com',
        },
        ConditionExpression: 'attribute_not_exists(#CE_PK)',
        ExpressionAttributeNames: {
          '#CE_PK': 'PK',
        },
        TableName: 'my-table'
      }
    }
  ]
}
```

Because of the way attribute_not_exists constraint and transaction api work, item will only be created if there is not item matching `id` (this is already handled by primary key) and `email`. Pretty cool right?. 😲

## Updating a record

### tl;dr

#### Given

```Typescript
entityManager.update(User, {id: '11'},
  {name: 'Ex-Loki', status: 'inactive'}
)
```

#### Updated

```Typescript
{
  ExpressionAttributeNames: {
    '#attr0': 'name',
    '#attr1': 'status',
    '#attr2': 'GSI1SK',
  },
  ExpressionAttributeValues: {
    ':val0': 'Ex-Loki',
    ':val1': 'inactive',
    ':val2': 'USER#11#STATUS#inactive',
  },
  Key: {
    PK: 'USER#11',
    SK: 'USER#11',
  },
  ReturnValues: 'ALL_NEW',
  TableName: 'test-table',
  UpdateExpression:
    'SET #attr0 = :val0, #attr1 = :val1, #attr2 = :val2, #attr3 = :val3',
}
```

Here, We only asked to updated `name` and `status`, but why did `GSI1SK` also got updated? It's because in `User` entity schema, `GSI1SK` references `status` attribute, and TypeDORM can infer that, meaning we are no longer required to also having to maintain indexes when value for any of the attributes changes.

## Querying items

Querying in dynamo db can be cumbersome, but it doesn't have to be that way. TypeDORM takes a simple approach of generating query expressions from given query options.

### tl;dr

#### Given

```Typescript
entityManager.find(Order,
  {userId: 'user-1', queryIndex: 'GSI1'}, {
  keyCondition: {
    BEGINS_WITH: 'ORDER#cancelled',
  },
})
```

#### Queried

This is the query expression TypeDORM generates for above query condition

```Typescript
{
  ExpressionAttributeNames: {
    '#KY_CE_GSI1PK': 'GSI1PK',
    '#KY_CE_GSI1SK': 'GSI1SK',
  },
  ExpressionAttributeValues: {
    ':KY_CE_GSI1PK': 'USER#user-1',
    ':KY_CE_GSI1SK': 'ORDER#cancelled',
  },
  KeyConditionExpression:
    '#KY_CE_GSI1PK = :KY_CE_GSI1PK AND begins_with(#KY_CE_GSI1SK, :KY_CE_GSI1SK)',
  ScanIndexForward: true,
  IndexName: 'GSI1',
  TableName: 'test-table',
  }
```

## Deleting a record

Deleting an item can only be done on by specifying item's primary key, it will simply look as following

### tl;dr

#### Given

```Typescript
entityManager..delete(User, {id: 'user-1'})
```

#### Updated

```Typescript
{
  Key: {
    PK: 'USER#user-1',
    SK: 'USER#user-1',
  },
  TableName: 'test-table',
}
```

Best of all, TypeDORM does all of these without coming in the way of developer, unlike other ORM tools, where design patterns are assumed.
