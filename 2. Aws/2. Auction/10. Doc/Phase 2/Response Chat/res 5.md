# Main Problem
Your EC2 FastAPI backend will run inside:
```
auction-public-subnet-1
```
However, a new custom VPC does not automatically have a path to the internet.
You need two separate network components:
```
Internet Gateway
    ↓ attached to
auction-vpc
    ↓ referenced by a route
Public route table
    ↓ associated with
auction-public-subnet-1
```
In **Task 5**, create and attach the Internet Gateway. You will create the public route in the next task.

---
## Problem 1: Open Internet Gateways
## Solution
1. Sign in to AWS using:
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
5. In the left navigation menu, find **Virtual private cloud**.
6. Select:
```
Internet gateways
```
Be careful not to choose:
```
Egress only internet gateways
NAT gateways
Transit gateways
```
They are different resources.

---
## Problem 2: Create the Internet Gateway
## Solution
On the **Internet gateways** page:
1. Select:
```
Create internet gateway
```
2. Under **Name tag**, enter:
```
auction-igw
```
You normally do not need to change any other settings.
3. Select:
```
Create internet gateway
```
AWS will create the gateway, but its state may initially show:
```
Detached
```
This is normal. It means the Internet Gateway exists but is not connected to a VPC yet. AWS treats creating the gateway and attaching it as separate operations.

---
## Problem 3: Attach the Internet Gateway to `auction-vpc`
## Solution
After AWS creates the gateway, you may see a green success banner with this button:
```
Attach to a VPC
```
Select it.
Under **Available VPCs**, choose:
```
auction-vpc
```
Confirm that its CIDR is:
```
10.0.0.0/16
```
Then select:
```
Attach internet gateway
```
### When the button is not visible
You can attach it manually:
1. Open **VPC → Internet gateways**.
2. Select `auction-igw`.
3. Select **Actions**.
4. Select **Attach to VPC**.
5. Choose `auction-vpc`.
6. Select **Attach internet gateway**.

---
## Problem 4: Verify the attachment
## Solution
Return to:
```
VPC → Internet gateways
```
Select:
```
auction-igw
```
Check the details.
You should see approximately:

|Setting|Expected value|
|---|---|
|Name|`auction-igw`|
|State|`Attached`|
|VPC ID|The ID belonging to `auction-vpc`|
Your architecture now looks like this:
```
Internet
    │
    ▼
auction-igw
    │
    ▼
auction-vpc
```
But traffic still cannot automatically travel from your public subnet to the gateway.

---
# Why This Is Not Enough
Attaching an Internet Gateway only connects the gateway to the VPC.
AWS still needs a routing rule that says:
```
When traffic is going anywhere on the internet,
send it to auction-igw.
```
That rule is:
```
Destination: 0.0.0.0/0
Target: auction-igw
```
It must be placed in a route table associated with:
```
auction-public-subnet-1
```
AWS defines a public subnet as a subnet whose route table has a route to an Internet Gateway.
Do **not** add this Internet Gateway route to the private RDS subnets:
```
auction-private-subnet-1
auction-private-subnet-2
```
Those subnets should remain private.

---
# What `0.0.0.0/0 → auction-igw` Means
```
0.0.0.0/0
```
means:
```
Every IPv4 address that does not match a more specific route
```
Therefore:
```
0.0.0.0/0 → auction-igw
```
means:
```
Send internet-bound IPv4 traffic through auction-igw.
```
You will add that rule to a dedicated public route table in the next task. AWS’s documented process is: create the gateway, attach it to the VPC, and then add the route to the subnet’s route table.

---
# Final Checklist
```
[ ] Opened VPC
[ ] Opened Internet gateways
[ ] Selected Create internet gateway
[ ] Entered auction-igw
[ ] Created the Internet Gateway
[ ] Attached auction-igw to auction-vpc
[ ] Confirmed its state is Attached
```
After Task 5, your network should be:
```
Internet
    │
    ▼
auction-igw
    │
    ▼
auction-vpc
    │
    ├── auction-public-subnet-1
    ├── auction-private-subnet-1
    └── auction-private-subnet-2
```
The missing connection is still:
```
auction-public-subnet-1
        │
        ▼
public route table
0.0.0.0/0 → auction-igw
```