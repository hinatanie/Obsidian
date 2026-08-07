# Main Problem
Your Spring Boot application should not connect to RDS using the powerful master account all the time.
Create three separate MySQL accounts:
```
pet_shop_admin
→ Human database administration
pet_shop_migration
→ Flyway creates and changes database objects
pet_shop_app
→ Spring Boot reads and changes application data
```
This limits the damage if the application’s database password is exposed.
MySQL supports granting privileges at the database level, such as `pet_shop.*`, instead of globally across every database.

---
## Problem 1: Understand the three accounts
## Solution
Use the accounts like this:

|Account|Used by|Main purpose|
|---|---|---|
|`pet_shop_admin`|You, manually|Create users, inspect and repair the database|
|`pet_shop_migration`|Flyway|Create and modify tables, indexes and constraints|
|`pet_shop_app`|Spring Boot|Normal application queries|
The desired flow is:
```
You
→ pet_shop_admin
→ Create and manage database users
```
```
Spring Boot startup
→ pet_shop_migration
→ Run Flyway migrations
```
```
Spring Boot runtime
→ pet_shop_app
→ SELECT, INSERT, UPDATE, DELETE
```
Do not configure the main Spring Boot datasource with:
```
DB_USERNAME=pet_shop_admin
```

---
## Problem 2: Connect with the RDS administrator account
## Solution
Connect to the EC2 instance through Session Manager:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Connect
→ Session Manager
→ Connect
```
Set your RDS endpoint:
```
RDS_ENDPOINT="YOUR_RDS_ENDPOINT"
```
Example:
```
RDS_ENDPOINT="pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com"
```
Connect using the existing RDS master account:
```
mysql \
  -h "$RDS_ENDPOINT" \
  -P 3306 \
  -u pet_shop_admin \
  -p
```
Enter the password interactively.
After successful login, you should see:
```
mysql>
```

---
## Problem 3: Confirm the `pet_shop` database exists
## Solution
Inside MySQL, run:
```
SHOW DATABASES;
```
Confirm this database exists:
```
pet_shop
```
Then select it:
```
USE pet_shop;
```
If it does not exist, create it using the administrator account:
```
CREATE DATABASE pet_shop
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```
Then:
```
USE pet_shop;
```

---
## Problem 4: Choose strong passwords
## Solution
Create two different strong passwords:
```
One password for pet_shop_migration
One password for pet_shop_app
```
Each password should be:
```
At least 20 characters
Random
Unique
Not reused
Not committed to Git
```
Example format only:
```
migration password:
random-long-password-1
application password:
different-random-password-2
```
Do not copy those examples as real passwords.
Store the actual passwords in a password manager for now. Later, use AWS Secrets Manager or SSM Parameter Store for deployment secrets.
Avoid troublesome characters while manually entering SQL passwords, particularly a single quote:
```
'
```
A password containing a single quote must be escaped correctly in SQL.

---
## Problem 5: Create the migration user
## Solution
Inside MySQL, run:
```
CREATE USER 'pet_shop_migration'@'%'
IDENTIFIED BY 'Lamthaiyennhi2005';
```
The MySQL account format is:
```
'username'@'host'
```
Using:
```
'pet_shop_migration'@'%'
```
means MySQL permits this account to authenticate from network hosts, but the RDS security group still limits which machines can reach port `3306`. Explicitly including the host portion is preferable to relying on MySQL’s default behavior.
Replace only:
```
REPLACE_WITH_MIGRATION_PASSWORD
```
with your real password.
Do not include the angle brackets:
```
-- Wrong
IDENTIFIED BY '<my-password>';
```
unless the `<` and `>` characters are genuinely part of your password.

---
## Problem 6: Grant Flyway migration permissions
## Solution
A practical Flyway user for this project can receive:
```
GRANT
    SELECT,
    INSERT,
    UPDATE,
    DELETE,
    CREATE,
    ALTER,
    DROP,
    INDEX,
    REFERENCES,
    CREATE VIEW,
    SHOW VIEW,
    TRIGGER
ON pet_shop.*
TO 'pet_shop_migration'@'%';
```
Flyway needs privileges required by the SQL in your migration scripts, along with permissions to maintain its schema-history table. Redgate specifically notes that deployment users commonly need schema-changing privileges plus data-changing privileges on the Flyway history table.
### Why these permissions are required
```
CREATE
→ Create tables and other objects
ALTER
→ Add or change columns and constraints
DROP
→ Remove obsolete objects through migrations
INDEX
→ Create and remove indexes
REFERENCES
→ Create foreign-key relationships
CREATE VIEW / SHOW VIEW
→ Required only when migrations manage views
TRIGGER
→ Required only when migrations manage triggers
SELECT / INSERT / UPDATE / DELETE
→ Maintain flyway_schema_history and run data migrations
```
The permissions are restricted to:
```
pet_shop.*
```
They are not granted globally using:
```
*.*
```
### Optional tighter permission set
When your migrations never create views or triggers, you can omit:
```
CREATE VIEW
SHOW VIEW
TRIGGER
```
However, the broader schema-scoped set above is easier for an initial Flyway deployment while still remaining limited to `pet_shop`.

---
## Problem 7: Create the Spring Boot application user
## Solution
Run:
```
CREATE USER 'pet_shop_app'@'%'
IDENTIFIED BY 'Lamthaiyennhi2005';
```
Use a different password from the migration account.
Then grant only normal data-access permissions:
```
GRANT
    SELECT,
    INSERT,
    UPDATE,
    DELETE
ON pet_shop.*
TO 'pet_shop_app'@'%';
```
This means the application can:
```
Read rows
Create rows
Modify rows
Delete rows
```
It cannot normally:
```
Create tables
Alter columns
Drop tables
Create database users
Grant itself more permissions
```

---
## Problem 8: Do not run `FLUSH PRIVILEGES`
## Solution
You do not need:
```
FLUSH PRIVILEGES;
```
after using:
```
CREATE USER
GRANT
```
Those account-management statements take effect directly.
`FLUSH PRIVILEGES` is mainly relevant when privilege tables are changed manually, which you should not do.

---
## Problem 9: Verify both users and their grants
## Solution
Run:
```
SELECT User, Host
FROM mysql.user
WHERE User IN ('pet_shop_migration', 'pet_shop_app');
```
Expected:
```
pet_shop_migration    %
pet_shop_app          %
```
Then inspect the migration user:
```
SHOW GRANTS FOR 'pet_shop_migration'@'%';
```
Inspect the application user:
```
SHOW GRANTS FOR 'pet_shop_app'@'%';
```
The application user should show privileges equivalent to:
```
SELECT, INSERT, UPDATE, DELETE ON `pet_shop`.*
```
It should not show:
```
ALL PRIVILEGES
CREATE
ALTER
DROP
GRANT OPTION
```
Exit:
```
EXIT;
```

---
## Problem 10: Test the application user
## Solution
Reconnect using:
```
mysql \
  -h "$RDS_ENDPOINT" \
  -P 3306 \
  -u pet_shop_app \
  -p
```
Enter the application password.
Then run:
```
USE pet_shop;
SHOW TABLES;
```
Test that the user can read:
```
SELECT 1;
```
When tables already exist, test one harmless query:
```
SELECT *
FROM your_existing_table
LIMIT 1;
```
Replace `your_existing_table` with a real table name.
### Confirm that schema changes are blocked
Run this controlled test:
```
CREATE TABLE permission_test (
    id INT PRIMARY KEY
);
```
Expected:
```
ERROR 1142 (42000):
CREATE command denied to user ...
```
That error is good. It proves `pet_shop_app` cannot create tables.
Exit:
```
EXIT;
```

---
## Problem 11: Test the migration user
## Solution
Connect using:
```
mysql \
  -h "$RDS_ENDPOINT" \
  -P 3306 \
  -u pet_shop_migration \
  -p
```
Enter the migration password.
Run:
```
USE pet_shop;
```
Create a temporary test table:
```
CREATE TABLE migration_permission_test (
    id BIGINT NOT NULL AUTO_INCREMENT,
    test_value VARCHAR(100) NOT NULL,
    PRIMARY KEY (id)
);
```
Alter it:
```
ALTER TABLE migration_permission_test
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
```
Insert a row:
```
INSERT INTO migration_permission_test (test_value)
VALUES ('permission test');
```
Read it:
```
SELECT *
FROM migration_permission_test;
```
Remove the temporary table:
```
DROP TABLE migration_permission_test;
```
Then exit:
```
EXIT;
```
This confirms that Flyway will be able to perform normal schema migrations.

---
## Problem 12: Configure Spring Boot to use both accounts
## Solution
Your main datasource should use:
```
pet_shop_app
```
Flyway should use:
```
pet_shop_migration
```
Spring Boot supports supplying a separate Flyway URL, username and password instead of requiring Flyway to use the main datasource.
Use this in `application-prod.yaml`:
```
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    username: ${DB_APP_USERNAME}
    password: ${DB_APP_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
  flyway:
    enabled: true
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    user: ${DB_MIGRATION_USERNAME}
    password: ${DB_MIGRATION_PASSWORD}
```
Use these environment variables:
```
DB_HOST=your-rds-endpoint
DB_PORT=3306
DB_NAME=pet_shop
DB_APP_USERNAME=pet_shop_app
DB_APP_PASSWORD=your-app-password
DB_MIGRATION_USERNAME=pet_shop_migration
DB_MIGRATION_PASSWORD=your-migration-password
```
Do not configure:
```
DB_APP_USERNAME=pet_shop_admin
```
Do not put real passwords directly inside:
```
application.yaml
application-prod.yaml
GitHub
Dockerfile
JAR
```
Spring Boot supports external configuration through environment variables and other external sources.

---
## Problem 13: Prevent Hibernate from changing the schema
## Solution
When Flyway owns schema changes, Hibernate should validate the schema rather than create or modify it.
Add:
```
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```
Recommended production configuration:
```
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    username: ${DB_APP_USERNAME}
    password: ${DB_APP_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
  flyway:
    enabled: true
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    user: ${DB_MIGRATION_USERNAME}
    password: ${DB_MIGRATION_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
```
This separates responsibilities:
```
Flyway
→ Changes the database structure
Hibernate
→ Verifies that entities match the database
pet_shop_app
→ Performs application data operations
```
Do not use this in production:
```
spring:
  jpa:
    hibernate:
      ddl-auto: update
```
Otherwise Hibernate may try to alter the schema through `pet_shop_app`, which should not have `ALTER` privileges.

---
## Problem 14: Consider an even safer deployment model
## Solution
There are two possible ways to run Flyway.
### Model A: Flyway runs when Spring Boot starts
```
Spring Boot starts
→ Uses migration credentials
→ Runs Flyway
→ Starts application using app credentials
```
This is simpler for your current learning deployment.
However, migration credentials must be available to the EC2 application process.
### Model B: Deployment pipeline runs Flyway separately
```
Deployment process
→ Temporarily obtains migration credentials
→ Runs Flyway
→ Removes migration credentials
→ Starts Spring Boot with only app credentials
```
This is safer for mature production environments because the running application never receives schema-changing credentials.
For now, Model A is acceptable, provided that:
```
Migration privileges are restricted to pet_shop.*
Passwords are not stored in Git
The admin account is not used by Spring Boot
```

---
# Complete SQL script
Run the following while connected as `pet_shop_admin`.
Replace both password placeholders first:
```
CREATE USER 'pet_shop_migration'@'%'
IDENTIFIED BY 'REPLACE_WITH_MIGRATION_PASSWORD';
GRANT
    SELECT,
    INSERT,
    UPDATE,
    DELETE,
    CREATE,
    ALTER,
    DROP,
    INDEX,
    REFERENCES,
    CREATE VIEW,
    SHOW VIEW,
    TRIGGER
ON pet_shop.*
TO 'pet_shop_migration'@'%';
CREATE USER 'pet_shop_app'@'%'
IDENTIFIED BY 'REPLACE_WITH_APP_PASSWORD';
GRANT
    SELECT,
    INSERT,
    UPDATE,
    DELETE
ON pet_shop.*
TO 'pet_shop_app'@'%';
SHOW GRANTS FOR 'pet_shop_migration'@'%';
SHOW GRANTS FOR 'pet_shop_app'@'%';
```

---
# Final permission structure
```
pet_shop_admin
├── Used manually
├── Creates database users
├── Grants and revokes permissions
└── Not stored in Spring Boot configuration
pet_shop_migration
├── Used by Flyway
├── Restricted to pet_shop.*
├── Creates and modifies schema objects
└── Does not receive global privileges
pet_shop_app
├── Used by Spring Boot
├── Restricted to pet_shop.*
├── SELECT
├── INSERT
├── UPDATE
└── DELETE
```
## Completion checklist
```
[ ] Connect to RDS as pet_shop_admin
[ ] Confirm the pet_shop database exists
[ ] Generate two different strong passwords
[ ] Create pet_shop_migration
[ ] Grant schema-migration permissions on pet_shop.*
[ ] Create pet_shop_app
[ ] Grant SELECT, INSERT, UPDATE and DELETE on pet_shop.*
[ ] Verify both accounts with SHOW GRANTS
[ ] Confirm pet_shop_app cannot CREATE TABLE
[ ] Confirm pet_shop_migration can create, alter and drop a test table
[ ] Use pet_shop_app for spring.datasource
[ ] Use pet_shop_migration for spring.flyway
[ ] Set Hibernate ddl-auto to validate
[ ] Do not use pet_shop_admin in Spring Boot
[ ] Do not commit database passwords
```