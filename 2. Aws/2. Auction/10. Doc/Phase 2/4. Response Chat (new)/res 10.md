# Main Problem
Your RDS MySQL database needs a **DB subnet group** that tells RDS which private subnets it is allowed to use.
For your Pet Shop project, the group will contain:
```
pet-shop-private-subnet-1
→ ap-southeast-1a
→ 10.0.2.0/24
pet-shop-private-subnet-2
→ ap-southeast-1b
→ 10.0.3.0/24
```
The architecture will be:
```
pet-shop-db-subnet-group
├── pet-shop-private-subnet-1
│   └── ap-southeast-1a
└── pet-shop-private-subnet-2
    └── ap-southeast-1b
```
RDS DB subnet groups must include subnets in at least two Availability Zones, even when the initial database is Single-AZ.
# Problem 10: Create the RDS DB subnet group
## Solution
Create:
```
Name: pet-shop-db-subnet-group
Description: Private subnets for Pet Shop RDS
VPC: pet-shop-vpc
```
Add only:
```
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
Do not add:
```
pet-shop-public-subnet-1
```

---
# Problem 10.1: Open the Amazon RDS console
## Solution
In the AWS Management Console:
1. Confirm the Region in the upper-right corner is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
2. Use the search bar and search for:
```
RDS
```
3. Open:
```
Amazon RDS
```
The DB subnet group must be created in the same Region as your VPC and private subnets.

---
# Problem 10.2: Open the Subnet groups page
## Solution
In the left navigation menu of the RDS console, select:
```
Subnet groups
```
Depending on the current AWS console layout, it may appear under a section such as:
```
Network & Security
→ Subnet groups
```
Then select:
```
Create DB subnet group
```
AWS uses the RDS **Subnet groups** page for creating DB subnet groups.

---
# Problem 10.3: Enter the subnet-group information
## Solution
Enter:
```
Name:
pet-shop-db-subnet-group
```
Enter:
```
Description:
Private subnets for Pet Shop RDS
```
For **VPC**, select:
```
pet-shop-vpc
```
Verify that the selected VPC has:
```
IPv4 CIDR: 10.0.0.0/16
```
Do not select the default VPC.
Your form should look approximately like:
```
Name
pet-shop-db-subnet-group
Description
Private subnets for Pet Shop RDS
VPC
pet-shop-vpc
```

---
# Problem 10.4: Select the Availability Zones
## Solution
After selecting `pet-shop-vpc`, find the section named something similar to:
```
Add subnets
```
or:
```
Availability Zones
```
Select these two Availability Zones:
```
ap-southeast-1a
ap-southeast-1b
```
Do not select only one Availability Zone.
The required coverage is:
```
ap-southeast-1a
+
ap-southeast-1b
```
RDS requires the subnet group to cover at least two Availability Zones.

---
# Problem 10.5: Select the two private subnets
## Solution
After selecting the Availability Zones, the console should show the available subnets.
Select:
```
☑ pet-shop-private-subnet-1
   CIDR: 10.0.2.0/24
   AZ: ap-southeast-1a
```
Select:
```
☑ pet-shop-private-subnet-2
   CIDR: 10.0.3.0/24
   AZ: ap-southeast-1b
```
Do not select:
```
☐ pet-shop-public-subnet-1
   CIDR: 10.0.1.0/24
```
Your selected subnet list should contain exactly:

|Subnet|Availability Zone|CIDR|
|---|---|---|
|`pet-shop-private-subnet-1`|`ap-southeast-1a`|`10.0.2.0/24`|
|`pet-shop-private-subnet-2`|`ap-southeast-1b`|`10.0.3.0/24`|
## When AWS shows subnet IDs instead of names
AWS may display values similar to:
```
subnet-0123456789abcdef0
subnet-0abcdef1234567890
```
Check the associated names, Availability Zones, and CIDRs carefully.
You need:
```
10.0.2.0/24 → ap-southeast-1a
10.0.3.0/24 → ap-southeast-1b
```
Do not select a subnet only by looking at its generated subnet ID.

---
# Problem 10.6: Create the DB subnet group
## Solution
Before creating it, verify:
```
Name:
pet-shop-db-subnet-group
VPC:
pet-shop-vpc
Selected Availability Zones:
ap-southeast-1a
ap-southeast-1b
Selected subnets:
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
Then select:
```
Create
```
or:
```
Create DB subnet group
```
AWS should display a success message.

---
# Problem 10.7: Verify the DB subnet group
## Solution
Return to:
```
RDS
→ Subnet groups
```
Select:
```
pet-shop-db-subnet-group
```
Verify:
```
Status: Complete
```
You may see a status such as `Complete` indicating that the subnet group has sufficient Availability Zone coverage.
Also verify:
```
VPC:
pet-shop-vpc
```
And confirm the subnet list contains:
```
pet-shop-private-subnet-1
ap-southeast-1a
10.0.2.0/24
```
```
pet-shop-private-subnet-2
ap-southeast-1b
10.0.3.0/24
```
There should be no public subnet in the group.

---
# What this DB subnet group does
The subnet group tells RDS:
```
You may place the database network interface
inside one of these approved private subnets.
```
When you later create a Single-AZ RDS instance, RDS may place it in one selected Availability Zone from this subnet group.
The second subnet does not mean that two databases are automatically created.
These are separate ideas:
```
DB subnet group with two Availability Zones
→ Required network coverage
```
```
Multi-AZ deployment
→ Separate RDS availability setting
```
You can still choose:
```
Single DB instance
```
when creating the initial learning database.

---
# Important: The subnet group does not secure RDS by itself
The DB subnet group controls **where RDS can be placed**.
It does not control:
```
Who can connect to RDS
Whether RDS is publicly accessible
Which database credentials are valid
```
Those protections come from other settings:
```
DB subnet group
→ Places RDS in private subnets
Public access: No
→ Prevents a publicly accessible database configuration
pet-shop-rds-sg
→ Allows MySQL 3306 only from pet-shop-backend-sg
MySQL username and password
→ Controls database authentication
```
# Settings to use when creating RDS later
When you create the MySQL RDS database, configure the connectivity section carefully:
```
Virtual private cloud:
pet-shop-vpc
```
```
DB subnet group:
pet-shop-db-subnet-group
```
```
Public access:
No
```
```
Existing VPC security groups:
pet-shop-rds-sg
```
Remove the default security group if it is selected and not required.
The final database network configuration should be:
```
RDS MySQL
├── VPC: pet-shop-vpc
├── DB subnet group: pet-shop-db-subnet-group
├── Public access: No
├── Security group: pet-shop-rds-sg
└── Port: 3306
```
VPC security groups control which network sources can reach an RDS instance; by default, database network access is not granted until appropriate rules are configured.
# Final architecture
```
Internet
   ↓
Nginx and Spring Boot EC2
pet-shop-backend-sg
   ↓ TCP 3306
pet-shop-rds-sg
   ↓
RDS MySQL
   ↓ placed in
pet-shop-db-subnet-group
├── pet-shop-private-subnet-1
└── pet-shop-private-subnet-2
```
# Final Checklist
```
[ ] Confirmed Region is ap-southeast-1
[ ] Opened Amazon RDS
[ ] Opened Subnet groups
[ ] Selected Create DB subnet group
[ ] Entered pet-shop-db-subnet-group
[ ] Entered Private subnets for Pet Shop RDS
[ ] Selected pet-shop-vpc
[ ] Selected ap-southeast-1a
[ ] Selected ap-southeast-1b
[ ] Added pet-shop-private-subnet-1
[ ] Added pet-shop-private-subnet-2
[ ] Did not add pet-shop-public-subnet-1
[ ] Created the DB subnet group
[ ] Verified its status is Complete
[ ] Verified both private subnets are listed
```
When RDS is created later, use:
```
DB subnet group: pet-shop-db-subnet-group
Public access: No
Security group: pet-shop-rds-sg
```