# Main Problem
Your service is **not running successfully**.
This line tells us the real issue:
```
Active: activating (auto-restart) (Result: exit-code)
```
and:
```
ExecStart=/usr/bin/java -jar /opt/pet-shop/pet-shop.jar
code=exited, status=1/FAILURE
```
That means:
```
systemd starts Java
→ Spring Boot fails during startup
→ Java exits with code 1
→ systemd waits 10 seconds
→ tries again
```
That is why this command shows nothing:
```
sudo ss -lntp | grep ':8080'
```
Spring Boot never stayed alive long enough to listen on port `8080`.
## Problem 1: Stop the restart loop temporarily
## Solution
Run:
```
sudo systemctl stop pet-shop
```
This prevents the application from repeatedly restarting while you inspect the error.
Check:
```
sudo systemctl status pet-shop --no-pager
```
It should now show something similar to:
```
Active: inactive (dead)
```
## Problem 2: Read the real Spring Boot error
## Solution
Run:
```
sudo journalctl -u pet-shop -n 200 --no-pager
```
The most important part is usually near the bottom.
You can also filter common errors:
```
sudo journalctl -u pet-shop -n 300 --no-pager | \
grep -Ei "error|exception|failed|caused by|access denied|flyway|hibernate|datasource"
```
Look for messages such as:
```
Access denied for user
Communications link failure
Unknown database
Flyway migration failed
Schema-validation
UnsupportedClassVersionError
Unable to access jarfile
Permission denied
Could not resolve placeholder
```
## Problem 3: Check whether the JAR exists and is readable
## Solution
Run:
```
sudo ls -lh /opt/pet-shop/pet-shop.jar
```
Then:
```
sudo -u petshop test -r /opt/pet-shop/pet-shop.jar \
  && echo "petshop can read JAR" \
  || echo "petshop cannot read JAR"
```
Expected:
```
petshop can read JAR
```
Check ownership:
```
sudo stat -c '%U %G %a %n' /opt/pet-shop/pet-shop.jar
```
A good result is:
```
petshop petshop 550 /opt/pet-shop/pet-shop.jar
```
Fix it if needed:
```
sudo chown petshop:petshop /opt/pet-shop/pet-shop.jar
sudo chmod 550 /opt/pet-shop/pet-shop.jar
```
## Problem 4: Check whether the environment file is readable
## Solution
Run:
```
sudo ls -l /etc/pet-shop/pet-shop.env
```
Then:
```
sudo -u petshop test -r /etc/pet-shop/pet-shop.env \
  && echo "petshop can read env file" \
  || echo "petshop cannot read env file"
```
Expected:
```
petshop can read env file
```
Check ownership and permissions:
```
sudo stat -c '%U %G %a %n' /etc/pet-shop/pet-shop.env
```
Expected:
```
root petshop 640 /etc/pet-shop/pet-shop.env
```
Fix if needed:
```
sudo chown root:petshop /etc/pet-shop/pet-shop.env
sudo chmod 640 /etc/pet-shop/pet-shop.env
```
## Problem 5: Check required environment-variable names
## Solution
Do not print the passwords.
Run:
```
sudo grep -E \
'^(SPRING_PROFILES_ACTIVE|DB_HOST|DB_PORT|DB_NAME|DB_USERNAME|DB_MIGRATION_USERNAME|SERVER_ADDRESS|SERVER_PORT)=' \
/etc/pet-shop/pet-shop.env
```
Expected structure:
```
SPRING_PROFILES_ACTIVE=prod
DB_HOST=your-rds-endpoint
DB_PORT=3306
DB_NAME=pet_shop
DB_USERNAME=pet_shop_app
DB_MIGRATION_USERNAME=pet_shop_migration
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
```
Check that password variables exist without showing their values:
```
sudo awk -F= '
$1=="DB_PASSWORD" || $1=="DB_MIGRATION_PASSWORD" {
    if (length($2) > 0) {
        print $1 "=present"
    } else {
        print $1 "=empty"
    }
}' /etc/pet-shop/pet-shop.env
```
Expected:
```
DB_PASSWORD=present
DB_MIGRATION_PASSWORD=present
```
## Problem 6: Check for hidden Windows line endings
## Solution
If the environment file was copied from Windows, it may contain `CRLF` line endings.
Run:
```
sudo file /etc/pet-shop/pet-shop.env
```
If you see:
```
with CRLF line terminators
```
convert it:
```
sudo sed -i 's/\r$//' /etc/pet-shop/pet-shop.env
```
Then verify:
```
sudo file /etc/pet-shop/pet-shop.env
```
## Problem 7: Run the application manually as the service user
## Solution
This is the fastest way to see the real startup error directly.
Run:
```
sudo systemctl stop pet-shop
```
Then:
```
sudo -u petshop bash -c '
set -a
source /etc/pet-shop/pet-shop.env
set +a
exec /usr/bin/java -jar /opt/pet-shop/pet-shop.jar
'
```
You will see the Spring Boot logs directly in the terminal.
When it fails, copy only the section from:
```
APPLICATION FAILED TO START
```
through the final:
```
Caused by:
```
Do not share lines containing passwords or tokens.
Stop the manual process with:
```
Ctrl + C
```
## Most likely causes in your setup
Based on the work you just completed, these are the most likely problems:
### Wrong database password
You may see:
```
Access denied for user 'pet_shop_app'
```
or:
```
Access denied for user 'pet_shop_migration'
```
Check the passwords in:
```
/etc/pet-shop/pet-shop.env
```
They must exactly match the passwords used in:
```
CREATE USER ...
IDENTIFIED BY '...';
```
### Flyway user lacks a required privilege
You may see:
```
CREATE command denied
ALTER command denied
REFERENCES command denied
```
Check:
```
SHOW GRANTS FOR 'pet_shop_migration'@'%';
```
### Database schema is missing
You may see:
```
Schema-validation: missing table
```
That means Flyway did not create the tables expected by Hibernate.
### Missing environment variable
You may see:
```
Could not resolve placeholder 'DB_HOST'
```
That means the environment file is missing a variable or systemd did not load it.
### Wrong Java version
You may see:
```
UnsupportedClassVersionError
```
Check:
```
java -version
```
For a Java 21 build, it must show Java 21.
## Problem 8: Restart after fixing the error
## Solution
After correcting the cause:
```
sudo systemctl daemon-reload
sudo systemctl start pet-shop
sudo systemctl status pet-shop --no-pager
```
Then wait about 10 to 20 seconds and run:
```
sudo ss -lntp | grep ':8080'
```
Expected:
```
LISTEN ... 127.0.0.1:8080 ...
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
Run this now and share the bottom error section:
```
sudo journalctl -u pet-shop -n 200 --no-pager
```