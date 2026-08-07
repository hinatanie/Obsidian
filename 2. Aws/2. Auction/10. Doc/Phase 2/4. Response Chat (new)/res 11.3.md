# Main Problem
Before Session Manager can open a terminal, the EC2 instance must have **SSM Agent installed and running**.
The connection works like this:
```
AWS Systems Manager
        ↕ HTTPS 443
SSM Agent on EC2
        ↓
pet-shop-backend-ec2-role
```
For a new Amazon Linux 2023 instance, SSM Agent is commonly already installed. Your first action should be to try Session Manager directly before using SSH. AWS requires a supported SSM Agent version on the instance for Session Manager.
# Problem 11.5: Make sure SSM Agent is available
## Solution
## Step 1: Try Session Manager first
After the EC2 instance is running, open:
```
EC2
→ Instances
```
Select your Pet Shop backend instance, then choose:
```
Connect
→ Session Manager
```
Check whether the **Connect** button is available.
### When Connect works
Select:
```
Connect
```
A browser terminal should open.
Run:
```
whoami
```
You may see:
```
ssm-user
```
This confirms that:
```
SSM Agent is installed
SSM Agent is running
The IAM role is working
The instance can reach Systems Manager
Your IAM user can start a session
```
You do not need SSH to check the agent in this situation.

---
## Step 2: Check which operating system you launched
On the EC2 instance details page, look for:
```
AMI name
Platform details
```
You will probably see one of these:
```
Amazon Linux 2023
Amazon Linux 2
Ubuntu
```
Use the commands for your operating system.
# For Amazon Linux 2023 or Amazon Linux 2
## Step 3: Open a terminal temporarily
When Session Manager is not working yet, connect temporarily using one available method:
```
EC2 Instance Connect
```
or:
```
SSH with pet-shop-backend-key.pem
```
For SSH, port `22` must temporarily be allowed from your current public IP only:
```
SSH
TCP 22
your-current-public-IP/32
```
Do not allow:
```
SSH 22 from 0.0.0.0/0
```

---
## Step 4: Check the agent status
Run:
```
sudo systemctl status amazon-ssm-agent
```
A healthy result should contain:
```
Active: active (running)
```
Press:
```
q
```
to exit the status screen.
AWS documents `systemctl` commands for checking and starting SSM Agent on supported Linux systems.

---
## Step 5: Start the agent if it is stopped
When the output shows something such as:
```
inactive
```
or:
```
dead
```
run:
```
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
```
Then verify again:
```
sudo systemctl status amazon-ssm-agent
```
You want:
```
Active: active (running)
```
The `enable` command makes the agent start automatically after the EC2 instance reboots.

---
## Step 6: Restart the agent after attaching the IAM role
When you attached `pet-shop-backend-ec2-role` after launching the instance, restart the agent:
```
sudo systemctl restart amazon-ssm-agent
```
Then check:
```
sudo systemctl status amazon-ssm-agent
```

---
## Step 7: Check whether the package is installed
When AWS returns:
```
Unit amazon-ssm-agent.service could not be found
```
the agent is probably not installed.
For Amazon Linux 2023 or Amazon Linux 2, first try:
```
sudo yum install -y amazon-ssm-agent
```
Then run:
```
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
sudo systemctl status amazon-ssm-agent
```
AWS also provides manual installation procedures for Amazon Linux 2 and Amazon Linux 2023 when the agent is missing.
# For Ubuntu
## <mark style="background: #FFB86CA6;">Step 3: Check the Snap-based service</mark>
Connect temporarily to the Ubuntu instance and run:
```
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service
```
A healthy result should show:
```
Active: active (running)
```
AWS-provided modern Ubuntu AMIs commonly include SSM Agent as a Snap package.

---
## Step 4: Try the alternative service name
When the Snap service is not found, try:
```
sudo systemctl status amazon-ssm-agent
```
Use whichever service exists on your instance.

---
## Step 5: Start the Ubuntu Snap service
When the Snap service exists but is stopped, run:
```
sudo systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
sudo systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
```
Then verify:
```
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service
```
You can also check Snap directly:
```
sudo snap services amazon-ssm-agent
```
You want the service to show as active.

---
## Step 6: Install it when missing
When the agent is not installed, check:
```
snap list amazon-ssm-agent
```
When no package is found, install it:
```
sudo snap install amazon-ssm-agent --classic
```
Then start it:
```
sudo snap start amazon-ssm-agent
```
Verify:
```
sudo snap services amazon-ssm-agent
```
AWS recommends Snap-based SSM Agent installation for supported modern Ubuntu releases and warns against running duplicate Snap and Debian-package installations at the same time.
# Problem: The agent is running, but Session Manager still does not work
## Solution
SSM Agent being active is only one requirement.
Check these items in order.
## Check 1: Verify the EC2 IAM role
Open:
```
EC2
→ Instances
→ Select the instance
→ Details
```
Verify:
```
IAM role:
pet-shop-backend-ec2-role
```
Then open:
```
IAM
→ Roles
→ pet-shop-backend-ec2-role
→ Permissions
```
Confirm:
```
AmazonSSMManagedInstanceCore
```

---
## Check 2: Verify the instance has internet access
Your EC2 instance should have:
```
Subnet:
pet-shop-public-subnet-1
Public IPv4 address:
Present
```
The public route table should contain:
```
0.0.0.0/0 → pet-shop-igw
```
SSM Agent needs outbound HTTPS access to Systems Manager endpoints.
Your path is:
```
SSM Agent
    ↓ outbound HTTPS 443
pet-shop-public-subnet-1
    ↓
pet-shop-public-rt
    ↓
pet-shop-igw
    ↓
Systems Manager endpoints
```

---
## Check 3: Verify outbound security-group access
Open:
```
EC2
→ Security Groups
→ pet-shop-backend-sg
→ Outbound rules
```
During learning, you can leave the default outbound rule:
```
All traffic
Destination: 0.0.0.0/0
```
Session Manager does not require an inbound SSM rule.
It also does not require inbound port `443`. The agent initiates the connection from EC2.

---
## Check 4: Review the agent logs
For Amazon Linux or an Ubuntu package installation, run:
```
sudo journalctl -u amazon-ssm-agent --no-pager -n 100
```
For Ubuntu Snap, run:
```
sudo journalctl \
  -u snap.amazon-ssm-agent.amazon-ssm-agent.service \
  --no-pager \
  -n 100
```
Look for errors mentioning:
```
credentials
AccessDenied
connection
timeout
endpoint
registration
```
AWS provides SSM Agent troubleshooting guidance and log inspection when the agent cannot communicate correctly.

---
## Check 5: Look in Systems Manager
Open:
```
AWS Systems Manager
→ Fleet Manager
→ Managed nodes
```
Your EC2 instance should eventually appear as:
```
Ping status: Online
```
Then return to:
```
EC2
→ Instances
→ Connect
→ Session Manager
```
and try again.
# Recommended process for your EC2 instance
Because you are likely using Amazon Linux 2023, follow this order:
```
1. Launch the EC2 instance.
2. Attach pet-shop-backend-ec2-role.
3. Wait until the instance finishes status checks.
4. Try EC2 → Connect → Session Manager.
5. If it fails, connect temporarily through SSH or EC2 Instance Connect.
6. Run sudo systemctl status amazon-ssm-agent.
7. Start or restart the agent when necessary.
8. Test Session Manager again.
9. Remove the temporary SSH inbound rule.
```
# Final Checklist
```
[ ] EC2 instance is running
[ ] IAM role shows pet-shop-backend-ec2-role
[ ] Role contains AmazonSSMManagedInstanceCore
[ ] SSM Agent is installed
[ ] SSM Agent shows active (running)
[ ] EC2 has a public IPv4 address
[ ] Public route table has 0.0.0.0/0 → pet-shop-igw
[ ] Security group permits outbound traffic
[ ] Instance appears in Systems Manager as Online
[ ] Session Manager terminal opens successfully
[ ] Temporary SSH rule is removed afterward
```