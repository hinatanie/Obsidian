
# Main Problem
Your use case is **mostly correct**, but it is missing several checks needed to prevent an invalid auction session from becoming `ACTIVE`.  
The most important issue is this:
> In your current database, users have roles `ADMIN` and `USER`. You do not have a `SELLER` role.  
> A normal `USER` becomes the seller because they own the auction session through `seller_id`.
## Problem 1: The actor does not match your database roles
#### Solution
Use these actors:
```
Session Owner
Admin
```
Or:
```
User who created the session
Admin
```
heck ownership:
```
session.seller_id == current_user.id
```
An admin bypasses the ownership check.
## Problem 3: The session rules should exist
Your auction session depends on settings such as:
```
minIncrement
depositRequired
autoExtendEnabled
paymentDueHours
```
Starting the session without its rules could make bidding behave incorrectly.
#### Solution
Before activation, verify that the session has an `auction_session_rules` record.
```
Session must have auction rules configured.
```
## Problem 4: Time validation is missing
You should decide whether the seller can manually start an auction before `startTime`.  
There are two reasonable designs.
###### Strict scheduled start
The session may only start when:
```
currentTime >= startTime
currentTime < endTime
```
This is safer for a scheduled auction.
###### Manual early start
The owner or admin can start it before `startTime`.  
In that design, you should clearly state that starting manually overrides the scheduled start time.  
For your current use case, I recommend:
```
currentTime >= startTime
currentTime < endTime
```
Otherwise, a seller could accidentally start an auction several days early.
## Problem 5: Concurrent requests could start the session twice
The seller might double-click the button, or two requests may reach the backend simultaneously.  
Both requests could read:
```
status = SCHEDULED
```
and then both try to activate the session.
#### Solution
Perform the status check and update inside one database transaction. For stronger protection, lock the session row while updating it.
```
SELECT ... FOR UPDATE
```
The second request will then see that the session is already `ACTIVE`.
## Recommended UC12
````
## UC12 - Start Auction Session
#### Actor
- Session owner
- Active admin
#### Goal
Change an auction session from `SCHEDULED` to `ACTIVE` so bidders can begin placing bids.
#### API
```http
PATCH /api/v1/auction-sessions/{sessionId}/start
````
#### Headers
```
Authorization: Bearer <accessToken>
```
#### Preconditions
- The current user is authenticated and `ACTIVE`.
- The auction session exists.
- The session status is `SCHEDULED`.
- A normal user must own the session.
- An admin may start any session.
- The session has auction rules configured.
- The current time is greater than or equal to `startTime`.
- The current time is earlier than `endTime`.
#### Backend flow
1. User clicks **Start Session**.
2. Frontend calls `PATCH /api/v1/auction-sessions/{sessionId}/start`.
3. Backend gets the current user from the JWT.
4. Backend verifies that the current user has status `ACTIVE`.
5. Backend retrieves and locks the auction session.
6. If the session does not exist, return `AUCTION_SESSION_NOT_FOUND`.
7. If the current user is not an admin:
    - The session's `sellerId` must equal the current user's ID.
8. Backend verifies that the session status is `SCHEDULED`.
9. Backend verifies that auction rules exist.
10. Backend verifies that the current time is within the session's valid time range.
11. Backend changes the session status to `ACTIVE`.
12. Backend commits the transaction.
13. Backend returns the updated session.
## Suggested success response
```
{
  "status": 200,
  "code": 1000,
  "message": "Auction session started successfully",
  "data": {
    "id": "4381bbad-04ac-4088-b0b4-85fca226ef68d",
    "status": "ACTIVE",
    "startedAt": "2026-07-20T09:00:00Z"
  }
}
```
`"Auction session started successfully"` sounds more natural than:
```
Start auction session successfully
```
## Suggested error cases

|HTTP status|Code|Situation|
|---|---|---|
|`401`|`UNAUTHORIZED`|Missing token|
|`401`|`INVALID_ACCESS_TOKEN`|Invalid or expired token|
|`403`|`USER_BANNED`|Current user is not active|
|`403`|`AUCTION_SESSION_ACCESS_DENIED`|User does not own the session|
|`404`|`AUCTION_SESSION_NOT_FOUND`|Session does not exist|
|`409`|`INVALID_SESSION_STATUS`|Session is not `SCHEDULED`|
|`409`|`SESSION_RULES_REQUIRED`|Rules have not been created|
|`409`|`SESSION_NOT_STARTED_YET`|Current time is before `startTime`|
|`409`|`SESSION_ALREADY_ENDED`|Current time is after `endTime`|
## Final Framework
Before changing an auction session to `ACTIVE`, check in this order:
```
Authentication
→ Active user
→ Session exists
→ Admin or owner
→ Correct current status
→ Rules exist
→ Valid start/end time
→ Lock row
→ Activate session
→ Open ready items
→ Commit transaction
```
So, your original UC12 has the correct foundation, but I would change `Seller` to **session owner** and add rules, item-status, time, and transaction checks.
# Main Problem
UC12 is already implemented, but you need to understand how the endpoint safely changes an auction session from:
```
SCHEDULED → ACTIVE
```
Starting an auction is not just changing one database field. The backend must prevent:
- The wrong user from starting the session.
- The session from starting too early or too late.
- A session without rules from starting.
- Two requests from starting the same session simultaneously.
- Auction items remaining unavailable after the session becomes active.
## Problem 1: Where is UC12 implemented?

#### Solution

The use case is divided into four layers:

|Layer|File|Responsibility|
|---|---|---|
|Router|`session_router.py`|Receives the HTTP request|
|Service|`session_service.py`|Applies business rules|
|Repository|`session_repository.py`|Reads and locks database data|
|Schema|`session_schema.py`|Defines the response structure|

This separation is useful because every layer has one main responsibility.

The execution flow is:

```
HTTP request
→ Router
→ Service
→ Repository
→ Database
→ Response schema
```

## Problem 2: How does the endpoint receive the request?

#### Solution

The endpoint is:

```
PATCH /api/v1/auction-sessions/{session_id}/start
```

A simplified router probably looks similar to this:

```
@router.patch(
    "/{session_id}/start",
    response_model=StartAuctionSessionResponse,
)
async def start_auction_session(
    session_id: UUID,
    current_user: CurrentUserDep,
    db: AsyncSessionDep,
    service: SessionServiceDep,
):
    return await service.start_session(
        db=db,
        session_id=session_id,
        current_user=current_user,
    )
```

The router handles three important things:

1. Reads `session_id` from the URL.
2. Gets the authenticated user from the JWT.
3. Passes the work to `start_session()`.

The router should not contain all the business logic because that would make it difficult to maintain and test.

## Problem 3: Why must the user be authenticated and active?

#### Solution

Before UC12 runs, the authentication dependency reads the JWT and retrieves the current user.

The backend checks that:

```
The token is valid
The user exists
The user status is ACTIVE
```

Possible errors include:

```
UNAUTHORIZED
INVALID_ACCESS_TOKEN
USER_BANNED
```

This protects the endpoint from unauthenticated or banned users.

An authenticated user is not automatically allowed to start every session. Authentication answers:

```
Who is making the request?
```

Authorization answers:

```
Is this user allowed to start this session?
```

## Problem 4: Why is the session row locked?

#### Solution

The repository uses:

```
find_by_id_for_update()
```

Internally, this normally produces a query similar to:

```
stmt = (
    select(AuctionSession)
    .where(AuctionSession.id == session_id)
    .with_for_update()
)
```

The SQL concept is:

```
SELECT ...
FROM auction_sessions
WHERE id = ?
FOR UPDATE;
```

#### Why this works

Imagine the seller double-clicks the Start button.

Without a row lock:

```
Request A reads SCHEDULED
Request B reads SCHEDULED
Request A changes it to ACTIVE
Request B also changes it to ACTIVE
```

Both requests believe they successfully started the session.

With `FOR UPDATE`:

```
Request A locks the row
Request B waits
Request A changes SCHEDULED → ACTIVE and commits
Request B continues and now sees ACTIVE
Request B returns INVALID_SESSION_STATUS
```

This protects the transaction from concurrent updates.

## Problem 5: Who may start the session?

#### Solution

The service checks whether the user is:

```
An ADMIN
or
The owner of the auction session
```

The logic is conceptually:

```
is_admin = current_user.role == UserRole.ADMIN
is_owner = session.seller_id == current_user.id

if not is_admin and not is_owner:
    raise AppException(
        status_code=403,
        code="AUCTION_SESSION_ACCESS_DENIED",
        message="You are not allowed to start this auction session",
    )
```

Your database does not need a separate `SELLER` role.

A regular `USER` becomes the seller of a particular session because:

```
auction_sessions.seller_id == current_user.id
```

An admin can start any session because admin authorization bypasses the ownership requirement.

## Problem 6: Why must the status be `SCHEDULED`?

#### Solution

The backend only permits:

```
SCHEDULED → ACTIVE
```

For example:

```
if session.status != AuctionSessionStatus.SCHEDULED:
    raise AppException(
        status_code=409,
        code="INVALID_SESSION_STATUS",
        message="Only a scheduled session can be started",
    )
```

This prevents invalid transitions such as:

```
DRAFT → ACTIVE
ACTIVE → ACTIVE
ENDED → ACTIVE
CANCELLED → ACTIVE
```

The session must first finish all preparation and become `SCHEDULED`.

## Problem 7: Why must auction rules exist?

#### Solution

The service checks that the session has an associated rules record.

For example:

```
if session.rules is None:
    raise AppException(
        status_code=409,
        code="SESSION_RULES_REQUIRED",
        message="Auction session rules are required",
    )
```

The rules may contain important bidding behavior such as:

```
Minimum bid increment
Deposit requirement
Automatic extension
Payment deadline
Buy-now permission
```

Without these rules, the bidding service may not know how to validate a bid.

Therefore:

```
No rules
→ bidding behavior is incomplete
→ session must not start
```

## Problem 8: Why is the time window checked?

#### Solution

The backend verifies:

```
start_time <= current_time < end_time
```

The two failure conditions are:

```
current_time < start_time
→ SESSION_NOT_STARTED_YET
```

```
current_time >= end_time
→ SESSION_ALREADY_ENDED
```

A simplified implementation is:

```
now = datetime.now(timezone.utc)

if now < session.start_time:
    raise AppException(
        status_code=409,
        code="SESSION_NOT_STARTED_YET",
        message="Auction session cannot start before its scheduled time",
    )

if now >= session.end_time:
    raise AppException(
        status_code=409,
        code="SESSION_ALREADY_ENDED",
        message="Auction session end time has already passed",
    )
```

This means UC12 does not allow a seller to manually start the session early.

## Problem 9: What happens to the session?

#### Solution

After every validation succeeds:

```
session.status = AuctionSessionStatus.ACTIVE
```

The session now accepts active-auction behavior.

The service also records the start time returned to the client:

```
started_at = now
```

Depending on your model, `startedAt` might come from:

```
A dedicated started_at column
or
The time calculated during the operation
```

A dedicated database column is better if you need to preserve the actual time the seller started the session.

## Problem 10: What happens to auction items?

#### Solution

The implementation changes:

```
READY → OPEN
```

It also sets:

```
opened_at = current time
```

Conceptually:

```
for item in session.items:
    if item.status == AuctionItemStatus.READY:
        item.status = AuctionItemStatus.OPEN
        item.opened_at = now
```

This is important because bids are normally placed against an auction item, not directly against an auction session.

Therefore both states should agree:

```
Session ACTIVE
Item OPEN
→ bidding is allowed
```

If the session were `ACTIVE` but its items stayed `READY`, the bid endpoint might reject every bid.

## Problem 11: There is an important status mismatch

Your note says:

```
Items created via UC06 start as UNSOLD
```

But UC12 only opens items with:

```
READY
```

That creates this flow:

```
UC06 creates item as UNSOLD
UC12 searches for READY items
No items match
No items become OPEN
```

This is probably a design inconsistency.

#### Recommended lifecycle

For an item that has not entered an auction yet, use:

```
DRAFT → READY → OPEN → SOLD or UNSOLD
```

The meanings should be:

|Status|Meaning|
|---|---|
|`DRAFT`|Item information is incomplete|
|`READY`|Item is prepared and can open when the session starts|
|`OPEN`|Bidders can place bids|
|`SOLD`|Item ended with a winner|
|`UNSOLD`|Item ended without a winner|
|`CANCELLED`|Item was removed from the auction|

`UNSOLD` should normally be a final status after bidding closes without a valid winner. It should not normally be the initial status.

Therefore, UC06 should probably create the item as either:

```
DRAFT
```

or:

```
READY
```

Use `DRAFT` when more preparation is required.

Use `READY` when creating an item means it is immediately prepared for the scheduled auction.

## Problem 12: Why is the transaction committed only at the end?

#### Solution

The service performs all updates in one transaction:

```
Lock session
→ validate session
→ set session ACTIVE
→ set READY items OPEN
→ commit
```

Conceptually:

```
try:
    session.status = AuctionSessionStatus.ACTIVE

    for item in ready_items:
        item.status = AuctionItemStatus.OPEN
        item.opened_at = now

    await db.commit()
except Exception:
    await db.rollback()
    raise
```

This ensures atomic behavior.

Either everything succeeds:

```
Session becomes ACTIVE
and
Items become OPEN
```

Or everything fails:

```
Session remains SCHEDULED
and
Items remain READY
```

You do not want a partial result such as:

```
Session ACTIVE
but items still READY
```

## Success Response

The response:

```
{
  "status": 200,
  "code": 1000,
  "message": "Auction session started successfully",
  "data": {
    "id": "4381bbad-04ac-4088-b0b4-85fca226ef68d",
    "status": "ACTIVE",
    "startedAt": "2026-07-20T09:00:00"
  }
}
```

means:

|Field|Meaning|
|---|---|
|`status`|HTTP-style application status|
|`code`|Your successful application code|
|`message`|Human-readable result|
|`data.id`|Started session ID|
|`data.status`|New session status|
|`data.startedAt`|Actual activation time|

## How to Test Correctly

First, create or find a session with:

```
status = SCHEDULED
start_time <= current time
end_time > current time
rules exist
at least one item has status READY
```

Then:

```
1. Login as the session owner or an admin.
2. Copy the access token.
3. Click Authorize in Swagger.
4. Enter the normal UUID format.
5. Call PATCH /api/v1/auction-sessions/{session_id}/start.
```

Use a UUID like:

```
4381bbad-04ac-4088-b0b4-85fca226ef68d
```

Do not use the MySQL hexadecimal representation:

```
0x4381BBAD04AC4088B0B485CA226EF68D
```

## Common Wrong Approach

A beginner may implement UC12 as only:

```
session.status = AuctionSessionStatus.ACTIVE
await db.commit()
```

That is unsafe because it does not verify:

```
Authentication
User status
Ownership
Admin permission
Current session status
Rules
Start time
End time
Concurrent requests
Item statuses
```

The correct operation is not simply “update a field.” It is a controlled state transition.

## Final Framework

UC12 works in this order:

```
Receive PATCH request
→ Validate JWT
→ Verify user is ACTIVE
→ Lock session row
→ Verify session exists
→ Verify admin or owner
→ Require SCHEDULED status
→ Require session rules
→ Validate current time
→ Change session to ACTIVE
→ Change READY items to OPEN
→ Set opened_at
→ Commit transaction
→ Return response
```

The implementation is logically strong. The main thing you should review is the item lifecycle: **UC06 should not normally create a new item as `UNSOLD` if UC12 only opens `READY` items.**