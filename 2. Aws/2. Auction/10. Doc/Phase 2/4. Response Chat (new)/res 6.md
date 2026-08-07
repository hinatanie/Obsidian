# Main Problem
You created and attached:
```
pet-shop-igw
→ pet-shop-vpc
```
But your EC2 public subnet still needs routing instructions.
The public route table will tell AWS:
```
Traffic inside pet-shop-vpc
→ Keep it inside the VPC
Traffic going anywhere else
→ Send it to pet-shop-igw
```
The final path will be:
```
EC2
↓
pet-shop-public-subnet-1
↓
pet-shop-public-rt
↓
0.0.0.0/0 → pet-shop-igw
↓
Internet
```
# Problem 6: Create the public route table
## Solution
You will complete three tasks:
```
1. Create pet-shop-public-rt
2. Add 0.0.0.0/0 → pet-shop-igw
3. Associate pet-shop-public-subnet-1
```
# Problem 6.1: Create the route table
## Solution
### Step 1: Open Route Tables
In the AWS Console:
```
Search bar
→ VPC
→ Open VPC
```
Confirm the Region is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
In the left navigation menu, select:
```
Route tables
```
Then select:
```
Create route table
```
### Step 2: Enter the route-table settings
Enter:
```
Name: pet-shop-public-rt
VPC: pet-shop-vpc
```
Confirm that the selected VPC has:
```
IPv4 CIDR: 10.0.0.0/16
```
Do not select the default VPC.
Then select:
```
Create route table
```
AWS creates a local route automatically when you create the route table.

---
## Step 3: Check the automatic local route
Select:
```
pet-shop-public-rt
```
Open the:
```
Routes
```
tab.
You should already see:
```
Destination: 10.0.0.0/16
Target: local
Status: Active
```
You do not need to add this route manually.
### What this route does
```
10.0.0.0/16 → local
```
allows resources inside `pet-shop-vpc` to communicate with each other.
For example:
```
EC2 in 10.0.1.0/24
        ↓
RDS in 10.0.2.0/24 or 10.0.3.0/24
```
The `local` target does not mean your laptop or local computer. It means communication inside the VPC.
# Problem 6.2: Add the internet route
## Solution
Select:
```
pet-shop-public-rt
```
Then open:
```
Routes
→ Edit routes
```
Select:
```
Add route
```
Configure the new route:
```
Destination: 0.0.0.0/0
Target: Internet Gateway
```
After choosing **Internet Gateway**, select:
```
pet-shop-igw
```
AWS may display the generated ID alongside the name:
```
pet-shop-igw
igw-xxxxxxxxxxxxxxxxx
```
Then select:
```
Save changes
```
AWS uses `0.0.0.0/0` to represent all IPv4 addresses outside more specific routes. Sending this destination to the Internet Gateway gives the route table a path to the IPv4 internet.
Your route table should now contain:

|Destination|Target|Purpose|
|---|---|---|
|`10.0.0.0/16`|`local`|Traffic inside the VPC|
|`0.0.0.0/0`|`pet-shop-igw`|Internet-bound traffic|
The screen may show the Internet Gateway’s AWS ID instead of its name:
```
0.0.0.0/0 → igw-xxxxxxxxxxxxxxxxx
```
That is correct as long as the ID belongs to `pet-shop-igw`.
# Problem 6.3: Associate the public subnet
## Solution
A route table does nothing for a subnet until the subnet uses it.
Select:
```
pet-shop-public-rt
```
Open the tab:
```
Subnet associations
```
You may see two sections:
```
Explicit subnet associations
Subnets without explicit associations
```
Select:
```
Edit subnet associations
```
Find and select only:
```
☑ pet-shop-public-subnet-1
```
Verify its details:
```
CIDR: 10.0.1.0/24
Availability Zone: ap-southeast-1a
```
Do not select:
```
☐ pet-shop-private-subnet-1
☐ pet-shop-private-subnet-2
```
Then select:
```
Save associations
```
AWS requires a subnet association for the custom route table to control that subnet’s traffic. A subnet can use only one route table at a time.
# Problem 6.4: Verify everything
## Solution
Select:
```
VPC
→ Route tables
→ pet-shop-public-rt
```
## Verify the Routes tab
You should see:
```
10.0.0.0/16 → local
0.0.0.0/0   → pet-shop-igw
```
Both routes should have:
```
Status: Active
```
If the internet route shows:
```
Status: Blackhole
```
the Internet Gateway may have been deleted, detached, or the wrong gateway may have been selected.
## Verify the Subnet associations tab
Under explicit subnet associations, you should see:
```
pet-shop-public-subnet-1
10.0.1.0/24
```
You should not see either private RDS subnet associated with this route table.
# What your network looks like now
```
Internet
   │
   ▼
pet-shop-igw
   │
   ▼
pet-shop-vpc
10.0.0.0/16
   │
   ├── pet-shop-public-subnet-1
   │   10.0.1.0/24
   │          │
   │          ▼
   │   pet-shop-public-rt
   │   ├── 10.0.0.0/16 → local
   │   └── 0.0.0.0/0 → pet-shop-igw
   │
   ├── pet-shop-private-subnet-1
   │   10.0.2.0/24
   │   No direct Internet Gateway route
   │
   └── pet-shop-private-subnet-2
       10.0.3.0/24
       No direct Internet Gateway route
```
# Important: Do not use Edge associations
You may see a tab called:
```
Edge associations
```
Do not use it for this task.
You need:
```
Subnet associations
→ Edit subnet associations
```
An edge association is an advanced routing feature and is not how you connect your normal public subnet to this route table.
# Is the subnet now public?
The subnet now has the required public route:
```
0.0.0.0/0 → pet-shop-igw
```
It is therefore configured as a public subnet.
However, an EC2 instance launched there still needs all of the following for direct IPv4 internet access:
```
Public IPv4 address or Elastic IP
Public route to pet-shop-igw
Security group allowing the required traffic
Network ACL allowing the traffic
```
You already enabled automatic public IPv4 assignment for:
```
pet-shop-public-subnet-1
```
Later, your EC2 security group can allow:
```
HTTP  80  → 0.0.0.0/0
HTTPS 443 → 0.0.0.0/0
SSH   22  → Your IP only
```
Do not expose the Spring Boot application port directly to everyone unless your architecture specifically requires it.
# Final Checklist
```
[ ] Opened VPC → Route tables
[ ] Selected Create route table
[ ] Entered pet-shop-public-rt
[ ] Selected pet-shop-vpc
[ ] Created the route table
[ ] Confirmed 10.0.0.0/16 → local exists automatically
[ ] Opened Routes → Edit routes
[ ] Added 0.0.0.0/0
[ ] Selected Internet Gateway as the target
[ ] Selected pet-shop-igw
[ ] Saved the route
[ ] Opened Subnet associations
[ ] Selected Edit subnet associations
[ ] Selected pet-shop-public-subnet-1
[ ] Did not select either private RDS subnet
[ ] Saved the association
[ ] Both routes show Active
[ ] pet-shop-public-subnet-1 is explicitly associated
```