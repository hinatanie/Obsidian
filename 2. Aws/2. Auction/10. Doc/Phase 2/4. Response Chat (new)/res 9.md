# Main Problem
Your RDS MySQL database needs a security group that allows database connections **only from your Spring Boot EC2 backend**.
The connection should be:
```
Spring Boot EC2
pet-shop-backend-sg
        ↓ TCP 3306
RDS MySQL
pet-shop-rds-sg
```
Using `pet-shop-backend-sg` as the source is safer than allowing an IP range. Any EC2 instance using that backend security group can connect to MySQL, while your laptop and the public internet cannot. AWS supports using an EC2 security group as the source of an RDS inbound rule.
# Problem 9: Create the RDS security group
## Solution
Create:
```
Name: pet-shop-rds-sg
Description:
Security group for Pet Shop RDS MySQL
VPC:
pet-shop-vpc
```
Add exactly this inbound rule:
```
Type: MySQL/Aurora
Protocol: TCP
Port: 3306
Source: pet-shop-backend-sg
```
## Problem 9.1: Open Security Groups
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
3. Open:
```
EC2
→ Network & Security
→ Security Groups
```
4. Select:
```
Create security group
```
You can also create it through:
```
VPC
→ Security groups
→ Create security group
```

---
## Problem 9.2: Enter the security-group details
## Solution
Enter:
```
Security group name:
pet-shop-rds-sg
```
```
Description:
Security group for Pet Shop RDS MySQL
```
For **VPC**, select:
```
pet-shop-vpc
```
Verify that the VPC shows:
```
IPv4 CIDR: 10.0.0.0/16
```
Do not select the default VPC.
The RDS security group and backend security group must be available in the correct network configuration so that the RDS rule can reference the backend group.

---
## Problem 9.3: Add the MySQL inbound rule
## Solution
Under **Inbound rules**, select:
```
Add rule
```
Configure the rule as follows:
```
Type: MySQL/Aurora
Protocol: TCP
Port range: 3306
```
For **Source**, do not choose:
```
Anywhere-IPv4
My IP
Custom CIDR such as 10.0.0.0/16
```
Instead:
1. Open the **Source** selection.
2. Choose:
```
Custom
```
3. Click inside the source search field.
4. Search for:
```
pet-shop-backend-sg
```
5. Select the matching security group.
AWS may show it as:
```
pet-shop-backend-sg
sg-0123456789abcdef0
```
That is correct.
Your completed rule should look like:

|Type|Protocol|Port|Source|
|---|---|---|---|
|MySQL/Aurora|TCP|`3306`|`pet-shop-backend-sg`|
AWS allows the source of an inbound rule to be another security group, not just an IP address.

---
## Problem 9.4: Review the outbound rule
## Solution
A new security group normally contains this outbound rule:
```
All traffic
Destination: 0.0.0.0/0
```
For this learning setup, you can leave the default outbound rule unchanged.
Remember:
```
Inbound rule
→ Controls who can start a connection to RDS
Outbound rule
→ Controls connections initiated from resources using this group
```
The important protection here is the inbound MySQL rule.

---
## Problem 9.5: Create the security group
## Solution
Before creating it, verify:
```
Name:
pet-shop-rds-sg
VPC:
pet-shop-vpc
Inbound:
MySQL/Aurora
TCP 3306
Source: pet-shop-backend-sg
```
Then select:
```
Create security group
```
AWS should display a success message.

---
# Problem 9.6: Verify the security group
## Solution
Open:
```
EC2
→ Security Groups
→ pet-shop-rds-sg
```
Verify the basic information:
```
Security group name:
pet-shop-rds-sg
VPC:
pet-shop-vpc
```
Open the **Inbound rules** tab.
You should see:
```
MySQL/Aurora
TCP
3306
pet-shop-backend-sg
```
The source may be displayed as only a security-group ID:
```
sg-xxxxxxxxxxxxxxxxx
```
Click or inspect that ID and confirm its name is:
```
pet-shop-backend-sg
```
# Do not allow public MySQL access
Your RDS security group must not contain:
```
MySQL/Aurora
TCP 3306
0.0.0.0/0
```
That rule would allow connection attempts from the entire IPv4 internet.
Also do not add:
```
MySQL/Aurora
TCP 3306
your-public-IP/32
```
That would allow your laptop to connect directly to the database.
For your architecture, database administration and application access should happen through controlled paths, such as the EC2 backend or a secure management method—not a publicly exposed RDS endpoint.
# What the security-group source means
The source:
```
pet-shop-backend-sg
```
does not mean that all traffic from the EC2 instance is automatically allowed.
It means:
```
Resources attached to pet-shop-backend-sg
may initiate TCP connections
to resources attached to pet-shop-rds-sg
on port 3306
```
It does not allow:
```
Port 80
Port 443
Port 22
Other database ports
All traffic
```
Only TCP port `3306` is permitted by this rule.
AWS recommends this security-group relationship for an application EC2 instance connecting to an RDS database within a VPC.
# Important: Attach this security group to RDS later
Creating `pet-shop-rds-sg` does not automatically protect or configure your future RDS database.
When you create the RDS MySQL instance, find the connectivity or security-group setting and select:
```
Existing VPC security groups:
pet-shop-rds-sg
```
Remove the default security group if it is not needed.
Your RDS instance must eventually have:
```
VPC: pet-shop-vpc
DB subnet group: Pet Shop private subnet group
Public access: No
VPC security group: pet-shop-rds-sg
Port: 3306
```
# Network permission is not database authentication
This security-group rule answers:
```
Is the EC2 instance allowed to reach the RDS network port?
```
It does not answer:
```
Does Spring Boot have permission to log in to MySQL?
```
Spring Boot still needs valid connection information:
```
RDS endpoint
Port 3306
Database name
MySQL username
MySQL password
```
For example, Spring Boot will eventually use settings similar to:
```
spring.datasource.url=jdbc:mysql://RDS-ENDPOINT:3306/pet_shop
spring.datasource.username=YOUR_DATABASE_USER
spring.datasource.password=YOUR_DATABASE_PASSWORD
```
Do not store the real password directly in Git or commit it in `application.properties`. Use environment variables, AWS Secrets Manager, or another secure configuration method.
A connection can fail even when the security group is correct because of:
```
Wrong username
Wrong password
Wrong database name
Wrong RDS endpoint
RDS not running
Spring Boot using the wrong port
MySQL user missing the required permissions
```
# Final architecture
```
Internet
   ↓ 80 and 443
pet-shop-backend-sg
   ↓
EC2 Nginx
   ↓
Spring Boot on 127.0.0.1:8080
   ↓ outbound MySQL connection
TCP 3306
   ↓
pet-shop-rds-sg
   ↓
RDS MySQL
```
# Final Checklist
```
[ ] Opened EC2 → Security Groups
[ ] Selected Create security group
[ ] Entered pet-shop-rds-sg
[ ] Entered the correct description
[ ] Selected pet-shop-vpc
[ ] Added MySQL/Aurora
[ ] Confirmed protocol is TCP
[ ] Confirmed port is 3306
[ ] Selected pet-shop-backend-sg as the source
[ ] Did not use 0.0.0.0/0
[ ] Did not use your laptop IP
[ ] Did not add All traffic inbound
[ ] Created the security group
[ ] Will attach pet-shop-rds-sg to the RDS instance
[ ] Will configure valid MySQL credentials separately
```