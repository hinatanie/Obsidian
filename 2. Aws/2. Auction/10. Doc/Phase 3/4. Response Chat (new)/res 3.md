# Main Problem
You need to launch an Ubuntu EC2 server inside `pet-shop-vpc` for the Pet Shop Spring Boot backend.
The server should:
```
Run Java and the Spring Boot JAR
Connect to RDS MySQL
Receive web requests through Nginx
Use Session Manager for administration
Avoid exposing SSH permanently
```
Before continuing, confirm these resources already exist:
```
pet-shop-vpc
pet-shop-public-subnet-1
pet-shop-backend-sg
pet-shop-backend-ec2-role
```
Your IAM role should contain the AWS-managed policy:
```
AmazonSSMManagedInstanceCore
```
An EC2 instance needs this permission to register with Systems Manager and accept Session Manager connections.

---
## Problem 1: Open the EC2 launch page
## Solution
1. Sign in using your IAM user.
2. Confirm the AWS Region is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
3. Search for:
```
EC2
```
4. Open:
```
EC2
→ Instances
→ Launch instances
```

---
## Problem 2: Enter the EC2 server name
## Solution
Under **Name and tags**, enter:
```
Name: pet-shop-backend-ec2
```
This name is only an AWS tag that helps you identify the server.

---
## Problem 3: Select the Ubuntu operating system
## Solution
Under **Application and OS Images**, choose:
```
Ubuntu
```
Select the current Ubuntu Server LTS image offered by AWS, preferably:
```
Ubuntu Server 24.04 LTS
Architecture: 64-bit (x86)
```
Choose an image marked similar to:
```
Free tier eligible
```
For your first deployment, use **x86_64** because it is generally the simplest option for Java, Docker, monitoring agents, and third-party native libraries.
### Important correction about Java architecture
A normal Spring Boot JAR contains Java bytecode and is usually not tied directly to x86 or ARM.
The architecture that must match is:
```
EC2 instance architecture
        ↕
Ubuntu AMI architecture
        ↕
Installed Java runtime architecture
```
For example:
```
t3.micro
→ x86_64 Ubuntu
→ x86_64 Java runtime
```
Or:
```
t4g.micro
→ ARM64 Ubuntu
→ ARM64 Java runtime
```
Your JAR may become architecture-dependent only when it uses native binaries or architecture-specific libraries.
For this guide, choose:
```
Architecture: 64-bit (x86)
```

---
## Problem 4: Select the instance type
## Solution
Under **Instance type**, select:
```
t3.micro
```
A `t3.micro` is a practical starting point for:
```
Learning AWS
Running Nginx
Running one small Spring Boot application
Testing an RDS connection
Low traffic
```
AWS currently includes several instance types under its newer Free Tier credit model, depending on account eligibility and creation date. Free Tier does not necessarily mean the resource can never generate charges, so continue monitoring your AWS budget.
### Why not start with `t4g.micro`?
`t4g.micro` uses an ARM-based AWS Graviton processor, while `t3.micro` uses x86. ARM can be cheaper, but x86 reduces compatibility decisions while you are learning.
Use:
```
Instance type: t3.micro
Architecture: x86_64
```
If Spring Boot repeatedly runs out of memory later, you can stop the instance and change it to:
```
t3.small
```
Do not select `t3.small` immediately unless your application actually needs the additional memory.

---
## Problem 5: Configure the key pair
## Solution
Session Manager should be your normal administration method. However, a key pair can be retained as an emergency SSH fallback.
Under **Key pair**, choose one of these approaches.
### Recommended learning approach
Create a key pair:
```
Key pair name: pet-shop-backend-key
Key pair type: RSA
Private key file format: .pem
```
Download the file and store it securely.
Do not:
```
Upload it to GitHub
Commit it to your project
Send it through chat
Put it inside the Spring Boot source folder
```
The key pair existing does not automatically expose SSH. SSH becomes reachable only when the security group allows inbound port `22`.
You can therefore retain the key while keeping port `22` closed.

---
## Problem 6: Configure the EC2 network
## Solution
Next to **Network settings**, select:
```
Edit
```
Configure:
```
VPC: pet-shop-vpc
Subnet: pet-shop-public-subnet-1
Auto-assign public IP: Enable
```
AWS allows you to override the subnet’s default public-IP behavior during instance launch.
The complete network path should be:
```
Internet
   ↓
Internet Gateway
   ↓
Public route table
   ↓
pet-shop-public-subnet-1
   ↓
pet-shop-backend-ec2
```
The subnet must have a route similar to:
```
Destination: 0.0.0.0/0
Target: pet-shop-igw
```
Without that route, merely enabling a public IPv4 address will not make the instance internet-accessible.
### Public IPv4 warning
A normal automatically assigned public IPv4 address may change when the instance is stopped and started.
Public IPv4 addresses can also generate AWS charges. Keep your budget alerts active.

---
## Problem 7: Attach the existing security group
## Solution
Under **Firewall**, choose:
```
Select existing security group
```
Select:
```
pet-shop-backend-sg
```
Do not allow the wizard to create another generic security group unless necessary.
Your security group should eventually contain:
```
HTTP
Port: 80
Source: 0.0.0.0/0
Purpose: Public Nginx HTTP traffic
```
```
HTTPS
Port: 443
Source: 0.0.0.0/0
Purpose: Public secure traffic
```
For IPv6, add equivalent `::/0` rules only when you have intentionally configured IPv6.
### Do not expose Spring Boot directly
Avoid this permanent rule:
```
Custom TCP
Port: 8080
Source: 0.0.0.0/0
```
The preferred connection is:
```
Internet
   ↓
Nginx: 80 or 443
   ↓
Spring Boot: 127.0.0.1:8080
```
Spring Boot port `8080` should normally remain accessible only inside the EC2 server.
### SSH rule
For normal administration, do not add SSH now:
```
SSH
Port: 22
Source: 0.0.0.0/0
```
That would expose SSH to the entire internet.
For temporary emergency SSH access, add:
```
Type: SSH
Port: 22
Source: My IP
Description: Temporary SSH access
```
After finishing, delete that rule.
Never use:
```
SSH port 22
Source: 0.0.0.0/0
```

---
## Problem 8: Configure the EBS storage
## Solution
Under **Configure storage**, use:
```
Volume type: gp3
Size: 10 GiB
Delete on termination: Yes
Encrypted: Yes
```
A `10 GiB` General Purpose SSD volume is sufficient for an initial learning server containing:
```
Ubuntu
Java runtime
Spring Boot JAR
Nginx
Application logs
Basic deployment files
```
Keep your MySQL data in RDS, not on the EC2 root volume.
### Delete on termination
Use:
```
Delete on termination: Yes
```
for this replaceable learning server.
That means when you terminate the EC2 instance, AWS can also delete its root EBS volume.
Remember:
```
Stop instance
→ EBS volume remains
→ EBS storage may still cost money
```
```
Terminate instance
→ Root EBS volume is deleted when Delete on termination is enabled
```

---
## Problem 9: Attach the EC2 IAM role
## Solution
Open:
```
Advanced details
```
Find:
```
IAM instance profile
```
Select:
```
pet-shop-backend-ec2-role
```
This is the role that the applications and AWS agents running inside EC2 can use.
The role should have:
```
AmazonSSMManagedInstanceCore
```
Do not store permanent AWS access keys on the server.
Correct:
```
EC2
→ IAM role
→ Temporary credentials
→ AWS services
```
Incorrect:
```
AWS_ACCESS_KEY_ID=permanent-key
AWS_SECRET_ACCESS_KEY=permanent-secret
```
Session Manager requires the instance to be managed by Systems Manager and to have suitable instance permissions.

---
## Problem 10: Protect the instance metadata service
## Solution
Still under **Advanced details**, locate the metadata settings.
Use:
```
Metadata accessible: Enabled
Metadata version: V2 only
```
This requires applications to use IMDSv2 when retrieving temporary IAM-role credentials and instance metadata.
Do not disable metadata completely because the EC2 IAM role depends on the instance metadata service to provide temporary credentials to software on the instance.

---
## Problem 11: Review and launch the instance
## Solution
Review the summary:
```
Name: pet-shop-backend-ec2
AMI: Ubuntu Server LTS
Architecture: x86_64
Instance type: t3.micro
Key pair: pet-shop-backend-key
VPC: pet-shop-vpc
Subnet: pet-shop-public-subnet-1
Public IPv4: Enabled
Security group: pet-shop-backend-sg
Storage: 10 GiB gp3
IAM role: pet-shop-backend-ec2-role
Metadata: IMDSv2 only
```
Select:
```
Launch instance
```
Then open:
```
View all instances
```
Wait until you see:
```
Instance state: Running
Status checks: 2/2 checks passed
```

---
## Problem 12: Connect through Session Manager
## Solution
Ubuntu AWS-provided AMIs normally have SSM Agent preinstalled, although you should still verify that your selected image is supported and the agent is running.
After the instance is running:
1. Open:
```
EC2
→ Instances
```
2. Select:
```
pet-shop-backend-ec2
```
3. Select:
```
Connect
```
4. Open:
```
Session Manager
```
5. Select:
```
Connect
```
AWS officially supports starting a browser-based shell this way.
You should see a terminal similar to:
```
sh-5.1$
```
or:
```
ssm-user@ip-10-0-1-xxx
```
Test it:
```
whoami
pwd
uname -m
cat /etc/os-release
```
For an x86 instance, this should return something similar to:
```
x86_64
```

---
## Problem 13: Fix Session Manager when it does not connect
## Solution
If the Session Manager tab says that the instance is not connected, check these items.
### Check 1: IAM role
Confirm:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Security
→ IAM role
```
It should show:
```
pet-shop-backend-ec2-role
```
Open the role and verify that it includes:
```
AmazonSSMManagedInstanceCore
```
### Check 2: Internet path
Because this EC2 instance is using a public subnet rather than private Systems Manager VPC endpoints, it needs outbound internet access:
```
EC2 public IPv4
        ↓
Public subnet route table
        ↓
0.0.0.0/0 → Internet Gateway
        ↓
AWS Systems Manager endpoints
```
The security group should allow outbound HTTPS:
```
Type: HTTPS
Port: 443
Destination: 0.0.0.0/0
```
The default outbound rule allowing all traffic also works for the learning environment.
### Check 3: SSM Agent
Use temporary SSH only when Session Manager is unavailable and you must diagnose the server.
Then check:
```
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service
```
If the service exists but is stopped:
```
sudo systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
```
AWS requires an appropriate SSM Agent version for Session Manager functionality.

---
# Final Configuration
Your completed server should look like this:
```
pet-shop-vpc
│
├── pet-shop-public-subnet-1
│   │
│   └── pet-shop-backend-ec2
│       ├── Ubuntu Server 24.04 LTS x86_64
│       ├── t3.micro
│       ├── 10 GiB gp3 EBS
│       ├── Public IPv4
│       ├── pet-shop-backend-sg
│       └── pet-shop-backend-ec2-role
│
└── Private RDS subnets
    └── Pet Shop MySQL database
```
Administration path:
```
Your AWS Console
        ↓
Systems Manager Session Manager
        ↓
SSM Agent
        ↓
pet-shop-backend-ec2
```
Application path after deployment:
```
Browser
   ↓
EC2 public IPv4 or domain
   ↓
Nginx: 80/443
   ↓
Spring Boot: localhost:8080
   ↓
RDS MySQL: 3306
```
## Checklist
```
[ ] Select Singapore ap-southeast-1
[ ] Name the instance pet-shop-backend-ec2
[ ] Choose Ubuntu Server LTS x86_64
[ ] Choose t3.micro
[ ] Create or select pet-shop-backend-key
[ ] Select pet-shop-vpc
[ ] Select pet-shop-public-subnet-1
[ ] Enable public IPv4
[ ] Select pet-shop-backend-sg
[ ] Do not expose port 8080 publicly
[ ] Do not expose SSH to 0.0.0.0/0
[ ] Configure a 10 GiB gp3 encrypted EBS volume
[ ] Attach pet-shop-backend-ec2-role
[ ] Require IMDSv2
[ ] Launch the instance
[ ] Wait for 2/2 status checks
[ ] Connect using Session Manager
```