# Main Problem
Your UC09 is **mostly correct** and has the most important concurrency protection:
```
SELECT ... FOR UPDATE
```
That prevents two simultaneous bids from both reading the same `current_price` and incorrectly becoming the winning bid.
However, several business validations are missing, especially the auction item’s status, the first-bid calculation, user status, and optional auction rules such as deposits and automatic extension.
## Problem 1: The auction item itself is not validated
#### Solution
After locking and finding the item, verify that its status is `OPEN`.
The session may be `ACTIVE`, but an individual item could still be:
```
DRAFT
READY
SOLD
UNSOLD
CANCELLED
```
A bid should only be accepted when:
```
item.status == AuctionItemStatus.OPEN
```
Otherwise:
```
400 AUCTION_ITEM_NOT_OPEN
```
#### Why this works
The session controls the overall event, while `auction_items.status` controls whether that specific item can receive bids.
Checking only the session allows bids on cancelled, sold, or not-yet-open items.

---
## Problem 2: The first bid calculation may be incorrect
#### Solution
Define the minimum bid differently depending on whether the item already has a bid.
```
If there is no current winning bid:
    minimumBid = startingPrice
If there is already a current winning bid:
    minimumBid = currentPrice + minIncrement
```
Example:
```
startingPrice = 10,000,000
currentPrice = null
First valid bid = 10,000,000
```
After the first bid:
```
currentPrice = 10,000,000
minIncrement = 50,000
Next valid bid = 10,050,000
```
Do not automatically require:
```
startingPrice + minIncrement
```
for the first bid unless that is your intended business rule.

---
## Problem 3: The bidder account status should be checked
#### Solution
The authentication dependency should ensure the bidder is:
```
Authenticated
ACTIVE
```
A banned user should not be able to bid even with an unexpired JWT.
Possible error:
```
403 USER_BANNED
```
This can be handled before entering the bidding service through a dependency such as:
```
CurrentActiveUserDep
```

---
## Problem 4: The session rule may not exist
#### Solution
Check that the auction session has a rule before calculating the minimum bid.
```
If no rule exists:
    return 409 AUCTION_RULE_NOT_CONFIGURED
```
Alternatively, your session activation use case should guarantee that a session cannot become `ACTIVE` without a rule.
The second approach is cleaner:
```
Session cannot become ACTIVE unless:
- It has a rule
- It has valid auction items
- Its required configuration is complete
```
The bid use case should still defend against inconsistent database data.

---
## Problem 5: The previous winning bid update needs a precise query
#### Solution
Update only the existing winning bid for this item:
```
UPDATE bids
SET status = 'OUTBID'
WHERE item_id = :item_id
  AND status = 'WINNING';
```
Do not update bids globally or by session only.
Because the auction item row is locked, another bid transaction for the same item must wait before changing the winning bid.
You should also enforce the invariant:
```
An auction item has at most one WINNING bid.
```
MySQL does not provide PostgreSQL-style partial unique indexes, so this is usually protected through:
```
Transaction
+ auction item row lock
+ controlled service logic
```

---
## Problem 6: Time validation can race with transaction execution
#### Solution
Check the time after locking the item and before writing the new bid:
```
now = datetime.now(timezone.utc)
if now < session.start_time or now >= session.end_time:
    raise AppException(
        status_code=400,
        code="AUCTION_NOT_ACTIVE",
    )
```
Use this boundary:
```
start_time <= now < end_time
```
At exactly `end_time`, bidding is closed.
Store and compare timestamps consistently, preferably in UTC.

---
## Problem 7: Auto-extension is not included
#### Solution
Your session rule contains fields such as:
```
auto_extend_enabled
auto_extend_minutes
```
If automatic extension belongs to your system, UC09 should include it.
Example rule:
```
If a bid is placed during the final 2 minutes,
extend the session or item closing time by 2 minutes.
```
Possible logic:
```
If autoExtendEnabled is true
and remaining time <= autoExtendMinutes:
    session.end_time += autoExtendMinutes
```
However, extending the entire session may affect every item. A better model for independent item auctions is to give each item its own:
```
opened_at
closed_at
```
Then extend `item.closed_at`, not `session.end_time`.
You need to decide whether:
```
All items close with the session
```
or:
```
Each item has an independent closing time
```
For your current schema, session-level closing is acceptable, but every item in that session would be extended together.
## Recommended UC09
```
## UC09 - Place Bid
#### Actor
Logged-in ACTIVE user who is not the seller of the auction session.
#### Goal
Place a valid bid on an open auction item.
#### Page
`/auction-items/:itemId`
#### API
`POST /api/v1/auction-items/{itemId}/bids`
#### Headers
Authorization: Bearer <accessToken>
Content-Type: application/json
#### Request body
{
  "amount": 13000000
}
#### Preconditions
- User is authenticated.
- User status is ACTIVE.
- Auction item exists.
- Auction item status is OPEN.
- Auction session exists and is ACTIVE.
- Current time satisfies:
  `session.start_time <= now < session.end_time`
- Bidder is not the session seller.
- Auction session rule exists.
#### Backend flow
1. Bidder opens the auction item detail page.
2. Bidder enters the bid amount.
3. Frontend calls:
   `POST /api/v1/auction-items/{itemId}/bids`.
4. Backend gets `bidderId` from the JWT.
5. Backend verifies that the bidder account is ACTIVE.
6. Backend starts a database transaction.
7. Backend finds and locks the auction item using:
   `SELECT ... FROM auction_items WHERE id = :item_id FOR UPDATE`.
8. If the item does not exist, return `404 AUCTION_ITEM_NOT_FOUND`.
9. Verify the item status is `OPEN`.
10. Load the auction session associated with the item.
11. If the session does not exist, return `404 AUCTION_SESSION_NOT_FOUND`.
12. Verify the session status is `ACTIVE`.
13. Verify:
    `session.start_time <= current_time < session.end_time`.
14. Verify the bidder is not the session seller.
15. Load the auction session rule.
16. If the rule does not exist, return `409 AUCTION_RULE_NOT_CONFIGURED`.
17. Calculate the minimum valid bid:
    - If no winning bid exists:
      `minimumBid = item.starting_price`
    - Otherwise:
      `minimumBid = item.current_price + rule.min_increment`
18. If `request.amount < minimumBid`, return `400 BID_TOO_LOW`.
19. Find the current `WINNING` bid for this item.
20. If one exists, update its status to `OUTBID`.
21. Create the new bid:
    - `item_id = item.id`
    - `session_id = item.session_id`
    - `bidder_id = current user id`
    - `amount = request.amount`
    - `status = WINNING`
22. Update:
    `auction_items.current_price = request.amount`.
23. Apply automatic closing-time extension if enabled.
24. Commit the transaction.
25. Return the new winning bid.
```
## Suggested validation errors
```
404 AUCTION_ITEM_NOT_FOUND
404 AUCTION_SESSION_NOT_FOUND
400 AUCTION_ITEM_NOT_OPEN
400 AUCTION_SESSION_NOT_ACTIVE
400 AUCTION_NOT_STARTED
400 AUCTION_ENDED
403 CANNOT_BID_ON_OWN_AUCTION
409 AUCTION_RULE_NOT_CONFIGURED
400 BID_TOO_LOW
```
For `BID_TOO_LOW`, returning the required amount is helpful:
```
{
  "status": 400,
  "code": "BID_TOO_LOW",
  "message": "Bid amount must be at least 12050000",
  "data": {
    "currentPrice": 12000000,
    "minIncrement": 50000,
    "minimumBid": 12050000
  }
}
```
## Important transaction order
Use this order consistently:
```
1. Begin transaction
2. Lock auction item
3. Validate current state
4. Mark previous bid OUTBID
5. Insert new WINNING bid
6. Update current_price
7. Commit
```
The important part is that every place-bid request locks the **same auction item row first**. This serializes bids for one item while still allowing users to bid concurrently on different items.
## Common wrong approach
```
item = await repository.find_by_id(item_id)
if amount >= item.current_price + min_increment:
    await bid_repository.create(...)
    item.current_price = amount
```
This is unsafe because two requests may both read:
```
currentPrice = 12,000,000
```
Both requests may then pass validation and create two `WINNING` bids.
Your use of `SELECT FOR UPDATE` solves this correctly.
## Final Assessment
Your design is about **85% complete**. The concurrency design is good. Add these essential rules before implementation:
```
Check item.status == OPEN
Handle the first bid using starting_price
Require an ACTIVE bidder
Define behavior when the session rule is missing
Use start_time <= now < end_time
Update only the item's current WINNING bid
Integrate deposit and auto-extension rules when those features are enabled
```
With those changes, UC09 is suitable for a real FastAPI auction backend.

# Main Problem
UC09 implements the logic that lets an authenticated user place a bid safely on an auction item.
The difficult part is not simply inserting a row into the `bids` table. The backend must guarantee that:
```
Only valid users can bid
Only open items can receive bids
The bid amount is high enough
The seller cannot bid on their own item
Only one bid remains WINNING
Simultaneous bids do not corrupt current_price
```
The implementation handles these rules inside one database transaction.
## Problem 1: Where does the bidder identity come from?
#### Solution
The endpoint is:
```
POST /api/v1/auction-items/{item_id}/bids
```
The request body only contains:
```
{
  "amount": 13000000
}
```
It does not accept `bidderId` from the frontend.
Instead, the backend reads the current user from the JWT:
```
Authorization: Bearer <accessToken>
```
The new dependency:
```
get_current_active_user()
```
checks two things:
```
The JWT is valid
The user status is ACTIVE
```
#### Why this solution works
The frontend must not decide which user owns the bid.
For example, this would be unsafe:
```
{
  "bidderId": "another-user-id",
  "amount": 13000000
}
```
A malicious user could replace `bidderId` and create bids for another account.
Getting the user ID from the verified JWT means:
```
bid.bidder_id = authenticated_user.id
```
If the account is banned or inactive, the backend returns:
```
403 USER_NOT_ACTIVE
```
## Problem 2: Why is the auction item row locked?
#### Solution
The repository now has:
```
find_by_id_for_update()
```
Conceptually, it runs:
```
SELECT *
FROM auction_items
WHERE id = :item_id
FOR UPDATE;
```
#### Why this solution works
Suppose the current price is:
```
12,000,000
```
Two users bid at almost exactly the same time:
```
User A: 12,100,000
User B: 12,200,000
```
Without a row lock, both requests might read:
```
current_price = 12,000,000
```
Both requests could pass validation and both could create a `WINNING` bid.
With `FOR UPDATE`:
```
Transaction A locks the item
Transaction B waits
Transaction A creates its bid and updates current_price
Transaction A commits
Transaction B continues and reads the new current_price
```
Therefore, bids for the same item are processed one by one.
Bids on different items can still happen concurrently because they lock different rows.
## Problem 3: What validations happen before accepting the bid?
#### Solution
After locking the item, the service checks the current auction state.
##### Auction item exists
If the item cannot be found:
```
404 AUCTION_ITEM_NOT_FOUND
```
##### Auction session exists
The item must belong to a valid auction session.
If the session cannot be found:
```
404 AUCTION_SESSION_NOT_FOUND
```
Normally, a foreign key should prevent this situation. The check still protects the service from inconsistent data.
##### Item is open
The item must have:
```
status = OPEN
```
Otherwise:
```
400 ITEM_NOT_OPEN
```
This prevents bidding on items that are:
```
DRAFT
READY
SOLD
UNSOLD
CANCELLED
```
##### Session is active
The parent session must have:
```
status = ACTIVE
```
Otherwise:
```
400 SESSION_NOT_ACTIVE
```
##### Current time is inside the auction window
The bid is accepted only when:
```
session.start_time <= current_time < session.end_time
```
Otherwise:
```
400 AUCTION_NOT_IN_PROGRESS
```
This covers both situations:
```
The auction has not started
The auction has already ended
```
##### Auction rule exists
The system needs the session rule to get:
```
min_increment
```
If the rule does not exist:
```
409 AUCTION_RULE_NOT_CONFIGURED
```
`409 Conflict` is reasonable because the request conflicts with the current configuration of the auction session.
##### Bidder is not the seller
The service compares:
```
current_user.id
```
with:
```
session.seller_id
```
If they are equal:
```
403 FORBIDDEN
```
This prevents a seller from increasing the price of their own item using their normal account.
## Problem 4: How is the minimum valid bid calculated?
#### Solution
The implementation supports two cases.
##### Case 1: No bid has been placed yet
The minimum valid amount is:
```
minimumBid = item.starting_price
```
Example:
```
Starting price = 10,000,000
Current price = null
```
The first bidder may bid:
```
10,000,000
```
They do not need to bid:
```
10,050,000
```
unless your business rule explicitly requires the first bid to include an increment.
##### Case 2: The item already has a current price
The minimum valid amount becomes:
```
minimumBid = item.current_price + rule.min_increment
```
Example:
```
Current price = 12,000,000
Minimum increment = 50,000
```
Calculation:
```
12,000,000 + 50,000 = 12,050,000
```
Therefore:
```
12,040,000 → rejected
12,050,000 → accepted
13,000,000 → accepted
```
If the amount is too low, the API returns:
```
400 BID_TOO_LOW
```
The error details include `minimumBid`, which is useful for the frontend.
For example:
```
{
  "status": 400,
  "code": "BID_TOO_LOW",
  "message": "Bid amount is too low",
  "data": {
    "minimumBid": 12050000
  }
}
```
The frontend can then show:
```
Your bid must be at least 12,050,000 VND.
```
## Problem 5: How does the system maintain one winning bid?
#### Solution
Inside the same transaction, the service performs these operations:
```
1. Find the existing WINNING bid
2. Change it to OUTBID
3. Create the new bid as WINNING
4. Update item.current_price
```
Example before the request:
```
Bid A: 12,000,000 — WINNING
Auction item current_price: 12,000,000
```
A new valid bid of `13,000,000` arrives.
After the request:
```
Bid A: 12,000,000 — OUTBID
Bid B: 13,000,000 — WINNING
Auction item current_price: 13,000,000
```
#### Why this solution works
The bid history remains available.
The old bid is not deleted because it may be needed for:
```
Auction history
Bidder activity
Audit records
Price progression
Dispute investigation
```
Only its status changes from:
```
WINNING
```
to:
```
OUTBID
```
## Problem 6: Why must everything happen in one transaction?
#### Solution
The full placement logic is implemented in:
```
modules/bids/bid_service.py
```
and runs inside one transaction.
The logical order is:
```
Begin transaction
Lock auction item
Validate item, session, time, seller and amount
Mark previous winning bid as OUTBID
Create new winning bid
Update current_price
Commit
```
#### Why this solution works
The transaction makes these changes atomic.
That means either all changes succeed:
```
Old bid becomes OUTBID
New bid becomes WINNING
Current price changes
```
or none of them are saved.
For example, suppose the new bid is inserted, but updating `current_price` fails.
Without a transaction, the database could contain:
```
New WINNING bid = 13,000,000
Item current_price = 12,000,000
```
The data would be inconsistent.
With a transaction, the failure causes a rollback, leaving the original state unchanged.
## Problem 7: What does each new file do?
#### Solution
##### `modules/bids/bid_schema.py`
Defines the request and response structures.
The request probably contains:
```
class PlaceBidRequest(BaseModel):
    amount: Decimal
```
The response model controls the returned fields:
```
id
itemId
sessionId
bidderId
amount
status
createdAt
```
Its purpose is validation and API serialization.
##### `modules/bids/bid_repository.py`
Handles bid-related database queries, such as:
```
Find the current WINNING bid for an item
Create a new bid
Possibly update the previous bid status
```
The repository should focus on database access rather than business decisions.
##### `modules/bids/bid_service.py`
Contains the business rules:
```
Can this user bid?
Is the auction currently active?
What is the minimum bid?
Should the previous bid become OUTBID?
```
This is the most important file for UC09.
##### `modules/bids/bid_router.py`
Defines the HTTP endpoint:
```
POST /api/v1/auction-items/{item_id}/bids
```
Its job is to:
```
Receive the path parameter
Validate the request body
Resolve the authenticated user
Call the bid service
Return HTTP 201
```
##### `modules/auction_items/item_repository.py`
Adds:
```
find_by_id_for_update()
```
This query locks the item row before validating and updating it.
##### `app/core/dependencies.py`
Adds:
```
get_current_active_user()
```
This blocks inactive users before the bid logic is executed.
##### `app/main.py`
Registers the bid router so FastAPI exposes the endpoint and Swagger displays it under:
```
Bids
```
## Problem 8: What does the success response mean?
#### Solution
A successful bid returns HTTP `201 Created`:
```
{
  "status": 201,
  "code": 1000,
  "message": "Place bid successfully",
  "data": {
    "id": "bid-uuid",
    "itemId": "item-uuid",
    "sessionId": "session-uuid",
    "bidderId": "bidder-uuid",
    "amount": 13000000,
    "status": "WINNING",
    "createdAt": "2026-07-20T10:30:00"
  }
}
```
The important fields are:
```
id
```
The newly created bid ID.
```
itemId
```
The auction item receiving the bid.
```
sessionId
```
The parent auction session.
```
bidderId
```
The authenticated user who placed it.
```
amount
```
The accepted bid amount.
```
status = WINNING
```
At the moment the response is returned, this is the highest valid bid.
It may later become `OUTBID` when another user places a higher bid.
## Problem 9: Why is automatic extension skipped?
#### Solution
The earlier UC09 design mentioned extending the auction closing time when a late bid is placed.
However, the current `auction_session_rules` table only contains:
```
min_increment
```
It does not yet contain fields such as:
```
auto_extend_enabled
auto_extend_threshold_minutes
auto_extend_minutes
```
Therefore, step 23 currently does nothing.
This is described as a no-op:
```
No database field exists
No time is changed
The bid still succeeds normally
```
#### Why this is the correct decision
The backend should not implement imaginary configuration.
Adding extension logic without corresponding schema fields would force hardcoded behavior, such as:
```
if remaining_minutes <= 2:
    session.end_time += timedelta(minutes=2)
```
That would make the rule difficult to configure and maintain.
It is better to add it later through a separate migration and use case.
## How to test it in Swagger
#### Step 1: Prepare two users
You need:
```
User A = seller
User B = bidder
```
The bidder must not be the seller of the session.
#### Step 2: Prepare valid auction data
Make sure:
```
The item status is OPEN
The session status is ACTIVE
The current time is between start_time and end_time
The session has a rule
The rule has min_increment
```
#### Step 3: Login as the bidder
Call:
```
POST /api/v1/auth/login
```
Use the credentials of User B.
Copy the returned:
```
accessToken
```
#### Step 4: Authorize Swagger
Click:
```
Authorize
```
Paste only the token, unless your Swagger configuration specifically requests the full `Bearer` value.
#### Step 5: Get the UUID in API format
Use a standard UUID:
```
4381bbad-04ac-4088-b0b4-85fca226ef68d
```
Do not use the MySQL hexadecimal display:
```
0x4381BBAD04AC4088B0B485CA226EF68D
```
#### Step 6: Place the bid
Call:
```
POST /api/v1/auction-items/{item_id}/bids
```
Request:
```
{
  "amount": 13000000
}
```
#### Step 7: Verify the database
After success, you should see:
```
A new bid with status WINNING
The previous bid changed to OUTBID, if one existed
auction_items.current_price changed to 13,000,000
```
## Common Wrong Approach
A beginner may implement the flow like this:
```
item = await item_repository.find_by_id(item_id)
minimum_bid = item.current_price + rule.min_increment
if request.amount >= minimum_bid:
    await bid_repository.create(...)
    item.current_price = request.amount
```
This is unsafe because there is no row lock.
Two simultaneous requests can both pass the check using the same old price.
Another wrong approach is trusting the frontend:
```
{
  "bidderId": "some-user-id",
  "amount": 13000000
}
```
The bidder must always come from the verified JWT.
## Final Framework
When processing a bid, remember this sequence:
```
1. Authenticate the user
2. Require an ACTIVE account
3. Begin a transaction
4. Lock the auction item
5. Validate item and session state
6. Validate the auction time
7. Prevent the seller from bidding
8. Load the session rule
9. Calculate the minimum bid
10. Reject an amount that is too low
11. Mark the old winner as OUTBID
12. Create the new WINNING bid
13. Update current_price
14. Commit
```
The implementation is logically sound for the current auction schema. The major missing future features are deposit validation and automatic time extension, but they can be added after their database fields and business rules are defined.