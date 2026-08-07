# Main Problem
Your Pet Shop application needs its own private AWS network. This network will later contain resources such as:
```
pet-shop-vpc
├── Public subnet
│   └── EC2 backend
└── Private subnets
    └── RDS MySQL
```
Creating a separate VPC gives you control over the IP addresses, subnets, routing, and security rules used by the project.
# Problem 1: Create the VPC
## Solution
### Step 1: Select the correct AWS Region
1. Sign in to the **AWS Management Console** using your IAM user.
2. Look at the upper-right corner.
3. Open the **Region** menu.
4. Select:
```
Asia Pacific (Singapore)
ap-southeast-1
```
The VPC is regional, so it must be created in the same Region where you will later create EC2 and RDS.

---
### Step 2: Open the VPC service
1. Use the AWS search box at the top.
2. Search for:
```
VPC
```
3. Select **VPC**.
You should now see the **VPC dashboard**.

---
### Step 3: Open Your VPCs
From the left menu:
```
Virtual private cloud
→ Your VPCs
```
Then select:
```
Create VPC
```

---
### Step 4: Choose what AWS should create
Under **Resources to create**, choose:
```
VPC only
```
Do not choose:
```
VPC and more
```
You are creating the subnets, route tables, and internet gateway manually in later tasks. AWS officially supports creating only the VPC without the additional networking resources.

---
### Step 5: Enter the VPC settings
Configure the form as follows:
```
Name tag: pet-shop-vpc
IPv4 CIDR manual input: Selected
IPv4 CIDR: 10.0.0.0/16
IPv6 CIDR block: No IPv6 CIDR block
Tenancy: Default
```
Leave any other settings at their default values.
Your screen should approximately contain:
```
Resources to create
● VPC only
Name tag
pet-shop-vpc
IPv4 CIDR
● IPv4 CIDR manual input
10.0.0.0/16
IPv6 CIDR block
● No IPv6 CIDR block
Tenancy
Default
```
### What `10.0.0.0/16` means
This gives your VPC an address range from approximately:
```
10.0.0.0
to
10.0.255.255
```
You will divide this large range into smaller subnets later, for example:
```
10.0.1.0/24 → Public subnet
10.0.2.0/24 → First private subnet
10.0.3.0/24 → Second private subnet
```
Do not enter one of those `/24` subnet ranges here. The VPC itself needs the larger:
```
10.0.0.0/16
```

---
### Step 6: Create the VPC
Select:
```
Create VPC
```
Wait until AWS displays a success message.

---
### Step 7: Verify the result
Open:
```
VPC
→ Your VPCs
```
Find the row named:
```
pet-shop-vpc
```
Verify:
```
Name: pet-shop-vpc
IPv4 CIDR: 10.0.0.0/16
State: Available
Default VPC: No
Tenancy: Default
```
`Default VPC: No` is correct. You created a custom VPC for the Pet Shop project rather than using AWS's existing default VPC.
# Final Checklist
```
[x] AWS Region is ap-southeast-1
[x] Selected VPC only
[x] Name is pet-shop-vpc
[x] IPv4 CIDR is 10.0.0.0/16
[x] IPv6 is disabled
[x] Tenancy is Default
[x] VPC state is Available
[x] Default VPC shows No
```
At this point, the VPC is only an isolated network container. It does not yet have a subnet, internet access, EC2 server, or database.