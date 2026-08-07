# Main Problem
Your EC2, RDS network, Java, and Flyway connection are working.
The application fails because Spring Boot is trying to log in with this literal username:
```
${DB_APP_USERNAME}
```
The log proves it:
```
Access denied for user '${DB_APP_USERNAME}'@'10.0.1.97'
```
That means your `application-prod.yaml` expects:
```
DB_APP_USERNAME
DB_APP_PASSWORD
```
but your EC2 environment file probably contains:
```
DB_USERNAME
DB_PASSWORD
```
So Spring Boot cannot resolve the expected variable and sends `${DB_APP_USERNAME}` directly to MySQL.
## Problem 1: Check what the JAR expects
On your development computer, open:
```
src/main/resources/application-prod.yaml
```
You likely have something similar to:
```
spring:
  datasource:
    username: ${DB_APP_USERNAME}
    password: ${DB_APP_PASSWORD}
```
Your Flyway connection succeeded, so these variables are probably already correct:
```
spring:
  flyway:
    user: ${DB_MIGRATION_USERNAME}
    password: ${DB_MIGRATION_PASSWORD}
```
The log confirms Flyway successfully connected to your RDS database before Hibernate failed.
## Problem 2: Fix the EC2 environment-variable names
The simplest fix is to make `/etc/pet-shop/pet-shop.env` match `application-prod.yaml`.
Open:
```
sudo nano /etc/pet-shop/pet-shop.env
```
Change this:
```
DB_USERNAME=pet_shop_app
DB_PASSWORD=YOUR_APP_PASSWORD
```
to:
```
DB_APP_USERNAME=pet_shop_app
DB_APP_PASSWORD=YOUR_APP_PASSWORD
```
Keep the migration variables:
```
DB_MIGRATION_USERNAME=pet_shop_migration
DB_MIGRATION_PASSWORD=YOUR_MIGRATION_PASSWORD
```
Your final file should contain:
```
SPRING_PROFILES_ACTIVE=prod
DB_HOST=pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=pet_shop
DB_APP_USERNAME=pet_shop_app
DB_APP_PASSWORD=YOUR_REAL_APP_PASSWORD
DB_MIGRATION_USERNAME=pet_shop_migration
DB_MIGRATION_PASSWORD=YOUR_REAL_MIGRATION_PASSWORD
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
```
Save with:
```
Ctrl + O
Enter
Ctrl + X
```
## Problem 3: Verify the variable names without showing passwords
Run:
```
sudo grep -E \
'^(DB_APP_USERNAME|DB_MIGRATION_USERNAME|DB_HOST|DB_PORT|DB_NAME)=' \
/etc/pet-shop/pet-shop.env
```
Expected:
```
DB_HOST=pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=pet_shop
DB_APP_USERNAME=pet_shop_app
DB_MIGRATION_USERNAME=pet_shop_migration
```
Check whether both password variables exist:
```
sudo awk -F= '
$1=="DB_APP_PASSWORD" || $1=="DB_MIGRATION_PASSWORD" {
    print $1, length($2) > 0 ? "present" : "empty"
}' /etc/pet-shop/pet-shop.env
```
Expected:
```
DB_APP_PASSWORD present
DB_MIGRATION_PASSWORD present
```
## Problem 4: Test the application account manually
Before restarting Spring Boot, confirm the credentials work:
```
mysql \
  -h pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com \
  -P 3306 \
  -u pet_shop_app \
  -p
```
Enter the same password stored in:
```
DB_APP_PASSWORD
```
After login:
```
USE pet_shop;
SELECT 1;
SHOW TABLES;
EXIT;
```
If you receive:
```
Access denied for user 'pet_shop_app'
```
then the password in the environment file does not match the password used when the MySQL user was created.
You can reset it while logged in as `pet_shop_admin`:
```
ALTER USER 'pet_shop_app'@'%'
IDENTIFIED BY 'YOUR_NEW_APP_PASSWORD';
```
Then put that exact password in:
```
DB_APP_PASSWORD=YOUR_NEW_APP_PASSWORD
```
## Problem 5: Restart the service
Because you changed only the environment file, you do not need to rebuild the JAR.
Run:
```
sudo systemctl restart pet-shop
```
Wait about 20–30 seconds:
```
sleep 25
```
Check:
```
sudo systemctl status pet-shop --no-pager
```
Expected:
```
Active: active (running)
```
Then:
```
sudo ss -lntp | grep ':8080'
```
Expected:
```
127.0.0.1:8080
```
Finally:
```
curl -i http://127.0.0.1:8080/actuator/health
```
Expected:
```
HTTP/1.1 200
```
```
{"status":"UP"}
```
# Secondary Problem: Flyway found no migration files
Your logs also show:
```
Successfully validated 0 migrations
No migrations found
Empty Schema
```
So after fixing the username, Hibernate may fail because the database has no tables while you configured:
```
ddl-auto: validate
```
Flyway looked for migrations but found none.
Check your project for:
```
src/main/resources/db/migration/
```
It should contain files such as:
```
V1__create_users_table.sql
V2__create_products_table.sql
```
Confirm the files are inside the JAR:
```
unzip -l /opt/pet-shop/pet-shop.jar | grep 'db/migration'
```
If nothing appears, your migration files were not packaged.
Do not solve that by changing production to:
```
ddl-auto: create
```
Fix or add the Flyway migration files, rebuild the JAR, and upload it again.
## Run these commands now
```
sudo nano /etc/pet-shop/pet-shop.env
```
Use:
```
DB_APP_USERNAME=pet_shop_app
DB_APP_PASSWORD=YOUR_REAL_APP_PASSWORD
```
Then:
```
sudo systemctl restart pet-shop
sleep 25
sudo systemctl status pet-shop --no-pager
sudo journalctl -u pet-shop -n 100 --no-pager
sudo ss -lntp | grep ':8080'
curl -i http://127.0.0.1:8080/actuator/health
```
The first error to fix is the variable-name mismatch:
```
DB_USERNAME
```
versus:
```
DB_APP_USERNAME
```