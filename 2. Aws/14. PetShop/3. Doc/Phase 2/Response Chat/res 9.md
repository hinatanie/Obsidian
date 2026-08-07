# Main Problem
Your RDS MySQL database must accept connections from the FastAPI backend, but it must **not** accept database connections directly from the internet.
You will create:
```
Name: auction-rds-sg
Description: Security group for Auction RDS MySQL
VPC: auction-vpc
```
Then add one inbound rule:
```
MySQL/Aurora
TCP 3306
Source: auction-backend-sg
```
This means AWS checks whether the connecting resource uses `auction-backend-sg`. It does not rely on your EC2 instance’s public IP address. AWS applies security-group references using the private IP addresses of resources associated with the source security group.
# Problem 1: Open Security Groups
## Solution
1. Sign in to AWS using:
```
auction-dev-admin
```
2. Confirm the Region in the upper-right corner is:
```
Singapore
ap-southeast-1
```
3. Search for:
```
EC2
```
4. Open the **EC2** service.
5. In the left menu, find:
```
Network & Security
```
6. Select:
```
Security Groups
```
7. Select:
```
Create security group
```
AWS lets you create the security group first and configure its inbound and outbound rules on the same page.
# Problem 2: Enter the security group details
## Solution
Under **Basic details**, enter:
### Security group name
```
auction-rds-sg
```
### Description
```
Security group for Auction RDS MySQL
```
### VPC
Select:
```
auction-vpc
```
Confirm the VPC CIDR is:
```
10.0.0.0/16
```
Be careful not to choose the default VPC.
Your form should look like:
```
Security group name: auction-rds-sg
Description: Security group for Auction RDS MySQL
VPC: auction-vpc
```
Security groups that reference each other should belong to the correct VPC configuration. Your backend and RDS security groups are both being created inside `auction-vpc`.
# Problem 3: Add the MySQL inbound rule
## Solution
Under **Inbound rules**:
1. Select:
```
Add rule
```
2. Under **Type**, select:
```
MySQL/Aurora
```
AWS should automatically set:
```
Protocol: TCP
Port range: 3306
```
Port `3306` is the standard MySQL and Aurora MySQL connection port.
Your rule is not complete yet. You must configure the source correctly.
# Problem 4: Select `auction-backend-sg` as the source
## Solution
In the new inbound rule, locate the **Source** field.
Depending on the current AWS Console interface, you may see a source-type dropdown. Select:
```
Custom
```
Then click inside the source search box.
Search for:
```
auction-backend-sg
```
AWS should display something similar to:
```
auction-backend-sg
sg-0123456789abcdef0
```
Select that security group.
Your completed inbound rule should look like:

|Type|Protocol|Port|Source|
|---|---|---|---|
|MySQL/Aurora|TCP|`3306`|`auction-backend-sg`|
The source might be displayed primarily by its security-group ID:
```
sg-xxxxxxxxxxxxxxxxx
```
That is normal. Confirm the attached name is `auction-backend-sg`.
AWS supports using one security group as the source of an inbound rule in another security group. This allows resources associated with the source group to reach the destination group on the permitted port.
# Problem 5: Do not select an IP-based source
## Solution
Do not choose:
```
Anywhere-IPv4
0.0.0.0/0
```
That would allow connection attempts to MySQL from every public IPv4 address, provided the database were otherwise reachable.
Also do not choose:
```
My IP
your-public-IP/32
```
Your laptop does not need direct access to the production RDS database.
The correct source is:
```
auction-backend-sg
```
This produces the intended permission:
```
A resource using auction-backend-sg
        ↓ TCP port 3306
A resource using auction-rds-sg
```
It does **not** mean every resource in the VPC can access MySQL.
# Problem 6: Understand what the security-group reference means
## Solution
Later, your EC2 instance will use:
```
auction-backend-sg
```
Your RDS database will use:
```
auction-rds-sg
```
When FastAPI connects to the database:
```
EC2 private IP
Security group: auction-backend-sg
                ↓
             TCP 3306
                ↓
RDS private address
Security group: auction-rds-sg
```
The RDS security group checks:
```
Is the incoming connection from a resource associated
with auction-backend-sg?
```
When the answer is yes, TCP port `3306` is allowed.
This rule does not connect the EC2 instance to RDS by itself. You will still need:
```
EC2 and RDS inside auction-vpc
RDS endpoint and correct port
Correct database username and password
RDS marked as not publicly accessible
Network routing through the VPC local route
FastAPI database configuration
```
# Problem 7: Check the outbound rules
## Solution
Under **Outbound rules**, AWS normally provides:
```
Type: All traffic
Destination: 0.0.0.0/0
```
For this learning deployment, leave the default outbound rule unchanged.
A newly created security group normally begins with an outbound rule allowing all outbound traffic, while inbound traffic must be explicitly allowed.
# Problem 8: Create the security group
## Solution
Before creating it, confirm:
```
Name: auction-rds-sg
Description: Security group for Auction RDS MySQL
VPC: auction-vpc
```
Inbound rule:
```
Type: MySQL/Aurora
Protocol: TCP
Port: 3306
Source: auction-backend-sg
```
Then select:
```
Create security group
```
# Problem 9: Verify the result
## Solution
After creation:
1. Open:
```
EC2
→ Network & Security
→ Security Groups
```
2. Search for:
```
auction-rds-sg
```
3. Select it.
4. Open the **Inbound rules** tab.
Confirm that you see only:
```
MySQL/Aurora
TCP
3306
Source: auction-backend-sg
```
The source might appear as:
```
sg-xxxxxxxxxxxxxxxxx / auction-backend-sg
```
Your completed security group should look like:
```
auction-rds-sg
│
└── Inbound
    └── TCP 3306
        └── Source: auction-backend-sg
```
# Problem 10: Do not add Lambda access yet
## Solution
Do not add a Lambda rule now.
Later, when your Lambda function genuinely needs database access, you will create:
```
auction-lambda-sg
```
Then add another inbound rule to `auction-rds-sg`:
```
Type: MySQL/Aurora
Port: 3306
Source: auction-lambda-sg
```
The future result would be:
```
auction-rds-sg
│
├── TCP 3306 from auction-backend-sg
└── TCP 3306 from auction-lambda-sg
```
For now, keep only the backend rule.
# Final Checklist
```
[ ] Opened EC2 → Security Groups
[ ] Selected Create security group
[ ] Entered auction-rds-sg
[ ] Entered Security group for Auction RDS MySQL
[ ] Selected auction-vpc
[ ] Added MySQL/Aurora TCP port 3306
[ ] Selected auction-backend-sg as the source
[ ] Did not select 0.0.0.0/0
[ ] Did not select My IP
[ ] Did not add Lambda access yet
[ ] Created the security group
```
The security group is now ready, but it does not protect a database until you assign `auction-rds-sg` to the RDS instance during RDS creation.