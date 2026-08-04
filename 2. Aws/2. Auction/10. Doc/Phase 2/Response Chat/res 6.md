# Main Problem
You already have:
```
auction-vpc
└── auction-igw attached
```
But your public subnet still does not know where to send internet-bound traffic.
You must now create this path:
```
auction-public-subnet-1
          ↓
auction-public-rt
          ↓
0.0.0.0/0 → auction-igw
          ↓
Internet
```
AWS considers a subnet public when its associated route table contains a route to an Internet Gateway.

---
## Problem 1: Open the Route Tables page
## Solution
1. Sign in to AWS using your IAM user:
```
auction-dev-admin
```
2. Check the Region in the upper-right corner:
```
Singapore
ap-southeast-1
```
3. Search for:
```
VPC
```
4. Open the **VPC** service.
5. In the left navigation menu, select:
```
Route tables
```
6. Select:
```
Create route table
```

---
## Problem 2: Create `auction-public-rt`
## Solution
Enter these values:
### Name
```
auction-public-rt
```
### VPC
Select:
```
auction-vpc
```
Confirm that its IPv4 CIDR is:
```
10.0.0.0/16
```
Your form should look like:
```
Name: auction-public-rt
VPC:  auction-vpc
```
Then select:
```
Create route table
```
AWS will create the custom route table. A newly created route table automatically contains a local route for communication inside the VPC.

---
## Problem 3: Check the automatic local route
## Solution
After creating the route table, select:
```
auction-public-rt
```
Open the:
```
Routes
```
tab.
You should already see:

|Destination|Target|Status|
|---|---|---|
|`10.0.0.0/16`|`local`|Active|
Do not delete or modify this route.
It allows resources inside `auction-vpc` to communicate with each other according to their security rules.
For example:
```
EC2 in 10.0.1.0/24
        ↓ local route
RDS in 10.0.2.0/24 or 10.0.3.0/24
```
The `local` route does not provide internet access.

---
## Problem 4: Add the Internet Gateway route
## Solution
While `auction-public-rt` is selected:
1. Open the **Routes** tab.
2. Select:
```
Edit routes
```
3. Select:
```
Add route
```
4. Under **Destination**, enter:
```
0.0.0.0/0
```
5. Under **Target**, open the target list.
6. Select:
```
Internet Gateway
```
7. Select the Internet Gateway named:
```
auction-igw
```
The target may display both its name and ID:
```
auction-igw
igw-xxxxxxxxxxxxxxxxx
```
8. Select:
```
Save changes
```
AWS route-table entries consist of a destination and a target. For public IPv4 internet access, the destination is `0.0.0.0/0` and the target is the attached Internet Gateway.

---
## Problem 5: Verify the routes
## Solution
Return to the **Routes** tab.
You should now see:

|Destination|Target|Meaning|
|---|---|---|
|`10.0.0.0/16`|`local`|Traffic inside `auction-vpc`|
|`0.0.0.0/0`|`auction-igw`|Internet-bound IPv4 traffic|
Approximately:
```
10.0.0.0/16 → local
0.0.0.0/0   → auction-igw
```
Both routes should show:
```
Active
```
### What `0.0.0.0/0` means
It means:
```
All IPv4 destinations
```
AWS first checks whether a more specific route matches.
For example:
```
Traffic to 10.0.2.15
→ matches 10.0.0.0/16
→ uses local
```
But:
```
Traffic to 8.8.8.8
→ does not match 10.0.0.0/16
→ uses 0.0.0.0/0
→ goes to auction-igw
```
AWS uses the most specific matching route.

---
# Problem 6: Associate the route table with the public subnet
## Solution
Creating the route table and adding the route is still not enough.
You must tell AWS that this route table belongs to:
```
auction-public-subnet-1
```
While `auction-public-rt` is selected:
1. Open the tab:
```
Subnet associations
```
2. Find the section:
```
Explicit subnet associations
```
3. Select:
```
Edit subnet associations
```
4. Find and select the checkbox beside:
```
auction-public-subnet-1
```
Check its details carefully. It should be your public subnet, for example:
```
Name: auction-public-subnet-1
Availability Zone: ap-southeast-1a
CIDR: 10.0.1.0/24
```
5. Do **not** select:
```
auction-private-subnet-1
auction-private-subnet-2
```
6. Select:
```
Save associations
```
AWS applies a custom route table to a subnet through this explicit association. A subnet can use only one route table at a time, although one route table can serve multiple subnets.

---
# Problem 7: Verify the subnet association
## Solution
On the **Subnet associations** tab, you should now see:
```
auction-public-subnet-1
```
under explicit subnet associations.
You should not see either private subnet associated with this public route table.
Your final configuration should be:
```
auction-public-rt
│
├── Routes
│   ├── 10.0.0.0/16 → local
│   └── 0.0.0.0/0   → auction-igw
│
└── Subnet association
    └── auction-public-subnet-1
```

---
# Why You Must Not Associate the Private Subnets
Do not associate this route table with:
```
auction-private-subnet-1
auction-private-subnet-2
```
This public route table contains:
```
0.0.0.0/0 → auction-igw
```
Associating it with the RDS subnets would give those subnets a direct route toward the Internet Gateway.
Your intended architecture is:
```
auction-public-subnet-1
└── EC2 FastAPI backend
    └── public route table
        └── Internet Gateway
auction-private-subnet-1
└── RDS MySQL
    └── no direct Internet Gateway route
auction-private-subnet-2
└── RDS MySQL standby/subnet-group coverage
    └── no direct Internet Gateway route
```

---
# Important Clarification
The route table makes the subnet public, but an EC2 instance also needs a public IPv4 address or Elastic IP to communicate directly through the Internet Gateway.
You will therefore eventually need all of these:
```
EC2 is inside auction-public-subnet-1
Public subnet has 0.0.0.0/0 → auction-igw
EC2 has a public IPv4 address or Elastic IP
Security group allows the required inbound traffic
Network ACL does not block the traffic
```
The route table alone does not automatically assign a public IP to EC2. AWS documents the route to an Internet Gateway and the instance’s public addressing as separate requirements for internet communication.

---
# Complete Checklist
```
[ ] Opened VPC → Route tables
[ ] Selected Create route table
[ ] Entered auction-public-rt
[ ] Selected auction-vpc
[ ] Created the route table
[ ] Confirmed 10.0.0.0/16 → local exists
[ ] Added 0.0.0.0/0 → auction-igw
[ ] Opened Subnet associations
[ ] Selected Edit subnet associations
[ ] Associated auction-public-subnet-1
[ ] Did not associate either private subnet
```
After completion:
```
Internet
    │
    ▼
auction-igw
    │
    ▼
auction-public-rt
10.0.0.0/16 → local
0.0.0.0/0   → auction-igw
    │
    ▼
auction-public-subnet-1
    │
    ▼
Future EC2 FastAPI backend
```