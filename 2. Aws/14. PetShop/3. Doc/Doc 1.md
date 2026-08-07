##### What is the root user?
The email and password you are creating belong to the most powerful identity in the AWS account:
```
AWS account
    ↓
Root user
    ↓
Complete control over the account
```
You should use it only for account administration. Later, you will create a separate administrator identity for normal work. AWS explicitly recommends avoiding the root user for everyday tasks.
###### What is an AWS account?

The confusing part is that an **AWS account** and a **root user** are connected, but they are not the same thing.  
Think of it like this:
```
AWS account = the entire house
Root user   = the original owner and master key
IAM user    = another person given a limited key
```

The **AWS account** is the container that owns everything:
```
AWS account
├── EC2 servers
├── RDS databases
├── S3 files
├── Billing information
├── IAM users
└── Root user
```
Your AWS account also has:
- A unique 12-digit Account ID
- A root email address
- Billing and payment information
- AWS resources and services


###### Problem : aws account and root user is different I even have not created root user
An AWS account and its root user are different **concepts**, but they are created together during registration.
###### Solution
Think of the registration process like this:
```
You register with:
hinataniee@gmail.com
        ↓
AWS creates an AWS account
        ↓
AWS automatically assigns that email
as the account's root user
```
Therefore:
```
AWS account ≠ root user
```
But:
```
Creating an AWS account
automatically creates its root user
```
A similar example is a new Windows computer:

###### Problem 1: What is an access key?
Your FastAPI application cannot click buttons in the AWS Management Console.
It needs a programmatic way to prove its identity when calling AWS APIs.
###### Solution
AWS can provide credentials containing values such as:
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```
For example, Python code using `boto3` might use credentials to upload an image:
```
import boto3
s3 = boto3.client("s3")
s3.upload_file(
    "watch.jpg",
    "auction-images",
    "items/watch.jpg",
)
```
The access key tells AWS:
```
This application is requesting access
    ↓
Identify which AWS user owns these credentials
    ↓
Check what that user is allowed to do
```
An access key is similar to a username and password for software.

###### Problem 2: What happens when FastAPI uploads an image?
Imagine your FastAPI application sends this request:
```
Upload watch.jpg to the auction-images S3 bucket
```
AWS does not immediately upload the file.
AWS first checks the credentials attached to the request.
###### Solution
The process is:
```
FastAPI sends request:
“Upload watch.jpg”
    ↓
FastAPI includes AWS credentials
    ↓
AWS reads the Access Key ID
    ↓
AWS finds the IAM identity connected to that key
    ↓
AWS verifies the Secret Access Key
    ↓
AWS checks that identity’s permissions
    ↓
AWS allows or rejects the upload
```

###### Problem 3: What does “identify which AWS user owns these credentials” mean?
Suppose you created an IAM user called:
```
auction-backend
```
Then you created an access key for that IAM user.
The relationship becomes:
```
IAM user: auction-backend
    ↓
Access Key ID: AKIA...
    ↓
Secret Access Key: ...
```
###### Solution
When AWS receives the access key, it can determine:
```
This access key belongs to:
auction-backend
```
AWS is not identifying a real human by face or name.
It is identifying the AWS identity associated with the key.
For example:
```
Access key A
    ↓
belongs to IAM user auction-backend
Access key B
    ↓
belongs to IAM user report-reader
```



###### Problem 4: What does “check what that user is allowed to do” mean?
Every IAM identity can have permissions.
For example, `auction-backend` may be allowed to upload images but not delete databases.
###### Solution
The permissions could conceptually look like this:
```
IAM user: auction-backend
Allowed:
- Upload files to auction-images
- Read files from auction-images
Not allowed:
- Delete RDS databases
- Create EC2 servers
- Manage billing
- Create IAM users
```
When FastAPI tries to upload an image:
```
Request:
Upload image to S3
    ↓
Permission exists
    ↓
AWS allows it
```
When FastAPI tries to delete the database:
```
Request:
Delete RDS database
    ↓
Permission does not exist
    ↓
AWS rejects it
```
###### Problem 5: Why are both an Access Key ID and Secret Access Key needed?
The Access Key ID alone is not enough because it is only an identifier.
It tells AWS which credentials are being used, but it does not prove that the requester is authorized to use them.
###### Solution
Think of a normal login:
```
Username identifies the account
Password proves you control it
```
For software:
```
Access Key ID identifies the AWS identity
Secret Access Key proves the application has the credential
```
So:
```
Access Key ID
    ↓
“Which identity is this?”
Secret Access Key
    ↓
“Can this application prove it owns the credential?”
```


###### Problem 7: Why should you not use the root access key?
The root user is allowed to control nearly the entire AWS account.
Therefore, a root access key would represent an extremely powerful identity.
###### Solution
Compare these two designs.
Wrong:
```
FastAPI
    ↓
Root access key
    ↓
AWS identifies:
“This is the root user”
    ↓
Root can control the entire account
```
Safer:
```
FastAPI
    ↓
Restricted IAM identity or role
    ↓
AWS identifies:
“This is the auction backend”
    ↓
Only S3 image permissions are allowed
```
Your application should receive only the permissions it needs.
###### Common wrong approach
A beginner may think:
```
The access key itself contains the permissions
```
That is not quite correct.
The access key mainly points to an AWS identity.
The permissions belong to the identity:
```
Access key
    ↓
Connected AWS identity
    ↓
Permissions attached to that identity
```
Another common mistake is thinking the key identifies the FastAPI project by its project name.
It does not.
AWS recognizes the IAM identity connected to the credentials, not your local folder or Python application name.

###### Problem 5: Why is an IAM role better than an IAM user access key?
An IAM user usually has long-term credentials that remain valid until they are rotated or deleted.
An IAM role provides temporary credentials that AWS manages automatically.
###### Solution
When your FastAPI application runs on EC2, attach an IAM role to that EC2 instance.
AWS then provides temporary credentials automatically:
```
EC2 instance starts
    ↓
EC2 receives permission from its IAM role
    ↓
FastAPI uses boto3
    ↓
boto3 automatically obtains temporary credentials
    ↓
FastAPI accesses the permitted S3 bucket
```
You do not need to place permanent credentials in `.env`.
AWS specifically supports attaching an IAM role to EC2 so applications can access services such as S3.
Your code can remain simple:
```
import boto3
s3 = boto3.client("s3")
```
You do not manually write:
```
s3 = boto3.client(
    "s3",
    aws_access_key_id="ROOT_KEY",
    aws_secret_access_key="ROOT_SECRET",
)
```
The AWS SDK automatically discovers the temporary role credentials when the application runs on EC2.


###### Problem 2: Why is a long-term access key risky?
Imagine that the permanent key is stored in:
```
.env
```
The server may run for months, and the key may also remain valid for months.
###### Solution
The danger is:
```
Permanent key leaks
    ↓
Attacker copies the key
    ↓
Key still works
    ↓
Attacker can keep accessing AWS
until you discover and delete it
```
For example:
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...
```
The file could accidentally leak through:
```
GitHub
Server backups
Docker configuration
Logs
Screenshots
Malware
```
The `.env` file is not automatically bad. The main problem is storing a long-lived AWS secret on the server when AWS can provide temporary credentials automatically.


###### Problem 3: What is an IAM role?
An IAM role is a set of permissions that a trusted AWS resource can temporarily use.
For your auction project, you could create a role named:
```
AuctionBackendS3Role
```
###### Solution
Give the role only the required permission:
```
AuctionBackendS3Role
Allowed:
- Upload images to auction-item-images
- Read images from auction-item-images
Not allowed:
- Delete RDS databases
- Manage IAM users
- View billing
- Create EC2 servers
```
Then attach that role to your EC2 instance.
The relationship becomes:
```
EC2 instance
    ↓
Uses AuctionBackendS3Role
    ↓
Receives permission to access the image bucket
```
The role is not stored inside your Python project. It is attached through AWS infrastructure.


###### Problem 4: What does “temporary credentials” mean?
FastAPI still needs credentials behind the scenes.
The difference is that AWS creates short-lived credentials automatically instead of asking you to create one permanent key.
###### Solution
Temporary credentials normally contain three parts:
```
Temporary Access Key ID
Temporary Secret Access Key
Session Token
```
They expire after a limited period.
Before or when they expire, AWS provides new credentials automatically to the EC2 instance.
The process is:
```
AWS creates temporary credentials
    ↓
EC2 can use them for a limited time
    ↓
Credentials approach expiration
    ↓
AWS provides replacement credentials
    ↓
Old credentials stop working
```
You do not normally need to view, copy, or rotate them yourself.
AWS recommends temporary role credentials for workloads running on services such as EC2, and AWS SDKs can obtain them automatically from the instance.



###### Problem 5: How does EC2 receive the temporary credentials?
Attaching the role does not permanently write the credentials into your application.
AWS makes temporary credentials available to software running inside the EC2 instance through the **Instance Metadata Service**, commonly called `IMDS`.
###### Solution
Think of IMDS as a private AWS information service available from inside that EC2 instance:
```
FastAPI inside EC2
    ↓
Boto3 asks the EC2 metadata service:
“Does this EC2 instance have a role?”
    ↓
Metadata service returns temporary role credentials
    ↓
Boto3 uses them to call S3
```
The application does not need to manually retrieve these credentials. AWS SDKs such as Boto3 do that automatically.
###### Problem 6: How does Boto3 know where to find the credentials?
Your code only says:
```
import boto3
s3 = boto3.client("s3")
```
You never supplied a key, so it may look like Boto3 has no credentials.
###### Solution
Boto3 follows a credential search process.
It checks several possible locations, including environment variables and credential files. When it runs on an EC2 instance with an IAM role and does not find credentials earlier in its search, it obtains the role credentials from EC2 instance metadata automatically.
Conceptually:
```
boto3.client("s3")
    ↓
Boto3 looks for credentials
    ↓
No manually supplied credentials
    ↓
No AWS keys in .env
    ↓
EC2 has an attached IAM role
    ↓
Boto3 retrieves temporary credentials
    ↓
S3 request is authenticated
```
That is why this code works on EC2:
```
import boto3
s3 = boto3.client("s3")
s3.upload_file(
    "watch.jpg",
    "auction-item-images",
    "items/watch.jpg",
)
```
###### Problem 7: What does “attach a role to EC2” really mean?
You are not attaching Python code to the IAM role.
You are connecting an AWS permission identity to the virtual server.
###### Solution
Think of an office employee:
```
EC2 instance = employee
IAM role = employee job badge
S3 policy = rooms that badge may enter
Temporary credentials = temporary electronic entry code
```
When the EC2 employee starts working:
```
EC2 presents its assigned role
    ↓
AWS gives it a temporary entry code
    ↓
The code opens only allowed doors
```
Your FastAPI process runs inside that employee’s computer, so it can use the same authorized role credentials.
###### Problem 8: Why is the IAM role safer than an IAM user key?
Compare the two approaches.
###### Long-term IAM user access key
```
Create IAM user
    ↓
Create permanent access key
    ↓
Copy key into .env
    ↓
FastAPI reads key
    ↓
Key remains valid until manually removed
```
You must handle:
```
Storage
Protection
Rotation
Deletion
Leak detection
```
###### EC2 IAM role
```
Create IAM role
    ↓
Attach role to EC2
    ↓
AWS creates temporary credentials
    ↓
Boto3 retrieves them automatically
    ↓
AWS refreshes them automatically
```
You do not need to store an AWS key in `.env`.
AWS specifically recommends defining an appropriately limited IAM role for an application and associating it with the EC2 instance instead of using long-term access keys.
###### Problem 9: What happens when FastAPI calls S3?
Suppose a user uploads a watch image.
###### Solution
The complete real request is:
```
User uploads watch.jpg
    ↓
FastAPI receives the file
    ↓
FastAPI calls boto3
    ↓
Boto3 gets temporary credentials from EC2
    ↓
FastAPI sends the signed request to S3
    ↓
AWS identifies the AuctionBackendS3Role
    ↓
AWS checks the role’s permissions
    ↓
Role can upload to auction-item-images
    ↓
S3 stores watch.jpg
```
When FastAPI tries something outside its permissions:
```
FastAPI requests:
Delete the RDS database
    ↓
AWS identifies AuctionBackendS3Role
    ↓
The role has no RDS deletion permission
    ↓
AWS denies the request
```
###### Problem 10: What changes when you run FastAPI locally?
Your laptop is not the EC2 instance, so it cannot automatically use the EC2 role.
###### Solution
There are two environments:
###### Local development
```
Your Windows computer
    ↓
Not attached to the EC2 role
    ↓
Use AWS CLI or IAM Identity Center development credentials
```
###### Production
```
FastAPI on EC2
    ↓
EC2 role is attached
    ↓
Boto3 automatically uses temporary credentials
```
Your Python code can remain the same in both places:
```
import boto3
s3 = boto3.client("s3")
```
Only the way Boto3 obtains credentials changes.
###### Common wrong approach
A beginner may attach an IAM role to EC2 and also put permanent access keys in `.env`:
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```
This is less safe, and Boto3 may use the environment credentials before checking the EC2 role.
The result is:
```
IAM role exists
    ↓
But .env contains a permanent key
    ↓
Boto3 finds the .env key first
    ↓
The application uses the permanent key
instead of the EC2 role
```
Therefore, when using an EC2 role, do not add long-term AWS credentials to your production `.env`.
Your `.env` may contain configuration such as:
```
AWS_REGION=ap-southeast-1
S3_BUCKET_NAME=auction-item-images
```
But not:
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```


###### Main Problem
You should stop using the root user for normal AWS work.
You want to create a separate IAM user named:
```
auction-dev-admin
```
This user will sign in to the AWS Console and manage your development resources without using the root email every day.
> AWS currently recommends IAM Identity Center for human access, especially when managing multiple accounts. However, for your single learning account, you can still create this IAM user as requested.