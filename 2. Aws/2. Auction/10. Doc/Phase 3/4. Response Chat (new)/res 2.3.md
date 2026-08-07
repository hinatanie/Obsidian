# Sent Message to ChatGPT


# Main Problem
You need to configure two different RDS settings:
```
1. How Spring Boot authenticates to MySQL
2. Which initial MySQL database RDS creates
```
Use:
```
Authentication: Password authentication
Initial database name: pet_shop
```
# Problem 2.10: Configure database authentication
## Solution
On the **Create database** page, find:
```
Additional credentials settings
→ Database authentication options
```
Select:
```
● Password authentication
```
Do not select:
```
○ Password and IAM database authentication
○ Password and Kerberos authentication
```
Your screen should look like:
```
Database authentication options
● Password authentication
○ Password and IAM database authentication
○ Password and Kerberos authentication
```
This means Spring Boot will connect using a MySQL username and password. AWS documents password authentication as the normal database-managed authentication method.
Your connection information will later be:
```
Host: the RDS endpoint
Port: 3306
Database: pet_shop
Username: pet_shop_admin
Password: your stored RDS password
```
For example:
```
jdbc:mysql://pet-shop-mysql.xxxxx.ap-southeast-1.rds.amazonaws.com:3306/pet_shop
```
Do not enter the endpoint yet. AWS generates it after the RDS instance is created.
# Problem 2.11: Create the initial database
## Solution
Stay on the same **Create database** page.
Scroll down and expand:
```
Additional configuration
```
Look for:
```
Database options
```
Then find:
```
Initial database name
```
Enter:
```
pet_shop
```
AWS’s RDS console places the **Initial database name** field under **Additional configuration**. If you provide a name, RDS creates that database during DB-instance creation.
Your settings should be:
```
Initial database name:
pet_shop
```
Do not enter:
```
pet-shop
```
Use an underscore:
```
pet_shop
```
Also do not enter:
```
pet-shop-mysql
```
That is your RDS instance identifier, not the database inside MySQL.
# Understand the two names
These two settings serve different purposes:
```
DB instance identifier:
pet-shop-mysql
```
This is the AWS resource name shown in the RDS Console.
```
Initial database name:
pet_shop
```
This is the actual MySQL database used by Spring Boot.
The relationship is:
```
RDS instance: pet-shop-mysql
└── MySQL database: pet_shop
```
# If you cannot find “Initial database name”
Make sure you selected:
```
Create database
→ Full configuration
```
Then:
```
Scroll down
→ Expand Additional configuration
→ Find Database options
→ Initial database name
```
The field might be farther down the page, below sections such as:
```
Monitoring
Additional configuration
Database options
Backup
Encryption
Maintenance
Deletion protection
```
You may need to expand the small arrow beside **Additional configuration**.
# What happens if you leave it blank?
RDS will still create:
```
DB instance: pet-shop-mysql
```
But it will not automatically create:
```
Database: pet_shop
```
You would then need to connect to MySQL and run:
```
CREATE DATABASE pet_shop;
```
It is easier for your current setup to enter `pet_shop` now.
# Verify before creating RDS
Before clicking **Create database**, confirm:
```
Database authentication:
Password authentication
DB instance identifier:
pet-shop-mysql
Master username:
pet_shop_admin
Initial database name:
pet_shop
Port:
3306
```
Also verify the important network settings:
```
VPC:
pet-shop-vpc
DB subnet group:
pet-shop-db-subnet-group
Public access:
No
Security group:
pet-shop-rds-sg
```
# Final Checklist
```
[ ] Selected Password authentication
[ ] Did not enable IAM database authentication
[ ] Did not enable Kerberos authentication
[ ] Expanded Additional configuration
[ ] Found Initial database name
[ ] Entered pet_shop
[ ] Did not enter pet-shop
[ ] Confirmed DB identifier is pet-shop-mysql
[ ] Confirmed database name is pet_shop
[ ] Stored the master password securely
```