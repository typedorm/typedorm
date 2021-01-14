# Debugging with TypeDORM

TypeDORM implements debug based logger which can be enabled by setting `DEBUG` environment variable to `typedorm:*`.

## Enabling Transform Logs

All Transform logs can be enabled by setting `DEBUG` environment variable to `typedorm:transform:log`. All the logs uses syntax highlighting (using [chalk](https://github.com/chalk/chalk))

For example, executing `EntityManager.create` operation with transformed log enabled, this will be printed to console.

```Typescript
  typedorm:transform:log PUT user Before:
Body:
{
  "id": "1",
  "name": "Test User",
  "status": "active"
}
 +0ms
  typedorm:transform:log PUT user After:
Body:
{
  "Item": {
    "__en": "user",
    "id": "1",
    "name": "Test User",
    "status": "active",
    "PK": "USER#1",
    "SK": "USER#1",
    "GSI1PK": "USER#STATUS#active",
    "GSI1SK": "USER#Test User"
  },
  "TableName": "test-table",
  "ConditionExpression": "attribute_not_exists(#CE_PK) AND attribute_not_exists(#CE_SK)",
  "ExpressionAttributeNames": {
    "#CE_PK": "PK",
    "#CE_SK": "SK"
  }
}
 +0ms
  typedorm:transform:log RESPONSE user Before:
Body:
{
  "__en": "user",
  "id": "1",
  "name": "Test User",
  "status": "active",
  "PK": "USER#1",
  "SK": "USER#1",
  "GSI1PK": "USER#STATUS#active",
  "GSI1SK": "USER#Test User"
}
 +0ms
  typedorm:transform:log RESPONSE user After:
Body:
{
  "id": "1",
  "name": "Test User",
  "status": "active"
}
 +0ms
```
