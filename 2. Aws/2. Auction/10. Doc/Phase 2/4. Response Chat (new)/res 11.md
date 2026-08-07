# Main Problem
Your EC2 instance needs permission to communicate with AWS Systems Manager.
Instead of storing AWS access keys on the server, you attach an **IAM role** to the EC2 instance:
```
EC2 instance
    ↓ assumes
pet-shop-backend-ec2-role
    ↓ receives temporary credentials
AmazonSSMManagedInstanceCore
    ↓
AWS Systems Manager
```
This lets you open a browser-based terminal through **Session Manager** without exposing SSH port `22`.
# Problem 11: Configure the EC2 IAM role and Session Manager
## Solution
Create:
```
Role name: pet-shop-backend-ec2-role
Trusted entity: AWS service
Use case: EC2
```
Initially attach only:
```
AmazonSSMManagedInstanceCore
```
Do not attach:
```
AdministratorAccess
AmazonS3FullAccess
PowerUserAccess
```
`AmazonSSMManagedInstanceCore` provides the core instance-side permissions required for Systems Manager.

---
# Problem 11.1: Create the IAM role
## Solution
## Step 1: Open IAM
In the AWS Console:
```
Search bar
→ IAM
→ Open IAM
```
IAM is a global service, so it does not depend on whether the console currently shows Singapore. However, your EC2 instance will still be created in:
```
ap-southeast-1
```
From the IAM left menu, select:
```
Access management
→ Roles
```
Then select:
```
Create role
```

---
## Step 2: Choose the trusted entity
Under **Trusted entity type**, choose:
```
AWS service
```
Under **Service or use case**, choose:
```
EC2
```
The screen may show:
```
Use case: EC2
```
Then select:
```
Next
```
This trust configuration allows the EC2 service to assume the role on behalf of your instance. AWS creates the necessary instance profile when the role is created through the console.

---
## Step 3: Attach the Systems Manager policy
On the **Add permissions** page, search for:
```
AmazonSSMManagedInstanceCore
```
Select the checkbox beside exactly:
```
☑ AmazonSSMManagedInstanceCore
```
Be careful not to select the older policy:
```
AmazonEC2RoleforSSM
```
AWS marks that older policy as superseded and recommends using `AmazonSSMManagedInstanceCore`.
Do not select:
```
AdministratorAccess
AmazonS3FullAccess
AmazonEC2FullAccess
```
Then select:
```
Next
```

---
## Step 4: Name and create the role
Enter:
```
Role name:
pet-shop-backend-ec2-role
```
Optional description:
```
IAM role for the Pet Shop Spring Boot EC2 backend
```
Review:
```
Trusted entity: EC2
Permission policy: AmazonSSMManagedInstanceCore
```
Then select:
```
Create role
```

---
# Problem 11.2: Verify the role
## Solution
Open:
```
IAM
→ Roles
→ pet-shop-backend-ec2-role
```
Under **Permissions**, verify:
```
AmazonSSMManagedInstanceCore
```
Under **Trust relationships**, verify that the trusted service is:
```
ec2.amazonaws.com
```
The trust policy will look conceptually like:
```
EC2 service
→ Allowed to assume pet-shop-backend-ec2-role
```
Do not change the trust relationship to your IAM user. This role is for the EC2 instance, not for signing into AWS yourself.

---
# Problem 11.3: Attach the role when creating EC2
## Solution
When you later launch the EC2 instance:
```
EC2
→ Instances
→ Launch instances
```
Expand:
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
AWS supports attaching an IAM role while launching an instance through the **Advanced details** section.
Before launching, verify:
```
IAM instance profile:
pet-shop-backend-ec2-role
```
Do not leave it as:
```
None
```

---
# Problem 11.4: Attach the role to an existing EC2 instance
## Solution
When the EC2 instance already exists, you do not need to recreate it.
Open:
```
EC2
→ Instances
```
Select your Pet Shop backend instance.
Then choose:
```
Actions
→ Security
→ Modify IAM role
```
For **IAM role**, select:
```
pet-shop-backend-ec2-role
```
Then select:
```
Update IAM role
```
AWS allows a role to be attached to a running or stopped EC2 instance.
Verify under the instance details:
```
IAM role:
pet-shop-backend-ec2-role
```

---
# Problem 11.5: Make sure SSM Agent is available
## Solution
Session Manager requires **SSM Agent** to be installed and running on the EC2 instance.
Many AWS-provided AMIs already include it, especially:
```
Amazon Linux 2
Amazon Linux 2023
Some Ubuntu AMIs
```
However, you should verify it after launching the instance.
## For Amazon Linux
Connect temporarily using SSH or EC2 Instance Connect when necessary, then run:
```
sudo systemctl status amazon-ssm-agent
```
A successful result should contain something similar to:
```
Active: active (running)
```
When it is installed but stopped, run:
```
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
```
Then check again:
```
sudo systemctl status amazon-ssm-agent
```
## For Ubuntu
Try:
```
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service
```
On some installations, the service may instead be:
```
sudo systemctl status amazon-ssm-agent
```
Use the service name that exists on your selected AMI.
AWS recommends keeping SSM Agent updated because newer Systems Manager features may require newer agent versions.

---
# Problem 11.6: Verify outbound network access
## Solution
SSM Agent initiates an outbound HTTPS connection from EC2 to Systems Manager.
Your EC2 instance must be able to reach endpoints such as:
```
ssm.ap-southeast-1.amazonaws.com
ssmmessages.ap-southeast-1.amazonaws.com
```
Systems Manager requires outbound HTTPS traffic on port `443` to its service endpoints.
For your architecture, the path is:
```
EC2
    ↓ outbound TCP 443
pet-shop-public-subnet-1
    ↓
pet-shop-public-rt
    ↓ 0.0.0.0/0
pet-shop-igw
    ↓
Public Systems Manager endpoints
```
The EC2 instance also needs:
```
Public IPv4 address or Elastic IP
```
because it is using the public Internet Gateway path.
You already designed:
```
Public subnet auto-assign public IPv4: Enabled
Public route: 0.0.0.0/0 → pet-shop-igw
```
Therefore, a NAT Gateway is not required for this public EC2 instance.
## Check the security group outbound rule
Open:
```
EC2
→ Security Groups
→ pet-shop-backend-sg
→ Outbound rules
```
The default rule normally allows:
```
All traffic
Destination: 0.0.0.0/0
```
You can leave it during the learning stage.
That rule allows the instance to initiate the HTTPS connection required by Systems Manager.
Session Manager does not require an inbound port from the internet because the agent initiates the connection outward.

---
# Problem 11.7: Give your administrator identity permission to start sessions
## Solution
There are two different permission sides:
```
EC2 role
→ Lets the EC2 instance communicate with Systems Manager
Your IAM administrator identity
→ Lets you request and control a Session Manager session
```
Attaching `AmazonSSMManagedInstanceCore` to EC2 does not automatically give your IAM user permission to click **Connect**.
Your administrator identity needs Session Manager permissions such as:
```
ssm:StartSession
ssm:TerminateSession
ssm:ResumeSession
```
Session access can be controlled with IAM policies, including restrictions on which users may connect to which instances.
Because you are currently using an administrative IAM user, it may already have permission. Test it before adding another policy.
Do not attach session-user permissions to:
```
pet-shop-backend-ec2-role
```
That role belongs to the server. Your human IAM permissions are configured separately.

---
# Problem 11.8: Test Session Manager
## Solution
After the EC2 instance is running:
```
EC2
→ Instances
→ Select your Pet Shop backend instance
→ Connect
```
Open the:
```
Session Manager
```
tab.
Select:
```
Connect
```
When successful, AWS opens a terminal in your browser.
You may see a shell prompt similar to:
```
sh-5.2$
```
or:
```
[ssm-user@ip-10-0-1-x ~]$
```
Session Manager provides a browser-based interactive shell for managed EC2 instances.
Run:
```
whoami
```
You will commonly see:
```
ssm-user
```
Then test:
```
hostname
```
and:
```
pwd
```

---
# Problem 11.9: Check Systems Manager managed-node status
## Solution
You can also verify registration through:
```
AWS Systems Manager
→ Fleet Manager
→ Managed nodes
```
Your instance should appear with a status similar to:
```
Node status: Online
Ping status: Online
```
The page should show the EC2 instance ID and platform information.
It may take a short period after attaching the role and starting the agent for the instance to register.
When the role was attached after SSM Agent had already started, restarting the agent can help it register:
```
sudo systemctl restart amazon-ssm-agent
```
AWS notes that restarting SSM Agent may be required after attaching an instance profile to an already-running instance.

---
# Problem 11.10: Remove temporary SSH access
## Solution
After Session Manager works successfully:
```
EC2
→ Security Groups
→ pet-shop-backend-sg
→ Inbound rules
→ Edit inbound rules
```
Delete:
```
SSH
TCP 22
your-current-public-IP/32
```
Then save the rules.
Your final inbound rules should be:
```
HTTP  80  from 0.0.0.0/0
HTTPS 443 from 0.0.0.0/0
```
Session Manager does not require inbound SSH port `22`.

---
# Later permissions: Use narrow policies
Do not add broad permissions now just because the application may use AWS services later.
Add each permission only when the corresponding application feature is ready.
## Product-image S3 access
Later, create a custom policy that allows access only to the product-image bucket and required object path.
Conceptually:
```
Allowed bucket:
pet-shop-product-images
Allowed actions:
s3:GetObject
s3:PutObject
s3:DeleteObject, only when required
s3:ListBucket, only when required
```
Do not attach:
```
AmazonS3FullAccess
```
## CloudWatch Agent
When you install CloudWatch Agent later, attach only the policy required for sending metrics and logs, commonly:
```
CloudWatchAgentServerPolicy
```
Review whether every permission in the managed policy is necessary for your environment.
## Parameter Store
For application configuration, grant only access to the required parameter path, for example:
```
/pet-shop/prod/*
```
Possible required actions include:
```
ssm:GetParameter
ssm:GetParameters
ssm:GetParametersByPath
```
When parameters use a customer-managed KMS key, the role may also need narrowly scoped:
```
kms:Decrypt
```
Do not give the role permission to read every Parameter Store value in the AWS account.

---
# Troubleshooting
## Session Manager says the instance is not connected
Check these items in order:
```
1. EC2 is running
2. pet-shop-backend-ec2-role is attached
3. AmazonSSMManagedInstanceCore is attached to the role
4. SSM Agent is installed
5. SSM Agent is running
6. EC2 has a public IPv4 address
7. Public subnet has 0.0.0.0/0 → pet-shop-igw
8. Security group allows outbound HTTPS
9. Network ACL permits outbound and return traffic
10. The instance and console are using ap-southeast-1
```
## The role does not appear in the EC2 role list
Confirm that its trusted entity is:
```
EC2
ec2.amazonaws.com
```
A normal IAM role created for another AWS service will not work as an EC2 instance profile.
## You receive AccessDenied when attaching the role
Your IAM administrator identity may be missing:
```
iam:PassRole
```
The user launching or modifying EC2 must be allowed to pass the selected role to the EC2 service.
## Session Manager tab says you lack permission
The EC2 role may be correct, but your IAM user may lack permission to start a session.
These are separate identities:
```
pet-shop-backend-ec2-role
→ Instance permission
auction-dev-admin or your administrator identity
→ Human session permission
```
# Final architecture
```
You in AWS Console
        ↓ StartSession permission
AWS Systems Manager Session Manager
        ↕ HTTPS 443
SSM Agent on EC2
        ↓ temporary role credentials
pet-shop-backend-ec2-role
        ↓
AmazonSSMManagedInstanceCore
```
Network path:
```
EC2 public IPv4
    ↓ outbound HTTPS 443
pet-shop-public-rt
    ↓
pet-shop-igw
    ↓
Systems Manager public endpoints
```
# Final Checklist
```
[ ] Opened IAM → Roles
[ ] Selected Create role
[ ] Selected AWS service
[ ] Selected EC2 as the use case
[ ] Attached AmazonSSMManagedInstanceCore
[ ] Named the role pet-shop-backend-ec2-role
[ ] Did not attach AdministratorAccess
[ ] Did not attach AmazonS3FullAccess
[ ] Created the role
[ ] Attached the role to the EC2 instance
[ ] Verified SSM Agent is installed
[ ] Verified SSM Agent is running
[ ] Verified EC2 has outbound HTTPS access
[ ] Verified EC2 has a public IPv4 address
[ ] Verified the public route points to pet-shop-igw
[ ] Verified your administrator identity can start a session
[ ] Successfully connected through Session Manager
[ ] Removed temporary SSH after Session Manager worked
```