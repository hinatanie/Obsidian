# Main Problem
You need to create a subnet inside `auction-vpc` where your future EC2 instance will run:
```
FastAPI
Uvicorn or Gunicorn
Nginx
```
The subnet will use:
```
Name: auction-public-subnet-1
VPC: auction-vpc
Availability Zone: ap-southeast-1a
IPv4 CIDR: 10.0.1.0/24
```
# Problem 1: Open the correct AWS Region
## Solution
Sign in using your IAM user:
```
auction-dev-admin
```
In the upper-right corner of the AWS Console, select:
```
Asia Pacific (Singapore)
ap-southeast-1
```
You must use the Singapore region because:
```
ap-southeast-1a
```
belongs to that region.
# Problem 2: Open the Subnets page
## Solution
1. Select the AWS search bar.
2. Search for:
```
VPC
```
3. Open the **VPC** service.
4. In the left navigation menu, select:
```
Subnets
```
5. Select:
```
Create subnet
```
AWS’s current process is to open **Subnets**, select **Create subnet**, and then choose the VPC where the subnet belongs.
# Problem 3: Select `auction-vpc`
## Solution
Find the **VPC ID** field.
Open the dropdown and select:
```
auction-vpc
```
Confirm that the VPC CIDR shown is:
```
10.0.0.0/16
```
Do not select the default VPC.
Your subnet CIDR must be inside the VPC CIDR:
```
VPC:    10.0.0.0/16
Subnet: 10.0.1.0/24
```
# Problem 4: Enter the subnet settings
## Solution
Under **Subnet settings**, enter the following values.
### Subnet name
```
auction-public-subnet-1
```
### Availability Zone
Open the dropdown and select:
```
ap-southeast-1a
```
Do not leave it as:
```
No Preference
```
AWS allows you to manually choose the Availability Zone when creating a subnet.
### IPv4 VPC CIDR block
Keep:
```
10.0.0.0/16
```
### IPv4 subnet CIDR block
Choose manual input if AWS shows that option, and enter:
```
10.0.1.0/24
```
Your completed form should look like:
```
VPC ID:
auction-vpc
Subnet name:
auction-public-subnet-1
Availability Zone:
ap-southeast-1a
IPv4 VPC CIDR:
10.0.0.0/16
IPv4 subnet CIDR:
10.0.1.0/24
```
Then select:
```
Create subnet
```
# Problem 5: Enable automatic public IPv4 assignment
## Solution
This setting is normally enabled after creating the subnet.
New nondefault subnets have automatic public IPv4 assignment disabled by default.
Follow these steps:
1. Return to the **Subnets** page.
2. Select:
```
auction-public-subnet-1
```
3. Select:
```
Actions
```
4. Select:
```
Edit subnet settings
```
5. Under **Auto-assign IP settings**, check:
```
Enable auto-assign public IPv4 address
```
6. Select:
```
Save
```
When this option is enabled, EC2 instances launched into this subnet can automatically receive public IPv4 addresses.
# Problem 6: Verify the result
## Solution
Select `auction-public-subnet-1` and verify:
```
Name:
auction-public-subnet-1
VPC:
auction-vpc
IPv4 CIDR:
10.0.1.0/24
Availability Zone:
ap-southeast-1a
Auto-assign public IPv4:
Yes
```
Your completed checklist is:
```
[x] Open Subnets
[x] Select Create subnet
[x] Select auction-vpc
[x] Enter auction-public-subnet-1
[x] Select ap-southeast-1a
[x] Enter 10.0.1.0/24
[x] Create the subnet
[x] Open Edit subnet settings
[x] Enable auto-assign public IPv4
[x] Save the changes
```
# Important: The subnet is not fully public yet
At this point, you have created the subnet and enabled public IPv4 assignment.
However, it is not fully public until you also create:
```
Internet Gateway:
auction-igw
Public route table:
auction-public-rt
Internet route:
0.0.0.0/0 → auction-igw
```
You must then associate `auction-public-rt` with:
```
auction-public-subnet-1
```
A public IPv4 address alone does not provide internet connectivity; the subnet also needs routing through an Internet Gateway.
Your future request flow will be:
```
Internet
   ↓
EC2 public IPv4
   ↓
Nginx on ports 80 or 443
   ↓
Uvicorn or Gunicorn
   ↓
FastAPI on 127.0.0.1:8000
```