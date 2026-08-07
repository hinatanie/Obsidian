# Main Problem
Your PetShop application needs a secure AWS network before you create the EC2 FastAPI backend server and the RDS MySQL database.
You need to build:
```text
PetShop-vpc
├── Public subnet
│   └── EC2 FastAPI backend
└── Private subnets
    └── RDS MySQL
```
The EC2 instance will later run:
```text
FastAPI
Uvicorn or Gunicorn
Nginx
```
Complete the following tasks in order.

---
# Task 1: Create the VPC
Create a dedicated VPC for the PetShop application.
```text
Name: PetShop-vpc
IPv4 CIDR: 10.0.0.0/16
```
Checklist:
```text
[ ] Open the VPC Console
[ ] Select Your VPCs
[ ] Select Create VPC
[ ] Choose VPC only
[ ] Enter the name PetShop-vpc
[ ] Enter the CIDR 10.0.0.0/16
[ ] Create the VPC
```
Do not use the default VPC for this project.

---
# Task 2: Create the Public Subnet
This subnet will contain the EC2 instance running:
```text
FastAPI
Uvicorn or Gunicorn
Nginx
The public backend API
```
Create:
```text
Name: PetShop-public-subnet-1
VPC: PetShop-vpc
Availability Zone: ap-southeast-1a
IPv4 CIDR: 10.0.1.0/24
```
Checklist:
```text
[ ] Open Subnets
[ ] Select Create subnet
[ ] Select PetShop-vpc
[ ] Create PetShop-public-subnet-1
[ ] Use CIDR 10.0.1.0/24
[ ] Use Availability Zone ap-southeast-1a
[ ] Enable auto-assign public IPv4
```
The EC2 FastAPI backend will be created in this subnet later.

---
# Task 3: Create the First Private Subnet
This subnet will be used by RDS MySQL.
Create:
```text
Name: PetShop-private-subnet-1
VPC: PetShop-vpc
Availability Zone: ap-southeast-1a
IPv4 CIDR: 10.0.2.0/24
```
Checklist:
```text
[ ] Create PetShop-private-subnet-1
[ ] Use CIDR 10.0.2.0/24
[ ] Use Availability Zone ap-southeast-1a
[ ] Keep auto-assign public IPv4 disabled
```
The RDS database will not receive a public IPv4 address.

---
# Task 4: Create the Second Private Subnet
RDS requires a DB subnet group containing subnets in at least two different Availability Zones.
Create:
```text
Name: PetShop-private-subnet-2
VPC: PetShop-vpc
Availability Zone: ap-southeast-1b
IPv4 CIDR: 10.0.3.0/24
```
Checklist:
```text
[ ] Create PetShop-private-subnet-2
[ ] Use CIDR 10.0.3.0/24
[ ] Use Availability Zone ap-southeast-1b
[ ] Keep auto-assign public IPv4 disabled
```
The two private subnets are in different Availability Zones:
```text
PetShop-private-subnet-1 → ap-southeast-1a
PetShop-private-subnet-2 → ap-southeast-1b
```

---
# Task 5: Create the Internet Gateway
The Internet Gateway allows the EC2 instance in the public subnet to communicate with the internet.
Create:
```text
Name: PetShop-igw
```
Checklist:
```text
[ ] Open Internet gateways
[ ] Select Create internet gateway
[ ] Enter the name PetShop-igw
[ ] Create the Internet Gateway
[ ] Attach PetShop-igw to PetShop-vpc
```
Creating and attaching the Internet Gateway is not enough.
You must also create a route from the public subnet to the Internet Gateway.

---
# Task 6: Create the Public Route Table
The public route table allows internet-bound traffic from the public subnet to reach the Internet Gateway.
Create:
```text
Name: PetShop-public-rt
VPC: PetShop-vpc
```
Checklist:
```text
[ ] Open Route tables
[ ] Select Create route table
[ ] Enter PetShop-public-rt
[ ] Select PetShop-vpc
[ ] Create the route table
```
Add this route:
```text
Destination: 0.0.0.0/0
Target: PetShop-igw
```
The route table will also contain the automatic local route:
```text
10.0.0.0/16 → local
```
Associate the route table with:
```text
PetShop-public-subnet-1
```
Complete checklist:
```text
[ ] Create PetShop-public-rt
[ ] Add 0.0.0.0/0 → PetShop-igw
[ ] Associate PetShop-public-rt with PetShop-public-subnet-1
```
After this association, `PetShop-public-subnet-1` becomes a public subnet.
Its route table will look like:
```text
10.0.0.0/16 → local
0.0.0.0/0   → PetShop-igw
```

---
# Task 7: Create the Private Route Table
The private route table will be used by the RDS subnets.
Create:
```text
Name: PetShop-private-rt
VPC: PetShop-vpc
```
It should initially contain only:
```text
10.0.0.0/16 → local
```
Do not add:
```text
0.0.0.0/0 → Internet Gateway
```
An Internet Gateway route would make the route table unsuitable for the private RDS subnets.
Associate the private route table with:
```text
PetShop-private-subnet-1
PetShop-private-subnet-2
```
Checklist:
```text
[ ] Create PetShop-private-rt
[ ] Confirm it contains the local route
[ ] Do not add an Internet Gateway route
[ ] Associate it with PetShop-private-subnet-1
[ ] Associate it with PetShop-private-subnet-2
```
The private route table should look like:
```text
10.0.0.0/16 → local
```
This local route allows EC2 and RDS resources inside `PetShop-vpc` to communicate when their security groups allow it.

---
# Task 8: Create the Backend Security Group
This security group protects the EC2 FastAPI backend server.
Create:
```text
Name: PetShop-backend-sg
Description: Security group for PetShop FastAPI backend
VPC: PetShop-vpc
```
Add these inbound rules.
## HTTP
```text
Type: HTTP
Port: 80
Source: 0.0.0.0/0
```
Nginx will receive normal HTTP requests on port `80`.
## HTTPS
```text
Type: HTTPS
Port: 443
Source: 0.0.0.0/0
```
Nginx will receive secure HTTPS requests on port `443` after HTTPS is configured.
## SSH
```text
Type: SSH
Port: 22
Source: My IP
```
Only your current public IP address should be allowed to connect through SSH.
## Temporary FastAPI Testing
For temporary FastAPI testing, you may also add:
```text
Type: Custom TCP
Port: 8000
Source: My IP
```
FastAPI commonly runs through Uvicorn on port `8000`.
For example:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Do not use:
```text
Port: 8000
Source: 0.0.0.0/0
```
That would allow everyone on the internet to access FastAPI directly and bypass Nginx.
The final production request flow should be:
```text
Internet
   ↓
Port 80 or 443
   ↓
Nginx
   ↓
127.0.0.1:8000
   ↓
FastAPI
```
Checklist:
```text
[ ] Create PetShop-backend-sg
[ ] Allow HTTP port 80 from anywhere
[ ] Allow HTTPS port 443 from anywhere
[ ] Allow SSH port 22 from your IP only
[ ] Optionally allow port 8000 from your IP only
[ ] Do not expose port 8000 publicly
```
After Nginx is working, remove the temporary port `8000` inbound rule.
FastAPI should then listen only on:
```text
127.0.0.1:8000
```
Nginx will be the only public entry point.

---
# Task 9: Create the RDS Security Group
This security group protects the RDS MySQL database.
Create:
```text
Name: PetShop-rds-sg
Description: Security group for PetShop RDS MySQL
VPC: PetShop-vpc
```
Add this inbound rule:
```text
Type: MySQL/Aurora
Port: 3306
Source: PetShop-backend-sg
```
Do not set the source to:
```text
0.0.0.0/0
```
Using `PetShop-backend-sg` as the source means that only resources attached to the backend security group can connect to MySQL.
The connection will be:
```text
EC2 FastAPI
PetShop-backend-sg
        ↓
MySQL port 3306
        ↓
RDS MySQL
PetShop-rds-sg
```
Checklist:
```text
[ ] Create PetShop-rds-sg
[ ] Allow MySQL port 3306
[ ] Set the source to PetShop-backend-sg
[ ] Do not allow port 3306 from the public internet
[ ] Do not allow port 3306 directly from your laptop IP
```
Lambda access will be added later by creating:
```text
PetShop-lambda-sg
```
Then `PetShop-rds-sg` can allow:
```text
MySQL 3306 from PetShop-lambda-sg
```
Do not add that rule until you create Lambda functions that genuinely need to connect to RDS.

---
# Task 10: Create the RDS DB Subnet Group
The DB subnet group tells RDS which private subnets it may use.
Open the RDS Console and create:
```text
Name: PetShop-db-subnet-group
Description: Private subnets for PetShop RDS
VPC: PetShop-vpc
```
Add:
```text
PetShop-private-subnet-1
PetShop-private-subnet-2
```
The selected subnets must be in different Availability Zones:
```text
PetShop-private-subnet-1
Availability Zone: ap-southeast-1a
PetShop-private-subnet-2
Availability Zone: ap-southeast-1b
```
Checklist:
```text
[ ] Open the RDS Console
[ ] Open Subnet groups
[ ] Create PetShop-db-subnet-group
[ ] Select PetShop-vpc
[ ] Select ap-southeast-1a
[ ] Select PetShop-private-subnet-1
[ ] Select ap-southeast-1b
[ ] Select PetShop-private-subnet-2
[ ] Create the DB subnet group
```
You will select this DB subnet group when you create RDS MySQL later.

---
# Task 11: Do Not Create a NAT Gateway Yet
Do not create a NAT Gateway during the first version of Phase 2.
Your current architecture is:
```text
EC2 FastAPI backend → public subnet
RDS MySQL           → private subnets
```
The RDS database does not need direct internet access.
The EC2 instance can access the internet through:
```text
Public IPv4 address
        +
PetShop-public-rt
        +
PetShop-igw
```
Checklist:
```text
[ ] Do not create a NAT Gateway
[ ] Create one later only when a private resource needs outbound internet access
```
This avoids unnecessary AWS charges.
A NAT Gateway may be required later if a Lambda function inside the private subnets must call external internet services.

---
# Task 12: Do Not Create an S3 VPC Endpoint Yet
An S3 Gateway Endpoint is useful, but it is not required during the first network setup.
The EC2 instance in the public subnet can initially access S3 through the Internet Gateway.
The initial image-upload flow can be:
```text
React
   ↓
FastAPI on EC2
   ↓
Internet Gateway
   ↓
Amazon S3
```
Checklist:
```text
[ ] Do not create the S3 endpoint yet
[ ] First make EC2-to-S3 image upload work
[ ] Add an S3 Gateway Endpoint later
```
Later, an S3 Gateway Endpoint can allow VPC resources to access S3 through the AWS network without relying on normal internet routing.

---
# Task 13: Enable VPC Flow Logs Later
Do not enable VPC Flow Logs during the initial setup unless you need them for troubleshooting.
Flow Logs can later help answer questions such as:
```text
Why can EC2 not connect to RDS?
Why is the API timing out?
Is unusual traffic reaching the backend?
Is a network rule blocking traffic?
```
Checklist:
```text
[ ] First complete EC2 and RDS deployment
[ ] Later enable VPC Flow Logs
[ ] Send logs to CloudWatch Logs or S3
```
Flow Logs are useful for network visibility, but they are not required for the first working deployment.

---
# Final Phase 2 Checklist
Complete these tasks now:
```text
[ ] Task 1: Create PetShop-vpc
[ ] Task 2: Create PetShop-public-subnet-1
[ ] Task 3: Create PetShop-private-subnet-1
[ ] Task 4: Create PetShop-private-subnet-2
[ ] Task 5: Create PetShop-igw
[ ] Task 6: Attach PetShop-igw to PetShop-vpc
[ ] Task 7: Create PetShop-public-rt
[ ] Task 8: Add 0.0.0.0/0 → PetShop-igw
[ ] Task 9: Associate PetShop-public-rt with PetShop-public-subnet-1
[ ] Task 10: Create PetShop-private-rt
[ ] Task 11: Associate PetShop-private-rt with both private subnets
[ ] Task 12: Create PetShop-backend-sg
[ ] Task 13: Add ports 80, 443, and restricted port 22
[ ] Task 14: Optionally add port 8000 from your IP for temporary testing
[ ] Task 15: Create PetShop-rds-sg
[ ] Task 16: Allow port 3306 from PetShop-backend-sg only
[ ] Task 17: Create PetShop-db-subnet-group
[ ] Task 18: Add both private subnets to the DB subnet group
```
Do not do these tasks yet:
```text
[ ] Do not create a NAT Gateway
[ ] Do not create an S3 VPC Endpoint yet
[ ] Do not enable VPC Flow Logs yet
[ ] Do not make RDS publicly accessible
[ ] Do not expose FastAPI port 8000 to everyone
[ ] Do not allow MySQL port 3306 from 0.0.0.0/0
```
# Expected Architecture
```text
PetShop-vpc
CIDR: 10.0.0.0/16
│
├── PetShop-public-subnet-1
│   CIDR: 10.0.1.0/24
│   AZ: ap-southeast-1a
│   Public IPv4: Enabled
│
│   └── Future EC2
│       ├── FastAPI
│       ├── Uvicorn or Gunicorn
│       ├── Nginx
│       └── Public IPv4
│
├── PetShop-private-subnet-1
│   CIDR: 10.0.2.0/24
│   AZ: ap-southeast-1a
│   Public IPv4: Disabled
│
└── PetShop-private-subnet-2
    CIDR: 10.0.3.0/24
    AZ: ap-southeast-1b
    Public IPv4: Disabled
```
Network components:
```text
PetShop-igw
└── Attached to PetShop-vpc
PetShop-public-rt
├── 10.0.0.0/16 → local
└── 0.0.0.0/0 → PetShop-igw
PetShop-private-rt
└── 10.0.0.0/16 → local
```
Route-table associations:
```text
PetShop-public-subnet-1
└── PetShop-public-rt
PetShop-private-subnet-1
└── PetShop-private-rt
PetShop-private-subnet-2
└── PetShop-private-rt
```
Security:
```text
PetShop-backend-sg
├── Port 80 from 0.0.0.0/0
├── Port 443 from 0.0.0.0/0
├── Port 22 from your IP only
└── Port 8000 from your IP only
    └── Temporary testing only
PetShop-rds-sg
└── Port 3306 from PetShop-backend-sg only
```
RDS placement:
```text
PetShop-db-subnet-group
├── PetShop-private-subnet-1
└── PetShop-private-subnet-2
```
# Expected Request Flow
During temporary testing:
```text
Your computer
    ↓
EC2 public IPv4:8000
    ↓
Uvicorn
    ↓
FastAPI
```
For the final deployment:
```text
User
  ↓
HTTP 80 or HTTPS 443
  ↓
Nginx on EC2
  ↓
127.0.0.1:8000
  ↓
Gunicorn/Uvicorn
  ↓
FastAPI
  ↓
RDS MySQL on port 3306
```
# After Completing Phase 2
Your AWS network will be ready for:
```text
Creating the EC2 FastAPI backend
Installing Python and FastAPI on EC2
Running FastAPI with Uvicorn or Gunicorn
Configuring Nginx as a reverse proxy
Creating the private RDS MySQL database
Connecting FastAPI to RDS MySQL
Receiving API requests through HTTP or HTTPS
Deploying the React frontend through S3 and CloudFront later
Adding Lambda functions for short background jobs later
```
In simple terms:
```text
EC2 runs the main FastAPI backend.
Nginx receives public requests.
Uvicorn or Gunicorn runs FastAPI.
RDS stores the PetShop application data privately.
Lambda can be added later for background jobs.
```