# Project 1 — AWS Read-Only Security Reviewer
You will build a real CLI application that connects to AWS using **read-only permissions**, discovers important resources, evaluates security rules, and produces an evidence-backed security review.
This project trains exactly these skills:
```text
AWS
├── IAM / permissions
├── EC2
├── Security Groups
├── S3
├── RDS
├── VPC
└── resource relationships
Security Review
├── discover environment
├── identify risk
├── collect evidence
├── prioritize findings
└── produce report
Software Engineering
├── Clean Architecture
├── dependency inversion
├── interfaces / ports
├── adapters
├── domain rules
└── testing
```

---
# 1. Main Problem
Imagine you join a company.
They tell you:
> "Here is read-only access to our AWS account. Tell us what looks dangerous."
You must inspect the environment without changing anything.
Your application should eventually support:
```bash
python -m app.cli review
```
And produce something like:
```text
AWS SECURITY REVIEW
Account: 123456789
Region: ap-southeast-1
Resources discovered
────────────────────
VPC                  2
EC2                  5
Security Groups     14
S3 Buckets           7
RDS                   2
Findings
────────────────────
[CRITICAL] RDS publicly accessible
Resource: production-db
Evidence:
  publicly_accessible=true
[HIGH] SSH open to the Internet
Resource: sg-012345
Evidence:
  protocol=tcp
  port=22
  source=0.0.0.0/0
[HIGH] S3 bucket allows public access
Resource: company-assets
[MEDIUM] Security group has unrestricted ingress
Resource: sg-web
Port: 8080
Source: 0.0.0.0/0
```
But the important requirement is:
> **Every claim must have evidence.**

---
# 2. Architecture
Use **Clean Architecture**.
```text
┌─────────────────────────────────────────────┐
│                 Presentation                │
│                                             │
│              CLI / Commands                 │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│                 Application                 │
│                                             │
│  ReviewAwsEnvironment                       │
│  DiscoverEnvironment                        │
│  EvaluateSecurity                           │
│  GenerateReport                             │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│                   Domain                    │
│                                             │
│ CloudResource                               │
│ Finding                                     │
│ Evidence                                    │
│ Severity                                    │
│ SecurityRule                                │
└────────────────────▲────────────────────────┘
                     │
           interfaces / ports
                     │
┌────────────────────┴────────────────────────┐
│               Infrastructure                │
│                                             │
│ Boto3EC2Adapter                             │
│ Boto3S3Adapter                              │
│ Boto3RDSAdapter                             │
│ Boto3IAMAdapter                             │
│ MarkdownReportWriter                        │
└─────────────────────────────────────────────┘
```
The most important rule:
```text
DOMAIN
  X
  X must NOT know boto3
  X
  X must NOT know AWS SDK
```
Instead:
```text
Application
      │
      ▼
CloudInventoryPort
      ▲
      │ implements
      │
Boto3CloudInventoryAdapter
```

---
# 3. Recommended project structure
```text
aws-security-reviewer/
│
├── app/
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── cloud_resource.py
│   │   │   ├── finding.py
│   │   │   └── evidence.py
│   │   │
│   │   ├── enums/
│   │   │   ├── severity.py
│   │   │   └── resource_type.py
│   │   │
│   │   └── rules/
│   │       ├── security_rule.py
│   │       ├── open_ssh_rule.py
│   │       ├── open_rdp_rule.py
│   │       ├── public_rds_rule.py
│   │       └── public_s3_rule.py
│   │
│   ├── application/
│   │   ├── ports/
│   │   │   ├── ec2_inventory_port.py
│   │   │   ├── s3_inventory_port.py
│   │   │   ├── rds_inventory_port.py
│   │   │   └── report_writer_port.py
│   │   │
│   │   ├── use_cases/
│   │   │   ├── discover_environment.py
│   │   │   ├── evaluate_security.py
│   │   │   ├── review_environment.py
│   │   │   └── generate_report.py
│   │   │
│   │   └── dto/
│   │       └── review_result.py
│   │
│   ├── infrastructure/
│   │   ├── aws/
│   │   │   ├── ec2_adapter.py
│   │   │   ├── s3_adapter.py
│   │   │   ├── rds_adapter.py
│   │   │   └── iam_adapter.py
│   │   │
│   │   └── reporting/
│   │       ├── markdown_report_writer.py
│   │       └── json_report_writer.py
│   │
│   ├── presentation/
│   │   └── cli.py
│   │
│   └── bootstrap.py
│
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   └── application/
│   │
│   └── integration/
│       └── aws/
│
├── reports/
│
├── pyproject.toml
├── README.md
└── .gitignore
```

---
# 4. Domain model
Start with four important concepts.
## `CloudResource`
Represents something discovered inside AWS.
Example:
```text
CloudResource
├── id
├── name
├── type
├── region
├── properties
└── tags
```
Example object:
```python
CloudResource(
    id="i-12345",
    name="production-api",
    type=ResourceType.EC2,
    region="ap-southeast-1",
    properties={
        "public_ip": "1.2.3.4",
        "state": "running"
    }
)
```

---
# 5. Finding
A `Finding` is a security problem discovered by your application.
```text
Finding
├── id
├── title
├── description
├── severity
├── resource
├── evidence[]
└── recommendation
```
Example:
```text
Finding
Title
SSH exposed to Internet
Severity
HIGH
Resource
sg-12345
Evidence
port = 22
source = 0.0.0.0/0
Recommendation
Restrict SSH access to trusted networks.
```

---
# 6. Evidence
This is probably the most important object in the entire project.
```text
Evidence
├── source
├── field
├── value
├── resource_id
└── collected_at
```
Example:
```python
Evidence(
    source="EC2.DescribeSecurityGroups",
    resource_id="sg-12345",
    field="IpRanges.CidrIp",
    value="0.0.0.0/0",
    collected_at="2026-09-05T10:15:30Z"
)
```
Now your finding can be traced back to AWS.
```text
Claim
"SSH is publicly exposed"
       │
       ▼
Evidence
SecurityGroup = sg-12345
Port = 22
CIDR = 0.0.0.0/0
       │
       ▼
Source
EC2 DescribeSecurityGroups
```

---
# 7. Severity
Create:
```python
class Severity(Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"
```
Do not worry about perfect industry-standard scoring yet.
Use your own documented rules.

---
# 8. Security rules you must implement
Your first version must support at least these **8 rules**.
### Rule 1 — SSH open to Internet
Detect:
```text
TCP
port 22
source 0.0.0.0/0
```
Severity:
```text
HIGH
```

---
### Rule 2 — RDP open to Internet
Detect:
```text
TCP
port 3389
source 0.0.0.0/0
```
Severity:
```text
HIGH
```

---
### Rule 3 — All traffic allowed
Detect something like:
```text
protocol = ALL
source = 0.0.0.0/0
```
Severity:
```text
CRITICAL
```

---
### Rule 4 — Database port exposed publicly
Detect:
```text
3306 + 0.0.0.0/0
```
or:
```text
5432 + 0.0.0.0/0
```
Severity:
```text
CRITICAL
```

---
### Rule 5 — Public RDS instance
Inspect:
```text
PubliclyAccessible = true
```
Severity:
```text
HIGH
```

---
### Rule 6 — S3 public access protection disabled
Inspect bucket public-access configuration.
Look for unsafe public-access settings.
Severity:
```text
HIGH
```

---
### Rule 7 — EC2 with public IP
This is not automatically a vulnerability.
Report it as:
```text
INFO
```
or possibly `LOW`.
The purpose is environment awareness.

---
### Rule 8 — Security group with broad application port
Examples:
```text
8080
3000
5000
8000
```
accessible from:
```text
0.0.0.0/0
```
Severity:
```text
MEDIUM
```

---
# 9. SecurityRule abstraction
Do **not** put 500 lines of `if` statements inside one AWS service.
Create something conceptually like:
```python
class SecurityRule(ABC):
    @abstractmethod
    def evaluate(
        self,
        resources: list[CloudResource]
    ) -> list[Finding]:
        ...
```
Then:
```text
SecurityRule
     ▲
     │
 ┌───┼───────────────────────────────┐
 │   │                               │
 │   │                               │
 │   │                               │
OpenSSHRule                  PublicRDSRule
OpenRDPRule                  PublicS3Rule
OpenDatabaseRule             ...
```
This makes adding rules easy.

---
# 10. Application use cases
You should have four major use cases.
## Use Case 1 — Discover Environment
```text
DiscoverEnvironment
        │
        ├── get VPCs
        ├── get EC2
        ├── get Security Groups
        ├── get RDS
        └── get S3
        ↓
List<CloudResource>
```

---
# 11. Use Case 2 — Evaluate Security
Input:
```text
CloudResource[]
```
Run:
```text
OpenSSHRule
OpenRDPRule
PublicRDSRule
PublicS3Rule
...
```
Output:
```text
Finding[]
```

---
# 12. Use Case 3 — Generate Report
Input:
```text
resources
findings
```
Output:
```text
reports/aws-review-2026-09-05.md
```

---
# 13. Main orchestration use case
Your most important use case:
```text
ReviewAwsEnvironment
```
It coordinates everything:
```text
┌─────────────────────────┐
│ ReviewAwsEnvironment    │
└───────────┬─────────────┘
            │
            ▼
     Discover resources
            │
            ▼
      Evaluate rules
            │
            ▼
     Prioritize findings
            │
            ▼
      Generate report
```
This use case should **not contain boto3 calls**.

---
# 14. Ports
Your application layer defines what it needs.
For example:
```python
class EC2InventoryPort(Protocol):
    def get_instances(self) -> list[CloudResource]:
        ...
    def get_security_groups(self) -> list[CloudResource]:
        ...
```
The application says:
> "I need something capable of retrieving EC2 information."
It does not say:
> "I need boto3."

---
# 15. Infrastructure adapter
Infrastructure handles boto3.
For example:
```text
EC2InventoryPort
       ▲
       │
       │ implements
       │
Boto3EC2Adapter
       │
       ▼
     boto3
       │
       ▼
      AWS
```
This is Dependency Inversion.

---
# 16. Critical Clean Architecture rule
This dependency is good:
```text
Infrastructure
      ↓
Application
      ↓
Domain
```
This is bad:
```text
Domain
  ↓
boto3
```
Also bad:
```text
Domain
  ↓
CLI
```
And bad:
```text
Application
  ↓
concrete Boto3EC2Adapter
```
Application should depend on the **port**, not the adapter.

---
# 17. AWS authentication
Do not put credentials in your source code.
Never:
```python
boto3.client(
    "ec2",
    aws_access_key_id="ABC...",
    aws_secret_access_key="XYZ..."
)
```
Your repository must contain **zero AWS credentials**.
Use the normal AWS credential chain.
For example:
```bash
aws configure
```
Or preferably later:
```text
IAM Role
AWS SSO
temporary credentials
```

---
# 18. Read-only boundary
Your application is an auditor.
It must never execute operations like:
```text
TerminateInstances
DeleteBucket
PutBucketPolicy
AuthorizeSecurityGroupIngress
ModifyDBInstance
DeleteDBInstance
```
Conceptually:
```text
                 AWS
          ┌──────────────┐
          │     READ     │
          │              │
Reviewer ─► Describe     │
          │ List         │
          │ Get          │
          │              │
          └──────────────┘
               X
               X
               X
          ┌──────────────┐
          │    WRITE     │
          │              │
          │ Create       │
          │ Update       │
          │ Delete       │
          │ Modify       │
          └──────────────┘
```

---
# 19. Report specification
Your generated Markdown report should follow this structure.
```markdown
# AWS Security Review
## Review Information
Account:
Region:
Timestamp:
## Executive Summary
Resources inspected:
Findings:
Critical:
High:
Medium:
Low:
## Environment Inventory
### VPC
### EC2
### Security Groups
### RDS
### S3
## Findings
### F-001 — SSH Open to Internet
Severity: HIGH
Resource:
sg-123
Description:
...
Evidence:

| Source | Field | Value | Timestamp |
|---|---|---|---|
Recommendation:
...
## Risk Priority
1.
2.
3.
## Limitations
...
## Conclusion
...
```

---
# 20. JSON output
Also support:
```bash
python -m app.cli review --format json
```
Example:
```json
{
  "findings": [
    {
      "id": "F-001",
      "title": "SSH exposed to Internet",
      "severity": "HIGH",
      "resource_id": "sg-12345",
      "evidence": [
        {
          "source": "EC2.DescribeSecurityGroups",
          "field": "CidrIp",
          "value": "0.0.0.0/0"
        }
      ]
    }
  ]
}
```

---
# 21. CLI requirements
Minimum:
```bash
python -m app.cli review
```
Then add:
```bash
python -m app.cli review --region ap-southeast-1
```
Then:
```bash
python -m app.cli review --format markdown
```
And:
```bash
python -m app.cli review --format json
```
Optional:
```bash
python -m app.cli review --severity HIGH
```

---
# 22. Phase 1 assignment — Domain only
Do not connect to AWS yet.
Implement:
```text
CloudResource
Evidence
Finding
Severity
ResourceType
SecurityRule
```
Then implement:
```text
OpenSSHRule
```
Use fake data.
Example:
```text
Security Group
├── ID: sg-test
├── protocol: tcp
├── port: 22
└── source: 0.0.0.0/0
```
Expected:
```text
1 HIGH finding
```

---
# 23. Phase 2 — Unit tests
Write tests for:
```text
22 from 0.0.0.0/0
→ HIGH
```
```text
22 from 10.0.0.0/16
→ no finding
```
```text
443 from 0.0.0.0/0
→ no SSH finding
```
```text
3389 from 0.0.0.0/0
→ RDP finding
```
This phase should use **zero AWS calls**.

---
# 24. Phase 3 — Application layer
Implement:
```text
DiscoverEnvironment
EvaluateSecurity
ReviewAwsEnvironment
```
Use fake adapters first.
Example:
```text
FakeEC2Adapter
FakeRDSAdapter
FakeS3Adapter
```
Now you can run the whole application without AWS.
```text
Fake AWS
   │
   ▼
DiscoverEnvironment
   │
   ▼
EvaluateSecurity
   │
   ▼
Findings
```

---
# 25. Phase 4 — AWS integration
Now create:
```text
Boto3EC2Adapter
```
Retrieve:
- EC2 instances
- Security Groups
- VPCs
- subnets
Convert boto3 responses into your own `CloudResource`.
This part is important.
Do not let boto3 dictionaries spread across your application.
Bad:
```text
boto3 dictionary
      │
      ├────────── application
      ├────────── domain
      ├────────── reports
      └────────── rules
```
Good:
```text
AWS response
    │
    ▼
Boto3 Adapter
    │
    ▼
CloudResource
    │
    ▼
rest of application
```

---
# 26. Phase 5 — RDS
Create:
```text
RDSInventoryPort
        ▲
        │
Boto3RDSAdapter
```
Collect at minimum:
```text
DBInstanceIdentifier
Engine
PubliclyAccessible
VpcSecurityGroups
DBSubnetGroup
Endpoint
MultiAZ
StorageEncrypted
```
Add rules:
```text
PublicRDSRule
UnencryptedRDSRule
```

---
# 27. Phase 6 — S3
Create:
```text
S3InventoryPort
        ▲
        │
Boto3S3Adapter
```
Inspect:
```text
bucket
public access block
encryption
versioning
```
Add:
```text
PublicS3Rule
UnencryptedS3Rule
```

---
# 28. Phase 7 — Environment Map
Now create an additional artifact:
```text
reports/environment-map.md
```
Example:
```text
AWS Account
│
└── VPC vpc-production
    │
    ├── Public Subnet
    │   │
    │   └── EC2 production-api
    │       │
    │       └── sg-web
    │
    └── Private Subnet
        │
        └── RDS production-db
            │
            └── sg-database
```
You are trying to answer:
> What talks to what?
Not merely:
> What resources exist?

---
# 29. Phase 8 — Evidence quality
Every finding must contain:
```text
WHAT
```
What was found?
```text
WHERE
```
Which resource?
```text
SOURCE
```
Which AWS API produced the evidence?
```text
WHEN
```
When was it collected?
```text
WHY
```
Why does it represent risk?

---
# 30. Phase 9 — Risk prioritization
Do not simply sort alphabetically.
Implement:
```text
CRITICAL
   ↓
HIGH
   ↓
MEDIUM
   ↓
LOW
   ↓
INFO
```
Then explain the top 3.
Example:
```text
#1 Public database
Reason:
Directly exposes sensitive infrastructure.
#2 SSH from Internet
Reason:
Increases remote attack surface.
#3 Public EC2
Reason:
Exposure exists, but public EC2 alone is not necessarily insecure.
```
This teaches you an important distinction:
```text
Exposure
     ≠
Vulnerability
     ≠
Risk
```

---
# 31. Phase 10 — Error handling
Your reviewer should not crash because one AWS API fails.
Suppose:
```text
EC2 ✓
RDS ✓
IAM ACCESS DENIED
S3 ✓
```
The report should say:
```text
LIMITATION
IAM resources could not be reviewed.
Reason:
AccessDenied
Therefore:
IAM security status is unknown.
```
Do **not** conclude:
```text
IAM is secure.
```
This is another central principle of the workshop:
> **Absence of evidence is not evidence of absence.**

---
# 32. Mandatory tests
You need at least these categories.
### Domain tests
```text
Security Rule
     +
Cloud Resource
     ↓
Finding / no Finding
```

---
### Application tests
Test:
```text
FakeInventory
      ↓
ReviewAwsEnvironment
      ↓
Expected findings
```
No AWS required.

---
### Adapter tests
Test transformation:
```text
AWS response
     ↓
Boto3Adapter
     ↓
CloudResource
```

---
### Report tests
Given:
```text
3 findings
```
Verify report contains:
```text
Critical count
High count
Evidence
Resource ID
Recommendation
```

---
# 33. Important edge cases
Your application should handle:
```text
0 resources
```
```text
no findings
```
```text
AWS API AccessDenied
```
```text
resource has no Name tag
```
```text
IPv6 ::/0 instead of 0.0.0.0/0
```
```text
Security Group allows a port range
20-30
```
Port `22` is therefore exposed.
That last one is a good test of your logic.

---
# 34. Definition of Done — Version 1
Your project is complete when all of these work:
-  Clean Architecture boundaries are respected.
-  Domain contains no boto3 imports.
-  Application contains no boto3 imports.
-  AWS access is read-only.
-  EC2 resources can be discovered.
-  Security Groups can be inspected.
-  RDS can be inspected.
-  S3 can be inspected.
-  At least 8 security rules exist.
-  Every finding contains evidence.
-  Evidence contains its source.
-  Evidence contains timestamp.
-  Findings have severity.
-  Findings are prioritized.
-  Markdown report works.
-  JSON report works.
-  AccessDenied does not crash the entire scan.
-  Unit tests exist.
-  Fake adapters allow testing without AWS.
-  No credentials exist in Git.

---
# 35. Your final portfolio artifacts
When you finish, the repository should produce:
```text
aws-security-reviewer/
│
├── reports/
│   ├── environment-map.md
│   ├── security-review.md
│   ├── findings.json
│   └── evidence.json
```
Those four files are valuable because they show different capabilities.
```text
environment-map.md
→ I understand cloud architecture
security-review.md
→ I can review security
findings.json
→ I can build tooling
evidence.json
→ I understand evidence-based investigation
```

---
# 36. Advanced Challenge 1 — IAM analysis
After Version 1, inspect:
```text
IAM Roles
IAM Policies
```
Detect dangerous patterns such as:
```json
{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "*"
}
```
Finding:
```text
CRITICAL
Administrator-like unrestricted IAM permission
```

---
# 37. Advanced Challenge 2 — Compare two scans
Run:
```bash
review --output scan-1.json
```
Later:
```bash
review --output scan-2.json
```
Then:
```bash
python -m app.cli diff scan-1.json scan-2.json
```
Output:
```text
NEW FINDINGS
+ sg-123 now exposes port 22
RESOLVED FINDINGS
- RDS production-db is no longer public
CHANGED RESOURCES
~ EC2 production-api received public IP
```
This introduces **change detection**.

---
# 38. Advanced Challenge 3 — Causal / relationship graph
Instead of resources existing independently, model relationships.
```text
Internet
    │
    ▼
Security Group
    │
    ▼
EC2
    │
    ▼
Security Group
    │
    ▼
RDS
```
Then your reviewer can eventually reason:
```text
RDS itself is private.
BUT
Internet
  ↓
EC2
  ↓
RDS
Therefore RDS may still be indirectly reachable
through the application path.
```
This is much more advanced security analysis.

---
# 39. Advanced Challenge 4 — AI Agent
Only add AI **after the normal reviewer works**.
Architecture:
```text
                   User
                     │
                     ▼
                AI Agent
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
Environment      Findings       Evidence
 Tool             Tool            Tool
       │             │             │
       └─────────────┼─────────────┘
                     │
                     ▼
             Your application
                     │
                     ▼
                    AWS
```
The Agent should never directly get arbitrary boto3 access.
Instead expose controlled tools such as:
```text
get_environment()
get_findings()
get_evidence(finding_id)
get_resource(resource_id)
```
That will become **Project 2** later.

---
# 40. One rule for the entire project
Put this in your README:
```text
┌────────────────────────────────────────┐
│                                        │
│        NO CLAIM WITHOUT EVIDENCE       │
│                                        │
└────────────────────────────────────────┘
```
And follow this pattern:
```text
OBSERVATION
    │
    ▼
HYPOTHESIS
    │
    ▼
AWS DATA
    │
    ▼
EVIDENCE
    │
    ▼
FINDING
    │
    ▼
SEVERITY
    │
    ▼
RECOMMENDATION
```
## Your first task
Don't start with boto3 yet.
Build only this:
```text
domain/
├── CloudResource
├── Evidence
├── Finding
├── Severity
├── SecurityRule
└── OpenSSHRule
```
And make these three tests pass:
```text
22 + 0.0.0.0/0
→ HIGH finding
22 + 10.0.0.0/16
→ no finding
443 + 0.0.0.0/0
→ no OpenSSHRule finding
```
Once these work, you have built the **core brain** of the security reviewer. The AWS integration comes afterward.