# Main Problem
While learning AWS, you may create resources for your PetShop app and forget that they are still running.
AWS will continue charging for many resources until you **stop or delete them**. A budget warns you about spending, but it does **not automatically stop the resources** unless you configure special budget actions. AWS also warns that costs can continue increasing before or after an alert arrives.
You should complete the following tasks.
# Problem 1: Create a monthly AWS budget
## Solution
Start with a **$5 monthly budget** because you are currently learning rather than operating a production application.
In the AWS Console:
1. Sign in using your `PetShop-dev-admin` IAM user.
2. Search for **Billing and Cost Management**.
3. Open **Budgets**.
4. Select **Create budget**.
5. Choose **Customize (advanced)**.
6. Choose **Cost budget**.
7. Configure:
```
Budget name: petshop-learning-monthly-budget
Period: Monthly
Budget renewal type: Recurring
Budget amount: $5
Scope: All AWS services
```
AWS supports monthly cost budgets that monitor the total cost of your account.
If your IAM user cannot open Billing, you may need to enable IAM access to billing information from the root account and give the IAM user the necessary billing permissions.
# Problem 2: Create three email alerts
## Solution
Add these alerts to the same budget:

|Threshold|With a $5 budget|Meaning|
|---|---|---|
|50%|$2.50|Early warning|
|80%|$4.00|Check your resources|
|100%|$5.00|Stop or delete unnecessary resources immediately|
For each notification:
```
Threshold type: Percentage
Notification type: Actual
Email recipient: your normal email address
```
You can also add one **forecasted cost alert** at `80%`. It can warn you when AWS predicts that your spending will exceed the budget, although forecast alerts require sufficient usage history before they work reliably.
Your alert configuration could therefore be:
```
50% actual cost
80% actual cost
100% actual cost
80% forecasted cost — optional
```
After creating the budget, verify that the correct email address appears in every notification.
# Problem 3: Understand what the alerts do
## Solution
A budget alert sends you an email such as:
```
Your AWS cost has reached 80% of your budget.
```
It normally does **not** do this:
```
Stop EC2
Stop RDS
Delete NAT Gateway
Delete Load Balancer
```
Therefore:
```
Budget alert
    ↓
You receive an email
    ↓
You open AWS
    ↓
You find the expensive resource
    ↓
You stop or delete it
```
Do not treat `$5` as a guaranteed spending limit. Treat it as an alarm that tells you to investigate.
# Problem 4: Stop EC2 when you finish practising
## Solution
After working on your PetShop backend:
1. Open **EC2**.
2. Select **Instances**.
3. Find your PetShop instance.
4. Choose:
```
Instance state
→ Stop instance
```
A stopped EC2 instance no longer incurs normal instance-compute charges, but its attached EBS volumes can still incur storage charges.
Use the correct action:
```
Stop
```
Use **Stop** when you want to continue using the same server later.
Use:
```
Terminate
```
only when you no longer need that EC2 instance. Termination is destructive and may delete its root EBS volume, depending on its configuration.
# Problem 5: Stop RDS when you are not using the database
## Solution
After testing your PetShop database:
1. Open **RDS**.
2. Choose **Databases**.
3. Select your  database.
4. Choose:
```
Actions
→ Stop temporarily
```
Stopping RDS saves database-instance compute costs, but AWS still charges for provisioned storage, backups, and related storage resources.
Also remember that temporarily stopped RDS instances may automatically restart after the maximum supported stopping period. Therefore, you must check RDS regularly rather than assuming it will remain stopped permanently.
When you no longer need the database:
```
Create a final snapshot if needed
    ↓
Delete the RDS instance
```
# Problem 6: Avoid creating a NAT Gateway while learning
## Solution
For your early PetShop project, avoid creating a NAT Gateway unless the architecture genuinely requires one.
A NAT Gateway normally continues generating hourly charges while it exists, even when your application is not actively being used. It can also generate data-processing charges.
For a simple learning deployment, you can initially use:
```
Internet
   ↓
Public subnet
   ↓
EC2 with a public IP
```
Later, a stronger production architecture may use:
```
Public Load Balancer
        ↓
Private EC2 instances
        ↓
NAT Gateway for outbound access
```
Do not build the more expensive production architecture before you need it.
If you accidentally create a NAT Gateway:
1. Open **VPC**.
2. Open **NAT gateways**.
3. Select it.
4. Choose **Delete NAT gateway**.
5. Then check **Elastic IP addresses** and release the associated address if it is no longer needed.
Deleting a public NAT Gateway disassociates its Elastic IP but does not automatically release that Elastic IP from your account.
# Problem 7: Delete unused Load Balancers
## Solution
If you experiment with an Application Load Balancer:
1. Open **EC2**.
2. Open **Load Balancers**.
3. Check whether one still exists.
4. Delete it when you finish the experiment.
Stopping EC2 instances behind a Load Balancer does not delete the Load Balancer.
```
EC2 stopped
≠
Load Balancer stopped
```
A Load Balancer is a separate AWS resource and must be deleted separately.
# Problem 8: Check EBS volumes after deleting EC2
## Solution
When an EC2 instance is terminated, some EBS volumes may remain.
Check:
1. Open **EC2**.
2. Open **Volumes**.
3. Look for volumes whose state is:
```
Available
```
`Available` usually means that the volume exists but is not attached to an EC2 instance.
Delete it when:
```
You do not need its data
AND
You do not need to attach it again
```
AWS can continue charging for EBS volumes and snapshots even when the associated EC2 instance is stopped or gone.
# Problem 9: Release unused Elastic IP addresses
## Solution
Check:
```
EC2
→ Elastic IP addresses
```
An Elastic IP should normally be associated with a resource that genuinely requires it.
Release it when:
```
The EC2 instance was deleted
The NAT Gateway was deleted
The address is no longer needed
```
Be careful: after releasing it, you may not receive the same public IP address again.
# Problem 10: Check S3, CloudFront and Route 53
## Solution
These may be less expensive during small experiments, but they are not automatically free.
### S3
Check for:
```
Large uploaded files
Old database backups
Unused images
Incomplete multipart uploads
Versioned objects
```
Delete unnecessary objects and buckets.
### CloudFront
Check for unused distributions. Disable and delete distributions created only for testing.
### Route 53
Check:
```
Hosted zones
Registered domains
Health checks
```
Deleting an EC2 instance does not delete its Route 53 hosted zone or domain registration.
A registered domain can renew separately, so review its automatic-renewal setting.
# Problem 11: Review your current spending
## Solution
Open:
```
Billing and Cost Management
→ Cost Explorer
```
Configure:
```
Date range: Current month
Granularity: Daily
Group by: Service
```
This shows which AWS service is producing the cost.
For example:
```
Amazon EC2        $1.40
Amazon RDS        $2.10
EC2 Other         $0.65
Amazon VPC        $0.80
```
Be aware that:
```
EC2 instance compute → Amazon EC2
EBS and some networking costs → EC2 Other
NAT Gateway costs → Amazon VPC
Database costs → Amazon RDS
```
Cost data and budget graphs may not update immediately; AWS notes that Cost Explorer information can take time to appear.
# Your immediate checklist
Complete these now:
```
[ ] Create one $5 monthly cost budget
[ ] Add 50% actual alert
[ ] Add 80% actual alert
[ ] Add 100% actual alert
[ ] Use your normal email for every alert
[ ] Open Cost Explorer
[ ] Check whether any EC2 instance is running
[ ] Check whether any RDS database is running
[ ] Check whether a NAT Gateway exists
[ ] Check whether a Load Balancer exists
[ ] Check for unattached EBS volumes
[ ] Check for unused Elastic IP addresses
```
After every PetShop app practice session:
```
Stop EC2
    ↓
Stop RDS
    ↓
Delete temporary Load Balancers
    ↓
Delete temporary NAT Gateways
    ↓
Release unused Elastic IPs
    ↓
Delete unused EBS volumes
    ↓
Check Cost Explorer
```
The most important first action is to create the **$5 monthly budget with the three actual-cost alerts**.