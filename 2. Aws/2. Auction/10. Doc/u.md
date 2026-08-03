

## Problem 11: Test the new user before signing out of root
You need to know that the IAM user works before abandoning the root session.
## Solution
Open a private or incognito browser window.
Then sign in using:
```
Account ID or alias:
Your AWS Account ID
IAM username:
auction-dev-admin
Password:
Your IAM user password
MFA code:
Current authenticator code
```
Confirm that you can open services such as:
```
EC2
S3
RDS
IAM
```
After the test succeeds, return to the root-user browser window and sign out.
## Common wrong approach
A beginner may create `auction-dev-admin` and then create an access key for it because it has administrator permissions.
That produces:
```
Administrator IAM user
    ↓
Long-term access key
    ↓
Key saved in FastAPI .env
    ↓
Application receives administrator power
```
This is dangerous and unnecessary.
Use:
```
auction-dev-admin
    ↓
Human Console administration
```
And later:
```
FastAPI on EC2
    ↓
Restricted IAM role
    ↓
Only required S3 or other permissions
```
# Creation Checklist
- [ ]  Sign in as the root user
- [ ]  Open IAM
- [ ]  Open **Users**
- [ ]  Select **Create user**
- [ ]  Enter `auction-dev-admin`
- [ ]  Enable AWS Management Console access
- [ ]  Create a strong password
- [ ]  Create or select the `auction-admins` group
- [ ]  Attach `AdministratorAccess` to the group
- [ ]  Add `auction-dev-admin` to the group
- [ ]  Do not create an access key
- [ ]  Create the IAM user
- [ ]  Save the Account ID, username, password, and sign-in URL
- [ ]  Enable MFA for `auction-dev-admin`
- [ ]  Test sign-in in a private browser window
- [ ]  Sign out of the root user
# Complete Execution Flow
```
Main Problem:
You should not use the root user for daily AWS development
    ↓
Smaller Problem 1:
A separate human identity is required
    ↓
Solution 1:
Create the IAM user auction-dev-admin
    ↓
Smaller Problem 2:
The user must sign in to the Console
    ↓
Solution 2:
Enable console access and create a password
    ↓
Smaller Problem 3:
The user initially has no permissions
    ↓
Solution 3:
Add it to auction-admins with AdministratorAccess
    ↓
Smaller Problem 4:
Administrator access needs extra protection
    ↓
Solution 4:
Enable MFA
    ↓
Smaller Problem 5:
FastAPI must not use human administrator credentials
    ↓
Solution 5:
Do not create access keys; use an EC2 IAM role later
    ↓
Smaller Problem 6:
The new identity must be verified
    ↓
Solution 6:
Test IAM sign-in, then sign out of root
    ↓
Complete workflow
```










## Main Problem
You are creating `auction-dev-admin` for yourself, and AWS is showing two different ideas on the same screen:
```
1. Should this user change the temporary password at first sign-in?
2. Can this user later use console login for local development tools?
```
These are separate settings.



### Problem 4: What does the new sentence about local development mean?
Your screen says:
> In addition to console access, users with `SignInLocalDevelopmentAccess` permissions can use the same console credentials for programmatic access without the need for access keys.
This does **not** mean that checking **Provide user access to the AWS Management Console** automatically gives programmatic access.
### Solution
It means AWS now supports an additional login method for development tools.
Normally, you use console credentials like this:
```
Browser
    ↓
Account ID + IAM username + password + MFA
    ↓
AWS Management Console
```
With the additional `SignInLocalDevelopmentAccess` permission, compatible tools can open a browser login:
```
AWS CLI or SDK on your computer
    ↓
Browser opens
    ↓
You sign in using auction-dev-admin
    ↓
AWS creates temporary credentials
    ↓
CLI or SDK uses those temporary credentials
```
This avoids creating permanent access keys. AWS says this feature uses a browser-based authentication flow and generates temporary credentials for local tools.



### Problem 5: Does `auction-dev-admin` already have `SignInLocalDevelopmentAccess`?
Not merely because that sentence appears.
The message is informational.
### Solution
The user would need the AWS-managed policy:
```
SignInLocalDevelopmentAccess
```
attached to the user, a group, or a role it uses. AWS confirms that this policy grants programmatic access through console credentials.
For the task you are doing now, you do not need to configure this yet.
Your current purpose is:
```
auction-dev-admin
    ↓
Human signs in to AWS Management Console
```
Later, for local command-line development, you can learn the browser-based AWS CLI sign-in method separately.



### Common wrong approach
A beginner may read the message and think:
```
I enabled console access
    ↓
My FastAPI app can now use my password directly
```
That is incorrect.
Your console username and password should not be written into Python code or `.env`.
The browser-based local-development feature requires the specific permission and an interactive sign-in flow. Production applications on EC2 should use IAM roles instead.
## What to select now
For the exact screen in your image, keep:
```
User name:
auction-dev-admin
☑ Provide user access to the AWS Management Console
● Autogenerated password
☑ Users must create a new password at next sign-in
```
Then continue to the permissions page.
## Complete execution flow
```
Main Problem:
auction-dev-admin needs a safe first password
    ↓
Smaller Problem 1:
AWS generated a password that you did not choose
    ↓
Solution 1:
Keep “Users must create a new password at next sign-in” selected
    ↓
Smaller Problem 2:
The user needs permission to replace that password
    ↓
Solution 2:
AWS adds IAMUserChangePassword automatically
    ↓
Smaller Problem 3:
AWS mentions programmatic local access
    ↓
Solution 3:
Understand that it requires SignInLocalDevelopmentAccess and browser login
    ↓
Smaller Problem 4:
Production FastAPI also needs AWS access
    ↓
Solution 4:
Use an EC2 IAM role, not the IAM user's password
    ↓
Complete workflow
```













### Main Problem
You are creating an IAM user named `auction-dev-admin`.
The user exists inside AWS, but AWS must know whether this user should be able to open the AWS website and sign in through a browser.
That is what this option controls:
```
Provide user access to the AWS Management Console
```


#### Common wrong approach
A beginner may think:
```
Provide console access
    ↓
Automatically gives administrator permission
```
That is incorrect.
Console access and permissions solve different problems:
```
Console password
    ↓
Who are you?
IAM policy
    ↓
What are you allowed to do?
```
### What to choose on your screen
Use:
```
User name:
auction-dev-admin
☑ Provide user access to the AWS Management Console
● Autogenerated password
☑ Users must create a new password at next sign-in
```
Then click **Next**.
### Complete execution flow
```
Main Problem:
auction-dev-admin must replace the root user for normal browser work
    ↓
Smaller Problem 1:
The IAM user has no browser password by default
    ↓
Solution 1:
Enable “Provide user access to the AWS Management Console”
    ↓
Smaller Problem 2:
The user needs an initial password
    ↓
Solution 2:
Let AWS generate a temporary password
    ↓
Smaller Problem 3:
The temporary password should not remain permanent
    ↓
Solution 3:
Require a new password at first sign-in
    ↓
Smaller Problem 4:
A password does not grant AWS permissions
    ↓
Solution 4:
Assign permissions on the next page
    ↓
Complete workflow
```