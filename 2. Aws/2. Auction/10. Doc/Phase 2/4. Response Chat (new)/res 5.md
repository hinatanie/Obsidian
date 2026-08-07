# Main Problem
Your EC2 instance will be placed in:
```
pet-shop-public-subnet-1
```
To communicate with the internet, your VPC needs an **Internet Gateway**.
The Internet Gateway is the connection point between:
```
Internet
   ↕
Internet Gateway
   ↕
pet-shop-vpc
```
However, simply creating and attaching it does **not** make the public subnet internet-accessible. You must later add this route to the public subnet’s route table:
```
0.0.0.0/0 → pet-shop-igw
```
AWS requires both an attached Internet Gateway and a route pointing internet traffic to it.
# Problem 5: Create and attach the Internet Gateway
## Solution
Create:
```
Name: pet-shop-igw
```
Attach it to:
```
pet-shop-vpc
```
## Step 1: Confirm the AWS Region
In the upper-right corner of the AWS Console, confirm:
```
Asia Pacific (Singapore)
ap-southeast-1
```
Internet Gateways are attached to VPCs in the selected Region, so you must be working in the same Region as `pet-shop-vpc`.

---
## Step 2: Open the VPC service
In the AWS Console:
```
Search bar
→ Search for VPC
→ Open VPC
```
From the left navigation menu, find:
```
Virtual private cloud
→ Internet gateways
```
Select:
```
Internet gateways
```

---
## Step 3: Create the Internet Gateway
Select:
```
Create internet gateway
```
For **Name tag**, enter:
```
pet-shop-igw
```
Your form should look approximately like this:
```
Name tag
pet-shop-igw
```
You do not need to configure a CIDR block, Availability Zone, or IP address for the Internet Gateway.
Select:
```
Create internet gateway
```
AWS will create the Internet Gateway, but it will initially be unattached. AWS calls this state:
```
Detached
```
AWS’s documented console process is **Internet gateways → Create internet gateway → enter a name → Create internet gateway**.

---
## Step 4: Attach it immediately from the success page
After creating it, AWS normally displays a success banner with a button such as:
```
Attach to a VPC
```
Select:
```
Attach to a VPC
```
For **Available VPCs**, choose:
```
pet-shop-vpc
```
Verify that the VPC has the CIDR:
```
10.0.0.0/16
```
Then select:
```
Attach internet gateway
```
The connection is now:
```
pet-shop-igw
      ↓ attached to
pet-shop-vpc
```
AWS permits an Internet Gateway to be attached from the success banner immediately after creation.
# Alternative: Attach it from the Internet Gateways list
Use these steps when you closed the success page or did not select **Attach to a VPC**.
Go to:
```
VPC
→ Internet gateways
```
Select the checkbox beside:
```
pet-shop-igw
```
Then choose:
```
Actions
→ Attach to VPC
```
Under **Available VPCs**, choose:
```
pet-shop-vpc
```
Then select:
```
Attach internet gateway
```
This is the standard AWS console attachment process.

---
# Problem 5.1: Verify the attachment
## Solution
Return to:
```
VPC
→ Internet gateways
```
Select:
```
pet-shop-igw
```
Check the Internet Gateway details.
You should see:
```
Name: pet-shop-igw
State: Attached
VPC ID: pet-shop-vpc
```
The VPC field may display both the name and generated AWS ID:
```
pet-shop-vpc
vpc-xxxxxxxxxxxxxxxxx
```
That is correct.
Your architecture now looks like:
```
Internet
   │
   │
pet-shop-igw
   │
   │ attached
   ▼
pet-shop-vpc
10.0.0.0/16
├── pet-shop-public-subnet-1
├── pet-shop-private-subnet-1
└── pet-shop-private-subnet-2
```
# Important: The public subnet is not public yet
Attaching the Internet Gateway only gives the VPC a possible connection point to the internet.
It does not automatically change any route tables.
At this moment, your public subnet probably still has only this route:
```
Destination: 10.0.0.0/16
Target: local
```
That route only supports communication inside `pet-shop-vpc`.
You still need to create a public route table with:
```
Destination: 0.0.0.0/0
Target: pet-shop-igw
```
Then associate that route table with:
```
pet-shop-public-subnet-1
```
The final public internet path will be:
```
EC2 public IPv4
       ↓
pet-shop-public-subnet-1
       ↓
Public route table
       ↓
0.0.0.0/0 → pet-shop-igw
       ↓
Internet
```
AWS states that a subnet route table must send internet traffic to the Internet Gateway before resources in that subnet can use it.
# Keep the RDS subnets private
Later, do not add this route to either private RDS subnet:
```
0.0.0.0/0 → pet-shop-igw
```
The following subnets should remain private:
```
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
They should not be associated with the public route table.
Your intended routing will be:
```
pet-shop-public-subnet-1
└── 0.0.0.0/0 → pet-shop-igw
pet-shop-private-subnet-1
└── No route to Internet Gateway
pet-shop-private-subnet-2
└── No route to Internet Gateway
```
# Common mistakes
Do not create an **Egress-only Internet Gateway**. That is primarily for outbound IPv6 traffic. For your IPv4 EC2 architecture, choose:
```
Internet gateways
```
Also, do not attach `pet-shop-igw` to the default VPC. Attach it specifically to:
```
pet-shop-vpc
10.0.0.0/16
```
# Final Checklist
```
[ ] Region is ap-southeast-1
[ ] Opened VPC → Internet gateways
[ ] Selected Create internet gateway
[ ] Entered pet-shop-igw
[ ] Created the Internet Gateway
[ ] Selected Attach to a VPC
[ ] Selected pet-shop-vpc
[ ] Attached the Internet Gateway
[ ] State shows Attached
[ ] VPC shows pet-shop-vpc
```
After this task, you have:
```
[x] Internet Gateway created
[x] Internet Gateway attached to pet-shop-vpc
[ ] Public route table still needs to be created
[ ] Route 0.0.0.0/0 → pet-shop-igw still needs to be added
[ ] Public subnet still needs to be associated with that route table
```