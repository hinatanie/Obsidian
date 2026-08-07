Your screenshot confirms only these three things:
```
EC2 is running
Public IPv4 is 54.179.121.250
Private IPv4 is 10.0.1.97
```
It does **not** confirm that SSH port `22` is open. A timeout means the traffic is being blocked before SSH authentication starts. The most likely cause is the EC2 security-group inbound rule.
# Problem 1: Check the security group attached to this exact instance
Open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Security
```
Under **Security groups**, click the security group attached to this instance, probably:
```
pet-shop-backend-sg
```
Do not search for the group separately by name. Click it from the instance’s **Security** tab so you know you are editing the correct one.
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
Save the rules.
The result should look similar to:
```
SSH
TCP
22
YOUR_PUBLIC_IP/32
```
AWS requires an inbound SSH rule from your computer’s public IP for a direct internet SSH connection.
Do not use:
```
0.0.0.0/0
```
for SSH.
# Problem 2: Test port 22 before using SCP
After saving the rule, run this in PowerShell:
```
Test-NetConnection 54.179.121.250 -Port 22
```
You need:
```
TcpTestSucceeded : True
```
When it is still:
```
TcpTestSucceeded : False
```
do not retry `scp` yet. Port `22` is still inaccessible.
# Problem 3: Make sure “My IP” matches your current connection
Your public IP may change because of:
```
Router reconnection
Changing Wi-Fi
VPN
Mobile hotspot
ISP address changes
```
Delete the existing SSH rule and add it again using:
```
Source: My IP
```
Make sure your VPN is either consistently enabled or consistently disabled while both creating the rule and running `scp`.
# Problem 4: Confirm SSH runs inside Ubuntu
Because Session Manager works, connect using:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Connect
→ Session Manager
→ Connect
```
Run:
```
sudo systemctl status ssh --no-pager
```
Expected:
```
Active: active (running)
```
Also run:
```
sudo ss -lntp | grep ':22'
```
Expected:
```
LISTEN ... 0.0.0.0:22
```
If SSH is not installed or not running:
```
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```
Your earlier UFW result was `inactive`, so UFW is not currently blocking port `22`.
# Problem 5: Confirm the public subnet route
Open:
```
VPC
→ Subnets
→ pet-shop-public-subnet-1
→ Route table
```
The route table must contain:
```
10.0.0.0/16 → local
0.0.0.0/0 → igw-xxxxxxxx
```
The Internet Gateway must be attached to:
```
pet-shop-vpc
```
A public IPv4 address works for inbound internet connections only when the subnet has an internet route.
Because you can already display Nginx through the public IP, this route is probably correct. That makes the missing SSH security-group rule even more likely.
# Problem 6: Retry in the correct order
First:
```
Test-NetConnection 54.179.121.250 -Port 22
```
When it returns `True`, test SSH:
```
ssh -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ubuntu@54.179.121.250
```
When SSH succeeds, exit:
```
exit
```
Then upload:
```
scp -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ".\pet-shop.jar" `
  ubuntu@54.179.121.250:/home/ubuntu/pet-shop.jar
```
Your `scp` command is correct. The failure is currently caused by port `22` not being reachable.
After the upload succeeds, remove the temporary SSH inbound rule and continue using Session Manager.