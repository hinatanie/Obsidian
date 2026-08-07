# Main Problem
Before creating the RDS MySQL database, confirm that the networking, security, IAM role, and cost alerts are ready.
Complete these checks in:
```
Region: Asia Pacific (Singapore)
Region code: ap-southeast-1
```
# Problem 1: Confirm `pet-shop-vpc` exists
## Solution
Open:
```
AWS Console
→ VPC
→ Your VPCs
```
Find:
```
pet-shop-vpc
```
Select it and verify:
```
State: Available
IPv4 CIDR: 10.0.0.0/16
Default VPC: No
DNS resolution: Enabled
DNS hostnames: Enabled
```
Your expected result is:
```
Name: pet-shop-vpc
CIDR: 10.0.0.0/16
State: Available
```
Do not continue with RDS if you accidentally selected the AWS default VPC.
Checklist:
```
[ ] pet-shop-vpc exists
[ ] State is Available
[ ] CIDR is 10.0.0.0/16
[ ] It is not the default VPC
[ ] DNS resolution is enabled
[ ] DNS hostnames are enabled
```
# Problem 2: Confirm the public route table
## Solution
Open:
```
VPC
→ Route tables
```
Select:
```
pet-shop-public-rt
```
## Check the Routes tab
You should see:
```
10.0.0.0/16 → local
0.0.0.0/0   → pet-shop-igw
```
Both routes should show:
```
Status: Active
```
## Check the Subnet associations tab
Open:
```
Subnet associations
```
Under explicit associations, confirm:
```
pet-shop-public-subnet-1
10.0.1.0/24
```
The public route table must not include:
```
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
A subnet follows the routes in its associated route table. The Internet Gateway route is what gives the public subnet an internet path.
Checklist:
```
[ ] pet-shop-public-rt exists
[ ] 10.0.0.0/16 → local is Active
[ ] 0.0.0.0/0 → pet-shop-igw is Active
[ ] pet-shop-public-subnet-1 is explicitly associated
[ ] Neither private RDS subnet is associated
```
# Problem 3: Confirm the private route table
## Solution
Open:
```
VPC
→ Route tables
→ pet-shop-private-rt
```
## Check the Routes tab
It should contain only:
```
10.0.0.0/16 → local
```
It must not contain:
```
0.0.0.0/0 → pet-shop-igw
0.0.0.0/0 → NAT Gateway
```
## Check the Subnet associations tab
Confirm these two explicit associations:
```
pet-shop-private-subnet-1
10.0.2.0/24
pet-shop-private-subnet-2
10.0.3.0/24
```
Do not associate:
```
pet-shop-public-subnet-1
```
Checklist:
```
[ ] pet-shop-private-rt exists
[ ] It contains 10.0.0.0/16 → local
[ ] It has no Internet Gateway route
[ ] It has no NAT Gateway route
[ ] pet-shop-private-subnet-1 is associated
[ ] pet-shop-private-subnet-2 is associated
[ ] pet-shop-public-subnet-1 is not associated
```
# Problem 4: Confirm the RDS DB subnet group
## Solution
Open:
```
AWS Console
→ RDS
→ Subnet groups
```
Select:
```
pet-shop-db-subnet-group
```
Verify:
```
VPC: pet-shop-vpc
Status: Complete
```
The subnet list should contain:

|Subnet|Availability Zone|CIDR|
|---|---|---|
|`pet-shop-private-subnet-1`|`ap-southeast-1a`|`10.0.2.0/24`|
|`pet-shop-private-subnet-2`|`ap-southeast-1b`|`10.0.3.0/24`|
It should not contain:
```
pet-shop-public-subnet-1
```
RDS requires the selected DB subnet group to cover at least two Availability Zones.
Checklist:
```
[ ] pet-shop-db-subnet-group exists
[ ] VPC is pet-shop-vpc
[ ] Status is Complete
[ ] pet-shop-private-subnet-1 is included
[ ] pet-shop-private-subnet-2 is included
[ ] ap-southeast-1a is covered
[ ] ap-southeast-1b is covered
[ ] The public subnet is not included
```
# Problem 5: Confirm `pet-shop-backend-sg`
## Solution
Open:
```
EC2
→ Network & Security
→ Security Groups
```
Select:
```
pet-shop-backend-sg
```
Verify:
```
VPC: pet-shop-vpc
```
The final preferred inbound rules are:

|Type|Port|Source|
|---|---|---|
|HTTP|`80`|`0.0.0.0/0`|
|HTTPS|`443`|`0.0.0.0/0`|
You may temporarily have:
```
SSH
TCP 22
your-current-public-IP/32
```
Remove that SSH rule after Session Manager works.
You should not see:
```
TCP 8080 from 0.0.0.0/0
MySQL 3306
All traffic inbound
SSH 22 from 0.0.0.0/0
```
Checklist:
```
[ ] pet-shop-backend-sg exists
[ ] It belongs to pet-shop-vpc
[ ] HTTP 80 is allowed
[ ] HTTPS 443 is allowed
[ ] Port 8080 is not publicly exposed
[ ] Port 3306 is not an inbound backend rule
[ ] SSH is absent or restricted to your current IP
```
# Problem 6: Confirm the RDS security group
## Solution
Select:
```
pet-shop-rds-sg
```
Verify:
```
VPC: pet-shop-vpc
```
Open:
```
Inbound rules
```
You should see exactly this database-access rule:
```
Type: MySQL/Aurora
Protocol: TCP
Port: 3306
Source: pet-shop-backend-sg
```
The source may appear as a generated security-group ID:
```
sg-xxxxxxxxxxxxxxxxx
```
Select or inspect it and confirm its name is:
```
pet-shop-backend-sg
```
You must not see:
```
3306 from 0.0.0.0/0
3306 from your public IP
3306 from 10.0.0.0/16
All traffic inbound
```
Using the backend security group as the source allows resources attached to that group to connect to RDS on port `3306`.
Checklist:
```
[ ] pet-shop-rds-sg exists
[ ] It belongs to pet-shop-vpc
[ ] MySQL/Aurora uses TCP 3306
[ ] Source is pet-shop-backend-sg
[ ] Source is not 0.0.0.0/0
[ ] Source is not your laptop IP
[ ] No other unnecessary inbound rules exist
```
# Problem 7: Confirm the EC2 IAM role
## Solution
Open:
```
AWS Console
→ IAM
→ Roles
```
Search for:
```
pet-shop-backend-ec2-role
```
Open it.
## Check Permissions
Under:
```
Permissions
```
Confirm:
```
AmazonSSMManagedInstanceCore
```
Do not attach:
```
AdministratorAccess
AmazonS3FullAccess
PowerUserAccess
```
## Check Trust relationships
Open:
```
Trust relationships
```
Confirm the trusted service is:
```
ec2.amazonaws.com
```
Conceptually, it should say:
```
EC2 is allowed to assume pet-shop-backend-ec2-role
```
## Check the EC2 instance
Open:
```
EC2
→ Instances
→ Select the Pet Shop backend instance
```
Under instance details, verify:
```
IAM role: pet-shop-backend-ec2-role
```
Also make sure the backend EC2 instance is now in the correct subnet:
```
Subnet: pet-shop-public-subnet-1
Private IPv4: 10.0.1.x
```
It should not be in:
```
pet-shop-private-subnet-1
10.0.2.x
```
Checklist:
```
[ ] pet-shop-backend-ec2-role exists
[ ] It trusts EC2
[ ] AmazonSSMManagedInstanceCore is attached
[ ] AdministratorAccess is not attached
[ ] AmazonS3FullAccess is not attached
[ ] The role is attached to the backend EC2 instance
[ ] The EC2 instance is in pet-shop-public-subnet-1
```
# Problem 8: Confirm the USD 5 budget and notifications
## Solution
Open:
```
AWS Console
→ Billing and Cost Management
→ Budgets
```
Find your learning budget, for example:
```
auction-learning-monthly-budget
```
or a Pet Shop-specific budget name.
Open it and verify:
```
Budget type: Cost budget
Period: Monthly
Budget amount: USD 5
Renewal: Recurring
```
Then find the section named:
```
Alerts
```
or:
```
Notifications
```
Confirm your email address is attached to the intended thresholds.
Recommended alerts:
```
50% of USD 5  → USD 2.50
80% of USD 5  → USD 4.00
100% of USD 5 → USD 5.00
```
Check your email inbox for any AWS subscription or verification message when applicable.
AWS shows budget status, current spending, forecast information, and alerts from the Budgets overview and budget details pages. Budget notifications warn you about costs, but costs can continue increasing after an alert is sent.
Checklist:
```
[ ] Monthly cost budget exists
[ ] Budget amount is USD 5
[ ] Budget is recurring
[ ] 50% alert exists
[ ] 80% alert exists
[ ] 100% alert exists
[ ] Correct email recipient is configured
[ ] Notification email was not sent to spam
```
# Final prerequisite review
Before selecting **Create database**, your final checklist should be:
```
[x] pet-shop-vpc exists
[x] VPC CIDR is 10.0.0.0/16
[x] VPC DNS resolution is enabled
[x] VPC DNS hostnames are enabled
[x] pet-shop-public-rt has 0.0.0.0/0 → pet-shop-igw
[x] pet-shop-public-subnet-1 uses pet-shop-public-rt
[x] pet-shop-private-rt has only the local route
[x] Both private subnets use pet-shop-private-rt
[x] pet-shop-db-subnet-group covers ap-southeast-1a
[x] pet-shop-db-subnet-group covers ap-southeast-1b
[x] Only private subnets are in the DB subnet group
[x] pet-shop-backend-sg exists
[x] pet-shop-rds-sg exists
[x] RDS allows TCP 3306 only from pet-shop-backend-sg
[x] pet-shop-backend-ec2-role exists
[x] AmazonSSMManagedInstanceCore is attached
[x] The EC2 trust relationship is correct
[x] USD 5 monthly budget exists
[x] 50%, 80%, and 100% notifications exist
```
When every item above is correct, you are ready to create:
```
RDS MySQL
DB identifier: pet-shop-mysql
VPC: pet-shop-vpc
DB subnet group: pet-shop-db-subnet-group
Public access: No
Security group: pet-shop-rds-sg
```