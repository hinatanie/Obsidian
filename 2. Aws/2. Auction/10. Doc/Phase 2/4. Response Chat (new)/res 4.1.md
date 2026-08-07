# Main Problem
Your RDS MySQL database should stay inside private subnets so it is not directly exposed to the internet.
You need two private subnets because the future RDS DB subnet group must cover at least two Availability Zones.
Your network will look like this:
```
pet-shop-vpc: 10.0.0.0/16
│
├── pet-shop-public-subnet-1
│   ├── ap-southeast-1a
│   └── 10.0.1.0/24
│
├── pet-shop-private-subnet-1
│   ├── ap-southeast-1a
│   └── 10.0.2.0/24
│
└── pet-shop-private-subnet-2
    ├── ap-southeast-1b
    └── 10.0.3.0/24
```
# Problem 4: Create the private RDS subnets
## Solution
You can create both subnets from the same **Create subnet** screen.
## Step 1: Open the subnet page
In the AWS Management Console:
```
Search bar
→ VPC
→ Open VPC
→ Subnets
```
Confirm the selected Region in the upper-right corner is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
Then select:
```
Create subnet
```

---
## Step 2: Select the Pet Shop VPC
For **VPC ID**, select:
```
pet-shop-vpc
```
Confirm that AWS displays:
```
IPv4 CIDR: 10.0.0.0/16
```
Do not select the default VPC.

---
# Problem 4.1: Configure the first private subnet
## Solution
Under **Subnet settings**, enter:
```
Subnet name: pet-shop-private-subnet-1
Availability Zone:
Asia Pacific (Singapore) / ap-southeast-1a
IPv4 subnet CIDR block:
10.0.2.0/24
```
The completed first subnet should be:

| Setting           | Value                       |
| ----------------- | --------------------------- |
| Name              | `pet-shop-private-subnet-1` |
| VPC               | `pet-shop-vpc`              |
| Availability Zone | `ap-southeast-1a`           |
| IPv4 CIDR         | `10.0.2.0/24`               |
Do not enter:
```
10.0.0.0/16
```
That is the CIDR of the whole VPC.
Do not enter:
```
10.0.1.0/24
```
That range is already being used by your public EC2 subnet.

---
# Problem 4.2: Add the second private subnet
## Solution
On the same page, select:
```
Add new subnet
```
Enter:
```
Subnet name: pet-shop-private-subnet-2
Availability Zone:
Asia Pacific (Singapore) / ap-southeast-1b
IPv4 subnet CIDR block:
10.0.3.0/24
```
The completed second subnet should be:

|Setting|Value|
|---|---|
|Name|`pet-shop-private-subnet-2`|
|VPC|`pet-shop-vpc`|
|Availability Zone|`ap-southeast-1b`|
|IPv4 CIDR|`10.0.3.0/24`|
Make sure the second subnet uses:
```
ap-southeast-1b
```
Do not create both private subnets in `ap-southeast-1a`.
AWS allows you to choose a specific Availability Zone when creating each subnet.

---
## Step 3: Review both subnets
Before creating them, your screen should contain approximately:
```
VPC ID
pet-shop-vpc
```
First subnet:
```
Subnet name: pet-shop-private-subnet-1
Availability Zone: ap-southeast-1a
IPv4 subnet CIDR block: 10.0.2.0/24
```
Second subnet:
```
Subnet name: pet-shop-private-subnet-2
Availability Zone: ap-southeast-1b
IPv4 subnet CIDR block: 10.0.3.0/24
```
Then select:
```
Create subnet
```
AWS should create both subnets.

---
# Problem 4.3: Disable automatic public IPv4 assignment
## Solution
Private RDS subnets must not automatically assign public IPv4 addresses.
Usually, this option is disabled by default for a custom subnet, but verify both subnets.
## Check the first private subnet
Open:
```
VPC
→ Subnets
```
Select:
```
pet-shop-private-subnet-1
```
Then choose:
```
Actions
→ Edit subnet settings
```
Under **Auto-assign IP settings**, make sure this box is unchecked:
```
☐ Enable auto-assign public IPv4 address
```
Select:
```
Save
```
AWS documents this setting under **Actions → Edit subnet settings**. When the box is selected, new instances launched in that subnet can request a public IPv4 address, so it should remain unselected for these RDS subnets.
## Check the second private subnet
Repeat the same process for:
```
pet-shop-private-subnet-2
```
Confirm:
```
☐ Enable auto-assign public IPv4 address
```
Then save.

---
# Problem 4.4: Verify the result
## Solution
Return to:
```
VPC
→ Subnets
```
You should now see:

|Name|Availability Zone|IPv4 CIDR|Auto-assign public IPv4|
|---|---|---|---|
|`pet-shop-private-subnet-1`|`ap-southeast-1a`|`10.0.2.0/24`|No|
|`pet-shop-private-subnet-2`|`ap-southeast-1b`|`10.0.3.0/24`|No|
Also confirm:
```
State: Available
```
for both subnets.
# Important: These are not fully private yet
The name `private-subnet` does not make a subnet private.
A subnet becomes private based on its route table. These RDS subnets must not have this route:
```
0.0.0.0/0 → Internet Gateway
```
Later, associate them with a private route table containing only the local VPC route:
```
10.0.0.0/16 → local
```
Do not associate them with the public EC2 route table.
# Why two Availability Zones are required
Later, you will create one RDS DB subnet group containing:
```
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
That subnet group will cover:
```
ap-southeast-1a
ap-southeast-1b
```
RDS generally requires a DB subnet group to contain subnets across at least two Availability Zones.
This does not automatically create a Multi-AZ database. You can still choose a less expensive Single-AZ RDS deployment later.
# Final Checklist
```
[ ] Region is ap-southeast-1
[ ] Created pet-shop-private-subnet-1
[ ] Selected pet-shop-vpc
[ ] Selected ap-southeast-1a
[ ] Entered 10.0.2.0/24
[ ] Auto-assign public IPv4 shows No
[ ] Created pet-shop-private-subnet-2
[ ] Selected pet-shop-vpc
[ ] Selected ap-southeast-1b
[ ] Entered 10.0.3.0/24
[ ] Auto-assign public IPv4 shows No
[ ] Both subnet states show Available
[ ] The two subnets use different Availability Zones
```