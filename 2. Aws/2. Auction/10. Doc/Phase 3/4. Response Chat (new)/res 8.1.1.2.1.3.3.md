# Main Problem
Windows OpenSSH refuses to use the `.pem` file because other Windows accounts can read it:
```
WARNING: UNPROTECTED PRIVATE KEY FILE!
Permissions ... are too open.
```
Your EC2 connection and port `22` are working. You only need to restrict the private-key file permissions.
## Problem 1: Open PowerShell as Administrator
## Solution
1. Close the current PowerShell window.
2. Open **Start**.
3. Search for:
```
PowerShell
```
4. Right-click **Windows PowerShell**.
5. Select:
```
Run as administrator
```
## Problem 2: Remove inherited permissions
Run:
```
$key = "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem"
icacls $key /inheritance:r
```
This removes permissions inherited from the `Downloads` folder.
## Problem 3: Remove the extra account shown in the error
Run:
```
icacls $key /remove "DESKTOP-FIOUEDG\CodexSandboxUsers"
```
The name comes directly from your error:
```
DESKTOP-FIOUEDG\CodexSandboxUsers
```
## Problem 4: Give only your Windows account permission
Run:
```
icacls $key /grant:r "$env:USERNAME:(R)"
```
This should give your current Windows user read-only permission.
If that command produces an invalid-parameter error, use the full account name:
```
whoami
```
It should return something similar to:
```
desktop-fiouedg\admin
```
Then run:
```
icacls $key /grant:r "DESKTOP-FIOUEDG\ADMIN:(R)"
```
## Problem 5: Verify the permissions
Run:
```
icacls $key
```
The result should mainly show your account, for example:
```
DESKTOP-FIOUEDG\ADMIN:(R)
```
It should not show:
```
CodexSandboxUsers
Users
Everyone
Authenticated Users
```
If those remain, remove them:
```
icacls $key /remove "Users"
icacls $key /remove "Everyone"
icacls $key /remove "Authenticated Users"
```
Some names may report that no mapping was found. That is harmless when that permission does not exist.
## Problem 6: Retry the upload
Return to your project directory:
```
cd "C:\Users\ADMIN\Documents\dhsg\third year\sem2\java\project\pet-shop\server\happy-pet-shop"
```
Confirm the JAR exists:
```
Get-Item ".\pet-shop.jar"
```
Then retry:
```
scp `
  -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ".\pet-shop.jar" `
  ubuntu@54.179.121.250:/home/ubuntu/pet-shop.jar
```
A successful result should reach:
```
100%
```
## Commands to run together
In an Administrator PowerShell:
```
$key = "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem"
icacls $key /inheritance:r
icacls $key /remove "DESKTOP-FIOUEDG\CodexSandboxUsers"
icacls $key /grant:r "$env:USERDOMAIN\$env:USERNAME:(R)"
icacls $key
```
Then upload again:
```
scp `
  -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ".\pet-shop.jar" `
  ubuntu@54.179.121.250:/home/ubuntu/pet-shop.jar
```
Do not delete the `.pem` file, upload it to Git, or send its contents anywhere. After the JAR upload finishes, remove the temporary SSH port `22` rule from `pet-shop-backend-sg`.