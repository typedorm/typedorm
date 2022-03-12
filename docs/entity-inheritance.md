# Entity Inheritance

## On this page

- [Entity Inheritance](#entity-inheritance)

## Entity Inheritance

Class inheritance is the great way to reduce code duplication, this is supported by TypeDORM using entity inheritance pattern. Here is the base example of how it works with TypeDORM.

For example, you have `Admin`, `Student` and `Parent` entities with following attributes.

```Typescript
@Entity({
  name: 'admin', // name of the entity that will be added to each item as an attribute
  // primary key
  primaryKey: {
    partitionKey: 'ADMIN#{{id}}',
    sortKey: 'ADMIN#{{id}}',
  }
})
export class Admin {
  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
  })
  id: string;

  @Attribute()
  name: string;

  @Attribute()
  department: string

  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.EPOCH,
    autoUpdate: true
  })
  updatedAt: string
}
```

```Typescript
@Entity({
  name: 'student', // name of the entity that will be added to each item as an attribute
  // primary key
  primaryKey: {
    partitionKey: 'STUDENT#{{id}}',
    sortKey: 'STUDENT#{{id}}',
  }
})
export class Student {
  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
  })
  id: string;

  @Attribute()
  name: string;

  @Attribute()
  studentId: number

  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.EPOCH,
    autoUpdate: true
  })
  updatedAt: string
}
```

```Typescript
@Entity({
  name: 'parent', // name of the entity that will be added to each item as an attribute
  // primary key
  primaryKey: {
    partitionKey: 'PARENT#{{id}}',
    sortKey: 'PARENT#{{id}}',
  }
})
export class Parent {
  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
  })
  id: string;

  @Attribute()
  name: string;

  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.EPOCH,
    autoUpdate: true
  })
  updatedAt: string
}
```

All of our `Admin`, `Student` and `Parent` has attributes `id`, `name`, and `updatedAt` and only few attributes change. To reduce code duplication and have better abstractions, we can rewrite these entities like:

```Typescript
export abstract class User {
  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.UUID4,
  })
  id: string;

  @Attribute()
  name: string;

  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.EPOCH,
    autoUpdate: true
  })
  updatedAt: string
}
```

```Typescript
@Entity({
  name: 'admin', // name of the entity that will be added to each item as an attribute
  // primary key
  primaryKey: {
    partitionKey: 'ADMIN#{{id}}',
    sortKey: 'ADMIN#{{id}}',
  }
})
export class Admin extends User{
  @Attribute()
  department: string
}
```

```Typescript
@Entity({
  name: 'student', // name of the entity that will be added to each item as an attribute
  // primary key
  primaryKey: {
    partitionKey: 'STUDENT#{{id}}',
    sortKey: 'STUDENT#{{id}}',
  }
})
export class Student extends User {
  @Attribute()
  studentId: number
}
```

```Typescript
@Entity({
  name: 'parent', // name of the entity that will be added to each item as an attribute
  // primary key
  primaryKey: {
    partitionKey: 'PARENT#{{id}}',
    sortKey: 'PARENT#{{id}}',
  }
})
export class Parent extends User {}
```

Much better right? You can also overwrite attributes defined on base classes like this:

```Typescript
@Entity({
  name: 'parent', // name of the entity that will be added to each item as an attribute
  // primary key
  primaryKey: {
    partitionKey: 'PARENT#{{id}}',
    sortKey: 'PARENT#{{id}}',
  }
})
export class Parent extends User {
  @AutoGenerateAttribute({
    strategy: AUTO_GENERATE_ATTRIBUTE_STRATEGY.KSUID,
  })
  id: string;
}
```

Here parent entity will now have `id` generated using `KSUID` strategy and rest of the entities will still use `UUID4` strategy derived from base class `User`.

You can go event further by having a base class like `BaseEntity` as predefine all the attributes that all other entities in your application must have, common ones being `id`, `createdAt`, `updatedAt`, and make all other entities extend this `BaseEntity` with their own schema.

_Note_: you do not ever want to annotate base class with `@Entity` and should always be marked `abstract` to force other extend it instead of initializing it, or it can cause many confusion and unwanted behaviors, as TypeDORM is not designed to work with inherited with `@Entity` annotation.
