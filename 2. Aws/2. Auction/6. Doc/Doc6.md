#review
Định luật Vạn vật hấp dẫn: Mọi hạt đều hút mọi hạt khác trong vũ trụ với một lực tỉ lệ thuận với tích khối lượng của chúng...

#### 1. The problem is Your auction application needs one standard component to manage all WebSocket connections watching each auction item. 
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

#### 2. The problem is The application layer should not depend directly on FastAPI WebSocket  
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
##### The abstraction version
Instead of requesting a FastAPI object, the application requests **any object that can perform the required operations**:
```
class RealtimeConnection(ABC):
    @abstractmethod
    async def accept(self) -> None:
        ...
    @abstractmethod
    async def send_json(self, message: dict) -> None:
        ...
```
Then the registry says:
```
async def connect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
    await connection.accept()
```
The registry does not care whether that object uses:
- FastAPI
- Django Channels
- another WebSocket library
- a fake connection used in a test
It only cares that the object has `accept()` and `send_json()`.
###### Where the wrapper fits
FastAPI gives you a `WebSocket`, but your application expects a `RealtimeConnection`. The wrapper translates between them:
```
class FastAPIRealtimeConnection(RealtimeConnection):
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
    async def accept(self) -> None:
        await self.websocket.accept()
    async def send_json(self, message: dict) -> None:
        await self.websocket.send_json(message)
```
Your FastAPI endpoint creates the wrapper:
```
@router.websocket("/items/{item_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    item_id: UUID,
):
    connection = FastAPIRealtimeConnection(websocket)
    await registry.connect(item_id, connection)
```
So the flow is:
```
FastAPI WebSocket
       ↓ wrapped by
FastAPIRealtimeConnection
       ↓ passed as
RealtimeConnection
       ↓ used by
Application registry
```
###### Why testing becomes easier
You can create a tiny fake object without FastAPI:
```
class FakeConnection(RealtimeConnection):
    def __init__(self):
        self.accepted = False
        self.messages = []
    async def accept(self) -> None:
        self.accepted = True
    async def send_json(self, message: dict) -> None:
        self.messages.append(message)
```
Then test the registry:
```
connection = FakeConnection()
await registry.connect(item_id, connection)
assert connection.accepted is True
```
The central idea is:
> The application describes what it needs. The infrastructure decides how to provide it.
`RealtimeConnection` is essentially a small plug shape. FastAPI is one plug implementation, and a test fake is another.
#### 4. The problem is Connections must be grouped by auction item  
Suppose these pages are open:
```
User A → item123
User B → item123
User C → item456
```
##### Solution
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
#### 5. The problem is A newly opened WebSocket must be registered  
When User A opens:
```
/auction-item/item123
```
the backend must add their WebSocket connection to the `item123` room.  
Otherwise, the server cannot count User A or send real-time updates to them.
##### Solution
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

###### The method
```
async def connect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
```
It receives:
- `item_id`: the auction item being viewed
- `connection`: the user’s WebSocket connection
###### Step 1: Accept the WebSocket
```
await connection.accept()
```
A WebSocket starts as a connection request. The server must accept it before normal communication can begin.  
Conceptually:
```
Browser: Can we open a WebSocket?
Server: Yes, accepted.
```
###### Step 2: Create a room when needed
```
if item_id not in self._connections:
    self._connections[item_id] = set()
```
`self._connections` might look like this:
```
self._connections = {}
```
When the first user opens `item123`, there is no room yet. So the code creates one:
```
{
    item123: set()
}
```
###### Step 3: Add the connection
```
self._connections[item_id].add(connection)
```
Now the room contains that user’s connection:
```
{
    item123: {user_a_connection}
}
```
When another user opens the same item:
```
{
    item123: {
        user_a_connection,
        user_b_connection,
    }
}
```
A user viewing another auction goes into a different room:
```
{
    item123: {
        user_a_connection,
        user_b_connection,
    },
    item456: {
        user_c_connection,
    },
}
```
###### Why registration matters
Later, the server can send an update only to users viewing `item123`:
```
for connection in self._connections[item123]:
    await connection.send_json({
        "type": "price_updated",
        "price": 250,
    })
```
Without registration, the backend receives the WebSocket but does not remember it. It would not know:
- how many users are viewing the item
- who should receive price updates
- which connection to remove after a disconnect
###### Why use a `set`
```
self._connections[item_id] = set()
```
A set stores unique connections. Calling `.add(connection)` with the same object twice does not create a duplicate.
###### Who should call `accept()`?
There are two valid designs.  
**Design A: the registry accepts it**
```
async def connect(...):
    await connection.accept()
    self._connections[item_id].add(connection)
```
**Design B: the endpoint accepts it**
```
await connection.accept()
await registry.connect(item_id, connection)
```
Then the registry only stores it:
```
async def connect(...):
    self._connections.setdefault(item_id, set()).add(connection)
```
The important part is that `accept()` happens exactly once. Calling it twice can cause an error.  
In simple terms, `connect()` means:
> Accept this user’s live connection and remember that they are currently watching this auction item.

`_connections` is usually defined in the constructor of the concrete registry class:
```
from collections import defaultdict
from uuid import UUID
class InMemoryAuctionConnectionRegistry(AuctionConnectionRegistry):
    def __init__(self) -> None:
        self._connections: dict[UUID, set[RealtimeConnection]] = {}
```
Then `connect()` uses it:
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
#### 6. The problem is Closed connections must be removed  
When User A:
- Closes the browser tab
- Navigates to another page
- Loses their internet connection
- Refreshes the page  
    their old WebSocket should no longer count as an active viewer.  
    If it stays in the registry, the count becomes incorrect.
##### Solution
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
This code cleans up a WebSocket after a user leaves.
Imagine the registry currently contains:
```
{
    item123: {
        connection_a,
        connection_b,
    }
}
```
User A closes the page, so `connection_a` is no longer active. The backend should change the registry to:
```
{
    item123: {
        connection_b,
    }
}
```
Here is the method:
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
###### Step by step
This line finds the room for the auction item:
```
item_connections = self._connections.get(item_id)
```
For example:
```
item_connections = {
    connection_a,
    connection_b,
}
```
If the room does not exist:
```
if item_connections is None:
    return
```
The method stops safely. There is nothing to remove.
Then this removes the exact disconnected connection:
```
item_connections.discard(connection)
```
For example:
```
{connection_a, connection_b}
```
becomes:
```
{connection_b}
```
`discard()` is useful because it does not raise an error when the connection is already missing.
Finally:
```
if not item_connections:
    del self._connections[item_id]
```
An empty set is considered false in Python.
So if the last user leaves:
```
{
    item123: set()
}
```
the whole room is deleted:
```
{}
```
###### Why both `item_id` and `connection`?
Because they answer two different questions:
```
item_id
```
means:
> Which auction room should I look inside?
And:
```
connection
```
means:
> Which exact connection inside that room should I remove?
A simple analogy:
```
item_id = apartment number
connection = person leaving that apartment
```
You need the apartment number to find the correct apartment, and the person to know exactly whom to remove.
A typical endpoint uses it like this:
```
try:
    while True:
        await connection.receive_text()
except WebSocketDisconnect:
    await registry.disconnect(item_id, connection)
```
So when the browser disconnects, the old connection is removed and the viewer count stays correct.

#### 7. The problem is The page needs the current viewer count  
After connecting or disconnecting, your frontend needs the updated number:
```
User A joins → viewerCount = 1
User B joins → viewerCount = 2
User A leaves → viewerCount = 1
```
##### Solution
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


Break it into two parts.
```
self._connections.get(item_id, set())
```
This tries to find the set of connections for `item_id`.
For `item123`, it might return:
```
{connection_a, connection_b}
```
Then:
```
len({connection_a, connection_b})
```
returns:
```
2
```
If the item does not exist in `_connections`, Python uses the default:
```
set()
```
An empty set has length zero:
```
len(set())  # 0
```
#### 8. The problem is that Every viewer of the same item must receive updates  
When a bid is successfully committed for `item123`, every viewer in that room should receive something like:
```
{
  "type": "BID_PLACED",
  "itemId": "item123",
  "amount": 1500000
}
```
The event must not be sent to viewers of other items.
##### Solution
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


Now suppose someone places a bid on `item123`:
```
message = {
    "type": "BID_PLACED",
    "itemId": "item123",
    "amount": 1_500_000,
}
```
Only users watching `item123` should receive it.
```
async def broadcast(
    self,
    item_id: UUID,
    message: dict,
) -> None:
    connections = list(
        self._connections.get(item_id, set())
    )
    for connection in connections:
        await connection.send_json(message)
```
Let us execute it step by step.
###### Step 1: Find the correct room
```
self._connections.get("item123", set())
```
returns:
```
{connection_a, connection_b}
```
It does **not** return `connection_c`, because that connection belongs to `item456`.
###### Step 2: Loop through the room
```
for connection in connections:
```
The loop first gets:
```
connection_a
```
and sends the message:
```
await connection_a.send_json(message)
```
Then it gets:
```
connection_b
```
and sends the same message:
```
await connection_b.send_json(message)
```
The result is:
```
User A receives BID_PLACED
User B receives BID_PLACED
User C receives nothing
```
##### Why use `list(...)`?
The original room is a set:
```
{connection_a, connection_b}
```
This line creates a temporary copy:
```
connections = list(
    self._connections.get(item_id, set())
)
```
Now:
```
connections
```
might be:
```
[connection_a, connection_b]
```
This protects the loop if somebody disconnects during broadcasting.
Without a copy, this could happen:
```
Loop starts over the set
    ↓
connection_a disconnects
    ↓
disconnect() changes the same set
    ↓
Python may raise:
"Set changed size during iteration"
```
Using `list(...)` means the loop uses a snapshot:
```
Original room: may change
Temporary list: stays stable during this broadcast
```
###### Full example
Initially:
```
self._connections = {}
```
User A joins `item123`:
```
{
    "item123": {connection_a}
}
```
Viewer count:
```
await get_viewer_count("item123")  # 1
```
User B joins:
```
{
    "item123": {connection_a, connection_b}
}
```
Viewer count:
```
await get_viewer_count("item123")  # 2
```
A bid is placed:
```
await broadcast(
    "item123",
    {
        "type": "BID_PLACED",
        "amount": 1_500_000,
    },
)
```
Both connections receive it.
User A leaves:
```
{
    "item123": {connection_b}
}
```
New viewer count:
```
await get_viewer_count("item123")  # 1
```
Then you can broadcast the new count:
```
await broadcast(
    "item123",
    {
        "type": "VIEWER_COUNT_UPDATED",
        "viewerCount": 1,
    },
)
```
So the core ideas are:
```
get_viewer_count()
    = count connections in one room
broadcast()
    = send a message to every connection in one room
```
And the registry acts like this:
```
item123 room → User A, User B
item456 room → User C
```
Messages for `item123` stay inside the `item123` room.
#### 9.  The problem is Why are all methods empty?  
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
##### Solution
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

#### 10. The problem is what is ABC in () of a class?
`ABC` means **Abstract Base Class**.
```
from abc import ABC, abstractmethod
class AuctionConnectionRegistry(ABC):
    ...
```
It signals that `AuctionConnectionRegistry` is mainly a **contract or blueprint**, not usually a class you instantiate directly.
For example:
```
from abc import ABC, abstractmethod
from uuid import UUID
class AuctionConnectionRegistry(ABC):
    @abstractmethod
    async def connect(
        self,
        auction_id: UUID,
        connection: RealtimeConnection,
    ) -> None:
        ...
```
The `@abstractmethod` means every concrete subclass must implement `connect()`:
```
class InMemoryAuctionConnectionRegistry(AuctionConnectionRegistry):
    async def connect(
        self,
        auction_id: UUID,
        connection: RealtimeConnection,
    ) -> None:
        print("Connection added")
```
This is allowed:
```
registry = InMemoryAuctionConnectionRegistry()
```
This normally raises an error because `connect()` has not been implemented:
```
registry = AuctionConnectionRegistry()
```
So:
- `ABC` marks the class as abstract.
- `@abstractmethod` marks required methods.
- Concrete subclasses provide the actual behavior.
Without any `@abstractmethod`, inheriting from `ABC` usually does not add much by itself.

#### 11. The problem is Why are these methods asynchronous?  
Accepting WebSocket connections and sending network messages involve waiting for I/O.  
If those operations were handled synchronously, one slow client could block other connections.
##### Solution
Each method is declared with `async def`:
```
async def broadcast(...) -> None:
    ...
```
This lets FastAPI’s event loop work on other requests while waiting for WebSocket operations.  
`get_viewer_count()` may not strictly need to be asynchronous in an in-memory implementation. However, keeping it asynchronous makes the port compatible with a future distributed implementation that may query Redis.


`async` means:
> “This function may need to wait, so Python can do other work during that wait.”
For example, sending a WebSocket message uses the network:
```
await connection.send_json(message)
```
The network may be slow. While Python waits for the message to be sent, it can handle another user’s request instead of freezing everything.
###### Without asynchronous code
Imagine User A has a slow internet connection:
```
Send message to User A
        ↓
Wait...
Wait...
Wait...
        ↓
Only then handle User B
```
User B is forced to wait because User A is slow.
###### With asynchronous code
```
Start sending to User A
        ↓
User A's network is taking time
        ↓
Handle User B while waiting
        ↓
Continue User A's send when ready
```
That is why methods involving WebSocket operations use `async def`:
```
async def broadcast(
    self,
    item_id: UUID,
    message: dict,
) -> None:
    connections = self._connections.get(item_id, set())
    for connection in connections:
        await connection.send_json(message)
```
Here:
- `async def` declares an asynchronous function.
- `await` pauses this function while the network operation finishes.
- The FastAPI event loop can run other tasks during that pause.
##### What about `get_viewer_count()`?
This version only reads memory:
```
async def get_viewer_count(self, item_id: UUID) -> int:
    return len(self._connections.get(item_id, set()))
```
Reading a Python dictionary is immediate. There is no network or database waiting, so technically it could be synchronous:
```
def get_viewer_count(self, item_id: UUID) -> int:
    return len(self._connections.get(item_id, set()))
```
But the interface may keep it asynchronous because a future implementation could use Redis:
```
async def get_viewer_count(self, item_id: UUID) -> int:
    return await redis.scard(f"auction:{item_id}:viewers")
```
Redis requires network I/O, so it needs `await`.
Keeping the abstract method asynchronous means both implementations have the same shape:
```
count = await registry.get_viewer_count(item_id)
```
Whether the registry uses:
```
Python memory
```
or later:
```
Redis over the network
```
the calling code does not need to change.
The simplest way to remember it is:
```
async def = this function may wait
await = pause here, but let Python do other work
```

#### 12. The problem is How does this port fit with `AuctionEventPublisher`?  
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

