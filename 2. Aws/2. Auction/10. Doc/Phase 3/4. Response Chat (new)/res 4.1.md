# Main Problem
Nginx is running inside EC2, but your browser cannot reach it unless all parts of this path are working:
```
Your browser
    ↓ HTTP port 80
EC2 public IPv4 address
    ↓
pet-shop-backend-sg
    ↓
Nginx running on EC2
```
Follow these steps in order.
## Problem 1: Confirm Nginx is running
## Solution
Connect to the EC2 instance through Session Manager:
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
sudo systemctl status nginx --no-pager
```
You should see:
```
Active: active (running)
```
Then test Nginx from inside the EC2 server:
```
curl -I http://localhost
```
Expected result:
```
HTTP/1.1 200 OK
Server: nginx
```
If Nginx is not running, start it:
```
sudo systemctl enable --now nginx
```

---
## Problem 2: Add HTTP port 80 to the security group
## Solution
In the AWS Console, open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
```
Select the **Security** tab.
Under **Security groups**, click:
```
pet-shop-backend-sg
```
Then open:
```
Inbound rules
→ Edit inbound rules
```
Select:
```
Add rule
```
Configure the new rule:
```
Type: HTTP
Protocol: TCP
Port range: 80
Source type: Anywhere-IPv4
Source: 0.0.0.0/0
Description: Public HTTP access to Nginx
```
Then select:
```
Save rules
```
AWS security groups act as virtual firewalls. An inbound HTTP rule on TCP port `80` from `0.0.0.0/0` allows any IPv4 client to reach the web server.
Your inbound rules may look like:
```
Type    Port    Source
HTTP    80      0.0.0.0/0
```
You do not need this rule:
```
Custom TCP
8080
0.0.0.0/0
```
Port `8080` should remain private because Nginx will later forward requests to Spring Boot internally.

---
## Problem 3: Find the EC2 public IPv4 address
## Solution
Return to:
```
EC2
→ Instances
```
Select:
```
pet-shop-backend-ec2
```
In the instance details, find:
```
Public IPv4 address
```
It should look similar to:
```
13.229.123.45
```
Do not copy:
```
Private IPv4 address
```
The private address often looks like:
```
10.0.1.123
```
A private address cannot normally be opened directly from your laptop over the public internet.
AWS displays the public IPv4 address from the EC2 **Instances** page or the instance details page.

---
## Problem 4: Open the address correctly
## Solution
In your browser address bar, enter:
```
http://54.179.121.250
```
Replace the example with your actual public IPv4 address.
Do not use HTTPS yet:
```
https://54.179.121.250
```
HTTPS will not work until you configure:
```
A domain
TLS certificate
Nginx port 443 configuration
```
You should see a page similar to:
```
Welcome to nginx!
```
That confirms:
```
Public IPv4 works
Security group allows port 80
Public subnet routing works
Nginx is running
```

---
## Problem 5: Check that the instance has a public IPv4 address
## Solution
If the **Public IPv4 address** field is blank, your instance does not currently have a public address.
Check:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Networking
```
You should see both:
```
Private IPv4 address: 10.0.1.97
Public IPv4 address: 54.179.121.250
```
If no public IPv4 exists, merely opening port `80` will not make the server reachable from the internet.
For a new learning instance, the easiest correction may be to relaunch it with:
```
Network settings
→ Auto-assign public IP
→ Enable
```
A public IPv4 address assigned automatically can change after the instance is stopped and started.

---
## Problem 6: Check the public subnet route
## Solution
If Nginx works through `localhost` but the public IP still times out, verify that the subnet is truly public.
Open:
```
VPC
→ Subnets
→ pet-shop-public-subnet-1
→ Route table
```
The associated route table should contain:
```
Destination: 10.0.0.0/16
Target: local
```
and:
```
Destination: 0.0.0.0/0
Target: pet-shop-igw
```
The important route is:
```
0.0.0.0/0 → Internet Gateway
```
Without this route, the EC2 instance may have a public IPv4 address but still cannot communicate correctly with the public internet.

---
## Problem 7: Check the Ubuntu firewall
## Solution
Ubuntu may also have its own firewall.
Run:
```
sudo ufw status
```
If the result is:
```
Status: inactive
```
then UFW is not blocking Nginx.
If it is active, allow Nginx HTTP traffic:
```
sudo ufw allow 'Nginx HTTP'
```
Then verify:
```
sudo ufw status
```
You should see a rule allowing port `80`.

---
## Problem 8: Confirm Nginx is listening publicly
## Solution
Run:
```
sudo ss -lntp | grep ':80'
```
A correct result should contain something similar to:
```
LISTEN 0 511 0.0.0.0:80
```
or:
```
LISTEN 0 511 *:80
```
This means Nginx accepts connections on port `80`.
If it only listens on:
```
127.0.0.1:80
```
then remote browsers cannot reach it. The default Ubuntu Nginx configuration normally listens on all interfaces.

---
# Final Test
Run these commands on EC2:
```
sudo systemctl is-active nginx
curl -I http://localhost
sudo ss -lntp | grep ':80'
```
Expected:
```
active
HTTP/1.1 200 OK
LISTEN ... :80
```
Then confirm the AWS configuration:
```
EC2 state: Running
Public IPv4 address: Present
Security group inbound: HTTP TCP 80 from 0.0.0.0/0
Subnet route: 0.0.0.0/0 → Internet Gateway
```
Finally, open:
```
http://YOUR_PUBLIC_IPV4
```
Do not open:
```
http://YOUR_PRIVATE_IPV4
http://YOUR_PUBLIC_IPV4:8080
https://YOUR_PUBLIC_IPV4
```
At this stage, the correct address is only:
```
http://YOUR_PUBLIC_IPV4
```