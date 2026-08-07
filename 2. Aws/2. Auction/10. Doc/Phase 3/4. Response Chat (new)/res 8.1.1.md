# Main Problem
You need your `pet-shop` systemd service to load:
```
SPRING_PROFILES_ACTIVE=prod
```
from:
```
/etc/pet-shop/pet-shop.env
```
Then Spring Boot will load:
```
application.yaml
application-prod.yaml
```
Spring Boot supports activating profiles through the `SPRING_PROFILES_ACTIVE` environment variable.
## Problem 1: Connect to EC2
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
You should now have an EC2 terminal.

---
## Problem 2: Check whether the environment file exists
## Solution
Run:
```
sudo ls -l /etc/pet-shop/pet-shop.env
```
A correct result may look like:
```
-rw-r----- 1 root petshop ... /etc/pet-shop/pet-shop.env
```
If you see:
```
No such file or directory
```
create the directory first:
```
sudo mkdir -p /etc/pet-shop
```

---
## Problem 3: Add the production profile
## Solution
Open the file:
```
sudo nano /etc/pet-shop/pet-shop.env
```
Add this line near the top:
```
SPRING_PROFILES_ACTIVE=prod
```
Your file should look similar to:
```
SPRING_PROFILES_ACTIVE=prod
DB_HOST=YOUR_RDS_ENDPOINT
DB_PORT=3306
DB_NAME=pet_shop
DB_USERNAME=pet_shop_app
DB_PASSWORD=YOUR_APP_PASSWORD
DB_MIGRATION_USERNAME=pet_shop_migration
DB_MIGRATION_PASSWORD=YOUR_MIGRATION_PASSWORD
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
```
Do not write:
```
export SPRING_PROFILES_ACTIVE=prod
```
For a systemd environment file, use:
```
SPRING_PROFILES_ACTIVE=prod
```
Also avoid spaces around `=`:
```
# Wrong
SPRING_PROFILES_ACTIVE = prod
```
```
# Correct
SPRING_PROFILES_ACTIVE=prod
```
Save Nano with:
```
Ctrl + O
Enter
Ctrl + X
```

---
## Problem 4: Protect the environment file
## Solution
Set the correct owner and permissions:
```
sudo chown root:petshop /etc/pet-shop/pet-shop.env
sudo chmod 640 /etc/pet-shop/pet-shop.env
```
Verify:
```
sudo ls -l /etc/pet-shop/pet-shop.env
```
Expected:
```
-rw-r----- 1 root petshop ... /etc/pet-shop/pet-shop.env
```
This means:
```
root
→ can read and edit
petshop group
→ can read
other users
→ no access
```

---
## Problem 5: Confirm the profile without exposing passwords
## Solution
Do not display the entire file because it contains database passwords.
Check only this variable:
```
sudo grep '^SPRING_PROFILES_ACTIVE=' /etc/pet-shop/pet-shop.env
```
Expected:
```
SPRING_PROFILES_ACTIVE=prod
```
You can safely display all variable names while hiding values:
```
sudo sed 's/=.*/=********/' /etc/pet-shop/pet-shop.env
```

---
## Problem 6: Confirm the systemd service loads the file
## Solution
Check your service configuration:
```
sudo systemctl cat pet-shop
```
Inside the `[Service]` section, confirm that it contains:
```
[Service]
User=petshop
Group=petshop
EnvironmentFile=/etc/pet-shop/pet-shop.env
ExecStart=/usr/bin/java -jar /opt/pet-shop/pet-shop.jar
```
The important line is:
```
EnvironmentFile=/etc/pet-shop/pet-shop.env
```
If it is missing, edit the service:
```
sudo nano /etc/systemd/system/pet-shop.service
```
A complete basic service can look like:
```
[Unit]
Description=Pet Shop Spring Boot application
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=petshop
Group=petshop
WorkingDirectory=/opt/pet-shop
EnvironmentFile=/etc/pet-shop/pet-shop.env
ExecStart=/usr/bin/java -jar /opt/pet-shop/pet-shop.jar
Restart=on-failure
RestartSec=10
SuccessExitStatus=143
[Install]
WantedBy=multi-user.target
```
Save the file.
Because you changed a systemd service definition, reload systemd:
```
sudo systemctl daemon-reload
```
You do not need `daemon-reload` when you only edit `pet-shop.env`, but running it is harmless.

---
## Problem 7: Confirm the JAR exists
## Solution
Run:
```
sudo ls -lh /opt/pet-shop/pet-shop.jar
```
A correct result should show the JAR file.
If it says:
```
No such file or directory
```
do not restart yet. Upload or copy your built JAR to:
```
/opt/pet-shop/pet-shop.jar
```
Then set ownership:
```
sudo chown petshop:petshop /opt/pet-shop/pet-shop.jar
sudo chmod 550 /opt/pet-shop/pet-shop.jar
```

---
## Problem 8: Restart the application
## Solution
Run:
```
sudo systemctl restart pet-shop
```
This stops the existing Java process and starts a new one.
The new process reads the latest contents of:
```
/etc/pet-shop/pet-shop.env
```
Therefore, the new Spring Boot process receives:
```
SPRING_PROFILES_ACTIVE=prod
```

---
## Problem 9: Check the service status
## Solution
Run:
```
sudo systemctl status pet-shop --no-pager
```
A successful result should contain:
```
Loaded: loaded
Active: active (running)
```
You may also see the Java command:
```
/usr/bin/java -jar /opt/pet-shop/pet-shop.jar
```
A typical successful status looks like:
```
● pet-shop.service - Pet Shop Spring Boot application
     Loaded: loaded
     Active: active (running)
   Main PID: 1234
      Tasks: ...
```

---
## Problem 10: Confirm that the `prod` profile is active
## Solution
Check the startup logs:
```
sudo journalctl -u pet-shop -n 100 --no-pager
```
Look for a message similar to:
```
The following 1 profile is active: "prod"
```
You can filter the logs:
```
sudo journalctl -u pet-shop --no-pager |
grep -i profile
```
Expected output should mention:
```
prod
```
This confirms that Spring Boot loaded production-specific configuration. Environment variables are one of Spring Boot’s supported external configuration sources.

---
## Problem 11: Verify the environment loaded into the service
## Solution
First get the service’s Java process ID:
```
sudo systemctl show pet-shop --property=MainPID
```
Example:
```
MainPID=1234
```
Then use the actual process ID:
```
sudo tr '\0' '\n' < /proc/1234/environ |
grep '^SPRING_PROFILES_ACTIVE='
```
Expected:
```
SPRING_PROFILES_ACTIVE=prod
```
You can do this automatically:
```
PID=$(sudo systemctl show pet-shop --property=MainPID --value)
sudo tr '\0' '\n' < "/proc/$PID/environ" |
grep '^SPRING_PROFILES_ACTIVE='
```
Do not display the entire `/proc/$PID/environ` content because it may expose database passwords.

---
## Problem 12: Test the application
## Solution
Confirm Spring Boot is listening on port `8080`:
```
sudo ss -lntp | grep ':8080'
```
Because you configured:
```
SERVER_ADDRESS=127.0.0.1
```
the correct result should contain:
```
127.0.0.1:8080
```
Test the Actuator health endpoint:
```
curl -i http://127.0.0.1:8080/actuator/health
```
Expected:
```
HTTP/1.1 200
```
and:
```
{"status":"UP"}
```

---
# If the service fails
Run:
```
sudo systemctl status pet-shop --no-pager
sudo journalctl -u pet-shop -n 150 --no-pager
```
Common causes are:
```
JAR file does not exist
Wrong JAR path
Wrong database password
Wrong RDS endpoint
Flyway migration failure
petshop user cannot read pet-shop.env
petshop user cannot read pet-shop.jar
Java version is incompatible
```
## Error: environment file cannot be read
You may see:
```
Failed to load environment files
```
Fix:
```
sudo chown root:petshop /etc/pet-shop/pet-shop.env
sudo chmod 640 /etc/pet-shop/pet-shop.env
```
Also confirm the service runs as:
```
User=petshop
Group=petshop
```
## Error: service does not exist
If you receive:
```
Unit pet-shop.service not found
```
create:
```
/etc/systemd/system/pet-shop.service
```
Then run:
```
sudo systemctl daemon-reload
sudo systemctl enable pet-shop
sudo systemctl start pet-shop
```
## Error: service repeatedly restarts
Stop it temporarily:
```
sudo systemctl stop pet-shop
```
Inspect the logs:
```
sudo journalctl -u pet-shop -n 200 --no-pager
```
Correct the error, then start it again:
```
sudo systemctl start pet-shop
```
# Commands to run now
```
# Open the environment file
sudo nano /etc/pet-shop/pet-shop.env
```
Add:
```
SPRING_PROFILES_ACTIVE=prod
```
Then run:
```
sudo chown root:petshop /etc/pet-shop/pet-shop.env
sudo chmod 640 /etc/pet-shop/pet-shop.env
sudo grep '^SPRING_PROFILES_ACTIVE=' \
  /etc/pet-shop/pet-shop.env
sudo systemctl restart pet-shop
sudo systemctl status pet-shop --no-pager
sudo journalctl -u pet-shop -n 100 --no-pager |
grep -i profile
curl -i http://127.0.0.1:8080/actuator/health
```
The final expected results are:
```
SPRING_PROFILES_ACTIVE=prod
Active: active (running)
Active profile: prod
HTTP 200
{"status":"UP"}
```