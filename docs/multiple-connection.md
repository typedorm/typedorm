# Working with multiple connections

Let's assume that we have a two different tables running two different workloads, one is for `app1` workload and other is for `app2` workload. In order to be able to interact with these two tables, we have two user with different permissions, `app1User` and `app2User`.

Now, we have a service that needs to be able to work with both tables in that are registered in separate connections. Working with different connections using different credentials, will look something like this.

First we create two separate connections both using different credentials

```Typescript
// connection for app1
createConnection({
  name: 'app1'
  table: app1Table,
  entities: [...entities],
  documentClient: {
    credentials: {
      accessKeyId: process.env.APP_1_ACCESS_KEY_ID,
      secretAccessKey: process.env.APP_1_SECRET_ACCESS_KEY
    }
  }
});

// connection for app2
createConnection({
  name: 'app2'
  table: app1Table,
  entities: [...entities],
  documentClient: {
    credentials: {
      accessKeyId: process.env.APP_2_ACCESS_KEY_ID,
      secretAccessKey: process.env.APP_2_SECRET_ACCESS_KEY
    }
  }
});
```

Now we can use multiple connections to different actions, that are using completely different credentials,

```Typescript
// update record in both table in different connections

// create user in connection 1
getEntityManager('app1').create(User, {...})

// update record in connection2
getEntityManager('app2').create(Record, {...})
```

TypeDORM makes it super easy to configure multiple connections with different connection options.
