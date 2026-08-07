# Main Problem
Your EC2 instance needs a security group that acts like a firewall.
For the Pet Shop backend, the intended request path is:
```
Internet
   ↓ HTTPS port 443
Nginx on EC2
   ↓ local connection
127.0.0.1:8080
   ↓
Spring Boot
```
The security group should allow users to reach **Nginx**, but it should not expose Spring Boot, MySQL, or administrative access to everyone.
# Problem 8: Create the backend security group
## Solution
Create:
```
Name: pet-shop-backend-sg
Description:
Security group for Pet Shop Spring Boot EC2 backend
VPC:
pet-shop-vpc
```
Add these inbound rules:

|Type|Port|Source|
|---|---|---|
|HTTP|80|`0.0.0.0/0`|
|HTTPS|443|`0.0.0.0/0`|
Optionally add temporary SSH access:

|Type|Port|Source|
|---|---|---|
|SSH|22|`your-current-public-IP/32`|
Do not add:
```
Custom TCP 8080 from 0.0.0.0/0
MySQL 3306
All traffic
SSH 22 from 0.0.0.0/0
```

---
## Problem 8.1: Open the Security Groups page
## Solution
In the AWS Console:
1. Confirm the Region is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
2. Search for:
```
EC2
```
3. Open the **EC2** service.
4. In the left navigation menu, open:
```
Network & Security
→ Security Groups
```
5. Select:
```
Create security group
```
You can also reach the same page through:
```
VPC
→ Security groups
```

---
## Problem 8.2: Enter the basic security-group information
## Solution
Enter these values:
```
Security group name:
pet-shop-backend-sg
```
```
Description:
Security group for Pet Shop Spring Boot EC2 backend
```
For **VPC**, select:
```
pet-shop-vpc
```
Verify that the VPC CIDR is:
```
10.0.0.0/16
```
Do not leave the AWS default VPC selected.
Your form should look approximately like this:
```
Security group name
pet-shop-backend-sg
Description
Security group for Pet Shop Spring Boot EC2 backend
VPC
pet-shop-vpc
```
A security group can only be attached to resources in the same VPC, so selecting `pet-shop-vpc` is essential.

---
# Problem 8.3: Add the HTTP inbound rule
## Solution
Under **Inbound rules**, select:
```
Add rule
```
Configure:
```
Type: HTTP
Protocol: TCP
Port range: 80
Source type: Anywhere-IPv4
Source: 0.0.0.0/0
Description: Public HTTP traffic
```
AWS may automatically fill in:
```
Protocol: TCP
Port: 80
```
when you select **HTTP**.
This rule allows HTTP traffic from the internet:
```
Internet
→ TCP port 80
→ Nginx
```
Port 80 is useful for:
```
Initial HTTP testing
HTTP-to-HTTPS redirection
TLS certificate domain validation
```
For example, Nginx can later redirect:
```
http://api.example.com
```
to:
```
https://api.example.com
```

---
# Problem 8.4: Add the HTTPS inbound rule
## Solution
Select:
```
Add rule
```
Configure:
```
Type: HTTPS
Protocol: TCP
Port range: 443
Source type: Anywhere-IPv4
Source: 0.0.0.0/0
Description: Public HTTPS API traffic
```
This will become the main public path:
```
Internet
→ TCP port 443
→ Nginx
→ Spring Boot
```
Opening ports 80 and 443 is normal for a public web server. AWS security groups can allow HTTP and HTTPS client traffic while keeping management ports restricted.

---
# Problem 8.5: Decide whether temporary SSH is needed
## Solution
There are two possible configurations.
## Preferred option: Use Systems Manager
When Systems Manager Session Manager is working, do not add an SSH inbound rule.
Your inbound rules should be only:
```
HTTP  80  from 0.0.0.0/0
HTTPS 443 from 0.0.0.0/0
```
Systems Manager Session Manager can give you terminal access without opening inbound port 22 and without maintaining a public SSH entry point.
For Systems Manager to work later, your EC2 instance will need:
```
SSM Agent installed and running
An EC2 IAM role with Systems Manager permissions
Outbound access to Systems Manager endpoints
Your IAM user permitted to start a session
```

---
## Temporary option: Add SSH from your IP only
When Systems Manager is not ready and you need SSH to configure the server, add one temporary rule.
Select:
```
Add rule
```
Configure:
```
Type: SSH
Protocol: TCP
Port range: 22
Source type: My IP
Source: your-current-public-IP/32
Description: Temporary SSH from my current IP
```
When you choose **My IP**, AWS normally detects your current public IPv4 address and enters something similar to:
```
113.161.25.80/32
```
Your actual address will be different.
The `/32` means:
```
Allow exactly this one public IPv4 address
```
Do not manually use the example address above.
AWS strongly recommends restricting SSH to only the specific IP address or range that requires access instead of allowing the entire internet.
### Do not choose Anywhere-IPv4 for SSH
This is unsafe:
```
SSH
TCP 22
0.0.0.0/0
```
It would allow connection attempts from every IPv4 address on the internet.
The correct temporary rule is:
```
SSH
TCP 22
your-current-public-IP/32
```
### Your IP can change
Your internet provider may change your public IP address.
When that happens, SSH may stop working even though the EC2 instance is healthy. Update the security-group rule to your new current IP rather than changing it to:
```
0.0.0.0/0
```

---
# Problem 8.6: Review the outbound rules
## Solution
A newly created security group normally includes:
```
Type: All traffic
Destination: 0.0.0.0/0
```
This is an **outbound** rule, not an inbound rule.
For this stage, you can leave the default outbound rule unchanged:
```
All traffic → 0.0.0.0/0
```
Your EC2 instance may need outbound access for:
```
Operating-system updates
Package downloads
Systems Manager
Calling AWS services
Connecting to external APIs
DNS requests
```
The inbound and outbound sections serve different purposes:
```
Inbound rules
→ Who can start a connection to EC2?
Outbound rules
→ Where can EC2 start a connection?
```
Do not confuse the default outbound **All traffic** rule with an inbound **All traffic** rule.

---
# Problem 8.7: Create the security group
## Solution
Before creating it, review the form.
Without SSH, inbound rules should be:

|Type|Port|Source|
|---|---|---|
|HTTP|80|`0.0.0.0/0`|
|HTTPS|443|`0.0.0.0/0`|
With temporary SSH, they should be:

|Type|Port|Source|
|---|---|---|
|HTTP|80|`0.0.0.0/0`|
|HTTPS|443|`0.0.0.0/0`|
|SSH|22|`your-current-public-IP/32`|
Then select:
```
Create security group
```
AWS should display a success message.

---
# Problem 8.8: Verify the security group
## Solution
Open:
```
EC2
→ Security Groups
→ pet-shop-backend-sg
```
Verify:
```
Security group name:
pet-shop-backend-sg
VPC:
pet-shop-vpc
```
Open the **Inbound rules** tab.
You should see:
```
TCP 80  from 0.0.0.0/0
TCP 443 from 0.0.0.0/0
```
When temporary SSH is needed, you may also see:
```
TCP 22 from your-public-IP/32
```
You should not see:
```
TCP 8080 from 0.0.0.0/0
TCP 3306 from 0.0.0.0/0
All traffic from 0.0.0.0/0
SSH 22 from 0.0.0.0/0
```

---
# Problem 8.9: Understand why port 8080 stays closed
## Solution
Spring Boot commonly listens on port:
```
8080
```
However, external users should not connect directly to Spring Boot.
The intended architecture is:
```
Internet request
    ↓ port 443
Nginx
    ↓ proxy internally
127.0.0.1:8080
    ↓
Spring Boot
```
Because Spring Boot listens on:
```
127.0.0.1:8080
```
only software on the same EC2 instance can reach it.
That means:
```
Nginx can reach Spring Boot
Internet users cannot reach Spring Boot directly
Other VPC resources cannot reach Spring Boot on port 8080
```
Later, configure Spring Boot with one of these approaches:
```
server.address=127.0.0.1
server.port=8080
```
or:
```
java -jar pet-shop.jar \
  --server.address=127.0.0.1 \
  --server.port=8080
```
Do not configure it to listen publicly on:
```
0.0.0.0:8080
```
unless there is a specific architectural reason.

---
# Problem 8.10: Understand why MySQL is not added
## Solution
Do not add MySQL port 3306 to:
```
pet-shop-backend-sg
```
The direction of the database connection is:
```
EC2 Spring Boot
→ initiates connection
→ RDS MySQL port 3306
```
Therefore:
```
pet-shop-backend-sg
```
does not need an inbound MySQL rule.
Later, the RDS security group will contain:
```
Type: MySQL/Aurora
Port: 3306
Source: pet-shop-backend-sg
```
The security-group relationship will be:
```
EC2
pet-shop-backend-sg
        ↓ initiates connection
RDS port 3306
pet-shop-rds-sg
```
Because security groups are stateful, response traffic for an allowed connection is automatically permitted.

---
# Problem 8.11: Remove SSH after Systems Manager works
## Solution
After you successfully connect using Systems Manager:
```
EC2
→ Instances
→ Select your instance
→ Connect
→ Session Manager
→ Connect
```
remove the temporary SSH rule.
Open:
```
EC2
→ Security Groups
→ pet-shop-backend-sg
→ Inbound rules
→ Edit inbound rules
```
Find:
```
SSH
TCP 22
your-current-public-IP/32
```
Select **Delete** beside that rule, and then choose:
```
Save rules
```
The final inbound rules should be:
```
HTTP  80  from 0.0.0.0/0
HTTPS 443 from 0.0.0.0/0
```
Session Manager is designed to provide instance access without requiring open inbound management ports.
# Final architecture
```
Internet
   │
   ├── TCP 80
   └── TCP 443
          ↓
pet-shop-backend-sg
          ↓
Nginx
          ↓
127.0.0.1:8080
          ↓
Spring Boot
          ↓ outbound connection
RDS endpoint:3306
```
# Final Checklist
```
[ ] Opened EC2 → Security Groups
[ ] Selected Create security group
[ ] Entered pet-shop-backend-sg
[ ] Entered the correct description
[ ] Selected pet-shop-vpc
[ ] Added HTTP port 80 from 0.0.0.0/0
[ ] Added HTTPS port 443 from 0.0.0.0/0
[ ] Did not expose port 8080
[ ] Did not add MySQL port 3306
[ ] Did not add inbound All traffic
[ ] Did not allow SSH from 0.0.0.0/0
[ ] Added temporary SSH from My IP only, if necessary
[ ] Will remove SSH after Systems Manager works
[ ] Left the default outbound rule for now
[ ] Created and verified the security group
```