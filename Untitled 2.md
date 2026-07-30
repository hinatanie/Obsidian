# Main Problem
Your auction system needs to send live events such as:
```
BID_PLACED
VIEWER_COUNT_UPDATED
AUCTION_ENDED
```
Today, you may send them using an in-memory WebSocket manager.
Later, you may use Redis because you want multiple backend workers.
The practical problem is:
```
How can the bidding use case publish an event without being tightly connected to one specific technology?
```
There are actually two different responsibilities:
```
Event publisher
    → Announces an auction event
Connection registry
    → Tracks which browsers are connected
```
They are related, but they solve different problems.

---
## Problem 1: The bid use case needs to announce a successful bid
After the user places a bid, your application flow looks like this:
```
PlaceBidUseCase
    ↓
Validate bid
    ↓
Save bid
    ↓
Commit transaction
    ↓
Announce BID_PLACED
```
The use case must somehow send this event:
```
{
  "type": "BID_PLACED",
  "itemId": "item-123",
  "data": {
    "currentPrice": "36000000.00"
  }
}
```
A simple implementation might directly call the WebSocket manager:
```
await websocket_manager.broadcast(
    item_id=result.item_id,
    message=event,
)
```
This works, but it connects the bidding use case directly to WebSocket infrastructure.
## Solution
Define a small interface that says:
```
I need something capable of publishing an auction event.
```
The interface does not explain how the event is delivered.
```
# app/application/ports/auction_event_publisher.py
from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.events.auction_item_event import AuctionItemEvent
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        raise NotImplementedError
```
This interface is a contract.
It says every publisher must provide:
```
async def publish(item_id, event)
```
But it does not contain the real delivery code.

---
## Problem 2: Why does the interface not contain implementation code?
The application layer knows that an event must be published.
But it should not need to know whether the event is sent through:
```
WebSocket
Redis Pub/Sub
RabbitMQ
Kafka
```
These technologies solve infrastructure concerns.
The bidding business rule should not change just because your delivery technology changes.
## Solution
Make the use case depend on `AuctionEventPublisher`.
```
class PlaceBidUseCase:
    def __init__(
        self,
        event_publisher: AuctionEventPublisher,
    ) -> None:
        self._event_publisher = event_publisher
```
After a successful commit:
```
await self._event_publisher.publish(
    item_id=result.item_id,
    event=event,
)
```
The use case only understands:
```
Publish this event.
```
It does not understand:
```
Find WebSocket connections.
Serialize JSON.
Publish to Redis channel.
Send messages to backend workers.
```
### Why this works
The business workflow remains stable:
```
Place bid
    ↓
Commit
    ↓
Publish event
```
Only the publisher implementation changes.

#### Problem 3: An interface cannot send anything by itself
This code:
```
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(...):
        raise NotImplementedError
```
does not actually send messages.
It only defines what a publisher must be able to do.
You still need a real implementation.
#### Solution
Create a WebSocket publisher in the infrastructure layer.
```
### app/infrastructure/realtime/websocket_auction_event_publisher.py
from uuid import UUID
from app.application.ports.auction_event_publisher import (
    AuctionEventPublisher,
)
from app.domain.events.auction_item_event import AuctionItemEvent
class WebSocketAuctionEventPublisher(AuctionEventPublisher):
    def __init__(self, connection_registry) -> None:
        self._connection_registry = connection_registry
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        message = event.model_dump(
            mode="json",
            by_alias=True,
        )
        await self._connection_registry.broadcast(
            item_id=item_id,
            message=message,
        )
```
Now you have:
```
AuctionEventPublisher
    → Interface
WebSocketAuctionEventPublisher
    → Actual WebSocket implementation
```
The application use case depends on the first one.
At runtime, you inject the second one.

---
#### Problem 4: What does dependency inversion mean here?
Without dependency inversion, the use case directly creates or imports the infrastructure class:
```
from app.infrastructure.realtime.websocket_manager import (
    websocket_manager,
)
class PlaceBidUseCase:
    async def execute(self, ...):
        ...
        await websocket_manager.broadcast(...)
```
Now `PlaceBidUseCase` depends directly on WebSocket infrastructure.
That creates this dependency direction:
```
Application business logic
    ↓
WebSocket technology
```
If you later replace WebSocket publishing with Redis, you must edit the business use case.
#### Solution
Reverse the dependency.
The application defines the contract:
```
AuctionEventPublisher
```
The infrastructure implements that contract:
```
WebSocketAuctionEventPublisher
```
The dependency becomes:
```
Application defines interface
    ↑
Infrastructure implements interface
```
That is the practical meaning of dependency inversion in this feature.
It is not mainly about using `ABC`.
It is about making the important business code independent from replaceable technology.

---
#### Problem 5: Why might you replace the WebSocket publisher later?
Your first backend may run with:
```
One FastAPI process
One Uvicorn worker
One in-memory connection manager
```
In that situation, direct local broadcasting works.
Later, you may run:
```
Worker 1
Worker 2
Worker 3
```
A browser connected to Worker 2 cannot receive an event that only exists inside Worker 1’s memory.
#### Solution
Replace the publisher implementation with Redis.
Conceptually:
```
class RedisAuctionEventPublisher(AuctionEventPublisher):
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        channel = f"auction-item:{item_id}"
        await self._redis.publish(
            channel,
            event.model_dump_json(by_alias=True),
        )
```
Your use case still calls:
```
await self._event_publisher.publish(
    result.item_id,
    event,
)
```
It does not change.
Only dependency injection changes:
```
### First version
event_publisher = WebSocketAuctionEventPublisher(registry)
### Scaled version
event_publisher = RedisAuctionEventPublisher(redis_client)
```

---
### Stage 5 Main Problem
The backend must also track browsers connected to each auction item.
For example:
```
item-123
    ├── Browser A
    ├── Browser B
    └── Browser C
```
When a bid happens for `item-123`, the backend must send the event to those three browsers.
This is the responsibility of the connection registry.

---
#### Problem 6: The backend needs to group connections by auction item
Suppose these users are connected:
```
Browser A → item-123
Browser B → item-123
Browser C → item-999
```
When item `123` receives a new bid:
```
Browser A should receive it
Browser B should receive it
Browser C should not receive it
```
The system needs somewhere to store this relationship.
#### Solution
Create an auction connection registry.
Conceptually, it stores:
```
{
    item_123: {browser_a, browser_b},
    item_999: {browser_c},
}
```
Its responsibilities are:
```
connect
disconnect
count viewers
broadcast to one item room
```
That is why the interface contains:
```
class AuctionConnectionRegistry(ABC):
    @abstractmethod
    async def connect(...):
        ...
    @abstractmethod
    async def disconnect(...):
        ...
    @abstractmethod
    async def get_viewer_count(...):
        ...
    @abstractmethod
    async def broadcast(...):
        ...
```
Each method represents one real problem.

---
#### Problem 7: What does `connect()` solve?
When a user opens:
```
/auction-items/item-123
```
the browser opens a WebSocket.
The backend must:
```
Accept the connection
Add it to item-123’s connection group
```
#### Solution
The registry exposes:
```
async def connect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
    ...
```
A real implementation might do:
```
async def connect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
    await connection.accept()
    self._connections[item_id].add(connection)
```
Cause and effect:
```
Connection is accepted
    ↓
Connection is stored under itemId
    ↓
Future events can find this browser
```

---
#### Problem 8: What does `disconnect()` solve?
When a user:
```
Closes the page
Refreshes the browser
Loses internet
Closes the tab
```
the old connection should no longer be stored.
If it remains stored:
```
Viewer count becomes incorrect
Broadcast attempts fail
Memory keeps growing
```
#### Solution
Remove the connection from the correct item room.
```
async def disconnect(
    self,
    item_id: UUID,
    connection: RealtimeConnection,
) -> None:
    connections = self._connections.get(item_id)
    if not connections:
        return
    connections.discard(connection)
    if not connections:
        self._connections.pop(item_id, None)
```
Cause and effect:
```
Browser disconnects
    ↓
Registry removes connection
    ↓
Viewer count stays correct
    ↓
Future broadcasts ignore dead connection
```

---
#### Problem 9: What does `get_viewer_count()` solve?
Your page must display:
```
3 people watching
```
The backend needs to count how many current connections belong to that item.
#### Solution
Count the stored connections.
```
async def get_viewer_count(
    self,
    item_id: UUID,
) -> int:
    return len(
        self._connections.get(item_id, set())
    )
```
Example:
```
{
    item_123: {browser_a, browser_b, browser_c}
}
```
Result:
```
viewerCount = 3
```
For the first version, this counts browser connections, not necessarily unique users.
One person opening three tabs may count as three viewers.

---
#### Problem 10: What does `broadcast()` solve?
After a successful bid, the backend has one event:
```
{
  "type": "BID_PLACED",
  "itemId": "item-123"
}
```
It needs to send that event to every connection watching `item-123`.
#### Solution
The registry exposes:
```
async def broadcast(
    self,
    item_id: UUID,
    message: dict,
) -> None:
    ...
```
Example implementation:
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
Cause and effect:
```
Publisher provides itemId and event
    ↓
Registry finds all connections for that item
    ↓
Registry sends JSON to every connection
```

---
#### Problem 11: Why is importing FastAPI `WebSocket` into the application layer questionable?
The first interface uses:
```
from fastapi import WebSocket
```
```
async def connect(
    self,
    item_id: UUID,
    websocket: WebSocket,
) -> None:
    ...
```
This means the application layer knows about FastAPI.
Now the core code depends on a specific web framework.
If you later use another framework or want simple unit tests, the interface is tied to FastAPI’s class.
#### Solution
Define only the connection abilities your application needs.
```
from typing import Protocol
class RealtimeConnection(Protocol):
    async def accept(self) -> None: ...
    async def send_json(self, data: dict) -> None: ...
    async def receive_text(self) -> str: ...
    async def close(self, code: int = 1000) -> None: ...
```
This says:
```
I do not care whether this is a FastAPI WebSocket.
I only care that it can:
- accept
- send JSON
- receive text
- close
```
Then the registry interface uses the generic type:
```
from abc import ABC, abstractmethod
from uuid import UUID
from app.application.ports.realtime_connection import (
    RealtimeConnection,
)
class AuctionConnectionRegistry(ABC):
    @abstractmethod
    async def connect(
        self,
        item_id: UUID,
        connection: RealtimeConnection,
    ) -> None:
        raise NotImplementedError
```

---
#### Problem 12: How can a FastAPI WebSocket satisfy `RealtimeConnection`?
You may think that FastAPI’s `WebSocket` must explicitly inherit from `RealtimeConnection`.
It does not.
Python `Protocol` supports structural typing.
That means an object is accepted when it has the required methods.
FastAPI `WebSocket` already has methods such as:
```
accept()
send_json()
receive_text()
close()
```
#### Solution
Pass the FastAPI WebSocket directly:
```
@router.websocket("/ws/auction-items/{item_id}")
async def auction_item_socket(
    websocket: WebSocket,
    item_id: UUID,
):
    await registry.connect(
        item_id=item_id,
        connection=websocket,
    )
```
The registry expects a `RealtimeConnection`.
The FastAPI WebSocket has the required methods.
Therefore, it satisfies the protocol.
No wrapper is required for the first implementation.

---
#### Problem 13: What is the difference between the publisher and registry?
This is the most important distinction.
##### Event publisher
Its job is:
```
Publish this auction event.
```
Example:
```
await publisher.publish(
    item_id=item_id,
    event=bid_placed_event,
)
```
It works at the event-delivery level.
##### Connection registry
Its job is:
```
Track browser connections and send messages to them.
```
Example:
```
await registry.broadcast(
    item_id=item_id,
    message=message,
)
```
It works at the WebSocket-connection level.
#### Solution
Think about a school announcement:
```
Publisher
    → Decides that an announcement must be delivered
Connection registry
    → Knows which classrooms should hear it
```
The call flow is:
```
PlaceBidUseCase
    ↓
AuctionEventPublisher.publish()
    ↓
WebSocketAuctionEventPublisher
    ↓
AuctionConnectionRegistry.broadcast()
    ↓
Connected browsers
```

---
#### Problem 14: Why not use only the connection registry?
For a small application, you can.
Your use case could call:
```
await registry.broadcast(
    item_id=item_id,
    message=event,
)
```
But then the application use case knows that events are distributed through active connections.
That makes future Redis changes harder.
#### Solution
Use the registry for WebSocket connection management.
Use the publisher as the application-facing abstraction.
```
Application layer
    → AuctionEventPublisher
Infrastructure publisher
    → AuctionConnectionRegistry
Connection registry
    → WebSocket clients
```
This gives each object one responsibility.

---
### Practical Code Relationship
#### Application port: publisher
```
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        raise NotImplementedError
```
#### Application port: connection
```
class RealtimeConnection(Protocol):
    async def accept(self) -> None: ...
    async def send_json(self, data: dict) -> None: ...
    async def receive_text(self) -> str: ...
    async def close(self, code: int = 1000) -> None: ...
```
#### Application port: registry
```
class AuctionConnectionRegistry(ABC):
    @abstractmethod
    async def connect(
        self,
        item_id: UUID,
        connection: RealtimeConnection,
    ) -> None:
        raise NotImplementedError
    @abstractmethod
    async def disconnect(
        self,
        item_id: UUID,
        connection: RealtimeConnection,
    ) -> None:
        raise NotImplementedError
    @abstractmethod
    async def get_viewer_count(
        self,
        item_id: UUID,
    ) -> int:
        raise NotImplementedError
    @abstractmethod
    async def broadcast(
        self,
        item_id: UUID,
        message: dict,
    ) -> None:
        raise NotImplementedError
```
#### Infrastructure publisher
```
class WebSocketAuctionEventPublisher(
    AuctionEventPublisher
):
    def __init__(
        self,
        registry: AuctionConnectionRegistry,
    ) -> None:
        self._registry = registry
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        message = event.model_dump(
            mode="json",
            by_alias=True,
        )
        await self._registry.broadcast(
            item_id=item_id,
            message=message,
        )
```

---
### Common Wrong Approach 1: Thinking the interface performs the work
This does not send any event:
```
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(...):
        raise NotImplementedError
```
It only defines the required method.
You need an implementation:
```
class WebSocketAuctionEventPublisher(
    AuctionEventPublisher
):
    async def publish(...):
        await registry.broadcast(...)
```

---
### Common Wrong Approach 2: Creating the registry inside every request
Wrong:
```
@router.websocket("/ws/auction-items/{item_id}")
async def socket(...):
    registry = InMemoryAuctionConnectionRegistry()
```
Each browser gets a different registry.
Browser A might be stored in registry A.
Browser B might be stored in registry B.
They cannot see each other.
#### Solution
Create one shared registry for the backend process:
```
auction_connection_registry = (
    InMemoryAuctionConnectionRegistry()
)
```
All WebSocket endpoints and publishers use that same object.

---
### Common Wrong Approach 3: Mixing publisher and registry responsibilities
A large class might:
```
Create events
Validate bids
Track connections
Publish Redis messages
Send WebSocket JSON
Count viewers
```
That class becomes difficult to understand and test.
#### Solution
Keep the responsibilities separate:
```
Event factory
    → Builds the event
Publisher
    → Publishes the event
Registry
    → Tracks connections and broadcasts
Use case
    → Controls business workflow
```

---
### What You Should Build First
For your project, you do not need Redis, RabbitMQ, or Kafka now.
Implement:
```
1. RealtimeConnection protocol
2. AuctionConnectionRegistry interface
3. InMemoryAuctionConnectionRegistry
4. AuctionEventPublisher interface
5. WebSocketAuctionEventPublisher
```
The runtime relationship is:
```
PlaceBidUseCase
    ↓ uses
AuctionEventPublisher interface
    ↓ implemented by
WebSocketAuctionEventPublisher
    ↓ uses
AuctionConnectionRegistry interface
    ↓ implemented by
InMemoryAuctionConnectionRegistry
    ↓ stores
FastAPI WebSocket connections
```

---
### Complete Execution Flow
```
User opens auction item page
    ↓
FastAPI receives WebSocket connection
    ↓
Router passes FastAPI WebSocket as RealtimeConnection
    ↓
AuctionConnectionRegistry.connect()
    ↓
Connection is stored under itemId
    ↓
User places a bid through REST
    ↓
PlaceBidUseCase validates and saves bid
    ↓
Database transaction commits
    ↓
PlaceBidUseCase calls AuctionEventPublisher.publish()
    ↓
WebSocketAuctionEventPublisher converts event to JSON
    ↓
AuctionConnectionRegistry.broadcast()
    ↓
Registry finds all connections for itemId
    ↓
Each browser receives BID_PLACED
    ↓
React updates the price and bid list
```
The key distinction is:
```
AuctionEventPublisher
    = How the application announces an event
AuctionConnectionRegistry
    = How WebSocket connections are stored and reached
RealtimeConnection
    = The minimum abilities required from one live connection
```
Do you mean AuctionEventPublisher is an interface? .An interface does not have node in function I do not get this ## Problem 2: Why does the interface not contain implementation code? The application layer knows that an event must be published. But it should not need to know whether the event is sent through:
```
WebSocket
Redis Pub/Sub
RabbitMQ
Kafka
```
These technologies solve infrastructure concerns. The bidding business rule should not change just because your delivery technology changes. ## Solution Make the use case depend on `AuctionEventPublisher`.
```
class PlaceBidUseCase:
    def __init__(
        self,
        event_publisher: AuctionEventPublisher,
    ) -> None:
        self._event_publisher = event_publisher
```
After a successful commit:
```
await self._event_publisher.publish(
    item_id=result.item_id,
    event=event,
)
```
The use case only understands:
```
Publish this event.
```
It does not understand:
```
Find WebSocket connections.
Serialize JSON.
Publish to Redis channel.
Send messages to backend workers.
```
##### Why this works The business workflow remains stable:
```
Place bid
    ↓
Commit
    ↓
Publish event
```
Only the publisher implementation changes. --- ## Problem 3: An interface cannot send anything by itself This code:
```
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(...):
        raise NotImplementedError
```
does not actually send messages. It only defines what a publisher must be able to do. You still need a real implementation. ## Solution Create a WebSocket publisher in the infrastructure layer.
```
### app/infrastructure/realtime/websocket_auction_event_publisher.py
from uuid import UUID
from app.application.ports.auction_event_publisher import (
    AuctionEventPublisher,
)
from app.domain.events.auction_item_event import AuctionItemEvent
class WebSocketAuctionEventPublisher(AuctionEventPublisher):
    def __init__(self, connection_registry) -> None:
        self._connection_registry = connection_registry
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        message = event.model_dump(
            mode="json",
            by_alias=True,
        )
        await self._connection_registry.broadcast(
            item_id=item_id,
            message=message,
        )
```
Now you have:
```
AuctionEventPublisher
    → Interface
WebSocketAuctionEventPublisher
    → Actual WebSocket implementation
```
The application use case depends on the first one. At runtime, you inject the second one. ---
### Main Problem
Yes, `AuctionEventPublisher` is acting like an interface.
Your confusion is reasonable because Python does not have a separate `interface` keyword like Java.
In Python, an interface is usually represented using:
```
ABC
abstractmethod
```
The important idea is:
```
AuctionEventPublisher defines what must exist.
WebSocketAuctionEventPublisher defines how it actually works.
```
The interface method has no real implementation because its job is only to define the required method name, parameters, and return type.

---
#### Problem 1: Python does not have a Java-style `interface`
In Java, you might write:
```
public interface AuctionEventPublisher {
    void publish(UUID itemId, AuctionItemEvent event);
}
```
There is no implementation inside the interface.
A class then implements it:
```
public class WebSocketAuctionEventPublisher
        implements AuctionEventPublisher {
    @Override
    public void publish(
        UUID itemId,
        AuctionItemEvent event
    ) {
        // Actual WebSocket code
    }
}
```
Python does not use the `interface` keyword.
#### Solution
Use an abstract base class:
```
from abc import ABC, abstractmethod
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        item_id,
        event,
    ) -> None:
        raise NotImplementedError
```
This means:
```
Any class that claims to be an AuctionEventPublisher
must implement publish().
```
It does not mean this class can publish an event itself.

---
#### Problem 2: Why does the interface method have a body?
You noticed this:
```
async def publish(...) -> None:
    raise NotImplementedError
```
You may think:
```
An interface should have no code inside the function.
```
That is conceptually correct.
But Python syntax requires a function body.
You cannot write:
```
async def publish(...)
```
without anything underneath it.
#### Solution
Use one of these placeholders:
```
raise NotImplementedError
```
or:
```
pass
```
or:
```
...
```
For abstract methods, all three are possible.
##### Version using `raise NotImplementedError`
```
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        item_id,
        event,
    ) -> None:
        raise NotImplementedError
```
##### Version using `pass`
```
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        item_id,
        event,
    ) -> None:
        pass
```
##### Version using ellipsis
```
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        item_id,
        event,
    ) -> None:
        ...
```
For an interface-like class, I recommend:
```
...
```
because it clearly means:
```
There is intentionally no implementation here.
```

---
#### Problem 3: What exactly does the interface define?
This interface:
```
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        ...
```
defines a contract.
The contract says:
```
A publisher must have a method named publish.
publish must receive:
- item_id
- event
publish must be asynchronous.
publish does not return a value.
```
It does not say how publishing happens.
#### Solution
Read the interface as a requirement:
```
Whoever is given to PlaceBidUseCase must support this operation:
await publisher.publish(item_id, event)
```
Possible implementations include:
```
WebSocketAuctionEventPublisher
RedisAuctionEventPublisher
RabbitMQAuctionEventPublisher
KafkaAuctionEventPublisher
```
Each one has the same public method:
```
async def publish(
    self,
    item_id: UUID,
    event: AuctionItemEvent,
) -> None:
```
But each one implements the method differently.

---
#### Problem 4: How can `PlaceBidUseCase` call a method with no implementation?
This is the central confusion.
You see:
```
class PlaceBidUseCase:
    def __init__(
        self,
        event_publisher: AuctionEventPublisher,
    ) -> None:
        self._event_publisher = event_publisher
```
Then:
```
await self._event_publisher.publish(...)
```
But `AuctionEventPublisher.publish()` has no real implementation.
So how can it work?
#### Solution
At runtime, you do not pass an `AuctionEventPublisher` object.
You pass a real implementation object.
For example:
```
publisher = WebSocketAuctionEventPublisher(
    connection_registry=connection_registry,
)
```
Then inject it:
```
place_bid_use_case = PlaceBidUseCase(
    event_publisher=publisher,
)
```
Although the constructor type says:
```
event_publisher: AuctionEventPublisher
```
the actual object is:
```
WebSocketAuctionEventPublisher
```
Therefore, this call:
```
await self._event_publisher.publish(...)
```
runs:
```
WebSocketAuctionEventPublisher.publish(...)
```
not the empty abstract method.

---
#### Problem 5: What happens at runtime exactly?
Consider this implementation:
```
class WebSocketAuctionEventPublisher(
    AuctionEventPublisher
):
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        print("Publishing through WebSocket")
```
Create it:
```
publisher = WebSocketAuctionEventPublisher()
```
Inject it:
```
use_case = PlaceBidUseCase(
    event_publisher=publisher,
)
```
Call it:
```
await use_case.execute(...)
```
Inside the use case:
```
await self._event_publisher.publish(
    item_id=result.item_id,
    event=event,
)
```
Python looks at the actual object stored in:
```
self._event_publisher
```
The actual object is:
```
WebSocketAuctionEventPublisher
```
So Python executes:
```
WebSocketAuctionEventPublisher.publish()
```
#### Solution
Think of the variable type and the real object separately:
```
Declared expected type:
AuctionEventPublisher
Actual object:
WebSocketAuctionEventPublisher
```
This is polymorphism.

---
#### Problem 6: Why not type the constructor directly as `WebSocketAuctionEventPublisher`?
You could write:
```
class PlaceBidUseCase:
    def __init__(
        self,
        event_publisher: WebSocketAuctionEventPublisher,
    ) -> None:
        self._event_publisher = event_publisher
```
This works today.
But now the use case specifically depends on WebSocket technology.
Later, if you use Redis, you must change:
```
WebSocketAuctionEventPublisher
```
to:
```
RedisAuctionEventPublisher
```
inside the use case.
#### Solution
Depend on the common contract:
```
class PlaceBidUseCase:
    def __init__(
        self,
        event_publisher: AuctionEventPublisher,
    ) -> None:
        self._event_publisher = event_publisher
```
Now both objects are acceptable:
```
PlaceBidUseCase(
    event_publisher=WebSocketAuctionEventPublisher(...),
)
```
or:
```
PlaceBidUseCase(
    event_publisher=RedisAuctionEventPublisher(...),
)
```
The use case does not change.

---
#### Problem 7: Why does this count as dependency inversion?
Without an interface:
```
PlaceBidUseCase
    ↓ directly depends on
WebSocketAuctionEventPublisher
```
Your important business logic depends directly on replaceable infrastructure.
With the interface:
```
PlaceBidUseCase
    ↓ depends on
AuctionEventPublisher
```
Then:
```
WebSocketAuctionEventPublisher
    ↓ implements
AuctionEventPublisher
```
#### Solution
The application layer owns the contract.
The infrastructure layer follows that contract.
```
Application says:
"I need a publisher with publish()."
Infrastructure says:
"I will provide a WebSocket implementation."
```
The use case controls what it needs.
The infrastructure does not control the use case.

---
#### Problem 8: What does `WebSocketAuctionEventPublisher` actually implement?
The interface only says:
```
There must be a publish method.
```
The WebSocket implementation contains the actual work:
```
class WebSocketAuctionEventPublisher(
    AuctionEventPublisher
):
    def __init__(
        self,
        connection_registry,
    ) -> None:
        self._connection_registry = connection_registry
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        message = event.model_dump(
            mode="json",
            by_alias=True,
        )
        await self._connection_registry.broadcast(
            item_id=item_id,
            message=message,
        )
```
#### Solution
This implementation performs two real actions.
First:
```
message = event.model_dump(
    mode="json",
    by_alias=True,
)
```
It converts the Pydantic event object into JSON-compatible data.
For example:
```
AuctionItemEvent(
    type="BID_PLACED",
    itemId=item_id,
    timestamp=timestamp,
    data={
        "currentPrice": "36000000.00",
    },
)
```
becomes:
```
{
    "type": "BID_PLACED",
    "itemId": "...",
    "timestamp": "...",
    "data": {
        "currentPrice": "36000000.00",
    },
}
```
Second:
```
await self._connection_registry.broadcast(
    item_id=item_id,
    message=message,
)
```
It sends that message to all browser connections watching the item.

---
#### Problem 9: Where is the real implementation injected?
You need composition code that creates the objects.
For example:
```
connection_registry = InMemoryAuctionConnectionRegistry()
event_publisher = WebSocketAuctionEventPublisher(
    connection_registry=connection_registry,
)
place_bid_use_case = PlaceBidUseCase(
    event_publisher=event_publisher,
)
```
#### Solution
Read this from bottom to top:
```
PlaceBidUseCase receives an event publisher
    ↓
The publisher is WebSocketAuctionEventPublisher
    ↓
The WebSocket publisher receives a connection registry
    ↓
The registry knows which browsers are connected
```
At runtime:
```
PlaceBidUseCase
    ↓ calls publish()
WebSocketAuctionEventPublisher
    ↓ calls broadcast()
InMemoryAuctionConnectionRegistry
    ↓ calls send_json()
FastAPI WebSocket connections
```

---
#### Problem 10: Can someone instantiate the interface directly?
Consider:
```
publisher = AuctionEventPublisher()
```
This should not be allowed because `publish()` has no implementation.
#### Solution
Because the class inherits from `ABC` and the method uses `@abstractmethod`, Python prevents instantiation.
```
publisher = AuctionEventPublisher()
```
This raises an error similar to:
```
TypeError:
Can't instantiate abstract class AuctionEventPublisher
with abstract method publish
```
You must instantiate a concrete child class:
```
publisher = WebSocketAuctionEventPublisher(
    connection_registry,
)
```
That child class implements `publish()`, so Python allows it.

---
#### Problem 11: What happens if the child class forgets to implement `publish()`?
Suppose you write:
```
class WebSocketAuctionEventPublisher(
    AuctionEventPublisher
):
    pass
```
It inherits the abstract method but does not implement it.
#### Solution
Python still treats this child class as abstract.
This fails:
```
publisher = WebSocketAuctionEventPublisher()
```
because `publish()` is still missing.
You must provide it:
```
class WebSocketAuctionEventPublisher(
    AuctionEventPublisher
):
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        ...
```
This helps catch incomplete implementations early.

---
### Simplified Example Without WebSocket
Here is the same concept with a simpler notification example.
#### Interface
```
from abc import ABC, abstractmethod
class MessageSender(ABC):
    @abstractmethod
    def send(self, message: str) -> None:
        ...
```
#### Email implementation
```
class EmailMessageSender(MessageSender):
    def send(self, message: str) -> None:
        print(f"Sending email: {message}")
```
#### SMS implementation
```
class SmsMessageSender(MessageSender):
    def send(self, message: str) -> None:
        print(f"Sending SMS: {message}")
```
#### Use case
```
class NotifyUserUseCase:
    def __init__(
        self,
        sender: MessageSender,
    ) -> None:
        self._sender = sender
    def execute(self) -> None:
        self._sender.send("Auction started")
```
Use email:
```
use_case = NotifyUserUseCase(
    sender=EmailMessageSender(),
)
use_case.execute()
```
Output:
```
Sending email: Auction started
```
Use SMS:
```
use_case = NotifyUserUseCase(
    sender=SmsMessageSender(),
)
use_case.execute()
```
Output:
```
Sending SMS: Auction started
```
`NotifyUserUseCase` does not change.
That is exactly the purpose of `AuctionEventPublisher`.

---
### Common Wrong Approach 1: Instantiate the interface
Wrong:
```
publisher = AuctionEventPublisher()
```
It has no implementation and cannot publish anything.
Correct:
```
publisher = WebSocketAuctionEventPublisher(
    connection_registry,
)
```

---
### Common Wrong Approach 2: Think the type hint creates the object
This:
```
event_publisher: AuctionEventPublisher
```
does not create an interface object.
It only says:
```
The provided object must behave like an AuctionEventPublisher.
```
The real object is supplied here:
```
PlaceBidUseCase(
    event_publisher=WebSocketAuctionEventPublisher(...),
)
```

---
### Common Wrong Approach 3: Put a full WebSocket implementation in the interface
Wrong:
```
class AuctionEventPublisher(ABC):
    async def publish(
        self,
        item_id,
        event,
    ):
        await websocket_manager.broadcast(...)
```
Now the interface is tied to WebSocket.
It is no longer only a contract.
#### Solution
Keep the interface empty:
```
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        ...
```
Put WebSocket code in:
```
WebSocketAuctionEventPublisher
```

---
### Recommended Code for Your Project
#### Interface
```
### app/application/ports/auction_event_publisher.py
from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.events.auction_item_event import (
    AuctionItemEvent,
)
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        ...
```
#### WebSocket implementation
```
### app/infrastructure/realtime/websocket_auction_event_publisher.py
from uuid import UUID
from app.application.ports.auction_event_publisher import (
    AuctionEventPublisher,
)
from app.application.ports.auction_connection_registry import (
    AuctionConnectionRegistry,
)
from app.domain.events.auction_item_event import (
    AuctionItemEvent,
)
class WebSocketAuctionEventPublisher(
    AuctionEventPublisher
):
    def __init__(
        self,
        connection_registry: AuctionConnectionRegistry,
    ) -> None:
        self._connection_registry = connection_registry
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        message = event.model_dump(
            mode="json",
            by_alias=True,
        )
        await self._connection_registry.broadcast(
            item_id=item_id,
            message=message,
        )
```
#### Dependency creation
```
connection_registry = (
    InMemoryAuctionConnectionRegistry()
)
event_publisher = WebSocketAuctionEventPublisher(
    connection_registry=connection_registry,
)
place_bid_use_case = PlaceBidUseCase(
    event_publisher=event_publisher,
)
```
#### Use case call
```
await self._event_publisher.publish(
    item_id=result.item_id,
    event=event,
)
```
The actual method executed is:
```
WebSocketAuctionEventPublisher.publish()
```

---
### Complete Execution Flow
```
AuctionEventPublisher
    ↓
Defines the required publish() method
    ↓
Contains no real publishing implementation
    ↓
WebSocketAuctionEventPublisher implements publish()
    ↓
Application creates WebSocketAuctionEventPublisher
    ↓
Application injects it into PlaceBidUseCase
    ↓
PlaceBidUseCase stores it as self._event_publisher
    ↓
PlaceBidUseCase calls self._event_publisher.publish()
    ↓
Python uses the actual object type
    ↓
WebSocketAuctionEventPublisher.publish() runs
    ↓
Event is converted to JSON
    ↓
Connection registry broadcasts the event
    ↓
Connected React clients receive it
```
The key idea is:
```
AuctionEventPublisher
    = requirement
WebSocketAuctionEventPublisher
    = working implementation
event_publisher parameter
    = place where the working implementation is injected
```