It is **almost right**, but change two settings before launching.
## Use these storage settings
```
Size: 10 GiB
Volume type: gp3
Encrypted: Yes
File systems: None
Additional volumes: None
```
Your screenshot currently shows:
```
8 GiB
gp3
Not encrypted
```
### What to change
1. Change `8` to:
```
10
```
Eight GiB can work, but 10 GiB gives more room for Ubuntu, Java, your Spring Boot JAR, Nginx, updates, and logs.
2. Click **Advanced** in the upper-right corner.
Find the encryption option and enable:
```
Encrypted: Yes
```
You can normally use the default AWS-managed EBS encryption key:
```
aws/ebs
```
3. Leave these unchanged:
```
Volume type: gp3
IOPS: 3000
File systems: None
```
Do not click **Add new volume**. One root volume is enough for this learning server.
## About the warning
This message is not an error:
> The selected AMI contains instance store volumes, however the instance does not allow any instance store volumes.
It means the selected EC2 instance type does not support temporary instance-store disks. Your EC2 server will use its EBS `gp3` root volume instead, which is correct.
Your final storage configuration should look like:
```
1 × 10 GiB gp3
Root volume
3000 IOPS
Encrypted
```
Also check under **Advanced** that:
```
Delete on termination: Yes
```
This prevents the learning server’s root disk from remaining and continuing to generate storage charges after you terminate the EC2 instance.