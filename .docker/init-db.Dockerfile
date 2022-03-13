FROM amazon/aws-cli:2.0.39

ADD ./dynamodb-sample-table.json /data/dynamodb-sample-table.json

WORKDIR /data

ENTRYPOINT [ "aws", "dynamodb", "create-table", "--cli-input-json", "file://dynamodb-sample-table.json", "--endpoint-url", "http://ddb:8000"]
