# Main Problem
You want to manually remove a **failed Flyway V21 record** from your RDS MySQL database, then restart Spring Boot so Flyway can try V21 again.
The sequence is:
```
EC2
↓
connect to RDS MySQL
↓
open pet_shop database
↓
check flyway_schema_history
↓
delete failed V21 row
↓
restart Spring Boot
↓
Flyway retries V21
```
## Problem 1: Connect from EC2 to your RDS MySQL
## Solution
First stop the Spring Boot service so it does not keep retrying while you edit Flyway history:
```
sudo systemctl stop pet-shop
```
Then connect to RDS:
```
mysql -h pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com \
  -P 3306 \
  -u pet_shop_admin \
  -p
```
MySQL will ask:
```
Enter password:
```
Type your RDS master/user password.
Your password will not appear while you type. That is normal.

---
## Problem 2: Select the correct database
## Solution
After you see:
```
mysql>
```
run:
```
USE pet_shop;
```
Expected:
```
Database changed
```
Then confirm:
```
SELECT DATABASE();
```
Expected:
```
pet_shop
```

---
## Problem 3: Check V21 before deleting anything
## Solution
Run:
```
SELECT
    installed_rank,
    version,
    description,
    type,
    script,
    success
FROM flyway_schema_history
WHERE version = '21';
```
If V21 failed, you may see something similar to:
```
+----------------+---------+---------------------------+------+--------------------------------------+---------+
| installed_rank | version | description               | type | script                               | success |
+----------------+---------+---------------------------+------+--------------------------------------+---------+
| 21             | 21      | fix uuid columns binary16 | SQL  | V21__fix_uuid_columns_binary16.sql   | 0       |
+----------------+---------+---------------------------+------+--------------------------------------+---------+
```
The important value is:
```
success = 0
```
That means Flyway recorded a failed migration.

---
## Problem 4: Remove only the failed V21 row
## Solution
Now run:
```
DELETE FROM flyway_schema_history
WHERE version = '21'
  AND success = 0;
```
MySQL should respond with something like:
```
Query OK, 1 row affected
```
Then verify:
```
SELECT version, description, success
FROM flyway_schema_history
WHERE version = '21';
```
If deletion worked:
```
Empty set
```
### Important
Do **not** run:
```
DELETE FROM flyway_schema_history;
```
That would erase the history for V1–V20 too.
Only delete:
```
version = '21'
AND success = 0
```

---
## Problem 5: Exit MySQL
Run:
```
EXIT;
```
You will return to:
```
ubuntu@ip-10-0-1-97:~$
```

---
## Problem 6: Make sure your corrected V21 is inside the deployed JAR
Before restarting, verify:
```
sudo unzip -l /opt/pet-shop/pet-shop.jar | grep 'V21'
```
You should see something like:
```
BOOT-INF/classes/db/migration/V21__fix_uuid_columns_binary16.sql
```
This is important.
Otherwise you could delete the failed history row but restart with the wrong JAR.

---
## Problem 7: Restart Spring Boot
Run:
```
sudo systemctl start pet-shop
```
Then watch:
```
sudo journalctl -u pet-shop -f
```
You want Flyway to say something similar to:
```
Current version of schema `pet_shop`: 20
Migrating schema `pet_shop` to version "21 - fix uuid columns binary16"
Successfully applied 1 migration
```
Then Hibernate should validate the resulting schema.
Finally, success should look similar to:
```
Tomcat started on port 8080
Started HappyPetShopApplication
```
Press:
```
Ctrl+C
```
to stop following the logs. It does **not** stop the application.
Then verify:
```
sudo systemctl status pet-shop --no-pager -l
```
and:
```
sudo ss -lntp | grep ':8080'
```
If your production config binds Spring Boot to localhost, you should see Java listening on something like:
```
127.0.0.1:8080
```
One caution: deleting the failed Flyway row only resets Flyway's history. If the failed V21 already changed some columns before failing, the database may be **partially modified**. In that case V21 must be written so it can safely run against the current database state, or those partial changes need to be corrected first.