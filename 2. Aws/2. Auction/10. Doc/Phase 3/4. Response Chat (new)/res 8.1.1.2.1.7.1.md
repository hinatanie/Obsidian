# Main Problem
You need to check two separate things:
```
1. Do migration SQL files exist in your source project?
2. Were those files packaged inside pet-shop.jar?
```
Your logs currently show:
```
Successfully validated 0 migrations
No migrations found
Empty Schema
```
So Flyway did not find any migration files in the deployed JAR.
# Problem 1: Check the migration folder on Windows
## Solution
Open PowerShell in your project root:
```
C:\Users\ADMIN\Documents\dhsg\third year\sem2\java\project\pet-shop\server\happy-pet-shop
```
Run:
```
Get-Location
```
Make sure you are in the folder that contains:
```
pom.xml
src
mvnw.cmd
```
Check:
```
Get-ChildItem
```
Then check whether the migration directory exists:
```
Test-Path ".\src\main\resources\db\migration"
```
Possible results:
```
True
```
means the directory exists.
```
False
```
means it does not exist yet.
## Problem 2: List migration files
## Solution
Run:
```
Get-ChildItem ".\src\main\resources\db\migration"
```
A correct result should show files such as:
```
V1__create_users_table.sql
V2__create_products_table.sql
V3__create_cart_tables.sql
```
You can also search the whole project:
```
Get-ChildItem -Recurse -Filter "*.sql"
```
This helps you find SQL files that may currently be in the wrong directory.
The correct path is:
```
src
└── main
    └── resources
        └── db
            └── migration
                ├── V1__create_users_table.sql
                ├── V2__create_products_table.sql
                └── V3__create_cart_tables.sql
```
# Problem 3: Create the folder when it does not exist
## Solution
Run:
```
New-Item `
  -ItemType Directory `
  -Path ".\src\main\resources\db\migration" `
  -Force
```
Then confirm:
```
Test-Path ".\src\main\resources\db\migration"
```
Expected:
```
True
```
You can also open the folder in File Explorer:
```
explorer ".\src\main\resources\db\migration"
```
Creating the folder alone is not enough. It must contain valid migration SQL files.
# Problem 4: Check Flyway filename format
## Solution
Flyway migration filenames must follow this structure:
```
V<number>__<description>.sql
```
Notice the two underscores:
```
__
```
Correct:
```
V1__create_initial_schema.sql
V2__create_products_table.sql
V3__create_cart_tables.sql
```
Incorrect:
```
V1_create_initial_schema.sql
V1-create-schema.sql
create_schema.sql
v1__create_schema.sql
```
Use uppercase `V` and two underscores.
# Problem 5: Create a temporary test migration file
## Solution
Only do this to confirm packaging, not as your final database schema.
Run:
```
New-Item `
  -ItemType File `
  -Path ".\src\main\resources\db\migration\V1__test_migration.sql" `
  -Force
```
Open it:
```
notepad ".\src\main\resources\db\migration\V1__test_migration.sql"
```
Add:
```
CREATE TABLE flyway_test (
    id BIGINT NOT NULL AUTO_INCREMENT,
    test_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id)
);
```
Save the file.
However, your real migration must eventually create all tables required by your entities, including:
```
cart_items
```
A test migration alone will not make your application start because Hibernate expects the complete schema.
# Problem 6: Build the JAR again
## Solution
From the project root, run:
```
.\mvnw.cmd clean package
```
If the build succeeds, the JAR should appear in:
```
target
```
List it:
```
Get-ChildItem ".\target\*.jar"
```
You may see:
```
happy-pet-shop-0.0.1-SNAPSHOT.jar
```
Do not use:
```
*.jar.original
```
# Problem 7: Check the local JAR before uploading
## Solution
You can inspect the JAR directly on Windows.
First find the real JAR name:
```
Get-ChildItem ".\target\*.jar"
```
Then run:
```
jar tf ".\target\happy-pet-shop-0.0.1-SNAPSHOT.jar" | Select-String "db/migration"
```
Expected:
```
BOOT-INF/classes/db/migration/
BOOT-INF/classes/db/migration/V1__create_initial_schema.sql
```
If no output appears, the migration files were not included.
## Problem 8: Check the resource folder itself
## Solution
Run:
```
Get-ChildItem `
  ".\src\main\resources\db\migration" `
  -Recurse
```
Then run:
```
Get-ChildItem `
  ".\target\classes\db\migration" `
  -Recurse
```
After a Maven build, the migration files should be copied to:
```
target/classes/db/migration
```
The flow should be:
```
src/main/resources/db/migration
        ↓ Maven build
target/classes/db/migration
        ↓ Spring Boot packaging
BOOT-INF/classes/db/migration
```
If the file exists in `src/main/resources` but not in `target/classes`, check your `pom.xml` for a custom resource configuration that excludes `.sql` files.
# Problem 9: Copy the new JAR to `pet-shop.jar`
## Solution
Replace the filename below with your actual JAR:
```
Copy-Item `
  ".\target\pet-shop.jar" `
  ".\pet-shop.jar" `
  -Force
```
Confirm:
```
Get-Item ".\pet-shop.jar"
```
Inspect this final deployment JAR too:
```
jar tf ".\pet-shopscp .jar" |
  Select-String "db/migration"
```
Do not upload until this command shows the migration files.scp 
# Problem 10: Upload the new JAR to EC2
## Solution
Use the current EC2 public IPv4 address:
```
scp `
  -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ".\pet-shop.jar" `
  ubuntu@54.179.121.250:/home/ubuntu/pet-shop.jar
```
Then connect to EC2 through Session Manager.
Stop the service before replacing the JAR:
```
sudo systemctl stop pet-shop
```
Move the uploaded file:
```
sudo mv /home/ubuntu/pet-shop.jar \
  /opt/pet-shop/pet-shop.jar
```
Set ownership and permissions:
```
sudo chown petshop:petshop \
  /opt/pet-shop/pet-shop.jar
sudo chmod 550 \
  /opt/pet-shop/pet-shop.jar
```
# Problem 11: Check the deployed JAR on EC2
## Solution
Run:
```
sudo unzip -l /opt/pet-shop/pet-shop.jar |
grep 'db/migration'
```
Expected:
```
BOOT-INF/classes/db/migration/
BOOT-INF/classes/db/migration/V1__create_initial_schema.sql
```
A more focused command is:
```
sudo unzip -Z1 /opt/pet-shop/pet-shop.jar |
grep '^BOOT-INF/classes/db/migration/'
```
If no output appears, the JAR still contains no migration files.
# Problem 12: Start Spring Boot and watch Flyway
## Solution
Start the service:
```
sudo systemctl start pet-shop
```
Watch the logs:
```
sudo journalctl -u pet-shop -f
```
You want to see something similar to:
```
Successfully validated 1 migration
Migrating schema `pet_shop` to version "1 - create initial schema"
Successfully applied 1 migration
```
You should no longer see:
```
Successfully validated 0 migrations
No migrations found
```
Stop following the logs with:
```
Ctrl + C
```
# Commands to run now on Windows
```
Test-Path ".\src\main\resources\db\migration"
Get-ChildItem `
  ".\src\main\resources\db\migration" `
  -Recurse
.\mvnw.cmd clean package
Get-ChildItem ".\target\*.jar"
jar tf ".\target\YOUR_REAL_JAR_NAME.jar" |
  Select-String "db/migration"
```
# Commands to run after uploading to EC2
```
sudo unzip -Z1 /opt/pet-shop/pet-shop.jar |
grep '^BOOT-INF/classes/db/migration/'
sudo systemctl start pet-shop
sudo journalctl -u pet-shop -f
```
The most important check is this:
```
jar tf ".\pet-shop.jar" |
Select-String "db/migration"
```
Do not upload the JAR until it shows at least one migration file.