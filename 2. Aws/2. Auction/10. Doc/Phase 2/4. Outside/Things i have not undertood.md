### Step 2: Check the AWS Region
Look at the upper-right corner of the AWS Console.
Choose the region where you plan to build the Auction application, for example:
```
Asia Pacific (Singapore)
ap-southeast-1
```
Your VPC, subnets, EC2 instances, Lambda functions, and RDS database should normally be created in the same region.



Under **Resources to create**, choose:
```
VPC only
```
This means AWS will create only the network container. You will create the subnets, Internet Gateway, and route tables yourself in later tasks.
Do not choose:
```
VPC and more
```
That option automatically creates several networking resources, which would make it harder to learn what each component does.






#### tep 6: Enter the VPC settings
Configure the form as follows.
##### Name tag
Enter:
```
auction-vpc
```
This is the name that will appear in your AWS Console.
##### IPv4 CIDR block
Select:
```
IPv4 CIDR manual input
```
Enter:
```
10.0.0.0/16
```
AWS requires a VPC to have an IPv4 CIDR block. A `/16` VPC contains 65,536 IPv4 addresses, which can later be divided into smaller subnet ranges.
For example:
```
VPC:            10.0.0.0/16
Public subnet:  10.0.1.0/24
Private subnet: 10.0.2.0/24
```
You are not assigning all 65,536 addresses to servers. You are only reserving this address range for your Auction network.


###### Tenancy
Keep:
```
Default
```
Do not choose dedicated tenancy. Dedicated tenancy can involve additional cost and is unnecessary for this project.
Your completed settings should look approximately like this:
```
Resources to create: VPC only
Name tag: auction-vpc
IPv4 CIDR: IPv4 CIDR manual input
IPv4 CIDR block: 10.0.0.0/16
IPv6 CIDR block: No IPv6 CIDR block
Tenancy: Default
```