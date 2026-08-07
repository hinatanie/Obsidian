# Main Problem
The file does not exist because you have not yet:
```
Build the Spring Boot project into a JAR
        ↓
Transfer that JAR from your computer to EC2
        ↓
Place it at /opt/pet-shop/pet-shop.jar
```
Creating `/opt/pet-shop` does **not** automatically create the application JAR.
# Problem 1: Build the JAR on your computer
## Solution
Do this on your **Windows development computer**, inside the Pet Shop project folder.
### For Maven
Confirm the project contains:
```
pom.xml
mvnw
mvnw.cmd
```
Open PowerShell in the project directory and run:
```
.\mvnw.cmd clean package
```
If tests currently require unavailable configuration and you only need to test the deployment temporarily:
```
.\mvnw.cmd clean package -DskipTests
```
Prefer running all tests normally when possible.
After a successful build, inspect:
```
Get-ChildItem .\target\*.jar
```
You may see:
```
target\pet-shop-0.0.1-SNAPSHOT.jar
```
Do not upload a file ending in:
```
.jar.original
```
Upload the executable Spring Boot JAR.
### For Gradle
When your project contains `gradlew.bat`, run:
```
.\gradlew.bat clean bootJar
```
Then inspect:
```
Get-ChildItem .\build\libs\*.jar
```
The JAR will normally be under:
```
build\libs\
```

---
# Problem 2: Rename the JAR locally
## Solution
Using a stable deployment name makes your systemd service simpler.
For Maven:
```
Copy-Item `
  .\target\happy-pet-shop-0.0.1-SNAPSHOT.jar `
  .\pet-shop.jar
```
Replace the source filename with your actual filename.
Confirm:
```
Get-Item .\pet-shop.jar
```
You should now have:
```
pet-shop.jar
```
in your project directory.

---
# Problem 3: Choose how to transfer the JAR
## Solution
For your first learning deployment, the easiest approach is temporary SSH with `scp`.
The flow is:
```
Your Windows computer
        ↓ scp
Ubuntu home directory
        ↓ sudo mv
/opt/pet-shop/pet-shop.jar
```
Do not try to upload directly to `/opt/pet-shop` with `scp`, because the normal Ubuntu user usually cannot write there.

---
# Problem 4: Temporarily allow SSH from your IP
## Solution
In AWS Console, open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Security
→ pet-shop-backend-sg
→ Edit inbound rules
```
Add:
```
Type: SSH
Protocol: TCP
Port: 22
Source: My IP
Description: Temporary JAR upload
```
Do **not** use:
```
0.0.0.0/0
```
The SSH rule should be restricted to your current public IP.
You also need the private key that was selected when the EC2 instance was created, for example:
```
pet-shop-backend-key.pem
```

---
# Problem 5: Upload the JAR from Windows
## Solution
Find the EC2 public IPv4 address:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Public IPv4 address
```
Suppose the public IP is:
```
54.179.121.250
```
And suppose your key is stored at:
```
C:\Users\YourName\Downloads\pet-shop-backend-key.pem
```
From PowerShell in the folder containing `pet-shop.jar`, run:
```
scp -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" .\pet-shop.jar ubuntu@54.179.121.250:/home/ubuntu/pet-shop.jar
```
Replace:
```
54.179.121.250
```
with your real EC2 public IPv4 address.
For an Ubuntu AMI, the SSH username is normally:
```
ubuntu
```
The first connection may ask:
```
Are you sure you want to continue connecting?
```
Enter:
```
yes
```
A successful upload normally shows transfer progress and reaches `100%`.

---
# Problem 6: Move the uploaded JAR into `/opt/pet-shop`
## Solution
Reconnect using Session Manager:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Connect
→ Session Manager
→ Connect
```
Check the uploaded file:
```
sudo ls -lh /home/ubuntu/pet-shop.jar
```
Create the application directory if necessary:
```
sudo mkdir -p /opt/pet-shop
```
Move the JAR:
```
sudo mv /home/ubuntu/pet-shop.jar \
  /opt/pet-shop/pet-shop.jar
```
Set ownership:
```
sudo chown petshop:petshop \
  /opt/pet-shop/pet-shop.jar
```
Set permissions:
```
sudo chmod 550 \
  /opt/pet-shop/pet-shop.jar
```
Now verify:
```
sudo ls -lh /opt/pet-shop/pet-shop.jar
```
Expected structure:
```
-r-xr-x--- 1 petshop petshop ... /opt/pet-shop/pet-shop.jar
```
The exact file size will depend on your project.

---
# Problem 7: Confirm that the JAR is valid
## Solution
Check whether it contains the Spring Boot launcher files:
```
sudo unzip -l /opt/pet-shop/pet-shop.jar |
head
```
If `unzip` is unavailable:
```
sudo apt update
sudo apt install -y unzip
```
A Spring Boot executable JAR commonly contains entries such as:
```
META-INF/
BOOT-INF/
org/springframework/boot/loader/
```
You can also test whether Java can inspect it:
```
sudo -u petshop /usr/bin/java \
  -jar /opt/pet-shop/pet-shop.jar \
  --version
```
Not every Spring Boot application supports `--version`, so failure here does not necessarily mean the JAR is invalid. The real test is starting it through systemd with the required environment variables.

---
# Problem 8: Confirm all required files before starting
## Solution
Run:
```
sudo test -f /opt/pet-shop/pet-shop.jar \
  && echo "JAR exists" \
  || echo "JAR missing"
sudo test -f /etc/pet-shop/pet-shop.env \
  && echo "Environment file exists" \
  || echo "Environment file missing"
sudo test -f /etc/systemd/system/pet-shop.service \
  && echo "Service file exists" \
  || echo "Service file missing"
```
You need all three:
```
/opt/pet-shop/pet-shop.jar
/etc/pet-shop/pet-shop.env
/etc/systemd/system/pet-shop.service
```

---
# Problem 9: Start the service
## Solution
Reload systemd:
```
sudo systemctl daemon-reload
```
Enable the service at startup:
```
sudo systemctl enable pet-shop
```
Start it:
```
sudo systemctl start pet-shop
```
Check status:
```
sudo systemctl status pet-shop --no-pager
```
Expected:
```
Loaded: loaded
Active: active (running)
```
Check startup logs:
```
sudo journalctl -u pet-shop -n 150 --no-pager
```
Look for messages similar to:
```
The following profile is active: "prod"
Started PetShopApplication
Tomcat started on port 8080
```

---
# Problem 10: Test the application
## Solution
Confirm Java is listening on localhost port `8080`:
```
sudo ss -lntp | grep ':8080'
```
The expected address is:
```
127.0.0.1:8080
```
Test Actuator:
```
curl -i http://127.0.0.1:8080/actuator/health
```
Expected:
```
{"status":"UP"}
```

---
# Problem 11: Remove temporary SSH access
## Solution
After the JAR has been uploaded successfully, return to:
```
EC2
→ Security Groups
→ pet-shop-backend-sg
→ Inbound rules
→ Edit inbound rules
```
Delete the temporary rule:
```
SSH
TCP 22
My IP
```
Keep administration through Session Manager.
Do not leave:
```
SSH 22 from 0.0.0.0/0
```
open.
# Commands summary
On your Windows computer:
```
.\mvnw.cmd clean package
Copy-Item `
  .\target\YOUR_REAL_JAR_NAME.jar `
  .\pet-shop.jar
scp `
  -i "C:\path\to\pet-shop-backend-key.pem" `
  .\pet-shop.jar `
  ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/pet-shop.jar
```
On EC2 through Session Manager:
```
sudo mkdir -p /opt/pet-shop
sudo mv /home/ubuntu/pet-shop.jar \
  /opt/pet-shop/pet-shop.jar
sudo chown petshop:petshop \
  /opt/pet-shop/pet-shop.jar
sudo chmod 550 \
  /opt/pet-shop/pet-shop.jar
sudo ls -lh /opt/pet-shop/pet-shop.jar
sudo systemctl daemon-reload
sudo systemctl enable pet-shop
sudo systemctl start pet-shop
sudo systemctl status pet-shop --no-pager
sudo journalctl -u pet-shop -n 150 --no-pager
```
The important point is:
```
The missing JAR is not created on EC2.
You build it on your development computer,
then upload it to EC2.
```