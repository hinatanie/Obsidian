# Main Problem
Your auction application needs one standard component to manage all WebSocket connections watching each auction item.
For example:
```
User A opens /auction-item/item123
User B opens /auction-item/item123
```
The backend must know:
- Which connections are watching `item123`
- How many viewers `item123` currently has
- Which connection should be removed when a user leaves
- How to send real-time events to everyone watching `item123`
`AuctionConnectionRegistry` defines these required operations:
```
connect()
disconnect()
get_viewer_count()
broadcast()
```
This file is a **port**, meaning it defines what the application needs without deciding how the infrastructure implements it.

---
## Problem 1: The application layer should not depend directly on FastAPI WebSocket
You could define the registry like this:
```
from fastapi import WebSocket
async def connect(
    self,
    item_id: UUID,
    websocket: WebSocket,
) -> None:
    ...
```
But this makes your application layer depend on FastAPI.
That causes a Clean Architecture problem:
```
Application layer
    ↓ depends on
FastAPI framework
```
If you later use another WebSocket library, testing connection behavior becomes harder because application code expects a real FastAPI `WebSocket`.
## Solution
The registry receives your own abstraction:
```
from app.application.ports.realtime_connection import RealtimeConnection
```
Then:
```
async def connect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
    ...
```
`RealtimeConnection` can define only the operations your application actually needs, such as:
```
class RealtimeConnection(ABC):
    @abstractmethod
    async def accept(self) -> None:
        ...
    @abstractmethod
    async def send_json(self, message: dict) -> None:
        ...
```
Your infrastructure layer can wrap FastAPI’s WebSocket:
```
class FastAPIRealtimeConnection(RealtimeConnection):
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
    async def accept(self) -> None:
        await self.websocket.accept()
    async def send_json(self, message: dict) -> None:
        await self.websocket.send_json(message)
```
The dependency direction becomes:
```
Application → RealtimeConnection abstraction
Infrastructure → implements the abstraction using FastAPI
```

---
## Problem 2: Connections must be grouped by auction item
Suppose these pages are open:
```
User A → item123
User B → item123
User C → item456
```
If all connections are stored in one global list, an event for `item123` might incorrectly be sent to User C.
## Solution
Use `item_id` as the room identifier:
```
async def connect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
    ...
```
A concrete implementation could store connections like this:
```
{
    item123: [connection_a, connection_b],
    item456: [connection_c],
}
```
Therefore:
```
item123 event → connection A and B
item456 event → connection C
```
The port does not specify whether the implementation uses a dictionary, Redis, or another mechanism. It only requires that connections be organized logically by `item_id`.

---
## Problem 3: A newly opened WebSocket must be registered
When User A opens:
```
/auction-item/item123
```
the backend must add their WebSocket connection to the `item123` room.
Otherwise, the server cannot count User A or send real-time updates to them.
## Solution
The `connect()` method defines this requirement:
```
@abstractmethod
async def connect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
    ...
```
A concrete in-memory implementation might contain:
```
async def connect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
    await connection.accept()
    if item_id not in self._connections:
        self._connections[item_id] = set()
    self._connections[item_id].add(connection)
```
Execution:
```
WebSocket request arrives
    ↓
Connection is accepted
    ↓
Connection is added to the item room
    ↓
User becomes an active viewer
```
Whether `connect()` should call `accept()` is a design choice. Another valid design is for the WebSocket adapter to accept first and let the registry only store connections. The important rule is to choose one owner so the same connection is not accepted twice.

---
## Problem 4: Closed connections must be removed
When User A:
- Closes the browser tab
- Navigates to another page
- Loses their internet connection
- Refreshes the page
their old WebSocket should no longer count as an active viewer.
If it stays in the registry, the count becomes incorrect.
## Solution
The `disconnect()` method removes that exact connection:
```
@abstractmethod
async def disconnect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
    ...
```
Possible implementation:
```
async def disconnect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
    item_connections = self._connections.get(item_id)
    if item_connections is None:
        return
    item_connections.discard(connection)
    if not item_connections:
        del self._connections[item_id]
```
Why use both parameters?
- `item_id` locates the correct room.
- `connection` identifies the exact user connection to remove.
Deleting an empty room also prevents unused entries from accumulating in memory.

---
## Problem 5: The page needs the current viewer count
After connecting or disconnecting, your frontend needs the updated number:
```
User A joins → viewerCount = 1
User B joins → viewerCount = 2
User A leaves → viewerCount = 1
```
## Solution
The `get_viewer_count()` method returns the number of registered connections for one item:
```
@abstractmethod
async def get_viewer_count(
    self,
    item_id: UUID,
) -> int:
    ...
```
Possible implementation:
```
async def get_viewer_count(self, item_id: UUID) -> int:
    return len(self._connections.get(item_id, set()))
```
If the item has no room, the default empty set has a length of zero.
One important detail: this counts **connections**, not necessarily unique people.
For example, one user opening the same item in three tabs normally creates three connections:
```
1 user
3 tabs
viewer count = 3 connections
```
If you need unique-user counting, the registry must also track a stable `user_id` or anonymous viewer/session ID.

---
## Problem 6: Every viewer of the same item must receive updates
When a bid is successfully committed for `item123`, every viewer in that room should receive something like:
```
{
  "type": "BID_PLACED",
  "itemId": "item123",
  "amount": 1500000
}
```
The event must not be sent to viewers of other items.
## Solution
The `broadcast()` method sends a message only to connections registered under that `item_id`:
```
@abstractmethod
async def broadcast(
    self,
    item_id: UUID,
    message: dict,
) -> None:
    ...
```
Possible implementation:
```
async def broadcast(
    self,
    item_id: UUID,
    message: dict,
) -> None:
    connections = list(self._connections.get(item_id, set()))
    for connection in connections:
        await connection.send_json(message)
```
Copying the collection with `list(...)` prevents iteration problems if a connection is removed while broadcasting.
For your auction project, this method could distribute:
```
VIEWER_COUNT_UPDATED
BID_PLACED
PRICE_UPDATED
AUCTION_ITEM_CLOSED
```
The REST/use-case layer changes auction data. The WebSocket system only distributes events after the database transaction succeeds.

---
## Problem 7: Why are all methods empty?
The class contains:
```
class AuctionConnectionRegistry(ABC):
```
and every method contains:
```
@abstractmethod
...
```
The `...` means there is intentionally no implementation here.
This file defines a contract, not connection-storage behavior.
## Solution
`ABC` and `@abstractmethod` require concrete classes to implement every operation:
```
class InMemoryAuctionConnectionRegistry(
    AuctionConnectionRegistry
):
    async def connect(...):
        ...
    async def disconnect(...):
        ...
    async def get_viewer_count(...):
        ...
    async def broadcast(...):
        ...
```
You should not normally instantiate the port:
```
registry = AuctionConnectionRegistry()  # Wrong
```
Instead, create the implementation:
```
registry = InMemoryAuctionConnectionRegistry()
```
FastAPI dependency injection can provide that implementation wherever the port is required:
```
def get_connection_registry() -> AuctionConnectionRegistry:
    return registry
```
This gives the application a stable contract while allowing the implementation to change.

---
## Problem 8: Why are these methods asynchronous?
Accepting WebSocket connections and sending network messages involve waiting for I/O.
If those operations were handled synchronously, one slow client could block other connections.
## Solution
Each method is declared with `async def`:
```
async def broadcast(...) -> None:
    ...
```
This lets FastAPI’s event loop work on other requests while waiting for WebSocket operations.
`get_viewer_count()` may not strictly need to be asynchronous in an in-memory implementation. However, keeping it asynchronous makes the port compatible with a future distributed implementation that may query Redis.

---
## Problem 9: Why use UUID for `item_id`?
Your auction items use UUID identifiers. The room must therefore be associated with the same identifier type:
```
item_id: UUID
```
## Solution
Using `UUID` prevents different string formats from accidentally creating different rooms:
```
UUID("fb2e25d8-46cf-4fb8-becd-ab12c0e8cbf8")
```
It also clearly tells developers and type checkers that this parameter is an auction item identifier, not an arbitrary room name.

---
## Problem 10: How does this port fit with `AuctionEventPublisher`?
The two ports solve different problems:

|Port|Responsibility|
|---|---|
|`AuctionEventPublisher`|Application use cases publish auction events|
|`AuctionConnectionRegistry`|WebSocket infrastructure manages connections and broadcasts messages|
For example, `PlaceBidUseCase` should depend on `AuctionEventPublisher`:
```
await self._event_publisher.publish(
    item_id=item.id,
    event=bid_placed_event,
)
```
A local publisher implementation may then use the registry:
```
class WebSocketAuctionEventPublisher(AuctionEventPublisher):
    def __init__(
        self,
        registry: AuctionConnectionRegistry,
    ):
        self._registry = registry
    async def publish(
        self,
        item_id: UUID,
        event: dict,
    ) -> None:
        await self._registry.broadcast(item_id, event)
```
This separation means bidding code does not need to know about individual WebSocket connections.
```
PlaceBidUseCase
    ↓ publishes event
AuctionEventPublisher
    ↓ delegates delivery
AuctionConnectionRegistry
    ↓ sends message
Connections watching the item
```

---
## Common wrong approaches
### Putting all WebSocket code inside the router
```
@router.websocket(...)
async def websocket_endpoint(...):
    connections[item_id].append(websocket)
    # connection counting and broadcasting all implemented here
```
This makes the router responsible for transport, storage, counting, and broadcasting. It becomes difficult to test and replace.
### Making the bid use case depend directly on the registry
```
class PlaceBidUseCase:
    def __init__(self, registry: AuctionConnectionRegistry):
        ...
```
The bid use case should publish a business event, not manage WebSocket viewers. Use `AuctionEventPublisher` between them.
### Broadcasting before committing the transaction
```
await publisher.publish(item_id, event)
await session.commit()
```
Viewers might receive a successful bid event even if the database commit later fails.
Use:
```
await session.commit()
await publisher.publish(item_id, event)
```
### Treating in-memory storage as multi-server storage
An in-memory registry only knows about connections inside one FastAPI process.
If you later run multiple workers:
```
Worker 1 does not know Worker 2's connections
```
For the first version, one process is acceptable. At scale, use Redis Pub/Sub so events reach every FastAPI instance, while each instance still manages its own WebSocket connections.

---
# Complete execution flow
```
User opens /auction-item/{itemId}
    ↓
Frontend creates a WebSocket connection
    ↓
WebSocket adapter creates RealtimeConnection
    ↓
registry.connect(itemId, connection)
    ↓
registry.get_viewer_count(itemId)
    ↓
registry.broadcast(itemId, VIEWER_COUNT_UPDATED)
    ↓
All viewers display the new count
    ↓
REST request successfully places a bid
    ↓
Database transaction commits
    ↓
AuctionEventPublisher publishes BID_PLACED
    ↓
Registry broadcasts it to the item room
    ↓
User closes or leaves the page
    ↓
registry.disconnect(itemId, connection)
    ↓
Registry calculates and broadcasts the new viewer count
```
In short, `AuctionConnectionRegistry` is the application’s contract for treating every auction item as a real-time room. It defines what connection management must support while leaving FastAPI, in-memory dictionaries, Redis, and other technical details to the infrastructure layer.