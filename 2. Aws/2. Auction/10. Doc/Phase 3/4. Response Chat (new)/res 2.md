# Main Problem
You need to create a private RDS MySQL database for the Pet Shop application.
The final connection path will be:
```
Spring Boot on EC2
pet-shop-backend-sg
        ↓ TCP 3306
pet-shop-rds-sg
        ↓
RDS MySQL
        ↓
pet-shop-db-subnet-group
├── pet-shop-private-subnet-1
└── pet-shop-private-subnet-2
```
RDS must use your private subnet group, have **Public access set to No**, and use `pet-shop-rds-sg`. The DB subnet group supplies RDS with subnets in at least two Availability Zones.
# Problem 2: Create RDS MySQL
## Solution
## Step 1: Open Amazon RDS
In the AWS Console:
1. Confirm the Region in the upper-right corner is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
2. Search for:
```
RDS
```
3. Open **Amazon RDS**.
4. From the left menu, select:
```
Databases
```
5. Select:
```
Create database
```
AWS’s documented creation flow begins with **RDS → Databases → Create database**.

---
# Problem 2.1: Select the database creation method
## Solution
Under **Choose a database creation method**, select:
```
Standard create
```
Do not select:
```
Easy create
```
`Standard create` gives you control over:
```
VPC
DB subnet group
Public access
Security group
Backups
Storage
Availability configuration
Initial database name
```

---
# Problem 2.2: Select the database engine
## Solution
Under **Engine options**, configure:
```
Engine type: MySQL
```
For **Engine version**, choose a currently supported MySQL version offered by RDS.
For a new project, avoid selecting an old major version that requires RDS Extended Support, because Extended Support can add charges. AWS’s RDS for MySQL pricing page notes that Extended Support is charged separately based on the version, Region, and number of years after standard support ends.
Use:
```
Engine: MySQL
Engine version: A current supported default version
```
Do not choose:
```
Amazon Aurora
MariaDB
PostgreSQL
```
unless your application was designed for one of those engines.

---
# Problem 2.3: Select the template
## Solution
Under **Templates**, you may see options such as:
```
Production
Dev/Test
Free tier
```
Choose:
```
Free tier
```
when the console shows that your account is eligible.
Otherwise choose:
```
Dev/Test
```
Do not choose:
```
Production
```
for this learning database because it may automatically recommend more expensive availability, monitoring, or performance settings.
## Important Free Tier clarification
AWS account benefits depend on when the account was created and the current AWS Free Tier model. Accounts created before July 15, 2025 may have the older 12-month RDS benefit for eligible Single-AZ databases, including limited instance hours and storage. Do not assume your database is free merely because the console presents a small instance class.
Always examine:
```
Estimated monthly costs
```
before selecting **Create database**.

---
# Problem 2.4: Configure availability
## Solution
Look for **Availability and durability** or **Deployment options**.
Select the Single-AZ option, which may be displayed as:
```
Single DB instance
```
or:
```
Single-AZ DB instance deployment
```
Do not select:
```
Multi-AZ DB instance
Multi-AZ DB cluster
```
For your learning architecture:
```
Deployment: Single-AZ
```
Your DB subnet group still contains two private subnets, but that does not force RDS to create a Multi-AZ deployment.

---
# Problem 2.5: Enter the database identifier
## Solution
Under **Settings**, enter:
```
DB instance identifier:
pet-shop-mysql
```
This identifies the RDS resource in the AWS Console.
It is not the database name that Spring Boot uses inside MySQL.
The two values are different:
```
RDS resource identifier:
pet-shop-mysql
Initial MySQL database:
pet_shop
```

---
# Problem 2.6: Configure the master username and password
## Solution
Enter:
```
Master username:
pet_shop_admin
```
The master user is the first administrative MySQL user created for this RDS instance.
For **Credentials management**, the console may offer choices such as:
```
Self managed
Managed in AWS Secrets Manager
```
For a simple learning setup, you can select:
```
Self managed
```
Then create a strong, unique password.
Use a password containing:
```
Uppercase letters
Lowercase letters
Numbers
Symbols
A long, unique sequence
```
Do not reuse:
```
Your AWS password
Your IAM password
Your email password
Your laptop password
```
Store the password in your password manager, such as Bitwarden.
Do not put it in:
```
Git
GitHub
Java source code
application.properties committed to Git
application.yml committed to Git
README files
Dockerfile
Docker image
React environment variables
Frontend source code
```
Frontend variables are especially unsafe because values delivered to React can be inspected by users in the browser.
## Important distinction
```
Master username: pet_shop_admin
Master password: your secret password
```
These credentials authenticate Spring Boot to MySQL.
The RDS security group only allows network traffic. It does not replace database credentials.

---
# Problem 2.7: Choose the DB instance class
## Solution
Find **DB instance class**.
The console may organize choices into categories such as:
```
Standard classes
Memory optimized classes
Burstable classes
```
Choose:
```
Burstable classes
```
Then select the smallest suitable learning class that the console offers and that matches any account benefit shown.
Possible examples may include:
```
db.t3.micro
db.t4g.micro
```
Availability and eligibility can vary by Region, engine version, and account. Therefore, use the smallest class displayed in your console rather than assuming one specific class is free.
A small class is suitable for learning, but it has limited memory and database connections. AWS notes, for example, that a MySQL `db.t3.micro` has relatively low available memory and approximately 60 default connections.
For your current application:
```
DB instance class:
Smallest eligible burstable learning class
```
Do not select classes such as:
```
db.m*
db.r*
db.x*
```
for this learning setup unless you deliberately need and accept the higher cost.

---
# Problem 2.8: Configure storage
## Solution
Under **Storage**, choose:
```
Storage type:
General Purpose SSD
```
Depending on the console, this may appear as:
```
General Purpose SSD (gp3)
```
or another currently supported General Purpose option.
Do not choose:
```
Provisioned IOPS
```
for this small learning database.
Magnetic storage is deprecated for new use; AWS recommends General Purpose SSD or Provisioned IOPS SSD for new storage requirements.
For **Allocated storage**, select the smallest value accepted by the current RDS console for your selected MySQL configuration.
For example, the console may enforce a minimum value. Use the displayed minimum instead of typing a lower unsupported value.
Configure conceptually:
```
Storage type: General Purpose SSD
Allocated storage: Smallest console-supported value
```

---
## Storage autoscaling
You may see:
```
Enable storage autoscaling
```
For strict learning-cost control, you can initially leave it disabled:
```
Storage autoscaling: Disabled
```
This avoids RDS automatically increasing storage unexpectedly.
Alternatively, enable it only with a conservative maximum:
```
Enable storage autoscaling: Yes
Maximum storage threshold: A small conservative limit
```
Remember that storage can grow automatically but generally cannot be reduced directly afterward.

---
# Problem 2.9: Configure connectivity
## Solution
This is the most important section.
Find:
```
Connectivity
```
## Compute resource
The console may ask whether to connect an EC2 compute resource.
Choose:
```
Don't connect to an EC2 compute resource
```
or the equivalent manual-connectivity option.
You already created the required security-group relationship manually:
```
pet-shop-backend-sg
        ↓
pet-shop-rds-sg
```
Allowing the RDS wizard to configure EC2 connectivity automatically might create additional security groups that do not match your architecture.

---
## <mark style="background: #FF5582A6;">Network type</mark>
Choose:
```
Network type:
IPv4
```
Your VPC was designed using IPv4:
```
10.0.0.0/16
```

---
## Virtual private cloud
Select:
```
VPC:
pet-shop-vpc
```
Do not select:
```
Default VPC
```

---
## DB subnet group
Select:
```
DB subnet group:
pet-shop-db-subnet-group
```
This group should contain:
```
pet-shop-private-subnet-1
10.0.2.0/24
ap-southeast-1a
pet-shop-private-subnet-2
10.0.3.0/24
ap-southeast-1b
```
RDS requires a DB subnet group defining suitable subnets in the selected VPC.

---
## Public access
Choose:
```
Public access:
No
```
This is essential.
Do not choose:
```
Yes
```
Your Spring Boot EC2 server will connect to RDS through the private VPC network:
```
EC2 private IP: 10.0.1.x
        ↓ VPC local routing
RDS private IP: 10.0.2.x or 10.0.3.x
```
Your laptop should not connect directly to RDS over the public internet.

---
## VPC security group
Choose:
```
Existing
```
or:
```
Choose existing
```
Select:
```
pet-shop-rds-sg
```
Remove:
```
default
```
when it is selected and is not needed.
The final security-group selection should contain only:
```
pet-shop-rds-sg
```
That group should have this inbound rule:
```
MySQL/Aurora
TCP 3306
Source: pet-shop-backend-sg
```
AWS supports selecting an existing VPC security group when creating an RDS instance.

---
## Availability Zone
When RDS lets you select an Availability Zone, you may choose:
```
No preference
```
RDS can select an appropriate subnet from the DB subnet group.
You may also deliberately select one of the supported zones for the Single-AZ deployment, but `No preference` is acceptable for this learning database.

---
## Port
Under **Additional connectivity configuration**, verify:
```
Database port:
3306
```
Do not change it unless your application and security group are also intentionally configured for another port.

---
# Problem 2.10: Configure database authentication
## Solution
For a normal Spring Boot username-and-password connection, choose:
```
Database authentication:
Password authentication
```
Do not enable IAM database authentication yet unless you have specifically planned to implement and test IAM authentication in Spring Boot.
Your initial connection will use:
```
Host: RDS endpoint
Port: 3306
Database: pet_shop
Username: pet_shop_admin
Password: stored secret
```

---
# Problem 2.11: Create the initial database
## Solution
Expand:
```
Additional configuration
```
Find:
```
Initial database name
```
Enter:
```
pet_shop
```
Do not enter:
```
pet-shop
```
Use the underscore version:
```
pet_shop
```
For RDS MySQL, the initial database name must begin with a letter and can contain letters, numbers, and underscores. If you leave this field blank, RDS creates the DB instance but does not create your application database.
Verify the difference:
```
DB instance identifier:
pet-shop-mysql
Initial database name:
pet_shop
```

---
# Problem 2.12: Configure backups
## Solution
Find:
```
Backup
```
Enable automated backups and choose a short retention period:
```
Backup retention period:
1 day
```
You may choose up to seven days when the data becomes more important:
```
Learning or disposable data: 1 day
Important development data: 3–7 days
```
A shorter retention period helps limit backup storage use, but it also gives you a shorter recovery window.
Choose a backup window automatically unless you have a specific schedule:
```
Backup window:
No preference
```

---
# Problem 2.13: Configure encryption
## Solution
Leave storage encryption enabled when available:
```
Encryption:
Enabled
```
For a learning environment, the AWS-managed RDS key is usually sufficient:
```
KMS key:
aws/rds
```
You do not need to create a customer-managed KMS key for this first database.

---
# Problem 2.14: Configure monitoring and logs carefully
## Solution
Some monitoring options can create extra charges.
Review settings such as:
```
Performance Insights
Enhanced Monitoring
CloudWatch log exports
Database Insights
DevOps Guru
```
For the smallest learning database, keep optional paid monitoring features disabled unless you are actively learning them.
A conservative initial setup is:
```
Enhanced Monitoring: Disabled
Performance Insights or Database Insights: Disabled, unless explicitly free
DevOps Guru: Disabled
Log exports: Disabled initially
```
The exact names can change in the console. Check any cost warning shown beside each option.
Basic RDS metrics remain available through CloudWatch without enabling every advanced monitoring feature.

---
# Problem 2.15: Configure maintenance
## Solution
For automatic minor version upgrades, you can leave:
```
Enable auto minor version upgrade:
Enabled
```
For the maintenance window, use:
```
No preference
```
For a learning application, AWS can choose an appropriate maintenance window.

---
# Problem 2.16: Configure deletion protection
## Solution
When the database is currently disposable and you are still learning, you may leave:
```
Deletion protection:
Disabled
```
This makes cleanup easier and helps you avoid paying for an unused database.
When the database contains important Pet Shop data, enable:
```
Deletion protection:
Enabled
```
Deletion protection prevents accidental deletion, but it does not stop charges.
Even with deletion protection enabled:
```
RDS continues running
RDS continues generating charges
```
You must disable deletion protection before intentionally deleting the DB instance.

---
# Problem 2.17: Review the cost estimate
## Solution
Before creating the database, look for the console’s estimated cost section.
Review all cost-producing components:
```
DB instance class
Running hours
Storage allocation
Backup storage
Multi-AZ status
Performance Insights
Enhanced Monitoring
Public IPv4, if applicable
Extended Support
```
Your desired result should resemble:
```
Single-AZ
Smallest suitable burstable class
Smallest supported General Purpose SSD storage
No paid advanced monitoring
No unnecessary Extended Support
No public access
```
RDS pricing depends on the chosen instance, storage, Region, and other features, and AWS recommends using the displayed estimate or Pricing Calculator rather than assuming a fixed price.
Your existing AWS Budget sends warnings, but it does not automatically stop or delete the RDS instance.

---
# Problem 2.18: Review every setting before creating
## Solution
Before selecting **Create database**, verify:
```
Creation method:
Standard create
Engine:
MySQL
Template:
Free tier if eligible, otherwise Dev/Test
Availability:
Single DB instance / Single-AZ
DB identifier:
pet-shop-mysql
Master username:
pet_shop_admin
DB instance class:
Smallest eligible learning class
Storage:
General Purpose SSD
Smallest supported allocation
VPC:
pet-shop-vpc
DB subnet group:
pet-shop-db-subnet-group
Public access:
No
VPC security group:
pet-shop-rds-sg
Port:
3306
Database authentication:
Password authentication
Initial database name:
pet_shop
Backup retention:
1–7 days
Deletion protection:
Based on whether the data is important
```
Make especially certain that these three values are correct:
```
DB subnet group: pet-shop-db-subnet-group
Public access: No
Security group: pet-shop-rds-sg
```
Then select:
```
Create database
```

---
# Problem 2.19: Wait for RDS to become available
## Solution
Open:
```
RDS
→ Databases
→ pet-shop-mysql
```
The status will initially show something such as:
```
Creating
```
When creation succeeds, it will show:
```
Available
```
Do not attempt the Spring Boot connection while the status is still `Creating`.

---
# Problem 2.20: Record the RDS connection information
## Solution
Select:
```
RDS
→ Databases
→ pet-shop-mysql
→ Connectivity & security
```
Find and securely record:
```
Endpoint:
pet-shop-mysql.xxxxxxxxxxxx.ap-southeast-1.rds.amazonaws.com
Port:
3306
```
Also record:
```
Database name:
pet_shop
Master username:
pet_shop_admin
Master password:
The password you created
```
The endpoint is a DNS name. Do not use or save the database’s underlying private IP address because that address can change.
Store the secret values in a password manager entry similar to:
```
Name:
Pet Shop RDS MySQL
Region:
ap-southeast-1
DB identifier:
pet-shop-mysql
Endpoint:
Actual RDS endpoint
Port:
3306
Database:
pet_shop
Username:
pet_shop_admin
Password:
Actual secret password
```
Never show or send the password in screenshots.

---
# Problem 2.21: Prepare the Spring Boot connection
## Solution
Spring Boot will eventually require a JDBC URL similar to:
```
jdbc:mysql://RDS-ENDPOINT:3306/pet_shop
```
Use environment variables or a secure AWS configuration service rather than committing the values:
```
DB_HOST=RDS-ENDPOINT
DB_PORT=3306
DB_NAME=pet_shop
DB_USERNAME=pet_shop_admin
DB_PASSWORD=secret
```
Then construct the Spring Boot configuration from those environment variables.
Do not put the actual password in a committed file such as:
```
spring.datasource.password=actual-password
```
For production, create a separate, least-privileged application database user instead of running Spring Boot permanently as the RDS master user.
# Connection checklist
For the connection to work, all of these must be correct:
```
[ ] RDS status is Available
[ ] RDS uses pet-shop-db-subnet-group
[ ] Public access is No
[ ] RDS uses pet-shop-rds-sg
[ ] pet-shop-rds-sg allows TCP 3306 from pet-shop-backend-sg
[ ] EC2 uses pet-shop-backend-sg
[ ] EC2 and RDS are inside pet-shop-vpc
[ ] VPC DNS resolution is enabled
[ ] Spring Boot uses the RDS endpoint
[ ] Database name is pet_shop
[ ] Username and password are valid
```
# Final Checklist
```
[ ] Opened RDS → Databases → Create database
[ ] Selected Standard create
[ ] Selected MySQL
[ ] Selected Free tier if eligible, otherwise Dev/Test
[ ] Selected a current supported MySQL version
[ ] Selected Single-AZ
[ ] Entered pet-shop-mysql
[ ] Entered pet_shop_admin
[ ] Created and securely stored a strong password
[ ] Selected the smallest suitable burstable class
[ ] Selected General Purpose SSD
[ ] Selected the smallest supported storage amount
[ ] Reviewed storage autoscaling
[ ] Selected pet-shop-vpc
[ ] Selected pet-shop-db-subnet-group
[ ] Selected Public access: No
[ ] Selected pet-shop-rds-sg
[ ] Removed the default security group if unnecessary
[ ] Confirmed port 3306
[ ] Entered initial database name pet_shop
[ ] Configured 1–7 days of backup retention
[ ] Reviewed deletion protection
[ ] Disabled unnecessary paid monitoring features
[ ] Reviewed the current cost estimate
[ ] Created the database
[ ] Waited for status Available
[ ] Recorded the endpoint and connection settings securely
```
For a learning database, remember to delete it when it is no longer needed. Stopping an RDS DB instance is temporary; it can automatically restart after the maximum allowed stopped period, so deletion is the reliable way to end ongoing instance charges when you no longer need the database.