You are working on my existing auction application.
Technology stack:
```text
Backend: Python FastAPI
Database: MySQL
ORM: Async SQLAlchemy
Frontend: React + TypeScript
Architecture: Clean Architecture
```
The frontend auction item detail route is:
```text
/auction-items/{itemId}
```
I need you to implement WebSocket real-time viewer tracking for this page.
# Main Problem
When users open the same auction item page, the page must display the current number of active viewers.
Example:
```text
User A opens /auction-item/item123
viewerCount = 1
User B opens /auction-item/item123
viewerCount = 2
User A closes the page
viewerCount = 1
```
For the first version, one open browser tab counts as one viewer.
Do not count unique users yet.
Do not implement Redis yet.
Use one FastAPI process and one Uvicorn worker for this first implementation.
# Architecture Rules
Follow Clean Architecture.
Use these responsibilities:
```text
Presentation layer
    → Handles FastAPI WebSocket requests only
Application layer
    → Defines interfaces and coordinates join/leave use cases
Infrastructure layer
    → Stores active WebSocket connections in memory
Domain/realtime event layer
    → Defines the VIEWER_COUNT_UPDATED event
```
Do not:
```text
Query SQLAlchemy directly inside the WebSocket router
Store global connection logic inside the router
Put bidding business logic inside WebSocket code
Create a new connection registry for every WebSocket request
Use Redis, Kafka, RabbitMQ, or Socket.IO
```
# Required Folder Structure
Adapt the paths to the existing project structure when necessary, but preserve these responsibilities:
```text
app/
├── domain/
│   └── events/
│       ├── auction_item_event.py
│       └── viewer_count_updated_event.py
│
├── application/
│   ├── ports/
│   │   ├── realtime_connection.py
│   │   ├── auction_connection_registry.py
│   │   └── auction_event_publisher.py
│   │
│   └── use_cases/
│       └── realtime/
│           ├── join_auction_item.py
│           └── leave_auction_item.py
│
├── infrastructure/
│   └── realtime/
│       ├── in_memory_auction_connection_registry.py
│       └── websocket_auction_event_publisher.py
│
├── presentation/
│   └── websocket/
│       └── auction_item_websocket_router.py
│
├── dependencies/
│   └── realtime_dependencies.py
│
└── main.py
```
# Problem 1: Define a generic real-time connection
The application layer must not directly depend on FastAPI's `WebSocket` type.
Create:
```text
app/application/ports/realtime_connection.py
```
Define a Python `Protocol` named:
```python
RealtimeConnection
```
It must require these asynchronous methods:
```python
accept() -> None
send_json(data: dict) -> None
receive_text() -> str
close(code: int = 1000) -> None
```
FastAPI's `WebSocket` should satisfy this protocol through structural typing.
# Problem 2: Define the connection registry interface
Create:
```text
app/application/ports/auction_connection_registry.py
```
Define an abstract interface named:
```python
AuctionConnectionRegistry
```
It must expose:
```python
async def connect(
    item_id: UUID,
    connection: RealtimeConnection,
) -> None
async def disconnect(
    item_id: UUID,
    connection: RealtimeConnection,
) -> None
async def get_viewer_count(
    item_id: UUID,
) -> int
async def broadcast(
    item_id: UUID,
    message: dict,
) -> None
```
Use `ABC` and `@abstractmethod`.
Use `...` as the abstract method body.
# Problem 3: Define the viewer-count event
Create:
```text
app/domain/events/auction_item_event.py
```
Define:
```python
class AuctionItemEventType(str, Enum):
    VIEWER_COUNT_UPDATED = "VIEWER_COUNT_UPDATED"
```
Define a Pydantic event envelope:
```python
class AuctionItemEvent(BaseModel):
    type: AuctionItemEventType
    item_id: UUID = Field(alias="itemId")
    timestamp: datetime
    data: dict[str, Any]
```
Use:
```python
ConfigDict(populate_by_name=True)
```
Create:
```text
app/domain/events/viewer_count_updated_event.py
```
Define a factory:
```python
def create_viewer_count_updated_event(
    *,
    item_id: UUID,
    viewer_count: int,
) -> AuctionItemEvent
```
The generated WebSocket message must be:
```json
{
  "type": "VIEWER_COUNT_UPDATED",
  "itemId": "item UUID",
  "timestamp": "UTC ISO datetime",
  "data": {
    "viewerCount": 2
  }
}
```
Use timezone-aware UTC datetime.
# Problem 4: Implement the in-memory connection registry
Create:
```text
app/infrastructure/realtime/in_memory_auction_connection_registry.py
```
Implement:
```python
InMemoryAuctionConnectionRegistry
```
It must implement `AuctionConnectionRegistry`.
Internally store connections like:
```python
dict[UUID, set[RealtimeConnection]]
```
Each `item_id` represents one WebSocket room.
Use:
```python
defaultdict(set)
asyncio.Lock
```
Required behavior:
```text
connect
    → Accept the WebSocket connection
    → Add it to the item room
disconnect
    → Remove it from the item room
    → Remove the empty room
get_viewer_count
    → Return number of active connections for the item
broadcast
    → Send JSON to all connections for the item
    → Remove dead connections when sending fails
```
Do not hold the lock while calling `send_json`.
Use this safe sequence:
```text
Acquire lock
Copy room connections
Release lock
Send messages
Clean up failed connections
```
Add type hints to all methods and fields.
Do not catch exceptions silently without cleanup.
# Problem 5: Define the event publisher interface
Create:
```text
app/application/ports/auction_event_publisher.py
```
Define:
```python
class AuctionEventPublisher(ABC)
```
with:
```python
async def publish(
    item_id: UUID,
    event: AuctionItemEvent,
) -> None
```
The application layer should depend on this interface, not directly on the in-memory registry.
# Problem 6: Implement the WebSocket event publisher
Create:
```text
app/infrastructure/realtime/websocket_auction_event_publisher.py
```
Implement:
```python
WebSocketAuctionEventPublisher
```
It must implement `AuctionEventPublisher`.
It receives an `AuctionConnectionRegistry` through its constructor.
In `publish()`:
```text
Convert AuctionItemEvent into JSON-compatible dictionary
Use aliases such as itemId
Call registry.broadcast()
```
Use:
```python
event.model_dump(
    mode="json",
    by_alias=True,
)
```
# Problem 7: Validate that the auction item exists
Before accepting a viewer into a room, verify that the auction item exists.
Reuse the existing auction item repository if available.
If the repository does not have an existence method, add:
```python
async def exists(item_id: UUID) -> bool
```
The SQLAlchemy implementation should use an efficient `SELECT EXISTS` query.
Do not load the complete auction item entity just to check existence.
If the item does not exist:
```text
Close the WebSocket with code 1008
Do not add the connection to the registry
```
# Problem 8: Create the join use case
Create:
```text
app/application/use_cases/realtime/join_auction_item.py
```
Define:
```python
JoinAuctionItemUseCase
```
Dependencies:
```text
AuctionConnectionRegistry
AuctionEventPublisher
AuctionItemRepository
```
Its `execute()` method receives:
```python
item_id: UUID
connection: RealtimeConnection
```
Execution order:
```text
1. Check whether the auction item exists
2. If not, close connection with code 1008
3. Connect and store the connection
4. Get the new viewer count
5. Create VIEWER_COUNT_UPDATED event
6. Publish the event to all viewers in the item room
```
Return a meaningful result indicating whether the connection was accepted, so the router does not enter its receive loop after a rejected connection.
Do not let the router guess whether the join succeeded.
# Problem 9: Create the leave use case
Create:
```text
app/application/use_cases/realtime/leave_auction_item.py
```
Define:
```python
LeaveAuctionItemUseCase
```
Dependencies:
```text
AuctionConnectionRegistry
AuctionEventPublisher
```
Its `execute()` method receives:
```python
item_id: UUID
connection: RealtimeConnection
```
Execution order:
```text
1. Remove the connection
2. Get the new viewer count
3. Create VIEWER_COUNT_UPDATED event
4. Publish the event to remaining viewers
```
The leave operation should be safe if the connection was already removed.
# Problem 10: Create shared dependencies
Create:
```text
app/dependencies/realtime_dependencies.py
```
Create exactly one shared instance of:
```python
InMemoryAuctionConnectionRegistry
```
Do not create a registry inside the WebSocket router.
Create one shared:
```python
WebSocketAuctionEventPublisher
```
using the same registry.
Build the join and leave use cases using these shared dependencies.
For database repositories, use the existing `AsyncSession` dependency correctly.
Do not create or store a global SQLAlchemy session.
If use cases require a request-scoped repository, construct the use case with the current request/session while reusing the global registry and publisher.
# Problem 11: Create the WebSocket router
Create:
```text
app/presentation/websocket/auction_item_websocket_router.py
```
Add this endpoint:
```python
@router.websocket("/ws/auction-items/{item_id}")
```
Expected URL:
```text
ws://localhost:8080/ws/auction-items/{itemId}
```
The router must:
```text
1. Receive the FastAPI WebSocket and item_id
2. Resolve the join and leave use cases
3. Execute the join use case
4. Stop immediately if the join is rejected
5. Keep the socket alive with receive_text()
6. Reply with PONG when the client sends "ping"
7. On WebSocketDisconnect, execute the leave use case
8. Also clean up safely for unexpected connection exceptions
```
The router must not:
```text
Create event dictionaries
Store room connections
Count viewers itself
Run direct SQLAlchemy queries
Contain auction business rules
```
Prevent the leave use case from running twice for the same connection.
# Problem 12: Register the router
Register the WebSocket router in the FastAPI application.
Do not accidentally add `/api/v1` twice.
The final WebSocket URL must be clearly stated.
# Problem 13: Add frontend WebSocket support
Implement the React client for:
```text
/auction-item/{itemId}
```
Create a dedicated service:
```text
src/features/auction-items/services/auctionItemSocketClient.ts
```
Responsibilities:
```text
Connect to the WebSocket URL
Parse incoming JSON
Handle VIEWER_COUNT_UPDATED
Send "ping" every 25 seconds
Reconnect after unexpected disconnection
Stop reconnecting after intentional component unmount
Clear timers correctly
```
Create a hook:
```text
src/features/auction-items/hooks/useAuctionItemRealtime.ts
```
The hook should expose:
```typescript
viewerCount: number
isConnected: boolean
```
The hook must:
```text
Connect when itemId exists
Disconnect on component unmount
Reconnect when itemId changes
Avoid reconnecting on every React render
```
Use `useRef` for callback stability when necessary.
Display:
```text
Live
2 people watching
```
When disconnected, display:
```text
Reconnecting...
```
Add:
```env
VITE_WS_BASE_URL=ws://localhost:8080
```
For production documentation, mention:
```text
HTTP page/backend → ws://
HTTPS page/backend → wss://
```
# Problem 14: Add tests
Add backend tests for:
```text
Connecting one client returns viewerCount 1
Connecting two clients returns viewerCount 2
Disconnecting one client returns viewerCount 1
Connections from different item IDs are isolated
Broadcast sends only to clients in the correct item room
Invalid item closes with code 1008
Dead connections are removed
The registry is shared rather than recreated per request
```
Create a fake `RealtimeConnection` for unit tests.
Add frontend reducer or hook-level tests where practical.
# Problem 15: Add logging
Add useful logs for:
```text
WebSocket connected
WebSocket disconnected
item_id
viewer_count
unexpected send failure
invalid auction item
```
Do not log JWT tokens or private user information.
# Common Wrong Approaches
Do not implement any of these:
```text
Creating a new registry inside every WebSocket endpoint call
Using a list without grouping connections by itemId
Counting database users instead of active WebSocket connections
Sending viewer count only to the newly connected user
Holding asyncio.Lock while sending network messages
Leaving failed sockets in memory
Putting FastAPI WebSocket imports throughout the application layer
Using multiple Uvicorn workers with an in-memory registry
Using polling instead of WebSocket for viewer count
Adding Redis before the in-memory version works
```
# Important Runtime Limitation
The in-memory implementation only works correctly with:
```text
One backend process
One Uvicorn worker
```
Use:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 1
```
Add a clear comment or documentation explaining that multiple workers require Redis or another shared presence system.
# Required Final Output
After implementing the feature, show:
```text
1. Files created
2. Files modified
3. Final folder structure
4. Important code decisions
5. Exact WebSocket URL
6. How to run the backend
7. How to test with two browser tabs
8. Any assumptions made about the existing repository structure
```
Do not provide only pseudocode.
Write complete, production-readable code matching the existing code style.
Do not rewrite unrelated project files.
Before editing, inspect the existing repository, dependency patterns, repository interfaces, router prefixes, and naming conventions. Reuse existing abstractions where they already solve the requirement.