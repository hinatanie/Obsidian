# Main Problem
You need to confirm that:
```
pet-shop-backend-ec2
        ↓ private VPC connection
pet-shop-rds-sg:3306
        ↓
Pet Shop RDS MySQL
```
The RDS database can remain:
```
Publicly accessible: No
```
That is the recommended setup because EC2 and RDS communicate inside the VPC rather than exposing MySQL to the internet. AWS specifically documents private RDS instances being accessed by EC2 resources in the same VPC.

---
## Problem 1: Confirm that RDS is ready
## Solution
In the AWS Console, open:
```
RDS
→ Databases
→ Select your Pet Shop database
```
Confirm:
```
Status: Available
```
Do not test while it says:
```
Creating
Starting
Rebooting
Modifying
Backing-up
```

---
## Problem 2: Copy the RDS endpoint
## Solution
With the database selected, open:
```
Connectivity & security
```
Find:
```
Endpoint
Port
```
The endpoint should look similar to:
```
pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com
```
The port should normally be:
```
3306
```
Copy only the endpoint hostname.
Do not include:
```
https://
http://
:3306
jdbc:mysql://
```
AWS requires the DB endpoint DNS name as the host and the configured database port as the port.
Correct:
```
pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com
```
Incorrect:
```
https://pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com
```

---
## Problem 3: Confirm the RDS security group
## Solution
On the RDS database page, under **Connectivity & security**, find:
```
VPC security groups
```
Click the RDS security group:
```
pet-shop-rds-sg
```
Open:
```
Inbound rules
→ Edit inbound rules
```
The required rule is:
```
Type: MySQL/Aurora
Protocol: TCP
Port: 3306
Source: pet-shop-backend-sg
```
The source must be the **EC2 security group**, not the EC2 public IP and not your laptop IP.
Correct:
```
MySQL/Aurora
TCP
3306
Source: sg-xxxxxxxx / pet-shop-backend-sg
```
Do not use:
```
3306 from 0.0.0.0/0
```
RDS security groups block inbound access unless you explicitly authorize the required source and port. AWS supports using another security group as the source, which is the appropriate configuration for EC2-to-RDS traffic.
### Connection meaning
```
EC2 has pet-shop-backend-sg
        ↓
RDS allows port 3306 from pet-shop-backend-sg
        ↓
Connection allowed
```
The RDS security group is checking which security group is attached to the source network interface.

---
## Problem 4: Confirm the EC2 security group outbound rules
## Solution
Open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Security
→ pet-shop-backend-sg
→ Outbound rules
```
For your learning environment, the default rule is sufficient:
```
Type: All traffic
Destination: 0.0.0.0/0
```
You do not need to add port `3306` to the EC2 **inbound** rules.
The direction is:
```
EC2 initiates outbound connection
RDS accepts inbound connection
```
Therefore:
```
EC2 inbound 3306: Not needed
RDS inbound 3306 from EC2 SG: Required
```

---
## Problem 5: Confirm EC2 and RDS use the same VPC
## Solution
Check EC2:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Networking
→ VPC ID
```
Check RDS:
```
RDS
→ Databases
→ Your database
→ Connectivity & security
→ VPC
```
Both should point to:
```
pet-shop-vpc
```
For example:
```
EC2 VPC: vpc-0123456789abcdef
RDS VPC: vpc-0123456789abcdef
```
The subnet names may be different:
```
EC2:
pet-shop-public-subnet-1
RDS:
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
That is correct. Resources in different subnets of the same VPC can communicate through the VPC’s local routing when security rules permit it.

---
## Problem 6: Connect to the EC2 terminal
## Solution
Open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Connect
→ Session Manager
→ Connect
```
Confirm the MySQL client is installed:
```
mysql --version
```
You should see output similar to:
```
mysql Ver 8...
```
If the command is missing:
```
sudo apt update
sudo apt install -y default-mysql-client
```

---
## Problem 7: Test DNS resolution first
## Solution
Store the endpoint temporarily in a shell variable:
```
RDS_ENDPOINT="pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com"
```
Replace the example with your real endpoint.
Confirm it:
```
echo "$RDS_ENDPOINT"
```
Test whether EC2 can resolve the RDS DNS name:
```
getent hosts "$RDS_ENDPOINT"
```
You should get an address similar to:
```
10.0.2.123 pet-shop-mysql.abcdefghijkl.ap-southeast-1.rds.amazonaws.com
```
A private `10.x.x.x` address is expected.
Do not hard-code that IP address into your application. RDS IP addresses can change, so always use the endpoint hostname.
If `getent` produces no output, check:
```
VPC
→ Your VPCs
→ pet-shop-vpc
```
Confirm:
```
DNS resolution: Enabled
DNS hostnames: Enabled
```

---
## Problem 8: Test TCP port 3306 before logging in
## Solution
Install Netcat if necessary:
```
sudo apt install -y netcat-openbsd
```
Then run:
```
nc -vz "$RDS_ENDPOINT" 3306
```
A successful result should look similar to:
```
Connection to ... 3306 port [tcp/mysql] succeeded!
```
This proves:
```
RDS endpoint resolves
Network route works
Security groups permit port 3306
RDS is listening
```
It does not yet prove that the username and password are correct.
### If `nc` waits too long
Stop it with:
```
Ctrl + C
```
A timeout usually points to:
```
Wrong RDS security-group rule
Wrong VPC
Wrong endpoint
RDS not available
Network ACL problem
```
AWS identifies missing security-group authorization as one of the most common reasons a new RDS connection fails.

---
## Problem 9: Connect with the MySQL client
## Solution
Run:
```
mysql \
  -h "$RDS_ENDPOINT" \
  -P 3306 \
  -u pet_shop_admin \
  -p
```
You can also write it on one line:
```
mysql -h "$RDS_ENDPOINT" -P 3306 -u pet_shop_admin -p
```
The options mean:
```
-h = RDS endpoint hostname
-P = TCP port, uppercase P
-u = MySQL username
-p = ask for the password securely
```
MySQL uses port `3306` by default for the classic client protocol. When `-p` is supplied without a value, the client prompts for the password.
You will see:
```
Enter password: Lamthaiyennhi2005
```
Type the RDS master password and press Enter.
The terminal will not display:
```
characters
dots
asterisks
```
That is normal. The password is still being entered.
Do not put the password directly in the command:
```
mysql -h "$RDS_ENDPOINT" -u pet_shop_admin -pLamthaiyennhi2005
```
A command-line password may be exposed through shell history or process information.

---
## Problem 10: Verify the connection
## Solution
After successful login, you should see:
```
mysql>
```
Run:
```
SELECT VERSION();
```
Then:
```
SELECT CURRENT_USER();
```
List the databases:
```
SHOW DATABASES;
```
You may see something similar to:
```
information_schema
mysql
performance_schema
pet_shop
sys
```
Select the Pet Shop database:
```
USE pet_shop;
```
Expected:
```
Database changed
```
Then list its tables:
```
SHOW TABLES;
```
If your Spring Boot migrations or schema initialization have already run, you may see tables such as:
```
users
pets
products
orders
```
The exact table names depend on your project.
You can confirm the selected database:
```
SELECT DATABASE();
```
Expected:
```
pet_shop
```
Exit MySQL:
```
EXIT;
```
or:
```
QUIT;
```

---
# Complete command sequence
Replace the endpoint below with your actual RDS endpoint:
```
RDS_ENDPOINT="pet-shop-mysql.abcdefghijkl.ap-southeast-1.rds.amazonaws.com"
echo "Testing DNS..."
getent hosts "$RDS_ENDPOINT"
echo "Testing port 3306..."
nc -vz "$RDS_ENDPOINT" 3306
echo "Connecting to MySQL..."
mysql -h "$RDS_ENDPOINT" -P 3306 -u pet_shop_admin -p
```
Inside MySQL:
```
SELECT VERSION();
SELECT CURRENT_USER();
SHOW DATABASES;
USE pet_shop;
SELECT DATABASE();
SHOW TABLES;
EXIT;
```

---
# Common errors
## Error 1: Connection timed out
Example:
```
ERROR 2003 (HY000): Can't connect to MySQL server
Connection timed out
```
This usually means a network configuration problem.
Check:
```
[ ] RDS status is Available
[ ] Endpoint is correct
[ ] Port is 3306
[ ] EC2 and RDS are in pet-shop-vpc
[ ] pet-shop-rds-sg is attached to RDS
[ ] pet-shop-rds-sg allows 3306 from pet-shop-backend-sg
[ ] pet-shop-backend-sg is attached to EC2
[ ] EC2 outbound traffic is allowed
```
Do not fix this by making RDS public or opening port `3306` to everyone.

---
## Error 2: Access denied
Example:
```
ERROR 1045 (28000): Access denied for user 'pet_shop_admin'
```
This means EC2 successfully reached MySQL, but authentication failed.
Check:
```
Username is exactly pet_shop_admin
Password is correct
Caps Lock is off
No accidental spaces were copied
```
The password being invisible while you type is expected.

---
## Error 3: Unknown database
Example:
```
ERROR 1049 (42000): Unknown database 'pet_shop'
```
This means the connection works, but the `pet_shop` database has not been created or its name differs.
Run:
```
SHOW DATABASES;
```
If it does not exist and `pet_shop_admin` has creation permission:
```
CREATE DATABASE pet_shop
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```
Then:
```
USE pet_shop;
```
Only create it manually when your RDS setup did not already create it and your project expects this exact name.

---
## Error 4: `SHOW TABLES` returns empty
Example:
```
Empty set
```
This means:
```
EC2-to-RDS connectivity works
Authentication works
pet_shop exists
No application tables exist yet
```
You still need to run your database migration or allow Spring Boot to initialize the schema according to your chosen deployment process.
Do not treat an empty table list as a network failure.

---
## Error 5: `mysql: command not found`
Install only the client:
```
sudo apt update
sudo apt install -y default-mysql-client
```
Then verify:
```
mysql --version
```
Do not install:
```
sudo apt install mysql-server
```
Your actual database belongs in RDS.

---
# Correct final architecture
```
Internet
   ↓
EC2 public IP
   ↓
Nginx: 80/443
   ↓
Spring Boot: localhost:8080
   ↓ private VPC traffic
RDS endpoint: 3306
```
Your database configuration should remain:
```
Publicly accessible: No
RDS inbound port: 3306
RDS inbound source: pet-shop-backend-sg
```
You do not need:
```
RDS public IPv4
RDS inbound 3306 from 0.0.0.0/0
RDS inbound access from your laptop
EC2 inbound port 3306
```
## Completion checklist
```
[ ] RDS status is Available
[ ] Copy the endpoint without https:// or :3306
[ ] Confirm RDS and EC2 use pet-shop-vpc
[ ] Confirm RDS uses pet-shop-rds-sg
[ ] Allow MySQL 3306 from pet-shop-backend-sg
[ ] Keep Publicly accessible set to No
[ ] Connect to EC2 with Session Manager
[ ] Test endpoint DNS with getent
[ ] Test port 3306 with nc
[ ] Log in using mysql and -p
[ ] Run SHOW DATABASES
[ ] Run USE pet_shop
[ ] Run SHOW TABLES
[ ] Exit the MySQL client safely
```