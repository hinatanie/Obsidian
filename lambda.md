# Main Problem
You already have a Python FastAPI auction backend containing:
```
Authentication
Auction sessions
Auction items
Place bid
My bids
Start auction
MySQL database
WebSocket / real-time updates
```
You are wondering where **AWS Lambda** should fit.
Do **not** immediately move your entire FastAPI backend into Lambda.
For your auction application, a better design is:
```
FastAPI backend
    ├── handles bidding business rules
    ├── updates MySQL
    ├── returns API responses
    └── publishes background events
AWS Lambda
    ├── sends notifications
    ├── processes uploaded images
    ├── generates reports
    ├── sends payment reminders
    └── performs other asynchronous jobs
```
Lambda works especially well for narrow, event-driven tasks. AWS describes production Lambda systems as commonly responding asynchronously to services such as SQS and S3.

---
## Problem 1: Should your entire FastAPI backend run in Lambda?
Your bidding endpoint performs sensitive, stateful work:
```
Lock auction item
→ validate auction status
→ validate minimum bid
→ replace current winning bid
→ update current price
→ commit database transaction
→ publish real-time update
```
A live auction may also require:
```
WebSocket connections
Consistent low latency
Database transactions
Row locking
Frequent requests during bidding
```
These are easier to manage initially with your existing FastAPI container running on:
```
EC2
or
ECS/Fargate
```
Lambda can expose HTTP APIs through API Gateway, but that does not mean every workload should be converted into Lambda functions. API Gateway can invoke Lambda from HTTP endpoints and provides features such as throttling and authorization.
## Solution
Use a **hybrid architecture**:
```
React frontend
      │
      ▼
FastAPI on EC2/ECS
      │
      ├── MySQL RDS
      ├── Redis / WebSocket
      │
      └── Amazon SQS
                 │
                 ▼
             AWS Lambda
                 │
                 ├── Email
                 ├── Push notification
                 ├── Image processing
                 └── Reports
```
Your main bidding rules remain inside FastAPI.
Lambda handles work that does not need to block the HTTP request.

---
# Problem 2: What can Lambda do in your auction project?
Here are practical uses.
## Solution 1: Notify an outbid user
When user B places a higher bid than user A:
```
User B places bid
→ FastAPI commits the new bid
→ FastAPI sends OUTBID event to SQS
→ Lambda receives event
→ Lambda sends notification to user A
```
The bidder should not wait for email delivery:
```
Bad workflow:
Place bid
→ send email
→ wait for email provider
→ return API response
```
If the mail service is slow, your bidding endpoint becomes slow.
Use:
```
Better workflow:
Place bid
→ save bid
→ publish event
→ return response immediately
Meanwhile:
SQS
→ Lambda
→ send email
```
Lambda can consume SQS messages automatically. Lambda polls the queue and invokes your function with batches of messages.

---
## Solution 2: Process auction item images
Your seller uploads an image:
```
Seller uploads original image to S3
→ S3 triggers Lambda
→ Lambda resizes image
→ Lambda creates thumbnail
→ Lambda saves processed images to S3
```
Possible generated sizes:
```
original/
medium/
thumbnail/
```
Example:
```
auction-items/original/rolex.jpg
auction-items/medium/rolex.jpg
auction-items/thumbnail/rolex.jpg
```
Your FastAPI server does not have to spend CPU resizing images.

---
## Solution 3: Close expired auctions
You can run a scheduled process:
```
EventBridge Scheduler
→ invokes Lambda every minute
→ finds auctions that have ended
→ closes eligible auctions
```
However, because closing an auction involves important database transactions, winner selection and payment creation, I would initially keep the actual `CloseAuctionUseCase` in your backend.
Lambda can call an internal endpoint:
```
Lambda
→ POST /internal/auction-sessions/close-expired
→ FastAPI executes business rules
```
This prevents business rules from being duplicated between FastAPI and Lambda.

---
## Solution 4: Payment reminders
Example:
```
Auction ends
→ winner has 24 hours to pay
→ scheduled Lambda checks overdue payments
→ sends reminders
```

---
## Solution 5: Generate reports
Lambda can generate:
```
Daily auction report
Seller revenue report
Sold versus unsold report
Bid activity report
CSV export
```
These jobs do not need to run inside the main API process.

---
# Problem 3: How should FastAPI communicate with Lambda?
You could invoke Lambda directly:
```
FastAPI → Lambda
```
But that creates stronger coupling.
A better design for your project is:
```
FastAPI → SQS → Lambda
```
SQS temporarily stores the event.
If Lambda fails:
```
Message remains or becomes visible again
→ Lambda can retry
```
This makes your notification processing more resilient.
## Solution
Create one queue:
```
auction-events
```
FastAPI sends events such as:
```
{
  "eventId": "d58dffeb-840c-4fc4-9f86-c5e934ea0651",
  "eventType": "BID_OUTBID",
  "occurredAt": "2026-07-22T15:30:00Z",
  "data": {
    "auctionItemId": "79aeac70-b407-4f26-98ae-bbe22fb64a44",
    "previousBidderId": "0133a5b1-bf72-48e2-adad-018f4a4da879",
    "newPrice": "36000000.00"
  }
}
```
Lambda consumes the event.

---
# Problem 4: How does this connect to `AuctionEventPublisher`?
Previously, your use case depended on an interface:
```
class AuctionEventPublisher(Protocol):
    async def publish(self, event: AuctionEvent) -> None:
        ...
```
The interface does not contain AWS code because the application layer should only know:
```
An auction event must be published
```
It should not know:
```
SQS URL
AWS region
Boto3
Lambda
IAM
```
## Solution
Create an infrastructure implementation:
```
Application layer:
AuctionEventPublisher
Infrastructure layer:
SqsAuctionEventPublisher
```
Project structure:
```
app/
├── application/
│   ├── ports/
│   │   └── auction_event_publisher.py
│   └── use_cases/
│       └── place_bid.py
│
├── infrastructure/
│   └── messaging/
│       └── sqs_auction_event_publisher.py
│
└── presentation/
    └── api/
```

---
# Problem 5: How do you implement the publisher?
## Step 1: Define the event model
```
# app/application/events/auction_event.py
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field
class AuctionEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4, alias="eventId")
    event_type: str = Field(alias="eventType")
    occurred_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        alias="occurredAt",
    )
    data: dict[str, Any]
    model_config = {
        "populate_by_name": True,
    }
```

---
## Step 2: Define the application interface
```
# app/application/ports/auction_event_publisher.py
from typing import Protocol
from app.application.events.auction_event import AuctionEvent
class AuctionEventPublisher(Protocol):
    async def publish(self, event: AuctionEvent) -> None:
        ...
```
This interface means:
```
Any class is acceptable if it provides:
async publish(event)
```
It could later be implemented with:
```
SQS
RabbitMQ
Kafka
Redis Pub/Sub
Fake publisher for testing
```

---
## Step 3: Install AWS SDK
```
pip install boto3
```
Add it to `requirements.txt`:
```
boto3
```

---
## Step 4: Implement the SQS publisher
```
# app/infrastructure/messaging/sqs_auction_event_publisher.py
import asyncio
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from app.application.events.auction_event import AuctionEvent
class SqsAuctionEventPublisher:
    def __init__(
        self,
        queue_url: str,
        region_name: str,
    ) -> None:
        self._queue_url = queue_url
        self._client = boto3.client(
            "sqs",
            region_name=region_name,
        )
    async def publish(self, event: AuctionEvent) -> None:
        message_body = event.model_dump_json(
            by_alias=True,
        )
        try:
            # boto3 is synchronous, so run it outside FastAPI's event loop.
            await asyncio.to_thread(
                self._client.send_message,
                QueueUrl=self._queue_url,
                MessageBody=message_body,
            )
        except (BotoCoreError, ClientError) as exc:
            raise RuntimeError(
                f"Failed to publish auction event: {event.event_type}"
            ) from exc
```
### Why use `asyncio.to_thread()`?
Your FastAPI application is asynchronous, but normal `boto3` calls are synchronous.
This is undesirable:
```
async def publish(...):
    self._client.send_message(...)
```
The synchronous network request can block FastAPI's event loop.
This is safer:
```
await asyncio.to_thread(
    self._client.send_message,
    ...
)
```

---
# Problem 6: How does `PlaceBidUseCase` publish the event?
The use case receives the interface:
```
class PlaceBidUseCase:
    def __init__(
        self,
        bid_repository: BidRepository,
        auction_item_repository: AuctionItemRepository,
        event_publisher: AuctionEventPublisher,
    ) -> None:
        self._bid_repository = bid_repository
        self._auction_item_repository = auction_item_repository
        self._event_publisher = event_publisher
```
After the database transaction succeeds, create the event:
```
from decimal import Decimal
from uuid import UUID
from app.application.events.auction_event import AuctionEvent
async def _publish_outbid_event(
    self,
    auction_item_id: UUID,
    previous_bidder_id: UUID,
    new_price: Decimal,
) -> None:
    event = AuctionEvent(
        eventType="BID_OUTBID",
        data={
            "auctionItemId": str(auction_item_id),
            "previousBidderId": str(previous_bidder_id),
            "newPrice": str(new_price),
        },
    )
    await self._event_publisher.publish(event)
```
Simplified bidding flow:
```
async def execute(
    self,
    bidder_id: UUID,
    auction_item_id: UUID,
    amount: Decimal,
) -> PlaceBidResult:
    previous_winning_bid = (
        await self._bid_repository.find_winning_bid_for_update(
            auction_item_id
        )
    )
    new_bid = await self._create_bid(
        bidder_id=bidder_id,
        auction_item_id=auction_item_id,
        amount=amount,
    )
    await self._transaction.commit()
    if previous_winning_bid is not None:
        await self._publish_outbid_event(
            auction_item_id=auction_item_id,
            previous_bidder_id=previous_winning_bid.bidder_id,
            new_price=new_bid.amount,
        )
    return PlaceBidResult.from_entity(new_bid)
```
Notice the ordering:
```
1. Validate bid
2. Update database
3. Commit transaction
4. Publish event
```
Do not notify someone before the bid transaction succeeds.

---
# Problem 7: How do you configure dependency injection?
In your dependency factory:
```
# app/dependencies/use_cases.py
from app.config import settings
from app.infrastructure.messaging.sqs_auction_event_publisher import (
    SqsAuctionEventPublisher,
)
def get_auction_event_publisher() -> SqsAuctionEventPublisher:
    return SqsAuctionEventPublisher(
        queue_url=settings.auction_events_queue_url,
        region_name=settings.aws_region,
    )
```
Settings:
```
# app/config.py
from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    aws_region: str = "ap-southeast-1"
    auction_events_queue_url: str
    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }
settings = Settings()
```
Environment variables:
```
AWS_REGION=ap-southeast-1
AUCTION_EVENTS_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/123456789012/auction-events
```
For local development, AWS credentials normally come from your AWS CLI profile:
```
aws configure
```
Do not put permanent AWS keys directly in source code:
```
# Wrong
boto3.client(
    "sqs",
    aws_access_key_id="...",
    aws_secret_access_key="...",
)
```
When deployed on EC2, ECS or Lambda, use an IAM role.

---
# Problem 8: What does the Lambda function look like?
Create:
```
lambda_functions/
└── auction_notification/
    └── handler.py
```
Code:
```
# lambda_functions/auction_notification/handler.py
import json
import logging
from typing import Any
logger = logging.getLogger()
logger.setLevel(logging.INFO)
def process_outbid_event(event: dict[str, Any]) -> None:
    data = event["data"]
    previous_bidder_id = data["previousBidderId"]
    auction_item_id = data["auctionItemId"]
    new_price = data["newPrice"]
    logger.info(
        "User %s was outbid on item %s. New price: %s",
        previous_bidder_id,
        auction_item_id,
        new_price,
    )
    # Later:
    # 1. Find the user's email or notification destination.
    # 2. Send email through Amazon SES.
    # 3. Save an in-app notification.
def lambda_handler(
    event: dict[str, Any],
    context: Any,
) -> dict[str, Any]:
    batch_item_failures: list[dict[str, str]] = []
    for record in event.get("Records", []):
        message_id = record["messageId"]
        try:
            auction_event = json.loads(record["body"])
            event_type = auction_event.get("eventType")
            if event_type == "BID_OUTBID":
                process_outbid_event(auction_event)
            else:
                logger.warning(
                    "Unsupported event type: %s",
                    event_type,
                )
        except Exception:
            logger.exception(
                "Failed to process message %s",
                message_id,
            )
            batch_item_failures.append(
                {
                    "itemIdentifier": message_id,
                }
            )
    return {
        "batchItemFailures": batch_item_failures,
    }
```
The partial failure response allows successful messages to remain successful while failed messages can be retried.
AWS recommends partial batch responses for stream and queue processing so only failed records need to be retried.

---
# Problem 9: What happens if Lambda receives the same event twice?
SQS and Lambda processing provide **at-least-once delivery semantics**.
That means this can happen:
```
Message delivered
→ Lambda sends email
→ Lambda crashes before confirming success
→ SQS retries message
→ Lambda sends the same email again
```
AWS explicitly recommends making Lambda handlers idempotent because duplicate processing can occur.
## Solution
Use `eventId` as an idempotency key.
Create a processed-events table:
```
CREATE TABLE processed_events (
    event_id CHAR(36) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
Lambda logic:
```
Receive event
→ check eventId
→ already processed?
    → ignore
→ not processed?
    → send notification
    → save eventId
```
Simplified code:
```
def process_event_once(event: dict[str, Any]) -> None:
    event_id = event["eventId"]
    if processed_event_repository.exists(event_id):
        logger.info("Event already processed: %s", event_id)
        return
    process_outbid_event(event)
    processed_event_repository.save(event_id, event["eventType"])
```
AWS Lambda Powertools for Python also provides an idempotency utility designed for retry-safe Lambda processing.

---
# Problem 10: Should Lambda connect directly to your MySQL RDS database?
It can, but careless Lambda-to-MySQL connections can exhaust database connections because many Lambda instances may run concurrently.
AWS recommends RDS Proxy for production Lambda workloads that open frequent or short database connections. RDS Proxy pools and shares connections instead of every Lambda invocation creating an independent database connection.
## Solution
For a Lambda that needs MySQL:
```
Lambda
   │
   ▼
RDS Proxy
   │
   ▼
MySQL RDS
```
The Lambda function, RDS Proxy and database need compatible VPC networking. AWS states that the Lambda function must be able to reach the database in its VPC, and the proxy must share the database’s VPC.
For your first implementation, avoid database access inside the notification Lambda where possible. Put sufficient information into the event:
```
{
  "eventType": "BID_OUTBID",
  "data": {
    "recipientEmail": "bidder@example.com",
    "auctionItemTitle": "Rolex Submariner",
    "newPrice": "36000000.00"
  }
}
```
Be careful not to include secrets or unnecessary personal data.

---
# Problem 11: What is wrong with publishing immediately after commit?
Consider:
```
MySQL commit succeeds
→ application attempts to send SQS message
→ SQS request fails
```
Now the bid exists, but the notification event is lost.
The reverse is also dangerous:
```
Publish SQS event
→ database commit fails
```
Now Lambda receives an event for a bid that does not exist.
## Production solution: Transactional Outbox
Create an outbox table:
```
CREATE TABLE outbox_events (
    id CHAR(36) PRIMARY KEY,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id CHAR(36) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    status ENUM('PENDING', 'PUBLISHED', 'FAILED')
        NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME NULL
);
```
During `PlaceBidUseCase`, save both the bid and event in one transaction:
```
BEGIN
Update bids
Update auction item
Insert outbox event
COMMIT
```
Then a background publisher performs:
```
Read PENDING outbox records
→ send to SQS
→ mark PUBLISHED
```
This guarantees that your business data and the intention to publish the event are committed together.
For your learning sequence:
```
Phase 1:
FastAPI → SQS → Lambda
Phase 2:
FastAPI transaction → outbox table → SQS → Lambda
Phase 3:
Add idempotency, dead-letter queue and monitoring
```

---
# Common Wrong Approaches
## Wrong approach 1: Put `boto3` directly in `PlaceBidUseCase`
```
class PlaceBidUseCase:
    async def execute(...):
        sqs = boto3.client("sqs")
        sqs.send_message(...)
```
Why it fails architecturally:
```
PlaceBidUseCase becomes dependent on AWS
Testing becomes harder
Changing SQS becomes harder
Application and infrastructure layers become mixed
```
Use:
```
AuctionEventPublisher
```
and implement it with:
```
SqsAuctionEventPublisher
```

---
## Wrong approach 2: Move every endpoint into a separate Lambda immediately
You could end up with:
```
Register Lambda
Login Lambda
Create Session Lambda
Create Item Lambda
Place Bid Lambda
Start Auction Lambda
View Bids Lambda
```
For a learning project, this adds:
```
More deployments
More IAM configuration
More logging locations
More database connection concerns
More distributed debugging
More duplicated dependencies
```
Keep the FastAPI application together until you have a clear scaling reason to split it.

---
## Wrong approach 3: Use Lambda for persistent WebSocket state
Lambda executions are stateless and should not be treated as permanently running application processes. AWS recommends designing Lambda functions as stateless, narrowly scoped components.
API Gateway does support WebSocket APIs with Lambda integrations, but the architecture is different from a permanent FastAPI WebSocket server and typically stores connection IDs externally.
For your current project, continue using:
```
FastAPI WebSocket
+
Redis Pub/Sub
```
for live auction price updates.
Use Lambda for asynchronous side effects.

---
# Complete Execution Flow
## Place-bid request
```
React frontend
    │
    │ POST /api/v1/auction-items/{itemId}/bids
    ▼
FastAPI router
    │
    ▼
PlaceBidUseCase
    │
    ├── lock auction item
    ├── validate session is ACTIVE
    ├── validate item is OPEN
    ├── validate minimum increment
    ├── mark old bid OUTBID
    ├── create new WINNING bid
    ├── update current price
    └── commit MySQL transaction
```
## Real-time path
```
PlaceBidUseCase
    │
    ▼
AuctionEventPublisher
    │
    ▼
RedisAuctionEventPublisher
    │
    ▼
WebSocket
    │
    ▼
Connected auction viewers see new price
```
## Background notification path
```
PlaceBidUseCase
    │
    ▼
AuctionEventPublisher
    │
    ▼
SqsAuctionEventPublisher
    │
    ▼
Amazon SQS
    │
    ▼
AWS Lambda
    │
    ├── checks eventId
    ├── sends outbid notification
    └── records successful processing
```
The important architectural idea is that one business event can have multiple consumers:
```
BidPlacedEvent
    ├── WebSocket consumer → update browser
    ├── Notification consumer → notify previous bidder
    ├── Analytics consumer → record auction activity
    └── Fraud consumer → inspect suspicious bidding
```
For your auction app, the best first Lambda feature is:
```
FastAPI publishes BID_OUTBID to SQS
→ Lambda logs or sends an outbid notification
```
That gives you genuine Lambda experience without risking the correctness of your core bidding transaction.