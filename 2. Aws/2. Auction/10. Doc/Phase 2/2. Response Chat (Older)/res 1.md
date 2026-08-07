# Main Problem
Your Auction application needs its **own private network in AWS**.
The VPC will later contain resources such as:
```
auction-vpc
├── Public subnet
│   └── EC2 or Lambda-related public resources
└── Private subnet
    └── RDS MySQL
```
A VPC is an isolated virtual network inside your AWS account. After creating it, you can add subnets, route tables, gateways, and security groups.
# Task 1: Create `auction-vpc`
## Solution
### Step 1: Sign in with your IAM user
Sign in using:
```
auction-dev-admin
```
Do not use the AWS root user for this task.

---
### Step 2: Check the AWS Region
Look at the upper-right corner of the AWS Console.
Choose the region where you plan to build the Auction application, for example:
```
Asia Pacific (Singapore)
ap-southeast-1
```
Your VPC, subnets, EC2 instances, Lambda functions, and RDS database should normally be created in the same region.

---
### Step 3: Open the VPC Console
At the top of the AWS Console:
1. Select the search box.
2. Type:
```
VPC
```
3. Select **VPC** under Services.
You should now see the **VPC dashboard**.

---
### Step 4: Open “Your VPCs”
In the left navigation menu, select:
```
Your VPCs
```
You may already see a VPC with a name similar to:
```
default
```
Do not delete it, but do not use it for the Auction project.

---
### Step 5: Start creating the VPC
Select:
```
Create VPC
```
AWS will ask which resources it should create.
Under **Resources to create**, choose:
```
VPC only
```
This means AWS will create only the network container. You will create the subnets, Internet Gateway, and route tables yourself in later tasks.
Do not choose:
```
VPC and more
```
That option automatically creates several networking resources, which would make it harder to learn what each component does.

---
### Step 6: Enter the VPC settings
Configure the form as follows.
#### Name tag
Enter:
```
auction-vpc
```
This is the name that will appear in your AWS Console.
#### IPv4 CIDR block
Select:
```
IPv4 CIDR manual input
```
Enter:
```
10.0.0.0/16
```
AWS requires a VPC to have an IPv4 CIDR block. A `/16` VPC contains 65,536 IPv4 addresses, which can later be divided into smaller subnet ranges.
For example:
```
VPC:            10.0.0.0/16
Public subnet:  10.0.1.0/24
Private subnet: 10.0.2.0/24
```
You are not assigning all 65,536 addresses to servers. You are only reserving this address range for your Auction network.
#### IPv6 CIDR block
Choose:
```
No IPv6 CIDR block
```
You do not need IPv6 for the current learning architecture.
#### Tenancy
Keep:
```
Default
```
Do not choose dedicated tenancy. Dedicated tenancy can involve additional cost and is unnecessary for this project.
Your completed settings should look approximately like this:
```
Resources to create: VPC only
Name tag: auction-vpc
IPv4 CIDR: IPv4 CIDR manual input
IPv4 CIDR block: 10.0.0.0/16
IPv6 CIDR block: No IPv6 CIDR block
Tenancy: Default
```

---
### Step 7: Create the VPC
Select:
```
Create VPC
```
AWS should display a success message.
Select:
```
View VPC
```

---
# Task 2: Verify the result
## Solution
In **Your VPCs**, locate `auction-vpc` and verify:
```
Name: auction-vpc
State: Available
IPv4 CIDR: 10.0.0.0/16
Tenancy: Default
Default VPC: No
```
The most important field is:
```
Default VPC: No
```
That confirms this is your dedicated Auction application VPC rather than the automatically provided default VPC.
Your checklist is now:
```
[x] Open the VPC Console
[x] Select Your VPCs
[x] Select Create VPC
[x] Choose VPC only
[x] Enter auction-vpc
[x] Enter 10.0.0.0/16
[x] Keep No IPv6 CIDR block
[x] Keep Default tenancy
[x] Create the VPC
[x] Confirm the state is Available
```
At this point, the VPC is only an empty network container. It does not yet provide internet access and does not yet contain EC2, Lambda, or RDS resources. The next networking task is to create the public subnet.