# Main Problem
Your future **RDS MySQL database** needs a **DB subnet group** containing private subnets in at least two Availability Zones.
You already have:
```
auction-private-subnet-1
Availability Zone: ap-southeast-1a
CIDR: 10.0.2.0/24
```
Now you will create:
```
auction-private-subnet-2
Availability Zone: ap-southeast-1b
CIDR: 10.0.3.0/24
```
AWS requires subnets across at least two Availability Zones for an RDS DB subnet group.
## Problem 1: Open the subnet creation page
## Solution
1. Sign in to AWS using your IAM user:
```
auction-dev-admin
```
2. Check the AWS Region in the upper-right corner.
It should be:
```
Singapore
ap-southeast-1
```
3. In the AWS search bar, search for:
```
VPC
```
4. Open **VPC**.
5. In the left menu, select:
```
Subnets
```
6. Select:
```
Create subnet
```

---
## Problem 2: Select the correct VPC
## Solution
Under **VPC ID**, select:
```
auction-vpc
```
Be careful not to select the default VPC.
After selecting it, AWS should show a VPC CIDR similar to:
```
10.0.0.0/16
```
Your new subnet’s `10.0.3.0/24` CIDR fits inside that VPC CIDR.

---
## Problem 3: Enter the second private subnet information
## Solution
In **Subnet settings**, enter:
### Subnet name
```
auction-private-subnet-2
```
### Availability Zone
Select:
```
ap-southeast-1b
```
Do not select:
```
No preference
ap-southeast-1a
```
This subnet must be in `ap-southeast-1b`, because your first private subnet is already in `ap-southeast-1a`.
### IPv4 VPC CIDR block
Select:
```
10.0.0.0/16
```
### IPv4 subnet CIDR block
Enter:
```
10.0.3.0/24
```
Your completed form should look like this:
```
VPC:                       auction-vpc
Subnet name:               auction-private-subnet-2
Availability Zone:         ap-southeast-1b
IPv4 VPC CIDR block:       10.0.0.0/16
IPv4 subnet CIDR block:    10.0.3.0/24
```
Then select:
```
Create subnet
```

---
## Problem 4: Keep public IPv4 assignment disabled
## Solution
After creating the subnet:
1. Return to **VPC → Subnets**.
2. Select:
```
auction-private-subnet-2
```
3. Select:
```
Actions
```
4. Select:
```
Edit subnet settings
```
5. Find:
```
Enable auto-assign public IPv4 address
```
Make sure this checkbox is **not selected**.
6. Select:
```
Save
```
When auto-assignment is enabled, resources launched in the subnet can automatically request public IPv4 addresses. You do not want that behavior for the private RDS subnet.
Do not enable:
```
Enable auto-assign public IPv4 address
```

---
## Problem 5: Verify the result
## Solution
Open **VPC → Subnets** and locate:
```
auction-private-subnet-2
```
Confirm the following values:

|Setting|Expected value|
|---|---|
|Name|`auction-private-subnet-2`|
|VPC|`auction-vpc`|
|Availability Zone|`ap-southeast-1b`|
|IPv4 CIDR|`10.0.3.0/24`|
|Auto-assign public IPv4|`No`|
Your subnet structure should now be:
```
auction-vpc
│
├── auction-public-subnet-1
│   └── EC2 FastAPI backend
│
├── auction-private-subnet-1
│   ├── Availability Zone: ap-southeast-1a
│   └── CIDR: 10.0.2.0/24
│
└── auction-private-subnet-2
    ├── Availability Zone: ap-southeast-1b
    └── CIDR: 10.0.3.0/24
```
## Final checklist
```
[x] Created auction-private-subnet-2
[x] Selected auction-vpc
[x] Selected ap-southeast-1b
[x] Entered 10.0.3.0/24
[x] Kept auto-assign public IPv4 disabled
```
Creating these subnets does **not** create the RDS database yet. Later, you will add both private subnets to an RDS DB subnet group:
```
auction-private-subnet-1
auction-private-subnet-2
```