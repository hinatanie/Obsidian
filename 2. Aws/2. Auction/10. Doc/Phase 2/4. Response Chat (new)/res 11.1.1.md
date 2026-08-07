# Main Problem
AWS is warning you that you have not selected an **SSH key pair**.
A key pair is used when you want to connect directly to the Linux EC2 instance through SSH:
```
Your Windows computer
        ↓ SSH with private key
EC2 instance
```
Because your plan is to use **Systems Manager Session Manager**, a key pair is not strictly required. However, for this learning instance, I recommend creating one as an emergency backup until Session Manager works successfully.
# Problem: Which option should you choose?
## Solution
Choose:
```
Create new key pair
```
Use these settings:
```
Key pair name: pet-shop-backend-key
Key pair type: ED25519
Private key file format: .pem
```
This is appropriate because:
```
Operating system: Linux
Your computer: Windows
Connection tool: Windows OpenSSH
```
Linux EC2 instances support both RSA and ED25519. The `.pem` format works with OpenSSH, which is built into modern Windows versions. PuTTY uses `.ppk` instead.
## Step 1: Enter the key-pair name
Enter:
```
pet-shop-backend-key
```
The name identifies the key pair inside AWS.
It is not a password.

---
## Step 2: Select the key-pair type
Choose:
```
ED25519
```
For your Linux EC2 instance, ED25519 is a good modern choice.
Choose `RSA` instead only when:
```
You need compatibility with older SSH software
You may use the key with a Windows EC2 instance
```
Windows EC2 instances support RSA but not ED25519. Your Spring Boot server is expected to use Linux, so ED25519 is suitable.

---
## Step 3: Select the private-key format
Because you are using Windows and can use the built-in `ssh` command, select:
```
.pem
For use with OpenSSH
```
Choose `.ppk` only when you specifically plan to connect with:
```
PuTTY
```
The relationship is:
```
Windows PowerShell/OpenSSH → .pem
PuTTY                     → .ppk
```
AWS confirms that OpenSSH uses `.pem`, while PuTTY uses `.ppk`.

---
## Step 4: Create and download the key
Select:
```
Create key pair
```
Your browser should immediately download a file named approximately:
```
pet-shop-backend-key.pem
```
AWS stores the public key, but the private key is downloaded to you. The private key cannot normally be downloaded again later.
Move it from your Downloads folder to a safe location, for example:
```
C:\Users\YOUR_USERNAME\.ssh\pet-shop-backend-key.pem
```
Do not:
```
Upload it to GitHub
Put it inside your Spring Boot project
Send it through chat or email
Commit it to Git
Store it in a public Google Drive folder
```
Treat this file like a password.

---
# Should you choose “Proceed without key pair”?
You technically can choose:
```
Proceed without key pair
```
because you plan to use Session Manager.
However, only choose that after you are confident that all of these are correct:
```
pet-shop-backend-ec2-role is attached
AmazonSSMManagedInstanceCore is attached
SSM Agent exists and runs
EC2 has outbound internet access
Your IAM user can start an SSM session
```
Without a key pair, traditional SSH access will not work unless another login method has already been configured. AWS therefore labels this option as not recommended.
For your first learning EC2 instance, the safer choice is:
```
Create the key pair now
Use Session Manager as the preferred connection method
Keep SSH port 22 restricted to your IP or closed
Remove the SSH rule after Session Manager works
```
Creating a key pair does **not** automatically open SSH port `22`. Your security group still controls whether SSH traffic is allowed.
# Important distinction
These are separate things:
```
Key pair
→ Proves your identity when using SSH
```
```
Security-group SSH rule
→ Allows the SSH network connection to reach EC2
```
```
Session Manager
→ Connects through Systems Manager without SSH
```
You can create and keep the key pair as a backup while leaving port `22` closed.
# Recommended selection now
```
Create new key pair
Key pair name:
pet-shop-backend-key
Key pair type:
ED25519
Private key file format:
.pem
```
After it downloads, verify that this file exists:
```
pet-shop-backend-key.pem
```
Then continue launching the instance and make sure:
```
IAM instance profile:
pet-shop-backend-ec2-role
```