You removed inherited permissions, but that also removed your own ability to read the key file. That is why the error changed to:
```
Load key "...pem": Permission denied
```
Now give only your Windows account read permission.
Run these commands in **PowerShell as Administrator**:
```
$key = "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem"
icacls $key /grant:r "$env:USERDOMAIN\$env:USERNAME:(R)"
icacls $key
```
You should see your account, similar to:
```
DESKTOP-FIOUEDG\ADMIN:(R)
```
Then retry:
```
scp -i "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem" `
  ".\pet-shop.jar" `
  ubuntu@54.179.121.250:/home/ubuntu/pet-shop.jar
```
If the grant command fails, first run:
```
whoami
```
Suppose it returns:
```
desktop-fiouedg\admin
```
Then run:
```
icacls $key /grant:r "DESKTOP-FIOUEDG\ADMIN:(R)"
```
After that, check again:
```
icacls $key
```
The key file should not be readable by:
```
CodexSandboxUsers
Users
Everyone
Authenticated Users
```
A complete repair sequence is:
```
$key = "C:\Users\ADMIN\Downloads\pet-shop-backend-key.pem"
icacls $key /inheritance:r
icacls $key /remove "DESKTOP-FIOUEDG\CodexSandboxUsers"
icacls $key /grant:r "DESKTOP-FIOUEDG\ADMIN:(R)"
icacls $key
```
Then retry `scp`.
Your SSH network connection is already working. This remaining problem is only the Windows file permission on the `.pem` key.