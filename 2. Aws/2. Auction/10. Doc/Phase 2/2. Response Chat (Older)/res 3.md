You need to create the first **private subnet** inside `auction-vpc`.
This subnet will later be included in the RDS DB subnet group:
```
auction-vpc
├── auction-public-subnet-1
│   └── EC2 FastAPI
│
├── auction-private-subnet-1
│   └── RDS MySQL
│
└── auction-private-subnet-2
    └── RDS MySQL
```
Use these settings:
```
Name: auction-private-subnet-1
VPC: auction-vpc
Availability Zone: ap-southeast-1a
IPv4 CIDR: 10.0.2.0/24
Auto-assign public IPv4: Disabled
```
# Problem 1: Open the Subnets page
## Solution
1. Sign in to AWS using your IAM user:
```
auction-dev-admin
```
2. Confirm the selected region in the upper-right corner is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
3. Use the AWS search bar and search for:
```
VPC
```
4. Open the **VPC** service.
5. In the left menu, select:
```
Subnets
```
6. Select:
```
Create subnet
```
AWS creates subnets inside a selected VPC and lets you specify the Availability Zone and CIDR block.
# Problem 2: Select `auction-vpc`
## Solution
In the **VPC ID** dropdown, select:
```
auction-vpc
```
Confirm that AWS shows:
```
IPv4 CIDR: 10.0.0.0/16
```
Do not select the default VPC.
The new subnet range must be inside the VPC range:
```
VPC:            10.0.0.0/16
Private subnet: 10.0.2.0/24
```
It must also not overlap your existing public subnet:
```
Public subnet:  10.0.1.0/24
Private subnet: 10.0.2.0/24
```
# Problem 3: Enter the private subnet settings
## Solution
Under **Subnet settings**, enter the following.
### Subnet name
```
auction-private-subnet-1
```
### Availability Zone
Select:
```
ap-southeast-1a
```
### IPv4 VPC CIDR block
Keep:
```
10.0.0.0/16
```
### IPv4 subnet CIDR block
Enter:
```
10.0.2.0/24
```
Your completed form should look like:
```
VPC ID:
auction-vpc
Subnet name:
auction-private-subnet-1
Availability Zone:
ap-southeast-1a
IPv4 VPC CIDR block:
10.0.0.0/16
IPv4 subnet CIDR block:
10.0.2.0/24
```
Select:
```
Create subnet
```
# Problem 4: Keep automatic public IPv4 assignment disabled
## Solution
A private RDS subnet should not automatically give public IPv4 addresses to resources.
After creating the subnet:
1. Return to the **Subnets** page.
2. Select:
```
auction-private-subnet-1
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
6. Make sure the checkbox is **not selected**.
7. Select **Save** only if you changed something.
AWS explains that enabling this option causes new network interfaces launched in the subnet to request public IPv4 addresses. For this private subnet, leave it disabled.
The correct setting is:
```
Auto-assign public IPv4 address: No
```
# Problem 5: Verify the subnet
## Solution
Select `auction-private-subnet-1` and verify:
```
Name:
auction-private-subnet-1
VPC:
auction-vpc
IPv4 CIDR:
10.0.2.0/24
Availability Zone:
ap-southeast-1a
Auto-assign public IPv4:
No
```
Your checklist is now:
```
[x] Open Subnets
[x] Select Create subnet
[x] Select auction-vpc
[x] Enter auction-private-subnet-1
[x] Select ap-southeast-1a
[x] Enter 10.0.2.0/24
[x] Create the subnet
[x] Confirm auto-assign public IPv4 is disabled
```
# Important: It is not fully private yet
Disabling public IPv4 assignment helps, but the subnet’s route table also determines whether it is public or private.
Later, associate this subnet with:
```
auction-private-rt
```
That route table should initially contain only:
```
10.0.0.0/16 → local
```
Do not add:
```
0.0.0.0/0 → auction-igw
```
The final private-subnet configuration will be:
```
auction-private-subnet-1
├── CIDR: 10.0.2.0/24
├── AZ: ap-southeast-1a
├── Public IPv4 assignment: Disabled
└── Route table: auction-private-rt
    └── 10.0.0.0/16 → local
```
You still need a second private subnet in another Availability Zone because an RDS DB subnet group should cover at least two Availability Zones.