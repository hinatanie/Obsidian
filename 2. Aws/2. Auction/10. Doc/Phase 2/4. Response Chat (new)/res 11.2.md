why you said that should not use access keys, just use IAM role
Because an **EC2 key pair** and **AWS access keys** are completely different credentials.
# Main Problem
You need two different kinds of access:
```
1. You need to connect to the EC2 operating system.
2. The EC2 application needs to call AWS services.
```
They use different security mechanisms.
## EC2 key pair
An EC2 key pair is used for **SSH login to the Linux server**:
```
Your laptop
    ↓ SSH
Private key: pet-shop-backend-key.pem
    ↓
EC2 Linux operating system
```
It proves that you are allowed to open a terminal on that specific server.
It does **not** give you permission to call AWS APIs such as:
```
S3
Systems Manager
CloudWatch
Parameter Store
RDS API
```
The `.pem` file is not an AWS access key.
## AWS access keys
AWS access keys normally contain:
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```
They are used by software to call AWS APIs:
```
Application or AWS CLI
    ↓ access key and secret key
AWS API
```
The problem is that long-term access keys can be copied, leaked, committed to Git, or left inside EC2 configuration files.
For example, this is what you should avoid:
```
EC2 environment variables
├── AWS_ACCESS_KEY_ID=...
└── AWS_SECRET_ACCESS_KEY=...
```
Or:
```
~/.aws/credentials
```
with permanent credentials stored on the server.
# Why the IAM role is better for EC2
Attach this role to the instance:
```
pet-shop-backend-ec2-role
```
Then EC2 receives temporary credentials automatically:
```
EC2
    ↓ assumes IAM role
Temporary credentials
    ↓ automatically rotated
AWS services
```
Your application does not need hard-coded access keys.
For example:
```
Spring Boot
    ↓ uses AWS SDK default credential provider
EC2 IAM role
    ↓
S3 or Parameter Store
```
The AWS SDK can obtain the temporary credentials automatically from the EC2 instance role.
# The important difference

|Credential|Used for|Recommended here?|
|---|---|---|
|EC2 `.pem` key|SSH login to the Linux server|Yes, as an optional backup|
|IAM role|EC2 calling AWS services|Yes|
|Long-term AWS access keys stored on EC2|EC2 calling AWS services|No|
So these recommendations do not conflict:
```
Create an EC2 key pair
→ Optional backup for connecting to Linux with SSH
```
```
Use an IAM role
→ Let software on EC2 access AWS services securely
```
```
Do not store AWS access keys on EC2
→ Avoid permanent AWS credentials on the server
```
# Example for your Pet Shop project
## Connecting to the server
You may use:
```
Session Manager
```
Preferred:
```
Your browser
→ Systems Manager
→ SSM Agent
→ EC2 terminal
```
Or temporarily use:
```
Your laptop
→ SSH with pet-shop-backend-key.pem
→ EC2 terminal
```
## Letting Spring Boot access S3
Do not configure:
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```
Instead:
```
Spring Boot
→ pet-shop-backend-ec2-role
→ narrowly scoped S3 policy
→ Pet Shop image bucket
```
# Recommended setup
```
EC2 key pair:
Create and store securely as an emergency SSH backup
SSH port 22:
Allow temporarily from your IP only, or keep closed
Session Manager:
Use as the main administration method
AWS access keys on EC2:
Do not create or store them
EC2 IAM role:
Use for Systems Manager, S3, CloudWatch, and Parameter Store
```
The key pair lets **you enter the server**. The IAM role lets **the server access AWS services**.