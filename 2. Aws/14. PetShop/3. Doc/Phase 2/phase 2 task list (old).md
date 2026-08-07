# Main Problem
Your Auction application needs a secure AWS network before you create the EC2 backend server and the RDS MySQL database.
You need to build:
```text
auction-vpc
├── Public subnet
│   └── EC2 Spring Boot backend
└── Private subnets
    └── RDS MySQL
```
Complete the following tasks in order.

---
# Task 1: Create the VPC
Create a dedicated VPC for the Auction application.
```text
Name: auction-vpc
IPv4 CIDR: 10.0.0.0/16
```
Checklist:
```text
[ ] Open the VPC Console
[ ] Select Your VPCs
[ ] Select Create VPC
[ ] Choose VPC only
[ ] Enter the name auction-vpc
[ ] Enter the CIDR 10.0.0.0/16
[ ] Create the VPC
```
Do not use the default VPC for this project.

---
# Task 2: Create the Public Subnet
This subnet will contain the EC2 instance running:
```text
Spring Boot
Nginx
The public backend API
```
Create:
```text
Name: auction-public-subnet-1
VPC: auction-vpc
Availability Zone: ap-southeast-1a
IPv4 CIDR: 10.0.1.0/24
```
Checklist:
```text
[ ] Open Subnets
[ ] Select Create subnet
[ ] Select auction-vpc
[ ] Create auction-public-subnet-1
[ ] Use CIDR 10.0.1.0/24
[ ] Use Availability Zone ap-southeast-1a
[ ] Enable auto-assign public IPv4
```
The EC2 backend will be created in this subnet later.

---
# Task 3: Create the First Private Subnet
This subnet will be used by RDS MySQL.
Create:
```text
Name: auction-private-subnet-1
VPC: auction-vpc
Availability Zone: ap-southeast-1a
IPv4 CIDR: 10.0.2.0/24
```
Checklist:
```text
[ ] Create auction-private-subnet-1
[ ] Use CIDR 10.0.2.0/24
[ ] Use Availability Zone ap-southeast-1a
[ ] Keep auto-assign public IPv4 disabled
```

---
# Task 4: Create the Second Private Subnet
RDS requires a DB subnet group containing subnets in at least two different Availability Zones.
Create:
```text
Name: auction-private-subnet-2
VPC: auction-vpc
Availability Zone: ap-southeast-1b
IPv4 CIDR: 10.0.3.0/24
```
Checklist:
```text
[ ] Create auction-private-subnet-2
[ ] Use CIDR 10.0.3.0/24
[ ] Use Availability Zone ap-southeast-1b
[ ] Keep auto-assign public IPv4 disabled
```

---
# Task 5: Create the Internet Gateway
The Internet Gateway allows the EC2 instance in the public subnet to communicate with the internet.
Create:
```text
Name: auction-igw
```
Checklist:
```text
[ ] Open Internet gateways
[ ] Select Create internet gateway
[ ] Enter the name auction-igw
[ ] Create the Internet Gateway
[ ] Attach auction-igw to auction-vpc
```
Creating the Internet Gateway is not enough. You must also add it to the public route table.

---
# Task 6: Create the Public Route Table
The public route table allows internet traffic to reach the public subnet.
Create:
```text
Name: auction-public-rt
VPC: auction-vpc
```
Checklist:
```text
[ ] Open Route tables
[ ] Create auction-public-rt
[ ] Select auction-vpc
```
Add this route:
```text
Destination: 0.0.0.0/0
Target: auction-igw
```
The route table will also contain the automatic local route:
```text
10.0.0.0/16 → local
```
Associate the route table with:
```text
auction-public-subnet-1
```
Complete checklist:
```text
[ ] Create auction-public-rt
[ ] Add 0.0.0.0/0 → auction-igw
[ ] Associate it with auction-public-subnet-1
```
After this, `auction-public-subnet-1` becomes a public subnet.

---
# Task 7: Create the Private Route Table
The private route table will be used by the RDS subnets.
Create:
```text
Name: auction-private-rt
VPC: auction-vpc
```
It should initially contain only:
```text
10.0.0.0/16 → local
```
Do not add:
```text
0.0.0.0/0 → Internet Gateway
```
Associate it with:
```text
auction-private-subnet-1
auction-private-subnet-2
```
Checklist:
```text
[ ] Create auction-private-rt
[ ] Do not add an Internet Gateway route
[ ] Associate it with auction-private-subnet-1
[ ] Associate it with auction-private-subnet-2
```

---
# Task 8: Create the Backend Security Group
This security group protects the EC2 backend server.
Create:
```text
Name: auction-backend-sg
Description: Security group for Auction Spring Boot backend
VPC: auction-vpc
```
Add these inbound rules:
```text
HTTP
Port: 80
Source: 0.0.0.0/0
```
```text
HTTPS
Port: 443
Source: 0.0.0.0/0
```
```text
SSH
Port: 22
Source: My IP
```
For temporary Spring Boot testing, you may also add:
```text
Custom TCP
Port: 8080
Source: My IP
```
Do not use:
```text
Port 8080
Source: 0.0.0.0/0
```
That would allow everyone on the internet to access Spring Boot directly.
Checklist:
```text
[ ] Create auction-backend-sg
[ ] Allow HTTP port 80 from anywhere
[ ] Allow HTTPS port 443 from anywhere
[ ] Allow SSH port 22 from your IP only
[ ] Optionally allow port 8080 from your IP only
[ ] Do not expose port 8080 publicly
```

---
# Task 9: Create the RDS Security Group
This security group protects the MySQL database.
Create:
```text
Name: auction-rds-sg
Description: Security group for Auction RDS MySQL
VPC: auction-vpc
```
Add this inbound rule:
```text
Type: MySQL/Aurora
Port: 3306
Source: auction-backend-sg
```
Do not set the source to:
```text
0.0.0.0/0
```
Using `auction-backend-sg` as the source means that only resources using the backend security group can connect to MySQL.
Checklist:
```text
[ ] Create auction-rds-sg
[ ] Allow MySQL port 3306
[ ] Set the source to auction-backend-sg
[ ] Do not allow port 3306 from the public internet
```

---
# Task 10: Create the RDS DB Subnet Group
The DB subnet group tells RDS which private subnets it may use.
Open the RDS Console and create:
```text
Name: auction-db-subnet-group
Description: Private subnets for Auction RDS
VPC: auction-vpc
```
Add:
```text
auction-private-subnet-1
auction-private-subnet-2
```
Checklist:
```text
[ ] Open the RDS Console
[ ] Open Subnet groups
[ ] Create auction-db-subnet-group
[ ] Select auction-vpc
[ ] Select ap-southeast-1a
[ ] Select auction-private-subnet-1
[ ] Select ap-southeast-1b
[ ] Select auction-private-subnet-2
[ ] Create the DB subnet group
```
You will select this DB subnet group when you create RDS MySQL later.

---
# Task 11: Do Not Create a NAT Gateway Yet
Do not create a NAT Gateway during the first version of Phase 2.
Your current architecture is:
```text
EC2 backend → public subnet
RDS MySQL → private subnets
```
The RDS database does not need direct internet access.
Checklist:
```text
[ ] Do not create a NAT Gateway
[ ] Create one later only when a private resource needs outbound internet access
```
This avoids unnecessary AWS charges.

---
# Task 12: Do Not Create an S3 VPC Endpoint Yet
An S3 Gateway Endpoint is useful, but it is not required during the first network setup.
The EC2 instance in the public subnet can initially access S3 through the Internet Gateway.
Checklist:
```text
[ ] Do not create the S3 endpoint yet
[ ] First make EC2-to-S3 image upload work
[ ] Add an S3 Gateway Endpoint later
```

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

---
# Final Phase 2 Checklist
Complete these tasks now:
```text
[ ] Task 1: Create auction-vpc
[ ] Task 2: Create auction-public-subnet-1
[ ] Task 3: Create auction-private-subnet-1
[ ] Task 4: Create auction-private-subnet-2
[ ] Task 5: Create auction-igw
[ ] Task 6: Attach auction-igw to auction-vpc
[ ] Task 7: Create auction-public-rt
[ ] Task 8: Add 0.0.0.0/0 → auction-igw
[ ] Task 9: Associate auction-public-rt with auction-public-subnet-1
[ ] Task 10: Create auction-private-rt
[ ] Task 11: Associate auction-private-rt with both private subnets
[ ] Task 12: Create auction-backend-sg
[ ] Task 13: Add ports 80, 443, and restricted port 22
[ ] Task 14: Create auction-rds-sg
[ ] Task 15: Allow port 3306 from auction-backend-sg only
[ ] Task 16: Create auction-db-subnet-group
[ ] Task 17: Add both private subnets to the DB subnet group
```
Do not do these tasks yet:
```text
[ ] Do not create a NAT Gateway
[ ] Do not create an S3 VPC Endpoint yet
[ ] Do not enable VPC Flow Logs yet
[ ] Do not make RDS publicly accessible
```
# Expected Architecture
```text
auction-vpc
CIDR: 10.0.0.0/16
├── auction-public-subnet-1
│   CIDR: 10.0.1.0/24
│   AZ: ap-southeast-1a
│   Public IPv4: Enabled
│
│   └── Future EC2
│       ├── Spring Boot
│       ├── Nginx
│       └── Public IP
│
├── auction-private-subnet-1
│   CIDR: 10.0.2.0/24
│   AZ: ap-southeast-1a
│
└── auction-private-subnet-2
    CIDR: 10.0.3.0/24
    AZ: ap-southeast-1b
```
Network components:
```text
auction-igw
└── Attached to auction-vpc
auction-public-rt
├── 10.0.0.0/16 → local
└── 0.0.0.0/0 → auction-igw
auction-private-rt
└── 10.0.0.0/16 → local
```
Security:
```text
auction-backend-sg
├── 80 from 0.0.0.0/0
├── 443 from 0.0.0.0/0
└── 22 from your IP only
auction-rds-sg
└── 3306 from auction-backend-sg only
```
After completing Phase 2, your AWS network will be ready for:
```text
Creating the EC2 Spring Boot backend
Creating the private RDS MySQL database
Connecting Spring Boot to MySQL
Receiving API requests through HTTP or HTTPS
Deploying the React frontend through S3 and CloudFront later
```