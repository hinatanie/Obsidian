# Main Problem
Your RDS MySQL database should not be directly reachable from the internet.
You will place it in private subnets:
```
pet-shop-vpc
├── pet-shop-public-subnet-1
│   └── EC2 Spring Boot backend
│
├── pet-shop-private-subnet-1
│   └── Available for RDS in ap-southeast-1a
│
└── pet-shop-private-subnet-2
    └── Available for RDS in ap-southeast-1b
```
RDS DB subnet groups must cover at least two Availability Zones. However, having two subnets does **not** mean that your database automatically runs as Multi-AZ. You can still create the initial RDS database as Single-AZ.
# Problem 4: Create the private RDS subnets
## Solution
You need to create these two subnets:

|Name|Availability Zone|CIDR|Auto-assign public IPv4|
|---|---|---|---|
|`pet-shop-private-subnet-1`|`ap-southeast-1a`|`10.0.2.0/24`|Disabled|
|`pet-shop-private-subnet-2`|`ap-southeast-1b`|`10.0.3.0/24`|Disabled|
Each subnet must be inside:
```
VPC: pet-shop-vpc
VPC CIDR: 10.0.0.0/16
Region: ap-southeast-1
```
A subnet belongs to only one Availability Zone, which is why you must create two separate subnets.

---
# Problem 4.1: Create the first private subnet
## Solution
## Step 1: Open the VPC service
In the AWS Console:
```
Search bar
→ Search for VPC
→ Open VPC
```
Confirm that the Region in the upper-right corner is:
```
Asia Pacific (Singapore)
ap-southeast-1
```

---
## Step 2: Open the subnet page
From the left navigation menu, select:
```
Subnets
```
Then choose:
```
Create subnet
```

---
## Step 3: Select the Pet Shop VPC
For **VPC ID**, select:
```
pet-shop-vpc
```
After selecting it, AWS should show:
```
IPv4 CIDR: 10.0.0.0/16
```
Do not select the default VPC.

---
## Step 4: Enter the first subnet information
Enter:
```
Subnet name: pet-shop-private-subnet-1
Availability Zone: ap-southeast-1a
IPv4 VPC CIDR block: 10.0.0.0/16
IPv4 subnet CIDR block: 10.0.2.0/24
```
Your form should approximately look like:
```
VPC ID
pet-shop-vpc
Subnet name
pet-shop-private-subnet-1
Availability Zone
Asia Pacific (Singapore) / ap-southeast-1a
IPv4 subnet CIDR block
10.0.2.0/24
```
Be careful not to use:
```
10.0.1.0/24
```
That CIDR already belongs to your public EC2 subnet.
Subnet CIDR blocks inside the same VPC cannot overlap.

---
## Step 5: Create the subnet
Select:
```
Create subnet
```
Wait for the success message.
You should now see:
```
Name: pet-shop-private-subnet-1
State: Available
Availability Zone: ap-southeast-1a
IPv4 CIDR: 10.0.2.0/24
```

---
# Problem 4.2: Confirm that public IPv4 assignment is disabled
## Solution
New nondefault subnets normally have automatic public IPv4 assignment disabled, but you should verify it rather than assume.
## Step 1: Select the first private subnet
Go to:
```
VPC
→ Subnets
```
Select:
```
pet-shop-private-subnet-1
```

---
## Step 2: Open its settings
Choose:
```
Actions
→ Edit subnet settings
```
Find:
```
Auto-assign IP settings
```
Make sure this option is **not selected**:
```
☐ Enable auto-assign public IPv4 address
```
It must remain unchecked.
Then select:
```
Save
```
The result should be:
```
Auto-assign public IPv4 address: No
```
AWS provides a configuration check specifically for ensuring that subnets do not automatically assign public IP addresses.

---
# Problem 4.3: Create the second private subnet
## Solution
Return to:
```
VPC
→ Subnets
→ Create subnet
```
Select:
```
VPC: pet-shop-vpc
```
Enter:
```
Subnet name: pet-shop-private-subnet-2
Availability Zone: ap-southeast-1b
IPv4 VPC CIDR block: 10.0.0.0/16
IPv4 subnet CIDR block: 10.0.3.0/24
```
The important difference is the Availability Zone:
```
First private subnet:
ap-southeast-1a
Second private subnet:
ap-southeast-1b
```
Do not accidentally create both private subnets in:
```
ap-southeast-1a
```
RDS needs the subnet group to cover at least two Availability Zones.
Select:
```
Create subnet
```
Verify:
```
Name: pet-shop-private-subnet-2
State: Available
Availability Zone: ap-southeast-1b
IPv4 CIDR: 10.0.3.0/24
```

---
# Problem 4.4: Confirm that public IPv4 assignment is disabled
## Solution
Select:
```
pet-shop-private-subnet-2
```
Then open:
```
Actions
→ Edit subnet settings
```
Make sure this remains unchecked:
```
☐ Enable auto-assign public IPv4 address
```
Select:
```
Save
```
Verify:
```
Auto-assign public IPv4 address: No
```

---
# Why the two private subnets use different Availability Zones
The two Availability Zones are separate locations within the Singapore Region:
```
ap-southeast-1
├── ap-southeast-1a
└── ap-southeast-1b
```
Later, you will create an RDS DB subnet group containing:
```
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
The flow will be:
```
RDS DB subnet group
├── pet-shop-private-subnet-1
│   └── ap-southeast-1a
└── pet-shop-private-subnet-2
    └── ap-southeast-1b
```
RDS requires the DB subnet group to include subnets in at least two Availability Zones. It then selects an appropriate subnet and private IP address for the database.
# Important: Two subnets do not mean Multi-AZ
These are separate settings:
```
Two private subnets in two Availability Zones
```
means:
```
The RDS DB subnet group has sufficient Availability Zone coverage.
```
It does not automatically mean:
```
A primary database and standby database are both running.
```
When creating the RDS instance later, you can still select:
```
Availability and durability:
Single DB instance
```
For a learning project, Single-AZ is generally less expensive.
A Multi-AZ deployment is enabled separately in the RDS database creation settings.

---
# Important: What makes these subnets private?
The subnet names do not make them private.
These names are only labels:
```
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
A subnet is private because its route table does not contain a direct route like:
```
0.0.0.0/0 → Internet Gateway
```
Later, you should associate both private subnets with a private route table.
For your current architecture, that private route table can contain only:
```
10.0.0.0/16 → local
```
Do not associate the RDS private subnets with the public route table.

---
# Verify all three project subnets
After creating both private subnets, open:
```
VPC
→ Subnets
```
You should have:

|Name|Availability Zone|CIDR|Auto-assign public IPv4|
|---|---|---|---|
|`pet-shop-public-subnet-1`|`ap-southeast-1a`|`10.0.1.0/24`|Yes|
|`pet-shop-private-subnet-1`|`ap-southeast-1a`|`10.0.2.0/24`|No|
|`pet-shop-private-subnet-2`|`ap-southeast-1b`|`10.0.3.0/24`|No|
Your network should now look like:
```
pet-shop-vpc
10.0.0.0/16
│
├── pet-shop-public-subnet-1
│   ├── AZ: ap-southeast-1a
│   ├── CIDR: 10.0.1.0/24
│   └── Auto public IPv4: Enabled
│
├── pet-shop-private-subnet-1
│   ├── AZ: ap-southeast-1a
│   ├── CIDR: 10.0.2.0/24
│   └── Auto public IPv4: Disabled
│
└── pet-shop-private-subnet-2
    ├── AZ: ap-southeast-1b
    ├── CIDR: 10.0.3.0/24
    └── Auto public IPv4: Disabled
```
# Final Checklist
```
[ ] Created pet-shop-private-subnet-1
[ ] Selected pet-shop-vpc
[ ] Selected ap-southeast-1a
[ ] Entered 10.0.2.0/24
[ ] Confirmed auto-assign public IPv4 is disabled
[ ] Created pet-shop-private-subnet-2
[ ] Selected pet-shop-vpc
[ ] Selected ap-southeast-1b
[ ] Entered 10.0.3.0/24
[ ] Confirmed auto-assign public IPv4 is disabled
[ ] Both subnets show State: Available
[ ] The CIDR blocks do not overlap
[ ] The two private subnets use different Availability Zones
```