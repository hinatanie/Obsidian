You are working on my existing auction application.
Technology stack:
```text
Backend: Python FastAPI
Database: MySQL
ORM: Async SQLAlchemy
Frontend: React + TypeScript
Architecture: Clean Architecture
```
The application already has WebSocket real-time viewer tracking for:
```text
/ws/auction-items/{item_id}
```
The existing implementation includes:
```text
RealtimeConnection protocol
AuctionConnectionRegistry interface
InMemoryAuctionConnectionRegistry
AuctionEventPublisher interface
WebSocketAuctionEventPublisher
JoinAuctionItemUseCase
LeaveAuctionItemUseCase
VIEWER_COUNT_UPDATED event
Shared singleton registry
React WebSocket client
useAuctionItemRealtime hook
```
The current automated tests pass:
```text
11 passed
```
Do not rewrite the existing viewer-count implementation unless a small extension is required.
# Main Problem
The auction item page currently receives only viewer-count updates.
I now need the page to receive real-time auction state updates after bids are successfully placed.
Implement these two features:
```text
1. AUCTION_ITEM_SNAPSHOT
2. BID_PLACED
```
The final behavior must be:
```text
User opens an auction item page
    → WebSocket connects
    → Server sends the current auction item snapshot to that user
    → Server broadcasts the updated viewer count
Another user places a bid through the existing REST endpoint
    → Existing PlaceBidUseCase validates the bid
    → Database transaction succeeds
    → Server publishes BID_PLACED
    → All WebSocket clients watching that auction item update immediately
```
# Architecture Rules
Follow the existing Clean Architecture style.
Use this responsibility flow:
```text
Presentation
    → Handles HTTP and WebSocket transport only
Application
    → Coordinates use cases and depends on interfaces
Domain events
    → Defines event structures
Infrastructure
    → Publishes events through the existing connection registry
```
Do not:
```text
Move bid validation into the WebSocket router
Accept PLACE_BID commands through WebSocket
Query SQLAlchemy inside the WebSocket router
Commit database transactions inside an event publisher
Create a second item connection registry
Create a registry per request
Broadcast BID_PLACED before the database transaction succeeds
Expose private bidder information unnecessarily
Use Redis, Kafka, RabbitMQ, Socket.IO, or multiple Uvicorn workers
Rewrite unrelated project files
```
The bidding command must remain REST-based.
Use this rule:
```text
REST performs the bid command
WebSocket broadcasts the committed result
```
# Problem 1: Inspect the existing implementation
Before editing:
```text
1. Inspect the current folder structure
2. Inspect existing event models
3. Inspect JoinAuctionItemUseCase
4. Inspect PlaceBidUseCase
5. Inspect repository interfaces and SQLAlchemy implementations
6. Inspect transaction and commit behavior
7. Inspect dependency injection patterns
8. Inspect the React WebSocket client and hook
9. Inspect existing test conventions
```
Reuse current abstractions and naming conventions.
Do not assume file paths if the project already uses different paths.
# Problem 2: Extend auction item event types
Update the existing auction-item event enum to include:
```python
AUCTION_ITEM_SNAPSHOT = "AUCTION_ITEM_SNAPSHOT"
BID_PLACED = "BID_PLACED"
```
Keep:
```python
VIEWER_COUNT_UPDATED = "VIEWER_COUNT_UPDATED"
```
Do not create competing event envelopes if the current `AuctionItemEvent` envelope already supports these events.
Continue using:
```python
itemId
timestamp
data
```
with JSON aliases.
# Problem 3: Create the auction item snapshot event
Create a factory such as:
```python
def create_auction_item_snapshot_event(
    *,
    item_id: UUID,
    status: str,
    current_price: Decimal,
    starting_price: Decimal,
    min_increment: Decimal,
    opened_at: datetime | None,
    closed_at: datetime | None,
) -> AuctionItemEvent:
```
Adapt the fields to the real entity and repository model.
The message must look similar to:
```json
{
  "type": "AUCTION_ITEM_SNAPSHOT",
  "itemId": "item UUID",
  "timestamp": "UTC ISO datetime",
  "data": {
    "status": "OPEN",
    "currentPrice": "51000000.00",
    "startingPrice": "50000000.00",
    "minIncrement": "1000000.00",
    "openedAt": "2026-08-04T09:00:00Z",
    "closedAt": "2026-08-04T10:00:00Z"
  }
}
```
Use JSON-safe values.
For money, preserve decimal precision.
Do not serialize monetary values through binary floating-point unless that is already the established API convention.
Use timezone-aware UTC timestamps for the event timestamp.
# Problem 4: Add a realtime snapshot query
Add an application-facing repository method that efficiently loads only the data needed for the snapshot.
Prefer a dedicated projection or DTO instead of loading an unnecessarily large aggregate.
For example:
```python
@dataclass(frozen=True)
class AuctionItemRealtimeSnapshot:
    item_id: UUID
    status: str
    current_price: Decimal
    starting_price: Decimal
    min_increment: Decimal
    opened_at: datetime | None
    closed_at: datetime | None
```
Possible repository method:
```python
async def get_realtime_snapshot(
    item_id: UUID,
) -> AuctionItemRealtimeSnapshot | None:
    ...
```
Reuse an existing repository method if it already returns all required data efficiently.
The SQLAlchemy implementation may join:
```text
auction_items
auction_sessions
auction_session_rules
```
only when required.
Do not perform one query per field.
# Problem 5: Create SendAuctionItemSnapshotUseCase
Create a use case such as:
```python
SendAuctionItemSnapshotUseCase
```
Dependencies:
```text
AuctionItemRepository
AuctionEventPublisher or a direct single-connection sender abstraction
```
Execution:
```text
1. Load current realtime snapshot
2. If the item does not exist, return a meaningful failure result
3. Create AUCTION_ITEM_SNAPSHOT
4. Send the snapshot only to the newly connected client
```
Important:
```text
AUCTION_ITEM_SNAPSHOT should normally go only to the new connection.
Do not broadcast the snapshot to every viewer whenever one new viewer joins.
```
The current `AuctionEventPublisher` broadcasts to a room, so do not misuse it for a private initial snapshot.
Use one of these clean approaches:
```text
Preferred:
Add a dedicated sender interface for sending an event to one RealtimeConnection
Acceptable:
Use connection.send_json() inside the application use case after converting through a shared event serialization helper
```
Do not import FastAPI WebSocket into the application layer.
# Problem 6: Integrate snapshot into the join flow
Update the connection workflow safely.
Desired order:
```text
1. Verify item exists
2. Accept and register connection
3. Send AUCTION_ITEM_SNAPSHOT to the newly connected client
4. Get viewer count
5. Broadcast VIEWER_COUNT_UPDATED to the item room
6. Enter receive loop
```
If snapshot sending fails after connection registration:
```text
Remove the failed connection from the registry
Do not leave a dead socket counted as a viewer
Log the failure
Return a failed join result
```
Avoid loading the same item twice if the existing join existence check and snapshot query can be combined cleanly.
A good design may replace:
```text
exists(item_id)
```
with:
```text
get_realtime_snapshot(item_id)
```
inside the join use case because:
```text
None means item does not exist
A value provides the initial state
```
Only do this if it simplifies the flow without breaking existing repository use.
# Problem 7: Create the BID_PLACED event
Create a factory such as:
```python
def create_bid_placed_event(
    *,
    item_id: UUID,
    bid_id: UUID,
    amount: Decimal,
    current_price: Decimal,
    placed_at: datetime,
) -> AuctionItemEvent:
```
The public event must look similar to:
```json
{
  "type": "BID_PLACED",
  "itemId": "item UUID",
  "timestamp": "UTC ISO datetime",
  "data": {
    "bidId": "bid UUID",
    "amount": "52000000.00",
    "currentPrice": "52000000.00",
    "placedAt": "2026-08-04T09:15:00Z"
  }
}
```
Do not expose:
```text
User email
Phone number
JWT
Password information
Private profile data
Full bidder identity
```
If the current UI needs a bidder display label, expose only a safe masked or public value already permitted by the application.
Do not invent a public identity rule.
# Problem 8: Create PublishBidPlacedUseCase
Create:
```python
PublishBidPlacedUseCase
```
Dependency:
```text
AuctionEventPublisher
```
Its execution should:
```text
1. Receive the committed bid result
2. Create BID_PLACED
3. Publish it to the auction item room
```
The use case must not:
```text
Validate bid amount
Check auction status
Lock database rows
Create the bid
Update current price
Commit the transaction
```
Those responsibilities belong to the existing PlaceBidUseCase.
# Problem 9: Integrate BID_PLACED after successful bid persistence
Inspect the existing PlaceBidUseCase and transaction pattern.
Publish only after the bid and item price update are safely persisted.
The logical order must be:
```text
1. Validate user and item
2. Lock required database row
3. Validate auction status and minimum bid
4. Mark previous winning bid as OUTBID
5. Create new WINNING bid
6. Update auction item current_price
7. Flush or commit according to the existing transaction architecture
8. Publish BID_PLACED
9. Return the normal REST response
```
Critical requirement:
```text
Never broadcast BID_PLACED if the database transaction later rolls back.
```
Use the project’s existing transaction boundary.
If commit happens in the HTTP dependency after the use case returns, do not publish inside the use case before commit.
In that situation, implement a safe post-commit mechanism or publish from the orchestration layer only after commit succeeds.
Do not silently change transaction ownership without understanding the current architecture.
Add a clear code comment explaining why publication occurs after commit.
# Problem 10: Handle publication failure correctly
A successful bid must not be rolled back only because a WebSocket broadcast failed after the database commit.
Required behavior:
```text
Database commit succeeds
WebSocket publication fails
    → Log the publication failure
    → REST bid response remains successful
    → Do not undo the committed bid
```
Use structured logs containing:
```text
item_id
bid_id
current_price
event type
exception
```
Do not log private data.
# Problem 11: Update the React WebSocket event types
Inspect the existing TypeScript event definitions.
Add support for:
```typescript
type AuctionItemSnapshotEvent = {
  type: "AUCTION_ITEM_SNAPSHOT";
  itemId: string;
  timestamp: string;
  data: {
    status: string;
    currentPrice: string;
    startingPrice: string;
    minIncrement: string;
    openedAt: string | null;
    closedAt: string | null;
  };
};
type BidPlacedEvent = {
  type: "BID_PLACED";
  itemId: string;
  timestamp: string;
  data: {
    bidId: string;
    amount: string;
    currentPrice: string;
    placedAt: string;
  };
};
```
Adapt types to the actual backend serialization.
Use a discriminated union.
Do not process arbitrary JSON without validation or guarded property access.
# Problem 12: Update the React WebSocket client
Extend:
```text
auctionItemSocketClient.ts
```
It must handle:
```text
VIEWER_COUNT_UPDATED
AUCTION_ITEM_SNAPSHOT
BID_PLACED
```
Responsibilities:
```text
Parse incoming JSON
Validate the event type
Route the event to stable callbacks
Ignore or log unknown event types safely
Keep existing ping behavior
Keep existing reconnection behavior
Clear all timers correctly
Do not reconnect after intentional unmount
```
Do not create a separate WebSocket for bids.
Use the existing auction item socket.
# Problem 13: Update useAuctionItemRealtime
Extend the hook to expose enough state for the page.
Suggested output:
```typescript
{
  viewerCount: number;
  isConnected: boolean;
  status: string | null;
  currentPrice: string | null;
  startingPrice: string | null;
  minIncrement: string | null;
  openedAt: string | null;
  closedAt: string | null;
  latestBid: {
    bidId: string;
    amount: string;
    placedAt: string;
  } | null;
}
```
Behavior:
```text
AUCTION_ITEM_SNAPSHOT
    → replace the current realtime state
BID_PLACED
    → update currentPrice
    → update latestBid
VIEWER_COUNT_UPDATED
    → update viewerCount
```
Requirements:
```text
Connect once per itemId
Reconnect when itemId changes
Avoid reconnecting on every render
Use stable callbacks or refs where required
Reset state correctly when itemId changes
Do not overwrite a newer BID_PLACED event with stale initial REST data
```
# Problem 14: Integrate with the auction item page
Update the existing route:
```text
/auction-item/{itemId}
```
The page should display real-time values.
At minimum:
```text
Live
2 people watching
Current price
52,000,000 ₫
Latest bid received in real time
```
When the socket disconnects:
```text
Reconnecting...
```
Do not duplicate the page’s complete REST-fetching logic.
Use REST for the initial complete page data and WebSocket for realtime synchronization.
Resolve state precedence carefully:
```text
Initial REST result
    → fills full page
AUCTION_ITEM_SNAPSHOT
    → synchronizes realtime-sensitive fields
BID_PLACED
    → applies newest realtime price
```
# Problem 15: Add backend tests
Keep all existing tests passing.
Add tests for:
```text
Snapshot event uses itemId alias
Snapshot event preserves decimal precision
Joining sends AUCTION_ITEM_SNAPSHOT to the new connection
Snapshot is not broadcast to existing viewers
Invalid item still closes with code 1008
Failed snapshot send removes the connection
BID_PLACED is published to the correct item room
BID_PLACED does not reach another item room
Bid event contains currentPrice and bidId
Publication occurs only after successful persistence
Publication failure does not undo a committed bid
```
Use fakes where practical.
Do not require a real external WebSocket server for all unit tests.
Add integration tests where the current test setup supports them.
# Problem 16: Add frontend tests
Add practical tests for:
```text
AUCTION_ITEM_SNAPSHOT replaces realtime state
BID_PLACED updates currentPrice
BID_PLACED updates latestBid
VIEWER_COUNT_UPDATED still updates viewerCount
Unknown events do not crash the client
Unmount prevents reconnect
Changing itemId closes the previous socket
```
Reuse the project’s current frontend testing tools.
Do not introduce a new test framework unless necessary.
# Problem 17: Preserve current runtime limitation
The current in-memory registry only supports:
```text
One backend process
One Uvicorn worker
```
Keep the runtime documentation:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 1
```
Do not add Redis in this task.
# Expected WebSocket lifecycle
The final flow should be:
```text
Client connects to:
/ws/auction-items/{itemId}
Server:
    → verifies and loads item snapshot
    → accepts connection
    → adds connection to shared item room
    → sends AUCTION_ITEM_SNAPSHOT to this client
    → broadcasts VIEWER_COUNT_UPDATED
Client sends:
ping
Server replies:
PONG
Bid is placed through:
POST /api/v1/auction-items/{item_id}/bids
Server:
    → validates bid
    → persists bid
    → updates current price
    → commits transaction
    → publishes BID_PLACED to the item room
All connected item viewers:
    → receive BID_PLACED
    → update current price immediately
```
# Required final output
After implementation, show:
```text
1. Files inspected
2. Files created
3. Files modified
4. Final folder structure
5. Important architecture decisions
6. Exact event payloads
7. Where BID_PLACED is published
8. How post-commit publication is guaranteed
9. Backend tests added
10. Frontend tests added
11. Exact commands to run tests
12. Manual browser testing steps
13. Assumptions made
```
Run and report these tests:
```bash
pytest -v -k "websocket or realtime or viewer or snapshot or bid or connection"
```
Also run the relevant frontend test command used by the project.
Do not claim tests passed unless you actually ran them.
Do not provide only pseudocode.
Write complete, production-readable code matching the existing project style.