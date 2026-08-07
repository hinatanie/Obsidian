# Main Problem
Your IAM role is attached correctly, and SSM Agent is running enough to report an error. The failure is **network connectivity**:
```
dial tcp 47.128.9.157:443: i/o timeout
```
The strongest clue is the instance hostname:
```
ip-10-0-2-71
```
Your subnet plan says:
```
10.0.2.0/24 → pet-shop-private-subnet-1
```
Therefore, you accidentally launched the EC2 backend inside the **private RDS subnet**, not the public EC2 subnet.
That private subnet has only:
```
10.0.0.0/16 → local
```
It deliberately has no Internet Gateway or NAT Gateway route. Consequently, SSM Agent cannot reach:
```
https://ssm.ap-southeast-1.amazonaws.com:443
```
AWS confirms that Session Manager requires outbound HTTPS access to Systems Manager endpoints; routing or internet-connectivity problems produce this kind of connection failure.
# Problem 1: Verify the wrong subnet
## Solution
Open:
```
EC2
→ Instances
→ Select your Pet Shop EC2 instance
→ Networking
```
Check:
```
Subnet ID
Private IPv4 address
Public IPv4 address
```
You will probably find:
```
Subnet: pet-shop-private-subnet-1
Private IP: 10.0.2.71
Public IPv4: None
```
The correct backend subnet should be:
```
pet-shop-public-subnet-1
CIDR: 10.0.1.0/24
```
A correctly placed instance should normally receive a private address similar to:
```
10.0.1.x
```
not:
```
10.0.2.x
```
# Problem 2: Fix the EC2 placement
## Solution
For this new learning instance, the cleanest solution is to terminate it and launch a replacement in the correct public subnet.
You cannot simply edit the primary network interface and move it to another subnet. AWS network interfaces belong to the subnet in which they were created, and the primary interface cannot be detached from the instance.
## Step 1: Confirm that nothing important is stored on the instance
Because this appears to be a newly launched instance, you probably have no application files to preserve.
Before termination, confirm that you do not need anything stored on its EBS volume.
## Step 2: Terminate the incorrectly placed instance
Open:
```
EC2
→ Instances
→ Select the incorrect instance
→ Instance state
→ Terminate instance
```
Be certain you selected the new Pet Shop instance before terminating it.
## Step 3: Launch a replacement instance
Open:
```
EC2
→ Instances
→ Launch instances
```
In **Network settings**, select exactly:
```
VPC:
pet-shop-vpc
Subnet:
pet-shop-public-subnet-1
Auto-assign public IP:
Enable
Security group:
pet-shop-backend-sg
```
Do not choose:
```
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
Under **Advanced details**, select:
```
IAM instance profile:
pet-shop-backend-ec2-role
```
Also select your key pair as a temporary backup.
Before launching, verify:
```
VPC: pet-shop-vpc
Subnet: pet-shop-public-subnet-1
Auto-assign public IP: Enable
IAM instance profile: pet-shop-backend-ec2-role
Security group: pet-shop-backend-sg
```
# Problem 3: Verify the public network path
## Solution
After the replacement instance starts, check its networking details.
You should see:
```
Private IPv4:
10.0.1.x
Public IPv4:
A public IPv4 address is present
Subnet:
pet-shop-public-subnet-1
```
Then verify the subnet uses:
```
pet-shop-public-rt
```
The public route table must contain:
```
10.0.0.0/16 → local
0.0.0.0/0   → pet-shop-igw
```
The SSM Agent connection path will then be:
```
SSM Agent on EC2
        ↓ outbound HTTPS 443
pet-shop-public-subnet-1
        ↓
pet-shop-public-rt
        ↓ 0.0.0.0/0
pet-shop-igw
        ↓
ssm.ap-southeast-1.amazonaws.com
```
AWS requires the managed instance to reach the relevant Systems Manager endpoints over outbound port `443`.
# Problem 4: Check the security group outbound rules
## Solution
Open:
```
EC2
→ Security Groups
→ pet-shop-backend-sg
→ Outbound rules
```
For now, confirm it contains:
```
Type: All traffic
Destination: 0.0.0.0/0
```
You do **not** need an inbound port for Systems Manager.
SSM Agent starts the connection from the EC2 instance:
```
EC2 → Systems Manager
```
Therefore, Session Manager does not require:
```
Inbound port 443
Inbound port 22
```
Session Manager is designed to work without opening inbound management ports.
# Problem 5: Test Session Manager again
## Solution
Wait until the replacement instance shows:
```
Instance state: Running
Status checks: 2/2 checks passed
```
Then open:
```
EC2
→ Instances
→ Select the replacement instance
→ Connect
→ Session Manager
```
You should eventually see:
```
Ping status: Online
Session Manager connection status: Connected
SSM agent version: A version number
IAM role: pet-shop-backend-ec2-role
```
Then select:
```
Connect
```
# What “No SSM fallback” means
This line is not the main problem:
```
Systems Manager default role not enabled
No SSM fallback
```
You already attached:
```
pet-shop-backend-ec2-role
```
with:
```
AmazonSSMManagedInstanceCore
```
So you do not need the default host-management fallback for this design.
The decisive error is:
```
Post "https://ssm.ap-southeast-1.amazonaws.com/":
dial tcp ...:443: i/o timeout
```
That means the agent cannot reach the service endpoint over the network.
# Do not “fix” the RDS subnet
Do not add this route to `pet-shop-private-rt`:
```
0.0.0.0/0 → pet-shop-igw
```
Do not enable automatic public IPv4 addresses for:
```
pet-shop-private-subnet-1
pet-shop-private-subnet-2
```
Those subnets were created specifically for private RDS placement.
The correct solution is:
```
EC2 backend
→ pet-shop-public-subnet-1
RDS MySQL
→ pet-shop-private-subnet-1
  or pet-shop-private-subnet-2
```
# Final Checklist
```
[ ] Confirmed the old EC2 used private IP 10.0.2.71
[ ] Confirmed it was launched in pet-shop-private-subnet-1
[ ] Did not modify the private RDS route table
[ ] Terminated the incorrect new EC2 instance
[ ] Launched a replacement in pet-shop-public-subnet-1
[ ] Enabled auto-assign public IPv4
[ ] Selected pet-shop-backend-sg
[ ] Attached pet-shop-backend-ec2-role
[ ] Confirmed the new private IP is 10.0.1.x
[ ] Confirmed a public IPv4 address exists
[ ] Confirmed 0.0.0.0/0 routes to pet-shop-igw
[ ] Tested Session Manager again
```
The root cause is not the IAM role. The EC2 backend was launched in the RDS private subnet, so it had no route to the Systems Manager public endpoint.