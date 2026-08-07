# Pet Shop AWS Architecture and Implementation Plan
## Document purpose
This document consolidates the cost-control, networking, Spring Boot deployment, RDS, React hosting, and product-image plans into one consistent AWS architecture.
The application stack is:
```
Frontend: React + TypeScript
Backend: Spring Boot
Database: MySQL
Database migrations: Flyway
Product image storage: Amazon S3
AWS Region: ap-southeast-1
```
Two architectures are intentionally separated:
1. **Learning/MVP architecture** — build this first. It is easier to understand and avoids a NAT Gateway and Application Load Balancer.
2. **Production evolution** — adopt this only when availability, scale, or business requirements justify the additional cost.
Do not combine the two stages accidentally. A production service is not automatically a good learning-stage choice.

---
# Main Problem
The Pet Shop application needs to be deployed securely without creating unnecessary AWS services or leaving expensive resources running.
The system must support:
```
React frontend delivery
Spring Boot REST APIs
Private MySQL storage
Product image upload and delivery
HTTPS
Secure credentials
Backups
Monitoring
Cost alerts
```
The system must avoid:
```
Public RDS access
AWS access keys in source code
Public S3 buckets
Public Spring Boot port 8080
Unrestricted SSH
Unnecessary NAT Gateway charges
Unnecessary Load Balancer charges
Using the RDS master account as the application account
Storing expiring presigned URLs in MySQL
```

---
# Part 1: Approved Learning/MVP Architecture
## Problem 1: Choose the services needed now
## Solution
Use these services now:

| Requirement           | AWS service                                | Why it is used                                                    |
| --------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Cost warnings         | AWS Budgets                                | Warns when spending crosses the configured thresholds             |
| Cost investigation    | Cost Explorer                              | Shows which services are generating charges                       |
| Isolated network      | Amazon VPC                                 | Contains the EC2 and RDS network resources                        |
| Spring Boot server    | Amazon EC2                                 | Runs Java, Spring Boot, systemd, and Nginx                        |
| MySQL database        | Amazon RDS for MySQL                       | Provides a managed private database                               |
| React hosting         | Amazon S3 + CloudFront                     | Delivers the static React production build securely               |
| Product images        | Private Amazon S3 bucket                   | Stores product images outside EC2 and RDS                         |
| Image delivery        | CloudFront or temporary presigned GET URLs | Delivers private S3 objects to browsers                           |
| EC2 AWS permissions   | IAM role for EC2                           | Gives Spring Boot temporary AWS credentials                       |
| Configuration secrets | Protected EC2 environment file initially   | Keeps credentials outside Git; improve with Parameter Store later |
| Logs and alarms       | Amazon CloudWatch                          | Stores selected logs and monitors EC2/RDS                         |
| Administration        | AWS Systems Manager Session Manager        | Preferred alternative to public SSH                               |
| Optional DNS          | Route 53                                   | Needed only when using a domain managed in AWS                    |
Do not create these services now:
```
NAT Gateway
Application Load Balancer
Auto Scaling Group
RDS Proxy
AWS Lambda
Amazon SQS
Amazon ECR, unless the backend is deployed as a container
AWS WAF
Multi-AZ RDS
```
They may be valuable later, but the current application does not yet justify their cost or complexity.
## Learning/MVP architecture
```
Users
  │
  ├── React and public product images
  │         ↓
  │     CloudFront
  │         ↓
  │   Private S3 buckets
  │
  └── Pet Shop API
            ↓ HTTPS
      Nginx on public EC2
            ↓ 127.0.0.1:8080
          Spring Boot
            ↓ private MySQL 3306
        RDS MySQL
       Private subnets
```

---
# Part 2: Cost Protection
## Problem 2: Create the monthly budget
## Solution
Create:
```
Budget name: pet-shop-learning-monthly-budget
Budget type: Cost budget
Period: Monthly
Renewal: Recurring
Amount: USD 5
Scope: All AWS services
```
Add:

|   |   |   |
|---|---|---|
|Threshold|Notification basis|Meaning|
|50%|Actual|Early warning|
|80%|Actual|Review every active resource|
|100%|Actual|Stop or delete unnecessary resources immediately|
|80%|Forecasted, optional|AWS predicts the budget may be exceeded|
A budget is an alarm, not a hard spending limit. Standard budget notifications do not stop EC2, RDS, NAT Gateways, or Load Balancers.
Checklist:
```
[ ] Create the USD 5 monthly budget
[ ] Add 50% actual notification
[ ] Add 80% actual notification
[ ] Add 100% actual notification
[ ] Verify every email recipient
[ ] Open Cost Explorer
[ ] Use Current month, Daily, Group by Service
```
## Problem 3: Establish a shutdown routine
## Solution
After every practice session:
```
Stop EC2
    ↓
Stop RDS if the configuration supports it
    ↓
Check public IPv4 and Elastic IP usage
    ↓
Check unattached EBS volumes and old snapshots
    ↓
Check CloudWatch log growth
    ↓
Check Cost Explorer
```
Important behavior:
```
Stopped EC2 can still incur EBS and public IPv4-related charges.
Stopped RDS can still incur storage and backup charges.
Temporarily stopped RDS can restart automatically after AWS's supported stop period.
Manual RDS and EBS snapshots can continue generating storage charges.
```
Never delete a database, volume, snapshot, or S3 object until its data is confirmed unnecessary or safely backed up.

---
# Part 3: Network Foundation
## Problem 4: Create the VPC and subnets
## Solution
Create:
```
VPC: pet-shop-vpc
CIDR: 10.0.0.0/16
Region: ap-southeast-1
DNS resolution: Enabled
DNS hostnames: Enabled
```
Create these subnets:

|   |   |   |   |   |
|---|---|---|---|---|
|Name|Availability Zone|CIDR|Purpose|Public IPv4 assignment|
|pet-shop-public-subnet-1|ap-southeast-1a|10.0.1.0/24|EC2 Spring Boot backend|Enabled|
|pet-shop-private-subnet-1|ap-southeast-1a|10.0.2.0/24|RDS subnet group|Disabled|
|pet-shop-private-subnet-2|ap-southeast-1b|10.0.3.0/24|RDS subnet group|Disabled|
The two RDS subnets must be in different Availability Zones. This does not force a Multi-AZ database; it provides the subnet coverage RDS requires.
## Problem 5: Configure routing
## Solution
Create and attach:
```
Internet Gateway: pet-shop-igw
Attached VPC: pet-shop-vpc
```
Create the public route table:
```
Name: pet-shop-public-rt
Routes:
10.0.0.0/16 → local
0.0.0.0/0   → pet-shop-igw
Association:
pet-shop-public-subnet-1
```
Create the private route table:
```
Name: pet-shop-private-rt
Routes:
10.0.0.0/16 → local
Associations:
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
Do not add an Internet Gateway route or NAT Gateway route to the RDS subnets.
## Problem 6: Create security groups
## Solution
Create the EC2 security group:
```
Name: pet-shop-backend-sg
VPC: pet-shop-vpc
```
Preferred inbound rules when Session Manager is working:

|   |   |   |
|---|---|---|
|Port|Source|Purpose|
|80|0.0.0.0/0|HTTP and Let's Encrypt validation; later redirect to HTTPS|
|443|0.0.0.0/0|Public HTTPS API|
Do not open:
```
8080 from 0.0.0.0/0
3306 from any source
22 when Session Manager is available
```
If Session Manager is not ready, temporarily allow:
```
SSH 22 from your current public IP/32 only
```
Remove that rule after Session Manager works.
Create the RDS security group:
```
Name: pet-shop-rds-sg
VPC: pet-shop-vpc
Inbound:
MySQL/Aurora TCP 3306
Source: pet-shop-backend-sg
```
This permits private MySQL traffic from resources associated with the backend security group. MySQL authentication is still required.
## Problem 7: Create the RDS subnet group
## Solution
Create:
```
Name: pet-shop-db-subnet-group
VPC: pet-shop-vpc
Subnets:
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```

---
# Part 4: IAM and Server Administration
## Problem 8: Use one EC2 IAM role with limited policies
## Solution
Create:
```
Role: pet-shop-backend-ec2-role
Trusted service: EC2
```
Attach only the permissions currently needed:
```
AmazonSSMManagedInstanceCore
Custom limited product-image S3 policy
Optional CloudWatch Agent policy when the agent is installed
Optional Parameter Store read policy when parameters are adopted
```
Do not attach:
```
AdministratorAccess
AmazonS3FullAccess
IAMFullAccess
SecretsManagerReadWrite
```
Do not create AWS access keys for the EC2 application. The AWS SDK for Java should use the default credentials provider chain and obtain temporary credentials from the EC2 role.
## Problem 9: Prefer Session Manager over public SSH
## Solution
Use Systems Manager Session Manager for normal server administration.
Requirements:
```
SSM Agent installed and running
pet-shop-backend-ec2-role attached
AmazonSSMManagedInstanceCore attached
EC2 can reach Systems Manager public endpoints through its Internet Gateway
IAM user has permission to start a session
```
After Session Manager succeeds:
```
[ ] Remove inbound SSH port 22
[ ] Keep Spring Boot port 8080 closed
[ ] Use Session Manager for shell access
```

---
# Part 5: RDS MySQL
## Problem 10: Create the learning RDS database
## Solution
Create:
```
Engine: MySQL
Creation method: Standard create
Template: Free tier if eligible, otherwise Dev/Test
DB identifier: pet-shop-mysql
Initial database: pet_shop
Master username: pet_shop_admin
Deployment: Single-AZ
Instance class: Smallest suitable learning class
Storage: Smallest suitable General Purpose SSD allocation
Storage autoscaling: Optional with a conservative maximum
VPC: pet-shop-vpc
DB subnet group: pet-shop-db-subnet-group
Public access: No
Security group: pet-shop-rds-sg
Port: 3306
Backup retention: 1–7 days
Deletion protection: Enable when data becomes important
```
Review the current AWS price estimate before selecting **Create database**.
## Problem 11: Separate database identities
## Solution
Use three identities:
```
pet_shop_admin
└── RDS administration only
pet_shop_migration
└── Flyway schema migrations
pet_shop_app
└── Normal Spring Boot reads and writes
```
The normal application user should have only the permissions required by the application, normally:
```
SELECT
INSERT
UPDATE
DELETE
```
The Flyway user can receive schema-changing permissions on `pet_shop.*`. Do not use the master account permanently in Spring Boot.
## Problem 12: Protect database credentials
## Solution
For the first learning deployment:
```
Store the RDS master password in a password manager.
Store Spring Boot runtime values in /etc/pet-shop/pet-shop.env.
Set owner-only permissions such as chmod 600.
Never commit the file.
```
Improved next step:
```
Store application secrets as SecureString parameters in Systems Manager Parameter Store.
Allow pet-shop-backend-ec2-role to read only the exact Pet Shop parameter path.
Load them during deployment or application startup.
```
Production choice:
```
Use Secrets Manager when automatic credential rotation and managed secret lifecycle are required.
```
Do not store secrets in:
```
Git
application.yml
application.properties
React environment variables
Docker images
README files
systemd unit text
CloudWatch logs
```

---
# Part 6: Spring Boot Deployment
## Problem 13: Prepare the backend
## Solution
Recommended baseline:
```
Java: 21 LTS
Build: Maven or Gradle, matching the existing project
ORM: Spring Data JPA/Hibernate
Migrations: Flyway
Health: Spring Boot Actuator
Internal port: 8080
Internal bind address: 127.0.0.1
```
Required dependency groups:
```
Spring Web
Spring Security, if authentication is implemented
Spring Data JPA
MySQL Connector/J
Flyway Core
Flyway MySQL support when required by the selected Flyway version
Spring Boot Actuator
AWS SDK for Java 2.x S3 module when image storage is implemented
```
Production settings:
```
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
server:
  address: 127.0.0.1
  port: 8080
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: never
```
Do not use `ddl-auto: create` or `create-drop` in AWS.
## Problem 14: Deploy the JAR safely
## Solution
Use:
```
Application directory: /opt/pet-shop
JAR: /opt/pet-shop/pet-shop-backend.jar
Environment: /etc/pet-shop/pet-shop.env
Service: pet-shop-backend.service
```
Create a dedicated non-login Linux account for the application:
```
User: petshop
No interactive login
Read access to the JAR
Read access to the protected environment file
Write access only to directories the application genuinely needs
```
The systemd service should:
```
Run as petshop, not root
Load the environment file
Start java -jar /opt/pet-shop/pet-shop-backend.jar
Restart on failure
Wait for network-online.target
Stop gracefully
Start automatically at boot
```
Validate before starting:
```
[ ] Automated tests pass
[ ] JAR is built with the correct Java version
[ ] Flyway SQL is reviewed
[ ] RDS snapshot exists before a risky migration
[ ] Secrets are absent from the JAR and Git
```
## Problem 15: Place Nginx in front of Spring Boot
## Solution
Use this request path:
```
Internet HTTPS 443
      ↓
Nginx
      ↓
127.0.0.1:8080
      ↓
Spring Boot
```
Nginx must forward at least:
```
Host
X-Real-IP
X-Forwarded-For
X-Forwarded-Proto
```
Spring Boot port `8080` must not have a public security-group rule.
## Problem 16: Configure HTTPS correctly
## Solution
For the direct-EC2 learning architecture:
```
Create api.your-domain.example in DNS.
Point it to the EC2 public address.
Use Certbot/Let's Encrypt with Nginx.
Redirect HTTP 80 to HTTPS 443 after certificate issuance.
Enable automatic certificate renewal and test renewal.
```
Important:
```
A normal ACM public certificate cannot simply be attached to Nginx on a standalone EC2 instance.
ACM is the natural certificate choice when HTTPS terminates at CloudFront or an Application Load Balancer.
```
If you do not own a domain yet, use HTTP only for a short learning test and do not send real credentials or personal data over it.

---
# Part 7: React Hosting
## Problem 17: Host React using private S3 and CloudFront
## Solution
Create a dedicated frontend bucket:
```
Name pattern: pet-shop-frontend-<unique-suffix>
Block Public Access: Enabled
Static website hosting: Not required when using the regular S3 origin with OAC
```
Create a CloudFront distribution:
```
Origin: Private frontend S3 bucket
Origin access: Origin Access Control
Viewer protocol: Redirect HTTP to HTTPS
Default root object: index.html
Compression: Enabled
```
For React client-side routing, configure a controlled fallback so application routes return `index.html` without hiding genuine missing asset errors.
Deployment flow:
```
Build React
    ↓
Upload immutable hashed assets with long cache headers
    ↓
Upload index.html with short/no cache
    ↓
Invalidate index.html only when necessary
```
Use a separate API base URL:
```
VITE_API_BASE_URL=https://api.your-domain.example/api/v1
```
Only public frontend configuration belongs in `VITE_*` variables. Never put secrets in React environment variables; they are embedded in browser files.
## Problem 18: Configure DNS and certificates only when a domain exists
## Solution
If using Route 53:
```
shop.your-domain.example → CloudFront
api.your-domain.example  → EC2 public address for the learning architecture
```
For the CloudFront custom domain:
```
Request the ACM certificate in us-east-1.
Validate it through DNS.
Attach it to CloudFront.
```
For the direct EC2 API domain, use Nginx with Let's Encrypt during the learning stage.
Route 53 is optional. Do not create a hosted zone or register a domain until the project needs a stable domain.

---
# Part 8: Product Images
## Problem 19: Use a private product-image bucket
## Solution
Create:
```
Name pattern: pet-shop-product-images-<unique-suffix>
Region: ap-southeast-1
Block Public Access: Enabled
Object Ownership: Bucket owner enforced
ACLs: Disabled
Default encryption: SSE-S3
Versioning: Optional
```
S3 names are globally unique. Do not assume `pet-shop-product-images` is available.
Use object keys such as:
```
products/{productId}/original/{imageId}.jpg
products/{productId}/thumbnail/{imageId}.webp
```
Store the object key in RDS. Do not store:
```
Temporary presigned URLs
AWS console object URLs
Local EC2 file paths
```
## Problem 20: Use direct presigned uploads as the target design
## Solution
For the best long-term upload path:
```
1. React sends filename, size, and declared type to Spring Boot.
2. Spring Boot authenticates and authorizes product management.
3. Spring Boot creates an image ID and safe S3 object key.
4. Spring Boot returns a short-lived presigned upload URL.
5. React uploads directly to S3 without AWS credentials.
6. React calls a completion endpoint.
7. Spring Boot uses HeadObject to verify key, size, and metadata.
8. Spring Boot validates/records the image as READY.
```
Benefits:
```
Image bytes do not pass through EC2.
Spring Boot keeps authorization control.
React never receives AWS credentials.
EC2 uses less bandwidth and memory.
```
Required protections:
```
Short URL expiration
Server-generated key
Exact product prefix
Maximum upload size enforcement strategy
Allowed content types
S3 CORS limited to the real React origins and required methods/headers
Completion verification
Cleanup of abandoned UPLOADING records and orphaned objects
```
For the simplest first exercise, Spring Boot may accept `MultipartFile` and upload it with the AWS SDK. Treat this as an intermediate learning implementation, not the final high-scale design.
## Problem 21: Validate images securely
## Solution
Validate on the server or trusted processing path:
```
Non-empty file
Maximum bytes, recommended initial limit: 5 MB
Detected content type, not only browser Content-Type
Allowed formats
Image decoder can parse the file
Maximum width and height
Maximum total pixels
Server-generated extension matching detected type
```
Recommended initial policy:
```
JPEG and PNG required
WebP only after the selected Java image library is confirmed to decode it
Maximum 5000 × 5000 pixels
Maximum 25 million pixels
```
Client-side React validation improves usability but is not a security control.
## Problem 22: Design image metadata and APIs
## Solution
Suggested table:
```
product_images
├── id
├── product_id
├── object_key UNIQUE
├── original_filename
├── content_type
├── file_size
├── width
├── height
├── sort_order
├── is_primary
├── status
├── created_at
└── updated_at
```
Suggested statuses:
```
UPLOADING
READY
DELETING
DELETE_FAILED
REJECTED
```
Suggested APIs:
```
POST   /api/v1/products/{productId}/images/upload-request
POST   /api/v1/products/{productId}/images/{imageId}/complete
GET    /api/v1/products/{productId}/images
PATCH  /api/v1/products/{productId}/images/{imageId}/primary
DELETE /api/v1/products/{productId}/images/{imageId}
```
Only roles authorized by the actual Pet Shop business rules may manage product images. Do not assume every authenticated customer has permission.
## Problem 23: Deliver product images
## Solution
Choose one of these intentionally:
### Initial private delivery
```
Spring Boot generates short-lived presigned GET URLs.
React treats them as temporary.
RDS stores only object keys.
```
### Recommended public product-image delivery
```
CloudFront
    ↓ Origin Access Control
Private product-image S3 bucket
```
Public catalog images normally benefit from stable CloudFront URLs. Private user documents should continue using signed access rather than public CDN paths.
## Problem 24: Handle cross-service consistency
## Solution
S3 and RDS do not share one transaction.
For uploads:
```
Create UPLOADING record
    ↓
Upload object
    ↓
Verify object
    ↓
Mark READY
```
Periodically remove abandoned `UPLOADING` records and their objects after a safe timeout.
For deletion:
```
Mark DELETING
    ↓
Delete S3 object
    ↓
Delete metadata or mark deleted
```
If S3 deletion fails, mark `DELETE_FAILED`, log the exact object key, and allow a safe retry.
Do not claim success while leaving an unknown partial state.

---
# Part 9: Monitoring, Logs, and Backups
## Problem 25: Add only useful CloudWatch monitoring
## Solution
Monitor:
```
EC2:
- StatusCheckFailed
- CPUUtilization
- Network traffic
- EBS health
Spring Boot/Nginx:
- Service stopped
- Startup failures
- HTTP 5xx
- Database connection failures
- Disk usage
- JVM memory, when metrics are configured
RDS:
- CPUUtilization
- DatabaseConnections
- FreeStorageSpace
- FreeableMemory
- ReadLatency and WriteLatency
```
EC2 does not publish guest memory and filesystem usage by default. Install the CloudWatch Agent when those metrics or centralized application logs are required.
Configure finite log retention, for example:
```
Learning: 7–14 days
Production: Based on security, audit, and operational requirements
```
Create SNS email alarms only for conditions that require action. Too many alarms become noise.
## Problem 26: Configure backups and recovery
## Solution
Use:
```
RDS automated backups: 1–7 days for learning
Manual snapshot: Before risky migrations or destructive testing
Deletion protection: Enable when data matters
S3 versioning: Optional; combine with lifecycle rules if enabled
```
A snapshot is useful only if restoration is understood and tested. Before calling the environment production-ready:
```
[ ] Restore an RDS snapshot into a temporary database
[ ] Confirm the application schema and important data
[ ] Delete the temporary restored database afterward
```
## Problem 27: Configure lifecycle cleanup
## Solution
Review and clean:
```
Incomplete S3 multipart uploads
Abandoned UPLOADING product images
Old noncurrent S3 object versions
Old deployment artifacts
Old CloudWatch logs
Unused EBS snapshots
Unused Elastic IP addresses
Manual RDS snapshots that are no longer required
```
Never create a lifecycle rule that can delete required customer data without a reviewed retention policy.

---
# Part 10: Deployment and Change Safety
## Problem 28: Use a repeatable deployment process
## Solution
The minimum repeatable backend deployment should be:
```
Run tests
    ↓
Build versioned JAR
    ↓
Review Flyway migrations
    ↓
Create snapshot for risky migration
    ↓
Copy JAR to a versioned release location
    ↓
Atomically update the active release link or file
    ↓
Restart systemd service
    ↓
Check /actuator/health
    ↓
Run smoke tests
    ↓
Keep the previous JAR for rollback
```
Do not overwrite the only working JAR without keeping a rollback artifact.
For future CI/CD, prefer short-lived AWS credentials through OIDC rather than stored AWS access keys.
## Problem 29: Tag resources consistently
## Solution
Where supported, add:
```
Project: pet-shop
Environment: learning
Owner: your-name
ManagedBy: manual
```
Later environments should use:
```
Environment: development
Environment: staging
Environment: production
```
Do not place passwords, emails, or personal data in tag values.

---
# Part 11: Production Evolution
## Problem 30: Know when to change the architecture
## Solution
Do not call the learning architecture highly available. It contains one EC2 instance and a Single-AZ database.
Move toward this only when required:
```
Internet
   ↓
Route 53
   ↓
Application Load Balancer + ACM certificate
   ↓
Private EC2 instances or ECS tasks
across at least two Availability Zones
   ↓
Multi-AZ RDS MySQL
```
Production additions and their triggers:

|   |   |
|---|---|
|Service/change|Add it when|
|Application Load Balancer|Multiple backend instances, managed health routing, or ACM TLS termination is required|
|Auto Scaling Group|The backend needs replacement, horizontal scaling, or multi-AZ compute|
|Private backend subnets|The public entry point becomes an ALB and instances no longer need inbound internet traffic|
|NAT Gateway|Private workloads genuinely need general outbound internet access and the recurring cost is approved|
|VPC endpoints|Private workloads need supported AWS services without NAT; evaluate endpoint type and cost|
|Multi-AZ RDS|Downtime risk justifies the additional database cost|
|Secrets Manager|Managed rotation and centralized secret lifecycle are required|
|RDS Proxy|Connection bursts, especially from serverless or highly scaled compute, require pooling|
|AWS WAF|Internet exposure and threat model justify managed web filtering|
|AWS Backup|Central backup policies and multiple protected resources are required|
|Lambda image processor|Asynchronous resizing or format conversion is approved and operationally justified|
|SQS|Reliable asynchronous work, retries, and back-pressure are required|
Do not put private EC2 instances behind an ALB without designing their outbound needs. Package installation, external APIs, and some AWS service calls may require NAT, VPC endpoints, or a deployment method that avoids runtime downloads.

---
# Final Implementation Phases
## Phase 0: Account safety and cost controls
```
[ ] Use the IAM administrator rather than the root user for normal work
[ ] Confirm MFA
[ ] Create the USD 5 monthly budget
[ ] Add 50%, 80%, and 100% actual alerts
[ ] Open Cost Explorer
[ ] Establish the shutdown checklist
```
## Phase 1: Network
```
[ ] Create pet-shop-vpc
[ ] Enable DNS resolution and DNS hostnames
[ ] Create one public and two private subnets
[ ] Create and attach pet-shop-igw
[ ] Create public and private route tables
[ ] Create pet-shop-backend-sg
[ ] Create pet-shop-rds-sg
[ ] Create pet-shop-db-subnet-group
[ ] Do not create a NAT Gateway
```
## Phase 2: RDS
```
[ ] Create private Single-AZ pet-shop-mysql
[ ] Save master credentials securely
[ ] Create pet_shop_app
[ ] Create pet_shop_migration
[ ] Test EC2-to-RDS connectivity later from EC2
[ ] Configure backups
```
## Phase 3: EC2 and Spring Boot
```
[ ] Create pet-shop-backend-ec2
[ ] Attach pet-shop-backend-sg
[ ] Attach pet-shop-backend-ec2-role
[ ] Configure Session Manager
[ ] Remove SSH after Session Manager works
[ ] Install Java and Nginx
[ ] Deploy the versioned JAR
[ ] Run Spring Boot as the petshop Linux user
[ ] Bind Spring Boot to 127.0.0.1:8080
[ ] Configure Nginx
[ ] Test health and implemented APIs
```
## Phase 4: HTTPS and React
```
[ ] Decide whether to purchase/use a domain
[ ] Configure API DNS and Let's Encrypt for direct EC2
[ ] Create the private React S3 bucket
[ ] Create CloudFront with Origin Access Control
[ ] Configure React routing fallback carefully
[ ] Deploy React with correct cache headers
[ ] Configure the production API base URL
[ ] Restrict Spring Boot CORS to trusted origins
```
## Phase 5: Product images
```
[ ] Create the private product-image S3 bucket
[ ] Add the limited S3 IAM policy to the EC2 role
[ ] Create product_images through Flyway
[ ] Implement authorization and validation
[ ] Implement presigned upload request and completion APIs
[ ] Configure narrow S3 CORS
[ ] Implement listing, primary selection, and deletion
[ ] Add orphan and failed-deletion cleanup
[ ] Deliver public catalog images through CloudFront when ready
```
## Phase 6: Operations
```
[ ] Configure CloudWatch metrics and selected logs
[ ] Set log retention
[ ] Create actionable alarms
[ ] Test RDS restore
[ ] Add S3 lifecycle rules only after reviewing retention
[ ] Document deployment and rollback
[ ] Review Cost Explorer after each phase
```

---
# Final Acceptance Criteria
The learning deployment is complete only when:
```
[ ] React loads through HTTPS
[ ] React calls the Spring Boot API successfully
[ ] The API uses HTTPS when real credentials or data are involved
[ ] Spring Boot is not directly reachable on port 8080
[ ] RDS is not publicly accessible
[ ] RDS accepts 3306 only from pet-shop-backend-sg
[ ] Spring Boot uses pet_shop_app rather than the RDS master account
[ ] Flyway migrations are reviewed and reproducible
[ ] AWS credentials are absent from Git, React, and EC2 files
[ ] EC2 uses an IAM role for S3 and Systems Manager
[ ] The product-image S3 bucket blocks public access
[ ] RDS stores S3 object keys rather than temporary URLs
[ ] Product-image uploads enforce authorization, size, type, and dimension rules
[ ] Backups and a restoration test exist
[ ] CloudWatch retention is finite
[ ] Budget alerts and the shutdown routine are active
[ ] A previous backend JAR can be restored during rollback
```

---
# Decisions Requiring Approval
Approve these before implementation:

|   |   |
|---|---|
|Decision|Recommended learning choice|
|AWS Region|ap-southeast-1|
|Java version|Java 21 LTS|
|Database migration|Flyway|
|Database deployment|Single-AZ learning instance|
|Backend compute|One public EC2 instance|
|Server administration|Systems Manager Session Manager|
|Public SSH|Remove after Session Manager works|
|Backend internal port|127.0.0.1:8080|
|API HTTPS|Nginx + Let's Encrypt when a domain exists|
|React hosting|Private S3 + CloudFront OAC|
|Product-image bucket|Private S3|
|Initial upload method|Direct presigned upload is the target; MultipartFile is acceptable as a first exercise|
|Initial image limit|5 MB|
|Required image formats|JPEG and PNG|
|Optional image format|WebP after Java decoder verification|
|Image delivery|CloudFront for public catalog images; presigned GET for private images|
|Initial secret storage|Protected EC2 environment file|
|Next secret improvement|Systems Manager Parameter Store SecureString|
|NAT Gateway|Do not create|
|Application Load Balancer|Do not create|
|Lambda/SQS|Do not create until an asynchronous requirement is approved|

---
# Official AWS References
- [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [VPC Internet Gateway](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html)
- [RDS in a VPC](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html)
- [IAM roles for EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html)
- [Systems Manager Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
- [S3 bucket naming rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html)
- [S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [CloudFront Origin Access Control for S3](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [S3 Gateway Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)