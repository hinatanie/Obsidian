# Main Problem
Your new EC2 instance only contains Ubuntu. It does not yet have the software needed to run the Pet Shop Spring Boot backend.
You need to:
```
Connect to EC2 with Session Manager
Update Ubuntu packages
Install Java 21 runtime
Install Nginx
Install a MySQL client
Verify SSM Agent
Confirm every installation
```
You do **not** need Maven, Gradle, or a MySQL database server on EC2. Your Spring Boot application should be built into a JAR on your computer or in CI/CD, while MySQL runs in RDS.

---
## Problem 1: Connect to the EC2 server
## Solution
In the AWS Console, open:
```
EC2
→ Instances
→ Select pet-shop-backend-ec2
→ Connect
→ Session Manager
→ Connect
```
A terminal window should open.
Check which user you are using:
```
whoami
```
With Session Manager, it will commonly return:
```
ssm-user
```
Check the Ubuntu version:
```
cat /etc/os-release
```
You should see something similar to:
```
Ubuntu 24.04 LTS
```
Check the CPU architecture:
```
uname -m
```
For the x86 instance selected earlier, it should return:
```
x86_64
```

---
## Problem 2: Update Ubuntu package information
## Solution
Ubuntu keeps a local list of available software packages. A new instance may have an old package list, so update it before installing anything.
Run:
```
sudo apt update
```
Then install available security and package updates:
```
sudo apt upgrade -y
```
This may take a few minutes.
Afterward, remove unused package files:
```
sudo apt autoremove -y
```
You do not normally need to restart immediately unless Ubuntu reports that a reboot is required.
Check:
```
test -f /var/run/reboot-required && cat /var/run/reboot-required
```
When no output appears, no reboot is currently required.
When a reboot is required, run:
```
sudo reboot
```
The Session Manager terminal will disconnect. Wait approximately one or two minutes, then reconnect through Session Manager.

---
## Problem 3: Confirm which Java version the project requires
## Solution
Before installing Java, check the Pet Shop project configuration on your development computer.
For Maven, open:
```
pom.xml
```
Look for something similar to:
```
<properties>
    <java.version>21</java.version>
</properties>
```
You may also see:
```
<maven.compiler.release>21</maven.compiler.release>
```
For Gradle, open:
```
build.gradle
```
or:
```
build.gradle.kts
```
Look for:
```
JavaLanguageVersion.of(21)
```
Your runtime should support the Java version used to build the JAR.
For example:
```
JAR built with Java 21
        ↓
EC2 must run Java 21 or a compatible newer runtime
```
A Java 21 JAR will not run on Java 17. It typically fails with an error similar to:
```
UnsupportedClassVersionError
```

---
## Problem 4: Install the Java 21 runtime
## Solution
Because EC2 only needs to **run** the JAR, install the headless Java Runtime Environment:
```
sudo apt install -y openjdk-21-jre-headless
```
Ubuntu 24.04 supports OpenJDK 21, and the headless package avoids installing desktop graphical components that a server does not need.
Confirm the installation:
```
java -version
```
You should see output beginning with something similar to:
```
openjdk version "21..."
```
Also check where Java is installed:
```
readlink -f "$(which java)"
```
The result should be similar to:
```
/usr/lib/jvm/java-21-openjdk-amd64/bin/java
```
### Why use `jre-headless`?
The server needs:
```
java
Java standard runtime libraries
JVM
```
It does not need:
```
Java graphical desktop libraries
javac compiler
Development tools
```
Therefore, this is preferred:
```
sudo apt install -y openjdk-21-jre-headless
```
rather than:
```
sudo apt install -y openjdk-21-jdk
```
### When would the JDK be required?
Install a JDK only when you deliberately compile Java source code on the EC2 server.
That is not the recommended deployment flow for your project:
```
Development machine or CI
→ Test project
→ Build JAR
→ Upload tested JAR
→ EC2 runs JAR
```

---
## Problem 5: Install Nginx
## Solution
Nginx receives public requests on ports `80` and `443`, then forwards them internally to Spring Boot on port `8080`.
Install it:
```
sudo apt install -y nginx
```
Enable Nginx to start automatically whenever EC2 starts:
```
sudo systemctl enable nginx
```
Start it now:
```
sudo systemctl start nginx
```
Check its status:
```
sudo systemctl status nginx --no-pager
```
Look for:
```
Active: active (running)
```
Confirm the installed version:
```
nginx -v
```
The version is normally printed to standard error, but this is expected:
```
nginx version: nginx/...
```
Check whether it is listening on port `80`:
```
sudo ss -lntp | grep ':80'
```
You should see a line containing:
```
LISTEN
```
You can also test Nginx locally from inside EC2:
```
curl -I http://localhost
```
Expected output includes:
```
HTTP/1.1 200 OK
Server: nginx
```
The Ubuntu package is sufficient for this learning deployment. You do not need to add the separate official Nginx repository unless you specifically require a different Nginx release.
### Test through the browser
Copy the EC2 instance’s public IPv4 address from:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Public IPv4 address
```
Open:
```
http://YOUR_EC2_PUBLIC_IP
```
You should see the default Nginx page.
For this to work, `pet-shop-backend-sg` must allow:
```
Type: HTTP
Port: 80
Source: 0.0.0.0/0
```
Do not open Spring Boot port `8080` publicly.

---
## Problem 6: Install the MySQL client only
## Solution
Your MySQL database is in RDS, so EC2 only needs a client program for testing the database connection.
Do **not** install:
```
sudo apt install mysql-server
```
That would create another MySQL database directly on EC2, which is not your architecture.
Install only the Ubuntu MySQL client:
```
sudo apt install -y mysql-client
```
Confirm it:
```
mysql --version
```
You should see output similar to:
```
mysql  Ver 8...
```
Oracle also provides a dedicated MySQL APT repository, but the Ubuntu client package is simpler and sufficient for testing an RDS connection in this learning environment.
### If Ubuntu cannot find `mysql-client`
Run:
```
apt-cache search mysql-client
```
Then install the default metapackage:
```
sudo apt install -y default-mysql-client
```
Verify again:
```
mysql --version
```

---
## Problem 7: Verify the SSM Agent
## Solution
You are already connected through Session Manager, so SSM Agent is clearly installed and working.
Still, verify its service status:
```
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service --no-pager
```
You should see:
```
Active: active (running)
```
AWS-provided Ubuntu AMIs commonly include SSM Agent, and AWS documents the Snap-based service name for supported Ubuntu releases, including Ubuntu 24.04.
Enable it to start automatically:
```
sudo systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
```
### When the service is stopped
Start it with:
```
sudo snap start amazon-ssm-agent
```
Then check again:
```
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service --no-pager
```
### When SSM Agent is not installed
Only run this when the status command says the service does not exist:
```
sudo snap install amazon-ssm-agent --classic
```
Then start it:
```
sudo snap start amazon-ssm-agent
```
AWS documents Snap installation for Ubuntu 24.04 and other supported Ubuntu releases.
Because installing or restarting SSM Agent can interrupt your current Session Manager connection, do not reinstall it when your existing connection already works.

---
## Problem 8: Verify everything together
## Solution
Run:
```
java -version
mysql --version
nginx -v
```
Then check both services:
```
sudo systemctl is-active nginx
sudo systemctl is-active snap.amazon-ssm-agent.amazon-ssm-agent.service
```
Expected result:
```
active
active
```
Check enabled-at-boot status:
```
sudo systemctl is-enabled nginx
sudo systemctl is-enabled snap.amazon-ssm-agent.amazon-ssm-agent.service
```
Expected result:
```
enabled
enabled
```
You can run this combined verification block:
```
echo "=== Operating system ==="
cat /etc/os-release | grep PRETTY_NAME
echo "=== Architecture ==="
uname -m
echo "=== Java ==="
java -version
echo "=== MySQL client ==="
mysql --version
echo "=== Nginx ==="
nginx -v
sudo systemctl is-active nginx
echo "=== SSM Agent ==="
sudo systemctl is-active snap.amazon-ssm-agent.amazon-ssm-agent.service
```

---
## Problem 9: Understand what should not be installed
## Solution
Do not install Maven:
```
sudo apt install maven
```
Do not install Gradle:
```
sudo apt install gradle
```
Do not install MySQL Server:
```
sudo apt install mysql-server
```
The preferred deployment pipeline is:
```
Your development computer or CI/CD
        ↓
Run automated tests
        ↓
Build the executable Spring Boot JAR
        ↓
Upload the tested JAR to EC2
        ↓
Run the JAR with Java 21
```
Building directly on the production server creates several problems:
```
Requires more CPU, memory, and storage
Adds unnecessary development tools
Makes deployments less repeatable
May deploy code that was not tested
Makes rollback more difficult
```
The EC2 server should contain only what it needs to operate:
```
Java runtime
Nginx
MySQL client
SSM Agent
Spring Boot JAR
Configuration supplied through environment variables or secure AWS services
```

---
# Commands to Run
You can execute these commands one block at a time:
```
# Update Ubuntu
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
# Install Java 21 runtime, Nginx and the MySQL client
sudo apt install -y openjdk-21-jre-headless nginx mysql-client
# Enable and start Nginx
sudo systemctl enable --now nginx
# Verify installed software
java -version
mysql --version
nginx -v
# Verify services
sudo systemctl status nginx --no-pager
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service --no-pager
# Test Nginx locally
curl -I http://localhost
```
If `mysql-client` is unavailable, replace only that installation with:
```
sudo apt install -y default-mysql-client
```
# Completion Checklist
```
[ ] Connect through Session Manager
[ ] Confirm Ubuntu version and CPU architecture
[ ] Run apt update
[ ] Install available Ubuntu updates
[ ] Install openjdk-21-jre-headless
[ ] Confirm java -version shows Java 21
[ ] Install Nginx
[ ] Enable and start Nginx
[ ] Confirm Nginx is active
[ ] Confirm the public IP displays the Nginx page
[ ] Install only the MySQL client
[ ] Confirm mysql --version works
[ ] Confirm SSM Agent is active
[ ] Do not install MySQL Server
[ ] Do not install Maven or Gradle
```