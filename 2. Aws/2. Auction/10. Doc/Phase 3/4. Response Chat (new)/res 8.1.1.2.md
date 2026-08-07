You get:
```
No files found for pet-shop.service.
```
because the `pet-shop` systemd service has not been created yet.
The environment file and the systemd service are two different things:
```
/etc/pet-shop/pet-shop.env
→ stores environment variables
/etc/systemd/system/pet-shop.service
→ tells systemd how to start the Spring Boot JAR
```
# Main Problem
You created the environment file, but systemd still does not know what `pet-shop` means.
## Problem 1: Create the application directories
Run:
```
sudo mkdir -p /opt/pet-shop
sudo mkdir -p /etc/pet-shop
```
Confirm the Linux user exists:
```
id petshop
```
If it does not exist, create it:
```
sudo useradd \
  --system \
  --home /opt/pet-shop \
  --shell /usr/sbin/nologin \
  petshop
```
Then set directory ownership:
```
sudo chown -R petshop:petshop /opt/pet-shop
```
## Problem 2: Confirm the JAR exists
Run:
```
sudo ls -lh /opt/pet-shop/pet-shop.jar
```
If it shows:
```
No such file or directory
```
you still need to upload your built Spring Boot JAR to:
```
/opt/pet-shop/pet-shop.jar
```
Do not start the service until the JAR exists.
## Problem 3: Create the systemd service file
Run:
```
sudo nano /etc/systemd/system/pet-shop.service
```
Paste:
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
NoNewPrivileges=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
```
Save:
```
Ctrl + O
Enter
Ctrl + X
```
## Problem 4: Reload systemd
Systemd does not automatically notice a newly created service file.
Run:
```
sudo systemctl daemon-reload
```
Now test:
```
sudo systemctl cat pet-shop
```
You should see the contents of the service file.
## Problem 5: Validate the service
Run:
```
sudo systemd-analyze verify /etc/systemd/system/pet-shop.service
```
No output normally means the file is valid.
## Problem 6: Set correct file permissions
For the environment file:
```
sudo chown root:petshop /etc/pet-shop/pet-shop.env
sudo chmod 640 /etc/pet-shop/pet-shop.env
```
For the JAR:
```
sudo chown petshop:petshop /opt/pet-shop/pet-shop.jar
sudo chmod 550 /opt/pet-shop/pet-shop.jar
```
## Problem 7: Enable and start the service
Only do this after the JAR exists:
```
sudo systemctl enable pet-shop
sudo systemctl start pet-shop
```
Then check:
```
sudo systemctl status pet-shop --no-pager
```
Expected:
```
Loaded: loaded
Active: active (running)
```
If it fails, inspect the logs:
```
sudo journalctl -u pet-shop -n 150 --no-pager
```
## Commands in order
```
sudo mkdir -p /opt/pet-shop
sudo mkdir -p /etc/pet-shop
id petshop
sudo nano /etc/systemd/system/pet-shop.service
sudo systemctl daemon-reload
sudo systemctl cat pet-shop
sudo systemd-analyze verify /etc/systemd/system/pet-shop.service
sudo ls -lh /opt/pet-shop/pet-shop.jar
```
After the JAR has been uploaded:
```
sudo chown petshop:petshop /opt/pet-shop/pet-shop.jar
sudo chmod 550 /opt/pet-shop/pet-shop.jar
sudo systemctl enable pet-shop
sudo systemctl start pet-shop
sudo systemctl status pet-shop --no-pager
```
So the message is not a dangerous error. It simply means the service definition has not been created yet.