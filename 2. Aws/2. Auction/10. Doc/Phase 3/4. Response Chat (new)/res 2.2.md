What should i choose
![[Pasted image 20260805220332.png]]


Choose:
```
Password authentication
```
That is the correct option for your current Pet Shop learning setup.
Your Spring Boot application will connect using:
```
RDS endpoint
Database name: pet_shop
Username: pet_shop_admin
Password: your secure password
```
Do not choose **Password and IAM database authentication** yet. That option requires extra Spring Boot configuration to generate short-lived IAM authentication tokens and additional IAM permissions. You can enable it later by modifying the RDS instance.
Do not choose **Password and Kerberos authentication**. Kerberos is intended for environments using Microsoft Active Directory and requires additional directory configuration.
So leave the current selection as:
```
● Password authentication
```
Remember: this database password is different from your AWS password. Store it securely in Bitwarden and do not commit it to Git or place it in React variables.