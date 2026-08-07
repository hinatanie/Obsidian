# Main Problem
Your future EC2 instance will run:
```
Nginx
FastAPI
Uvicorn or Gunicorn
```
A security group acts like a firewall around the EC2 instance. It decides which incoming connections are allowed.
You will create:
```
Name: auction-backend-sg
Description: Security group for Auction FastAPI backend
VPC: auction-vpc
```
Then allow:
```
HTTP   80    from everyone
HTTPS  443   from everyone
SSH    22    from your IP only
FastAPI 8000 from your IP only, temporarily
```

---
## Problem 1: Open the Security Groups page
## Solution
1. Sign in using your IAM user:
```
auction-dev-admin
```
2. Confirm the AWS Region is:
```
Singapore
ap-southeast-1
```
3. In the AWS search bar, search for:
```
EC2
```
4. Open the **EC2** service.
5. In the left menu, find **Network & Security**.
6. Select:
```
Security Groups
```
7. Select:
```
Create security group
```
You can also create security groups from the VPC console, but using the EC2 console is usually easier when the group will protect an EC2 instance.

---
## Problem 2: Enter the basic security-group information
## Solution
Under **Basic details**, enter:
### Security group name
```
auction-backend-sg
```
### Description
```
Security group for Auction FastAPI backend
```
### VPC
Select:
```
auction-vpc
```
Confirm that the selected VPC has this CIDR:
```
10.0.0.0/16
```
Be careful not to select the default VPC.
Your form should look like:
```
Security group name:
auction-backend-sg
Description:
Security group for Auction FastAPI backend
VPC:
auction-vpc
```

---
# Problem 3: Add the HTTP rule
## Solution
Under **Inbound rules**:
1. Select:
```
Add rule
```
2. Configure:
```
Type: HTTP
Protocol: TCP
Port range: 80
Source type: Anywhere-IPv4
Source: 0.0.0.0/0
```
Optional description:
```
Public HTTP access for Nginx
```
This allows browsers and API clients on the internet to reach Nginx on port `80`.
The rule should look like:

|Type|Port|Source|
|---|---|---|
|HTTP|`80`|`0.0.0.0/0`|
AWS security-group rules specify the traffic type, protocol, port and source.

---
# Problem 4: Add the HTTPS rule
## Solution
Select **Add rule** again.
Configure:
```
Type: HTTPS
Protocol: TCP
Port range: 443
Source type: Anywhere-IPv4
Source: 0.0.0.0/0
```
Optional description:
```
Public HTTPS access for Nginx
```
The rule should look like:

|Type|Port|Source|
|---|---|---|
|HTTPS|`443`|`0.0.0.0/0`|
You may not use HTTPS immediately, but adding this rule prepares the EC2 instance for a future TLS certificate and secure API access.

---
# Problem 5: Add the SSH rule safely
## Solution
Select **Add rule** again.
Configure:
```
Type: SSH
Protocol: TCP
Port range: 22
Source type: My IP
```
When you select **My IP**, AWS should automatically enter your current public IPv4 address in `/32` form, for example:
```
113.161.25.80/32
```
Your actual address will be different.
Optional description:
```
SSH access from my current IP
```
The rule should look like:

|Type|Port|Source|
|---|---|---|
|SSH|`22`|`your-public-IP/32`|
A `/32` source represents one specific IPv4 address.
Do not choose:
```
Anywhere-IPv4
0.0.0.0/0
```
for SSH.
That would allow SSH connection attempts from every IPv4 address on the internet.
## Important note about `My IP`
Your public IP may change when:
```
You restart your router
You change Wi-Fi networks
You use mobile data
Your ISP changes your assigned address
You enable or disable a VPN
```
When that happens, SSH may stop working. You can edit the rule later and select **My IP** again to update it.

---
# Problem 6: Optionally add temporary FastAPI access
## Solution
You only need this rule when you want to test Uvicorn directly before Nginx is configured.
Select **Add rule** again.
Configure:
```
Type: Custom TCP
Protocol: TCP
Port range: 8000
Source type: My IP
Source: your-public-IP/32
```
Optional description:
```
Temporary direct FastAPI testing
```
The rule should look like:

|Type|Port|Source|
|---|---|---|
|Custom TCP|`8000`|`your-public-IP/32`|
Do not configure:
```
Port: 8000
Source: 0.0.0.0/0
```
That would let anyone attempt to access Uvicorn directly, bypassing Nginx.
You can skip this rule completely and configure Nginx first. It is not required for production.

---
# Problem 7: Check the outbound rule
## Solution
Scroll to **Outbound rules**.
AWS commonly adds this default rule:
```
Type: All traffic
Destination: 0.0.0.0/0
```
For your learning deployment, you can leave it unchanged.
It allows the EC2 instance to initiate outbound connections, such as:
```
Downloading Ubuntu updates
Installing Python packages
Connecting to RDS
Uploading images to S3
Sending requests to AWS services
```
Security groups are stateful. When an allowed connection is established, response traffic is automatically permitted.

---
# Problem 8: Create the security group
## Solution
Before creating it, verify the inbound rules.
They should look approximately like this:

|Type|Protocol|Port|Source|
|---|---|---|---|
|HTTP|TCP|`80`|`0.0.0.0/0`|
|HTTPS|TCP|`443`|`0.0.0.0/0`|
|SSH|TCP|`22`|`your-IP/32`|
|Custom TCP|TCP|`8000`|`your-IP/32`|
The port `8000` rule is optional.
Then select:
```
Create security group
```
AWS should show a confirmation that the security group was created.

---
# Problem 9: Verify the new security group
## Solution
Open:
```
EC2
→ Network & Security
→ Security Groups
```
Search for:
```
auction-backend-sg
```
Select it and confirm:
```
Security group name: auction-backend-sg
VPC: auction-vpc
```
Open the **Inbound rules** tab and verify the rules.
Your result should be:
```
auction-backend-sg
│
├── TCP 80
│   └── Source: 0.0.0.0/0
│
├── TCP 443
│   └── Source: 0.0.0.0/0
│
├── TCP 22
│   └── Source: your-public-IP/32
│
└── TCP 8000
    └── Source: your-public-IP/32
        Temporary only
```

---
# Problem 10: Understand the production request flow
## Solution
During temporary testing, you might run:
```
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Then you could test:
```
http://EC2_PUBLIC_IP:8000
```
Only your current IP should be allowed through the security group.
After Nginx is configured, change Uvicorn to listen only on the EC2 machine itself:
```
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
The production flow will then be:
```
Internet client
      ↓
EC2 port 80 or 443
      ↓
Nginx
      ↓
127.0.0.1:8000
      ↓
FastAPI
```
Because FastAPI listens on `127.0.0.1`, it cannot be reached directly from outside the EC2 instance.
Nginx becomes the public entry point.

---
# Problem 11: Remove port `8000` after Nginx works
## Solution
After confirming that Nginx successfully forwards requests to FastAPI:
1. Open:
```
EC2
→ Security Groups
```
2. Select:
```
auction-backend-sg
```
3. Open **Inbound rules**.
4. Select:
```
Edit inbound rules
```
5. Find:
```
Custom TCP
Port 8000
Source your-IP/32
```
6. Select **Delete** beside that rule.
7. Select:
```
Save rules
```
The final production inbound rules should be:
```
HTTP   80   → 0.0.0.0/0
HTTPS  443  → 0.0.0.0/0
SSH    22   → your-IP/32
```
AWS lets you add and remove security-group rules after the security group has been created.
# Complete Checklist
```
[ ] Opened EC2 → Security Groups
[ ] Selected Create security group
[ ] Entered auction-backend-sg
[ ] Entered Security group for Auction FastAPI backend
[ ] Selected auction-vpc
[ ] Allowed HTTP port 80 from 0.0.0.0/0
[ ] Allowed HTTPS port 443 from 0.0.0.0/0
[ ] Allowed SSH port 22 from My IP
[ ] Optionally allowed port 8000 from My IP
[ ] Did not expose port 8000 to 0.0.0.0/0
[ ] Created the security group
```
After creation, the security group is not yet protecting anything. You will attach `auction-backend-sg` when creating the EC2 instance.