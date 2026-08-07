# Main Problem
You are trying to change the existing route:
```
10.0.0.0/16 → local
```
You should **not change this route**. AWS created it automatically so resources inside `auction-vpc` can communicate. AWS only lets you modify routes you added yourself, so the destination is locked here.
## Solution
In your screenshot, click:
```
Add route
```
A new empty row will appear underneath the existing local route.
Enter:
```
Destination: 0.0.0.0/0
```
For **Target**:
1. Open the dropdown.
2. Select **Internet Gateway**.
3. Select:
```
auction-igw
```
Then click:
```
Save changes
```
Your result should contain **two separate routes**:
```
10.0.0.0/16 → local
0.0.0.0/0   → auction-igw
```
Do not replace:
```
10.0.0.0/16 → local
```
The first route handles communication within your VPC. The new `0.0.0.0/0` route sends internet-bound IPv4 traffic to the Internet Gateway.