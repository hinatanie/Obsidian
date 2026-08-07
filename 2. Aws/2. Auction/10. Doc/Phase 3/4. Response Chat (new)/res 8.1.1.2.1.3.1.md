# Main Problem
The public IP is correct, but this error:
```
ssh: connect to host 54.179.121.250 port 22: Connection timed out
```
means **port 22 is still blocked somewhere before SSH reaches Ubuntu**.
Your `.pem` file and `scp` command have not been checked yet, because the connection fails before authentication begins.
## Problem 1: Test port 22 directly
Run this in PowerShell:
```
Test-NetConnection 54.179.121.250 -Port 22
```
Look for:
```
TcpTestSucceeded : True
```
Your current result will probably be:
```
TcpTestSucceeded : False
```
Do not retry `scp` until it becomes `True`.

---
## Problem 2: Confirm the correct security group is attached
In AWS Console, open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Security
```
Look under:
```
Security groups
```
Confirm the attached group is:
```
pet-shop-backend-sg
```
Click that exact security group.
Then open:
```
Inbound rules
→ Edit inbound rules
→ Add rule
```
Add:
```
Type: SSH
Protocol: TCP
Port range: 22
Source: My IP
Description: Temporary JAR upload
```
Then select:
```
Save rules
```
The result should look similar to:
```
SSH | TCP | 22 | 113.161.86.112/32
```
Do not use your laptop’s local IP, such as:
```
192.168.x.x
10.x.x.x
```
The rule must use your internet-facing public IP. AWS security groups must explicitly allow inbound SSH before the connection can succeed.

---
## Problem 3: Refresh the “My IP” value
Your public internet IP may have changed since you created the rule.
In the SSH inbound rule:
1. Delete the existing SSH rule.
2. Add it again.
3. Select **My IP**.
4. Save the rule.
Temporarily disconnect any VPN before doing this, because the IP detected by AWS must match the connection source used by PowerShell.
Then rerun:
```
Test-NetConnection 54.179.121.250 -Port 22
```

---
## Problem 4: Confirm the subnet has an Internet Gateway route
Open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Networking
```
Click the subnet:
```
pet-shop-public-subnet-1
```
Open its **Route table**.
It must contain:
```
Destination: 0.0.0.0/0
Target: igw-xxxxxxxx
```
It should also contain the local VPC route, for example:
```
10.0.0.0/16 → local
```
A public IPv4 address alone is not sufficient. The subnet also needs a default route to an Internet Gateway attached to the VPC.
Also verify:
```
VPC
→ Internet gateways
→ pet-shop-igw
```
Its state should show that it is attached to:
```
pet-shop-vpc
```

---
## Problem 5: Check the subnet network ACL
Open:
```
VPC
→ Subnets
→ pet-shop-public-subnet-1
→ Network ACL
```
When using the default network ACL, it usually allows all inbound and outbound traffic.
A custom network ACL must allow at least:
```
Inbound:
TCP 22 from YOUR_PUBLIC_IP/32
Outbound:
TCP 1024-65535 to YOUR_PUBLIC_IP/32
```
Network ACLs are stateless, so response traffic must also be explicitly permitted. AWS identifies inbound port `22` and outbound ephemeral ports as required for SSH connectivity.
For your learning VPC, using the default allow-all network ACL is simpler unless you intentionally created custom restrictions.

---
## Problem 6: Confirm SSH is running inside Ubuntu
Because Session Manager works, connect through:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Connect
→ Session Manager
→ Connect
```
Then run:
```
sudo systemctl status ssh --no-pager
```
Expected:
```
Active: active (running)
```
If it is not installed or running:
```
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```
Confirm port `22` is listening:
```
sudo ss -lntp | grep ':22'
```
Expected:
```
LISTEN ... 0.0.0.0:22
```
Also check UFW:
```
sudo ufw status
```
Your earlier output showed:
```
Status: inactive
```
so UFW is not currently causing this timeout.

---
## Problem 7: Confirm the key pair belongs to this EC2 instance
In AWS Console, select:
```
pet-shop-backend-ec2
```
Find:
```
Key pair name
```
It must match the key file you are using:
```
pet-shop-backend-key
```
with:
```
C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem
```
A wrong key normally causes:
```
Permission denied (publickey)
```
It does **not** cause a timeout, so fix port `22` first.

---
## Problem 8: Retry SSH before SCP
After:
```
Test-NetConnection 54.179.121.250 -Port 22
```
returns:
```
TcpTestSucceeded : True
```
test SSH:
```
ssh -vvv `
  -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ubuntu@54.179.121.250
```
The `-vvv` option shows detailed connection diagnostics.
When SSH connects successfully, exit:
```
exit
```
Then retry:
```
scp `
  -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ".\pet-shop.jar" `
  ubuntu@54.179.121.250:/home/ubuntu/pet-shop.jar
```

---
# Check these in order
```
[ ] EC2 state is Running
[ ] Public IPv4 is 54.179.121.250
[ ] pet-shop-backend-sg is attached to this EC2 instance
[ ] SSH port 22 allows your current public IP/32
[ ] The subnet route table has 0.0.0.0/0 → Internet Gateway
[ ] Internet Gateway is attached to pet-shop-vpc
[ ] Network ACL permits SSH and return traffic
[ ] ssh.service is active inside Ubuntu
[ ] Port 22 is listening
[ ] The EC2 key-pair name matches your PEM file
```
Since Session Manager already works, you can also avoid opening inbound port `22` entirely by tunnelling SSH/SCP through Session Manager. AWS supports file copy through SCP over a Session Manager SSH session, without a publicly open SSH port, although it requires AWS CLI and Session Manager plugin configuration.