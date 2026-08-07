# Main Problem
You need to connect the IAM role:
```
pet-shop-backend-ec2-role
```
to your Pet Shop EC2 instance.
This gives software running inside EC2 temporary AWS permissions, including permission for the SSM Agent to communicate with Systems Manager.
```
EC2
↓ uses temporary credentials
pet-shop-backend-ec2-role
↓
AmazonSSMManagedInstanceCore
↓
Systems Manager
```
You have two possible situations:
```
EC2 not created yet
→ Attach the role while launching EC2
EC2 already created
→ Attach the role to the existing instance
```
You only need to follow the section that matches your situation.
# Problem 11.3: Attach the role while creating EC2
## Solution
Use these steps when you have **not launched the Pet Shop EC2 instance yet**.
## Step 1: Open the EC2 launch page
In the AWS Console, confirm the Region is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
Then open:
```
EC2
→ Instances
→ Launch instances
```

---
## Step 2: Configure the basic EC2 settings
Complete the normal EC2 launch settings, including:
```
Name
AMI
Instance type
Key pair, when required
Network
Subnet
Security group
Storage
```
For your Pet Shop network, the important selections will eventually include:
```
VPC: pet-shop-vpc
Subnet: pet-shop-public-subnet-1
Security group: pet-shop-backend-sg
```
Do not launch the instance yet.

---
## Step 3: Expand Advanced details
Scroll toward the bottom of the launch page.
Find:
```
Advanced details
```
Select it to expand the section.
AWS places the role selection in the **IAM instance profile** field in this section.

---
## Step 4: Select the IAM instance profile
Find:
```
IAM instance profile
```
Open the dropdown and select:
```
pet-shop-backend-ec2-role
```
The field may use the words **instance profile** rather than **IAM role**. In the EC2 console, AWS presents available EC2 roles through their corresponding instance profiles.
Your setting must show:
```
IAM instance profile:
pet-shop-backend-ec2-role
```
Do not leave it as:
```
None
```

---
## Step 5: Finish launching the instance
Review the summary panel and confirm:
```
VPC: pet-shop-vpc
Subnet: pet-shop-public-subnet-1
Security group: pet-shop-backend-sg
IAM instance profile: pet-shop-backend-ec2-role
```
Then select:
```
Launch instance
```
AWS can attach an existing IAM role during instance launch, and applications on the instance can then obtain temporary credentials through EC2 instance metadata.

---
## Step 6: Verify the role after launch
Open:
```
EC2
→ Instances
```
Select your Pet Shop EC2 instance.
In the instance details, find:
```
IAM role
```
It should show:
```
pet-shop-backend-ec2-role
```
You may be able to select the role name to open it in IAM.
# Problem 11.4: Attach the role to an existing EC2 instance
## Solution
Use these steps when your Pet Shop EC2 instance already exists.
You do not need to terminate, recreate, stop, or restart the instance just to attach the role. AWS allows an IAM role to be attached to either a running or stopped EC2 instance.
## Step 1: Open the instance list
In the AWS Console, confirm:
```
Region: ap-southeast-1
```
Then open:
```
EC2
→ Instances
```

---
## Step 2: Select the correct EC2 instance
Select the checkbox next to your Pet Shop backend instance.
Be careful not to select another learning or default instance.
Check details such as:
```
Name
Instance ID
VPC
Subnet
Private IPv4
Public IPv4
```
The expected network should be:
```
VPC: pet-shop-vpc
Subnet: pet-shop-public-subnet-1
```

---
## Step 3: Open Modify IAM role
With the instance selected, choose:
```
Actions
→ Security
→ Modify IAM role
```
This is the AWS console path for attaching, replacing, or removing an IAM role from an existing instance.

---
## Step 4: Select the role
In the **IAM role** dropdown, select:
```
pet-shop-backend-ec2-role
```
Then choose:
```
Update IAM role
```
You should receive a success message confirming that the IAM role was updated.

---
## Step 5: Verify the attachment
Return to:
```
EC2
→ Instances
→ Select your Pet Shop instance
```
Check the instance details.
You should see:
```
IAM role:
pet-shop-backend-ec2-role
```
You can also check:
```
Actions
→ Security
→ Modify IAM role
```
The selected value should now be:
```
pet-shop-backend-ec2-role
```
# Important: Make sure the correct policy is on the role
Attaching the role is not enough if the role has no useful permissions.
Open:
```
IAM
→ Roles
→ pet-shop-backend-ec2-role
→ Permissions
```
Confirm that it contains:
```
AmazonSSMManagedInstanceCore
```
The relationship should be:
```
EC2 instance
↓ attached role
pet-shop-backend-ec2-role
↓ attached policy
AmazonSSMManagedInstanceCore
```
Do not attach that policy directly to your IAM user. It is intended for the EC2 instance role.
# What to do when the role does not appear
When `pet-shop-backend-ec2-role` is missing from the dropdown, check these items.
## Check 1: Verify the trust relationship
Open:
```
IAM
→ Roles
→ pet-shop-backend-ec2-role
→ Trust relationships
```
It must trust:
```
ec2.amazonaws.com
```
The role must have been created with:
```
Trusted entity type: AWS service
Use case: EC2
```
A role created for Lambda or another service will not appear as a valid EC2 instance profile.
## Check 2: Refresh the EC2 page
When you created the role very recently:
```
Refresh the browser page
→ Reopen IAM instance profile
```
AWS IAM changes can require a brief period to become visible across services.
## Check 3: Check your own permissions
When you receive `AccessDenied`, your IAM identity may lack permission to pass the role to EC2.
The relevant permission is commonly:
```
iam:PassRole
```
Permissions to associate an instance profile may also be required.
Because you are using an administrator IAM user, these permissions may already be available. Do not add broader permissions unless the error actually occurs.
# Test Session Manager afterward
After the instance is running and the role is attached, open:
```
EC2
→ Instances
→ Select your Pet Shop instance
→ Connect
→ Session Manager
```
Then select:
```
Connect
```
For this to work, all of these must be true:
```
[ ] pet-shop-backend-ec2-role is attached
[ ] AmazonSSMManagedInstanceCore is attached to the role
[ ] SSM Agent is installed and running
[ ] EC2 has outbound HTTPS access
[ ] Your IAM administrator identity can start sessions
```
Your public EC2 network path should be:
```
EC2 with public IPv4
↓ outbound HTTPS 443
pet-shop-public-subnet-1
↓
pet-shop-public-rt
↓
0.0.0.0/0 → pet-shop-igw
↓
Systems Manager endpoints
```
You do not need inbound SSH port `22` for Session Manager.
# Final Checklist
For a new EC2 instance:
```
[ ] Opened EC2 → Instances → Launch instances
[ ] Expanded Advanced details
[ ] Found IAM instance profile
[ ] Selected pet-shop-backend-ec2-role
[ ] Did not leave it as None
[ ] Launched the instance
[ ] Verified the role in the instance details
```
For an existing EC2 instance:
```
[ ] Opened EC2 → Instances
[ ] Selected the Pet Shop instance
[ ] Opened Actions → Security → Modify IAM role
[ ] Selected pet-shop-backend-ec2-role
[ ] Selected Update IAM role
[ ] Verified the role in the instance details
```
You should perform **Problem 11.3 or Problem 11.4, not both**, unless you launch one instance and later need to change its role.