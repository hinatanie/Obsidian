# Main Problem
Your Pet Shop backend needs a subnet where the EC2 instance will run:
```
EC2
├── Java
├── Spring Boot
├── Nginx
└── Systems Manager Agent
```
Because users must reach the Spring Boot API from the internet, this EC2 instance will eventually need:
```
Public subnet
+
Route to an Internet Gateway
+
Public IPv4 address or Elastic IP
+
Security group rules
```
Creating the subnet is only the first part. You will connect it to an Internet Gateway and configure its route table in later tasks.
# Problem 3: Create the public EC2 subnet
## Solution
## Step 1: Confirm the AWS Region
In the upper-right corner of the AWS Console, confirm that the Region is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
The subnet must be created in the same Region as:
```
pet-shop-vpc
```

---
## Step 2: Open the VPC service
1. Use the AWS search bar.
2. Search for:
```
VPC
```
3. Open the **VPC** service.
4. In the left navigation menu, select:
```
Subnets
```
A subnet is a smaller IP address range inside your VPC, and each subnet belongs to exactly one Availability Zone.

---
## Step 3: Start creating the subnet
Select:
```
Create subnet
```
You should see a form containing:
```
VPC ID
Subnet name
Availability Zone
IPv4 subnet CIDR block
```

---
## Step 4: Select the correct VPC
For **VPC ID**, select:
```
pet-shop-vpc
```
After selecting it, verify that AWS shows the VPC CIDR:
```
10.0.0.0/16
```
Be careful not to select:
```
default VPC
```

---
## Step 5: Enter the subnet settings
Under the subnet configuration, enter:
```
Subnet name: pet-shop-public-subnet-1
Availability Zone: ap-southeast-1a
IPv4 VPC CIDR block: 10.0.0.0/16
IPv4 subnet CIDR block: 10.0.1.0/24
```
The important values are:
```
Name: pet-shop-public-subnet-1
VPC: pet-shop-vpc
Availability Zone: ap-southeast-1a
IPv4 CIDR: 10.0.1.0/24
```
### Be careful with the Availability Zone
Select the actual zone:
```
ap-southeast-1a
```
Do not leave it as:
```
No preference
```
For this architecture, you are intentionally placing the EC2 backend in `ap-southeast-1a`.
### Be careful with the CIDR block
Enter:
```
10.0.1.0/24
```
Do not enter:
```
10.0.0.0/16
```
The difference is:
```
10.0.0.0/16 → Entire Pet Shop VPC
10.0.1.0/24 → Public EC2 subnet inside the VPC
```
Your network will begin to look like this:
```
pet-shop-vpc
10.0.0.0/16
└── pet-shop-public-subnet-1
    10.0.1.0/24
    ap-southeast-1a
```

---
## Step 6: Create the subnet
Select:
```
Create subnet
```
AWS should display a success message.
Return to:
```
VPC
→ Subnets
```
Find:
```
pet-shop-public-subnet-1
```
Verify:
```
State: Available
VPC: pet-shop-vpc
Availability Zone: ap-southeast-1a
IPv4 CIDR: 10.0.1.0/24
```
# Problem 4: Enable automatic public IPv4 assignment
## Solution
Creating the subnet does not always automatically enable public IPv4 assignment.
You should configure this separately after creating the subnet.
### Step 1: Select the subnet
Go to:
```
VPC
→ Subnets
```
Select the checkbox beside:
```
pet-shop-public-subnet-1
```

---
### Step 2: Open the subnet settings
Choose:
```
Actions
→ Edit subnet settings
```

---
### Step 3: Enable public IPv4 assignment
Find:
```
Auto-assign IP settings
```
Enable:
```
☑ Enable auto-assign public IPv4 address
```
Then select:
```
Save
```
AWS documents this exact process under **Subnets → Actions → Edit subnet settings**. When enabled, new network interfaces and EC2 instances launched in the subnet can automatically request a public IPv4 address.

---
## Step 4: Verify the setting
Select the subnet and check its details.
You should see something similar to:
```
Auto-assign public IPv4 address: Yes
```
or:
```
Auto-assign public IPv4: Enabled
```
This setting applies to new EC2 instances launched into this subnet.
It does not retroactively give an existing EC2 instance a public IPv4 address.
# Why this setting is necessary
A route to the internet is not enough by itself.
For direct IPv4 internet communication, your EC2 instance needs:
```
1. A route to an Internet Gateway
2. A public IPv4 address or Elastic IP
3. Security group rules allowing the required traffic
```
The complete path will eventually be:
```
Internet user
      ↓
Public IPv4 address
      ↓
Internet Gateway
      ↓
Public route table
      ↓
pet-shop-public-subnet-1
      ↓
EC2
      ↓
Nginx
      ↓
Spring Boot
```
At this point, you have only created and configured the subnet. It is not fully public yet because you have not completed these later tasks:
```
[ ] Create an Internet Gateway
[ ] Attach it to pet-shop-vpc
[ ] Create a public route table
[ ] Add 0.0.0.0/0 → Internet Gateway
[ ] Associate the route table with pet-shop-public-subnet-1
```
A subnet is considered public when its route table has a route to an Internet Gateway. The EC2 instance also needs a public address to communicate directly over IPv4.
# Important cost note
AWS charges for public IPv4 addresses, including public addresses automatically assigned to EC2 instances and Elastic IP addresses.
For a learning environment:
```
Stop or terminate EC2 when it is not needed.
```
Stopping EC2 may release a normal auto-assigned public IPv4 address. When you start the instance again, it may receive a different address.
An Elastic IP remains stable, but it also incurs public IPv4 charges.
# Final Checklist
```
[x] Opened VPC → Subnets
[x] Selected Create subnet
[x] Selected pet-shop-vpc
[x] Entered pet-shop-public-subnet-1
[x] Selected ap-southeast-1a
[x] Entered 10.0.1.0/24
[x] Created the subnet
[x] Opened Actions → Edit subnet settings
[x] Enabled auto-assign public IPv4
[x] Saved the settings
[x] Verified the subnet state is Available
```
Your current network should now look like:
```
pet-shop-vpc
10.0.0.0/16
└── pet-shop-public-subnet-1
    ├── Availability Zone: ap-southeast-1a
    ├── CIDR: 10.0.1.0/24
    └── Auto-assign public IPv4: Enabled
```