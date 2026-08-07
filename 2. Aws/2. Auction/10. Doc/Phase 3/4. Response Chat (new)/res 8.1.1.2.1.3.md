# Main Problem
This error:
```
ssh: connect to host 54.179.121.250 port 22: Connection timed out
```
means your computer cannot reach SSH port `22` on the EC2 instance.
This is a network-access problem, not a problem with:
```
pet-shop.jar
the .pem file
the scp command syntax
```
For public SSH, the instance needs a public IPv4 address, a public subnet route to an Internet Gateway, and an inbound security-group rule allowing TCP port `22` from your current public IP.
## Problem 1: Check whether the IP address is correct
## Solution
In AWS Console, open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
```
Copy the current value from:
```
Public IPv4 address
```
Confirm that it is still:
```
54.179.121.250
```
A normal auto-assigned public IPv4 can change after stopping and starting the instance.
Then retry using the current IP:
```
scp -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ".\pet-shop.jar" `
  ubuntu@54.179.121.250:/home/ubuntu/pet-shop.jar
```
## Problem 2: Add temporary SSH access to the correct security group
## Solution
Open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Security
```
Under **Security groups**, click:
```
pet-shop-backend-sg
```
Then:
```
Inbound rules
→ Edit inbound rules
→ Add rule
```
Configure:
```
Type: SSH
Protocol: TCP
Port range: 22
Source: My IP
Description: Temporary JAR upload
```
Select:
```
Save rules
```
AWS recommends restricting SSH to your own public IP rather than allowing the entire internet.
Your inbound rules should temporarily include:
```
HTTP    TCP 80    0.0.0.0/0
SSH     TCP 22    YOUR_PUBLIC_IP/32
```
Do not select:
```
Anywhere-IPv4
0.0.0.0/0
```
for SSH.
### Important
Make sure you edited the security group actually attached to:
```
pet-shop-backend-ec2
```
It is possible to edit another security group with a similar name and see no effect.
## Problem 3: Check whether “My IP” is still your current IP
## Solution
Your public IP can change when:
```
Your router reconnects
You change Wi-Fi
You enable or disable a VPN
Your ISP rotates your address
```
In the security-group inbound rule, select **My IP** again and save it.
The source should look similar to:
```
113.161.25.40/32
```
Do not use your laptop’s private IP, such as:
```
192.168.1.10
10.0.0.5
```
## Problem 4: Confirm that EC2 has a public network path
## Solution
Open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Networking
```
Confirm:
```
Public IPv4 address: Present
Subnet: pet-shop-public-subnet-1
```
Then open:
```
VPC
→ Subnets
→ pet-shop-public-subnet-1
→ Route table
```
The route table must contain:
```
Destination: 0.0.0.0/0
Target: igw-xxxxxxxx
```
The Internet Gateway must also be attached to:
```
pet-shop-vpc
```
A public IPv4 address alone is not enough; the subnet also needs a route through an Internet Gateway.
## Problem 5: Test port 22 from PowerShell
## Solution
After saving the SSH rule, run:
```
Test-NetConnection 54.179.121.250 -Port 22
```
Replace the IP if it has changed.
Successful output should include:
```
TcpTestSucceeded : True
```
If it says:
```
TcpTestSucceeded : False
```
do not retry `scp` yet. Port `22` is still unreachable.
Check again:
```
[ ] EC2 is Running
[ ] Current public IP is correct
[ ] SSH rule is attached to pet-shop-backend-sg
[ ] SSH source matches your current internet IP
[ ] Public subnet has 0.0.0.0/0 → Internet Gateway
[ ] Network ACL does not block port 22
```
## Problem 6: Retry SSH before retrying SCP
## Solution
First test a normal SSH connection:
```
ssh -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ubuntu@54.179.121.250
```
The first successful connection may display:
```
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```
Enter:
```
yes
```
When SSH works, exit:
```
exit
```
Then upload:
```
scp -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ".\pet-shop.jar" `
  ubuntu@54.179.121.250:/home/ubuntu/pet-shop.jar
```
## Problem 7: Check the Ubuntu username
## Solution
For an official Ubuntu AMI, this is normally correct:
```
ubuntu
```
Therefore:
```
ubuntu@54.179.121.250
```
is likely correct.
A wrong username normally produces authentication errors such as:
```
Permission denied
```
It does not usually produce a port-22 timeout. Your current error occurs before username or key authentication begins.
## Problem 8: Use Session Manager instead of opening SSH
## Solution
Because Session Manager is already working, you can avoid exposing port `22`. AWS supports SSH and SCP tunneled through Session Manager, but this requires the AWS CLI, Session Manager plugin, SSH configuration, the correct IAM permissions, and a suitable SSM Agent version.
For your current learning deployment, the simpler alternatives are:
```
Option A: Temporarily allow SSH from My IP
Option B: Upload the JAR to a private S3 bucket, then download it from EC2 using its IAM role
```
Option A is quicker right now.
## Problem 9: After the upload succeeds
## Solution
From Session Manager, run:
```
sudo ls -lh /home/ubuntu/pet-shop.jar
```
Then move it:
```
sudo mkdir -p /opt/pet-shop
sudo mv /home/ubuntu/pet-shop.jar \
  /opt/pet-shop/pet-shop.jar
sudo chown petshop:petshop \
  /opt/pet-shop/pet-shop.jar
sudo chmod 550 \
  /opt/pet-shop/pet-shop.jar
```
Verify:
```
sudo ls -lh /opt/pet-shop/pet-shop.jar
```
Then remove the temporary SSH rule:
```
EC2
→ Security Groups
→ pet-shop-backend-sg
→ Inbound rules
→ Edit inbound rules
→ Delete SSH port 22 rule
→ Save rules
```
## Run these checks now
In PowerShell:
```
Test-NetConnection 54.179.121.250 -Port 22
```
If it returns `True`:
```
ssh -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ubuntu@54.179.121.250
```
Then:
```
scp -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ".\pet-shop.jar" `
  ubuntu@54.179.121.250:/home/ubuntu/pet-shop.jar
```
Your command is formatted correctly. The immediate fix is to make TCP port `22` reachable from your current public IP.