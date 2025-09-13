# implementing backend services

## base framwork

base module utility and tools: core_framework
logging: core_logging
database: core_db
api: core_api

## basic pythoj structure

// File: myscript.py

```python
import core_framework as util
import core_logging as log
import core_helper.aws as aws

from core_helper.magic import MagicS3Bucket

# correlation ID is already defined in logging framework
# util already has functions to retrieve all environment variables
# aws already has core foudnational framework for sessoin management

# To get an S3 bucket
#

bucket_name = "my-s3-artefcts-bucket" or util.get_bucket_name()
region = "ap-southeast-1" or util.get_bucket_region()
bucket_resource = MagicS3Bucket(bucket_name=bucket_name, region=region)

// upload a file

bucket_resource.put_object(Key=key, Filename=filename, Body=stream)

```

# bucket structure

the platform has 3 bucket object prefixes.  packages, files, artefacts

## Packages and Files for Pre-compilation

Uploaded to the bucket and can be considered "input" files ore pre-compiled

Package.Zip file input Jinja2 templates Upload Bucket is:

s3://{clientfact.bucket_name}/packages/{portfolio}/{app}/{branch}/{build}

Other files used BEFORE Template Generation and used as s3 resources for cloudformation verification.
Copied to artefacts/files after compilation.

s3://{clientfact.bucket_name}/files/{portfolio}/{app}/{branch}/{build}

S3 bucket lifecycle:  Packages and Files stay forever until deleted by core-automation.  After 30, 60, 90
days, packges and files are moved from "S3 Standard", to "S3 Onze Zone-IA", to "S3 Clacier Instant Retrieval".  When a deployment is deleted in the UI, the files are deleted.

## Artefacts Used for Deployments or "re-deployments"

Post compilation output from Jinja2 template geneartion

s3://{clientfact.artefact_bucket_name}/artefacts/{portfolio}/{app}/{branch}/{build}

Other files (unzipped package) AFTER Template Generation and used as s3 resources for cloudformation deployment.

s3://{clientfact.artefact_bucket_name}/files/{portfolio}/{app}/{branch}/{build}

S3 bucket lifecycle:  Artefacts and Files stay forever until deleted by core-automation.  After 30, 60, 90
days, packges and files are moved from "S3 Standard", to "S3 Onze Zone-IA", to "S3 Clacier Instant Retrieval".  When a deployment is deleted in the UI, the files are deleted.

## lambda event handling

ProxyEvent recognizes the AWS Gateway isBase64Encoded and automatically decodes it.  the first line in our handler is input_data = ProxyEvent(**event)... which will instantiate ProxyEvent and base64decode the body.  And, if the mimetype is application/json, it will bod=json.dumps(gateway.body).  So, by the time "input_data" is assigned, the body attribute is a python dict.

```python
def lambda_handler(event, context):

    try:
        input_data = ProxyEvent(**envent)
        data = input_data.body
        # We always expect a dict either from JSON or formencoded parsed namve/value pairs
        if data is not None and not isinstance(data, dict):
           raise Exception("Failed to decode body")

        print("Good to go")

    except Exception as e:
        print(f"Not an AWS Gateway Proxy Event: {str(e)}")
```

All APi gateway lambda handlers event always uses ProxyEvent to decode the body based on mimetype.

