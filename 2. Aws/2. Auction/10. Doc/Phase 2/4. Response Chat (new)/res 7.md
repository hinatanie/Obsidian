# Main Problem
Your two RDS subnets must use a route table that keeps them separate from the public internet:
```
pet-shop-private-subnet-1
pet-shop-private-subnet-2
        ↓
pet-shop-private-rt
        ↓
10.0.0.0/16 → local only
```
This allows your EC2 Spring Boot backend to communicate with RDS through the private VPC network, but it does not give RDS a route to the internet.
# Problem 7: Create the private route table
## Solution
You will complete three tasks:
```
1. Create pet-shop-private-rt
2. Keep only the automatic local route
3. Associate both private RDS subnets
```
## Step 1: Open Route Tables
In the AWS Management Console:
```
Search bar
→ Search for VPC
→ Open VPC
```
Confirm the selected Region is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
From the left navigation menu, select:
```
Route tables
```
Then select:
```
Create route table
```

---
## Step 2: Enter the private route-table settings
Configure:
```
Name: pet-shop-private-rt
VPC: pet-shop-vpc
```
Make sure you select the VPC with:
```
IPv4 CIDR: 10.0.0.0/16
```
Do not select the default VPC.
Then select:
```
Create route table
```
AWS automatically adds a local route to every newly created route table.

---
# Problem 7.1: Verify the local route
## Solution
After creating the route table, select:
```
pet-shop-private-rt
```
Open the:
```
Routes
```
tab.
You should see:
```
Destination: 10.0.0.0/16
Target: local
Status: Active
```
You do not need to create this route manually.
### What `local` means
The route:
```
10.0.0.0/16 → local
```
allows communication between resources inside `pet-shop-vpc`.
For your project, this allows:
```
EC2 Spring Boot
10.0.1.x
      ↓
Private VPC network
      ↓
RDS MySQL
10.0.2.x or 10.0.3.x
```
`local` means the VPC’s internal network. It does not mean your personal laptop.

---
# Problem 7.2: Do not add an internet route
## Solution
The Routes tab should contain only:

|Destination|Target|
|---|---|
|`10.0.0.0/16`|`local`|
Do not add:
```
0.0.0.0/0 → pet-shop-igw
```
That would give these subnets a direct route to the Internet Gateway and would make them public subnets. AWS defines a private subnet as one whose associated route table does not contain a route to an Internet Gateway.
Also do not add:
```
0.0.0.0/0 → NAT Gateway
```
A NAT Gateway is used when resources in a private subnet need outbound internet access, such as downloading software updates. Your RDS database does not need general outbound internet access for this project.
Therefore, you do not need to open **Edit routes** during this task.

---
# Problem 7.3: Associate the first private subnet
## Solution
With `pet-shop-private-rt` selected, open:
```
Subnet associations
```
Then select:
```
Edit subnet associations
```
Find and select:
```
☑ pet-shop-private-subnet-1
```
Verify:
```
Availability Zone: ap-southeast-1a
IPv4 CIDR: 10.0.2.0/24
```

---
# Problem 7.4: Associate the second private subnet
## Solution
On the same subnet-association screen, also select:
```
☑ pet-shop-private-subnet-2
```
Verify:
```
Availability Zone: ap-southeast-1b
IPv4 CIDR: 10.0.3.0/24
```
Do not select:
```
☐ pet-shop-public-subnet-1
```
Then select:
```
Save associations
```
A custom route table can be associated with multiple subnets, while each subnet can use only one route table at a time.

---
# Problem 7.5: Verify the route-table associations
## Solution
Select:
```
VPC
→ Route tables
→ pet-shop-private-rt
```
Open:
```
Subnet associations
```
Under **Explicit subnet associations**, you should see:
```
pet-shop-private-subnet-1
10.0.2.0/24
pet-shop-private-subnet-2
10.0.3.0/24
```
You should not see:
```
pet-shop-public-subnet-1
```

---
## Verify the Routes tab
Open:
```
Routes
```
You should see only:
```
10.0.0.0/16 → local
```
The route should show:
```
Status: Active
```
There should be no route for:
```
0.0.0.0/0
```
# How the route tables should now be separated
Your public and private subnets should use different route tables:
```
pet-shop-public-subnet-1
10.0.1.0/24
        ↓
pet-shop-public-rt
├── 10.0.0.0/16 → local
└── 0.0.0.0/0 → pet-shop-igw
```
```
pet-shop-private-subnet-1
10.0.2.0/24
pet-shop-private-subnet-2
10.0.3.0/24
        ↓
pet-shop-private-rt
└── 10.0.0.0/16 → local
```
The complete network now looks like:
```
Internet
   │
   ▼
pet-shop-igw
   │
   ▼
pet-shop-public-rt
├── 10.0.0.0/16 → local
└── 0.0.0.0/0 → pet-shop-igw
   │
   ▼
pet-shop-public-subnet-1
└── EC2 Spring Boot and Nginx
pet-shop-private-rt
└── 10.0.0.0/16 → local
   │
   ├── pet-shop-private-subnet-1
   └── pet-shop-private-subnet-2
       └── RDS MySQL
```
# Important clarification
The private subnets can still communicate with the public subnet through:
```
10.0.0.0/16 → local
```
Therefore, your EC2 backend can connect to RDS using:
```
RDS endpoint
+
MySQL port 3306
+
RDS security-group permission
```
The absence of an Internet Gateway or NAT Gateway route does not block communication inside the VPC.
The actual EC2-to-RDS permission will later be controlled by security groups:
```
pet-shop-backend-sg
        ↓
MySQL port 3306
        ↓
pet-shop-rds-sg
```
# Common mistakes
Do not associate the private subnets with:
```
pet-shop-public-rt
```
Do not associate the public subnet with:
```
pet-shop-private-rt
```
Do not add:
```
0.0.0.0/0 → pet-shop-igw
```
Do not add a NAT Gateway just because the route table is called “private.” NAT is optional and only needed when private resources require outbound internet connectivity.
# Final Checklist
```
[ ] Opened VPC → Route tables
[ ] Selected Create route table
[ ] Entered pet-shop-private-rt
[ ] Selected pet-shop-vpc
[ ] Created the route table
[ ] Confirmed 10.0.0.0/16 → local exists
[ ] Confirmed the local route is Active
[ ] Did not add 0.0.0.0/0 → Internet Gateway
[ ] Did not add 0.0.0.0/0 → NAT Gateway
[ ] Opened Subnet associations
[ ] Selected Edit subnet associations
[ ] Selected pet-shop-private-subnet-1
[ ] Selected pet-shop-private-subnet-2
[ ] Did not select pet-shop-public-subnet-1
[ ] Saved the associations
```
After completing this task:
```
pet-shop-public-subnet-1
→ pet-shop-public-rt
pet-shop-private-subnet-1
→ pet-shop-private-rt
pet-shop-private-subnet-2
→ pet-shop-private-rt
```