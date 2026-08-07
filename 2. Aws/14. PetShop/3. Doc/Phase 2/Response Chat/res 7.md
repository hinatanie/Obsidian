# Main Problem
Your two RDS subnets must stay private:
```
auction-private-subnet-1
auction-private-subnet-2
```
You will create a separate route table for them:
```
auction-private-rt
```
This route table will contain only:
```
10.0.0.0/16 → local
```
The local route lets resources inside `auction-vpc` communicate with each other. AWS automatically adds this route when you create the route table.

---
## Problem 1: Open Route Tables
## Solution
1. Sign in with:
```
auction-dev-admin
```
2. Confirm the AWS Region is:
```
Singapore
ap-southeast-1
```
3. Search for and open:
```
VPC
```
4. In the left menu, select:
```
Route tables
```
5. Select:
```
Create route table
```

---
## Problem 2: Create the private route table
## Solution
Enter:
```
Name: auction-private-rt
VPC: auction-vpc
```
Be careful to select your custom VPC:
```
auction-vpc
10.0.0.0/16
```
Then select:
```
Create route table
```
AWS will create the route table and automatically add the VPC’s local route.

---
## Problem 3: Check the Routes tab
## Solution
After creating it:
1. Select:
```
auction-private-rt
```
2. Open the:
```
Routes
```
tab.
You should see:

|Destination|Target|Status|
|---|---|---|
|`10.0.0.0/16`|`local`|Active|
This is correct:
```
10.0.0.0/16 → local
```
Do not try to edit or delete this route.
It means traffic between addresses inside your VPC can stay inside the VPC. For example:
```
EC2 private address: 10.0.1.20
                  ↓
RDS private address: 10.0.2.30
```
The security groups must still permit the connection.

---
## Problem 4: Do not add an Internet Gateway route
## Solution
Do **not** select **Edit routes** to add this:
```
0.0.0.0/0 → auction-igw
```
Your private route table should not look like this:
```
10.0.0.0/16 → local
0.0.0.0/0   → auction-igw   ❌
```
It should contain only:
```
10.0.0.0/16 → local         ✅
```
A route table determines where traffic from its associated subnets is sent. Keeping the Internet Gateway route out of this table preserves the intended private routing design.

---
## Problem 5: Associate the first private subnet
## Solution
While `auction-private-rt` is selected:
1. Open:
```
Subnet associations
```
2. Find:
```
Explicit subnet associations
```
3. Select:
```
Edit subnet associations
```
4. Select the checkbox beside:
```
auction-private-subnet-1
```
Verify its details:
```
Availability Zone: ap-southeast-1a
CIDR: 10.0.2.0/24
```

---
## Problem 6: Associate the second private subnet
## Solution
On the same page, also select:
```
auction-private-subnet-2
```
Verify:
```
Availability Zone: ap-southeast-1b
CIDR: 10.0.3.0/24
```
You should now have these two selected:
```
[x] auction-private-subnet-1
[x] auction-private-subnet-2
```
Do not select:
```
auction-public-subnet-1
```
Then select:
```
Save associations
```
A route table can be associated with multiple subnets, but each subnet can use only one route table at a time.

---
## Problem 7: Verify the associations
## Solution
Return to the:
```
Subnet associations
```
tab.
Under **Explicit subnet associations**, confirm that you see:
```
auction-private-subnet-1
auction-private-subnet-2
```
You should not see:
```
auction-public-subnet-1
```
Your result should be:
```
auction-private-rt
│
├── Routes
│   └── 10.0.0.0/16 → local
│
└── Subnet associations
    ├── auction-private-subnet-1
    └── auction-private-subnet-2
```

---
# Final Network Structure
```
auction-vpc
│
├── auction-public-rt
│   ├── 10.0.0.0/16 → local
│   ├── 0.0.0.0/0 → auction-igw
│   └── auction-public-subnet-1
│
└── auction-private-rt
    ├── 10.0.0.0/16 → local
    ├── auction-private-subnet-1
    └── auction-private-subnet-2
```
This gives you the intended design:
```
Public subnet
→ EC2 FastAPI backend
→ Internet Gateway access
Private subnets
→ RDS MySQL
→ no direct Internet Gateway route
```
Your two RDS subnets also span `ap-southeast-1a` and `ap-southeast-1b`, which supports the DB subnet group requirement for subnets in at least two Availability Zones.
# Complete Checklist
```
[ ] Created auction-private-rt
[ ] Selected auction-vpc
[ ] Confirmed 10.0.0.0/16 → local
[ ] Did not add 0.0.0.0/0 → auction-igw
[ ] Associated auction-private-subnet-1
[ ] Associated auction-private-subnet-2
[ ] Did not associate auction-public-subnet-1
```