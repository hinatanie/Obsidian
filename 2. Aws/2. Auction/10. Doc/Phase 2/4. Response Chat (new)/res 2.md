# Main Problem
Your Spring Boot backend will connect to RDS MySQL using an endpoint similar to:
```
pet-shop-db.xxxxxxxxx.ap-southeast-1.rds.amazonaws.com
```
This is a **DNS name**, not a permanent database IP address.
The VPC must therefore allow AWS DNS to translate the RDS endpoint into the correct private IP address:
```
Spring Boot
→ RDS DNS endpoint
→ AWS DNS resolver
→ RDS private IP address
→ MySQL connection
```
# Problem 2: Enable VPC DNS
## Solution
### Step 1: Open the VPC service
In the AWS Console:
1. Confirm that your Region is:
```
Asia Pacific (Singapore)
ap-southeast-1
```
2. Search for:
```
VPC
```
3. Open the **VPC** service.

---
### Step 2: Open your VPC list
From the left navigation menu, open:
```
Your VPCs
```
Find:
```
pet-shop-vpc
```
Select the checkbox beside `pet-shop-vpc`.
Be careful not to select the AWS default VPC.

---
### Step 3: Open the DNS settings
With `pet-shop-vpc` selected, choose:
```
Actions
→ Edit VPC settings
```
AWS officially uses this menu to update the DNS attributes of an existing VPC.

---
### Step 4: Enable both DNS options
In the **DNS settings** section, enable:
```
☑ Enable DNS resolution
☑ Enable DNS hostnames
```
Your settings should look similar to:
```
DNS settings
[x] Enable DNS resolution
[x] Enable DNS hostnames
```
Then select:
```
Save changes
```
## What these two settings mean
### DNS resolution
```
Enable DNS resolution
```
This allows resources inside `pet-shop-vpc` to use the AWS-provided DNS resolver.
For your project, it allows Spring Boot to resolve:
```
pet-shop-db.xxxxxxxxx.ap-southeast-1.rds.amazonaws.com
```
into the private IP address currently used by RDS.
Without DNS resolution, your backend may receive an error such as:
```
UnknownHostException
```
or:
```
Unknown MySQL server host
```
### DNS hostnames
```
Enable DNS hostnames
```
This permits eligible resources created inside the VPC to receive AWS DNS hostnames. AWS requires DNS resolution to be enabled before DNS hostnames can be enabled.
For your project, enabling both settings is the safe and recommended VPC configuration.

---
### Step 5: Verify the settings
Return to:
```
VPC
→ Your VPCs
→ pet-shop-vpc
```
Look at the VPC details and verify:
```
DNS resolution: Enabled
DNS hostnames: Enabled
```
If both already showed **Enabled**, you do not need to change anything.
# Important clarification
Enabling these options does **not** make your RDS database public.
The database remains protected by:
```
Private subnet
+
RDS security group
+
No public accessibility
```
DNS only allows your Spring Boot backend to find the database’s private IP address by using its AWS endpoint.
# Final Checklist
```
[x] Opened the VPC service
[x] Opened Your VPCs
[x] Selected pet-shop-vpc
[x] Opened Actions → Edit VPC settings
[x] Enabled DNS resolution
[x] Enabled DNS hostnames
[x] Saved the changes
[x] Verified that both settings show Enabled
```