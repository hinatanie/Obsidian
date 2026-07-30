#### 1. The problem is what the WebSocket message which backend must send to user watching like
```
{
	"type": "BID_PLACED",
	"itemId": "item-123",
	"data": {
		"bidId": "bid123",
		"currentPrice": "36000000.00",
		"totalBids": 8
	}
}
```
You can construct it directly inside the router, or use a separate function. Both approaches can work, but a separate function becomes cleaner when the same event has many fields or is used in multiple places.
#### 2. The problem is that you putting the event dictionary directly in the router
This code constructs the entire WebSocket messsage inside the bid endpoint
```
@router.post("/auction-items/{item_id}/bids")
async def place_bid(
	item_id: UUID,
	request: PlaceBidRequest
): 
	result = await bid_service.place_bid(
		item_id=item_id,
		amount=request.amount
	)
	await session.commit()
	await manager.broadcast(
		item_id,
		{
			"type": "BID_PLACED",
			"itemId": str(item_id),
			"data": {
				"bidId": str(result.bid_id),
				"currentPrice": str(result.current_price),
				"totalBids": result.total_bids
			}
		}
	)
	return result
```
This part is the event dictionary
```
		{
			"type": "BID_PLACED",
			"itemId": str(item_id),
			"data": {
				"bidId": str(result.bid_id),
				"currentPrice": str(result.current_price),
				"totalBids": result.total_bids
			}
		}
```
The solution is creating a function that builds and returns the WebSocket event
```
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID
def create_bid_placed_event(
    *,
    item_id: UUID,
    bid_id: UUID,
    bidder_name: str,
    amount: Decimal,
    current_price: Decimal,
    total_bids: int,
) -> dict:
    return {
        "type": "BID_PLACED",
        "itemId": str(item_id),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "bidId": str(bid_id),
            "bidderName": bidder_name,
            "amount": str(amount),
            "currentPrice": str(current_price),
            "totalBids": total_bids,
        },
    }
```
The router call it like this
```
event = create_bid_placed_event(
	item_id=item_id,
	bid_id=result.bid_id,
	bidder_name=result.bidder_name,
	amount=result.amount,
	current_price=result.current_price,
	total_bids=result.total_bids
)
```
But nothing has been sent yet
#### 3. The problem what does `publisher.publish()` do
After creating the event, the backend needs to send it to all WebSocket connections watching that item.
That is the publisher's responsibility
##### The solution is that the publisher takes the finished event and broadcast it
```
class AuctionEventPublisher:
	def __init__(self, manager):
		self.manager = manager
	async def publish(
		self,
		item_id: UUID,
		event:dict
	) -> None:
		await self._manager.broadcast(
			item_id=item_id,
			message=event
		)
```
Usage:
```
event = create_bid_placed_event(
    item_id=item_id,
    bid_id=result.bid_id,
    bidder_name=result.bidder_name,
    amount=result.amount,
    current_price=result.current_price,
    total_bids=result.total_bids,
)
await publisher.publish(
    item_id=item_id,
    event=event,
)
```
#### 4. The problem is why not call `manager.broadcast()` directly?
You can call it directly in the first version
```
event=create_bid_placed_event(...)
await manager.broadcast(
	item_id=item_id,
	message=event
)
```
This is already much cleaner than constructing the dictionary inside `broadcast()`.
The publisher is an additional abstraction that becomes useful later
For example, today you use
```
In-memmory WebSocket manager
```
Later, when using multiple backend workers, you may need
```
Redis Pub/Sub
```
#### 5. The problem is that a simple implementation might directly call the WebSocket manager
```
await websocket_manager.broadcast(
	item_id=result.item_id,
	message=event
)
```
This works, but it connects the bidding use case directly to WebSocket infrastructure
interface is a contract. It says every publisher must provide
```
async def publish(item_id, event)
```
##### The solution is defining a small interface
The interface does not explain how the event is delivered
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
This interface is a contract. It says every publisher must provide:
```
async def publish(item_id,event)
```

#### 6. The problem is why does the interface not contain implementation code?
The application layer knows that an event must be published
But it should not know whether the event is sent through
```
WebSocket
Redis Pub/Sub
RabbitMQ
Kafka
```
These technologies solve infrastructure concerns
#### The solution is making the use case depend on `AuctionEventPublisher`
```
class PlaceBidUserCase:
	def __init__(
		self,
		event_publisher: AuctionEventPublisher,
	) -> None:
		self._event_publisher=event_publisher
```
After a successful commit
```
await self._event_publisher.publish(
	item_id=result.item_id,
	event=event
)
```
#### 7. The problem is what does dependency inversion mean?
Without dependency inversion, the use case directly creates or imports the infrastructure class

#### 8. The problem is why might you replace the WebSocket publisher later?
Your first backend may run with
```
One FastAPI process
One Uvicorn worker
One in-memory connection manager
```
In that situation, direct local broadcasting works
Later, you may run 
```
Worker 1
Worker 2
Worker 3
```
A browser connected to Worker 2 cannot receive an event that only exist inside Worker 1's memory
##### The solution is replacing the publisher implementation with Redis
```
class RedisAuctionEventPublisher(AuctionEventPublisher):
	async def publish(
		self,
		item_id: UUID,
		event: AuctionItemEvent
	)-> None:
		channel= f"auction-item:{item_id}"
		await self._redis.publish(
			chankhonel,
			event.model_dump_json(by_alias=True)
		)
```
Your use case still calls
```
await self._event_publisher.publish(
	result.item_id,
	event
)
```
It does not change
Only dependency injection changes

#### 9. The problem is the backend must also track browser connected to each auction item
For example
```
item-123
    ├── Browser A
    ├── Browser B
    └── Browser C
```
When a bid happens for `item-123`, the backend must send the event to those three browsers.
This is the responsibility of the connection registry

#### 10. The problem is the backend needs to group connections by auction item
Suppose these users are connected
```
Browser A -> item-123
Browser B -> item-123
Browser C -> item-999
```
When `item-123` receives a new bid
```
Browser A should receive it
Browser B should receive it
Browser C should receive it
```
The system needs somewhere to store this relationship
#### The solution is creating an auction connection registry
Conceptually, it stores
```
{
	item_123: {browser_a, browser_b},
	item_999: {browser_c}
}
```
Its responsibilities are
```
connect
disconnect
count viewers
broadcast to one item room
```
That is why the interface contains
```
class AuctionConnectionRetrisgy(ABC):
	@abstractmethod
	async def connect(...):
	
	@abstractmethod
	async def disconnect(...):
	
	@abstractmethod
	async def get_viewer_count(...):
	
	@abstractmethod
	async def broadcast(...)
```
Each method represents one real problem

This protocol says:
> Any object with these methods can be treated as a `RealtimeConnection`.

#### 11. The problem is what does `connect()` solve?
When a user opens `/auction-items/item-123`
The browser opens a WebSocket.
The backend must
```
Accept the connection
Add it to item-123's connection group
```
##### The solution is that the registry exposes
```
async def connect(
	self,
	item_id:UUID,
	connection: RealtimeConnection,
)-> None:
```
A real implementation might do:
```
async def connect(
	self,
	item_id: UUID,
	connection: RealtimeConnection,
)-> None:
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
#### 12. The problem is what does `disconnect()` solve?
When a user
```
Closes the page
Refreshser the browser
Loses the internet
Closes the tab
```
the old connection should no longer be stored
If it remains stored
```
Viewer count becomes incorrect
Broadcast attemps fail
Memory keeps growing
```
The solution is removing the connection from the correct item room
```
async def disconnect(
	self,
	item_id: UUID,
	connection:RealtimeConnection,
)-> None:
	connections = self._connections.get(item_id)
	if not connections
		return
	connections.discard(connection)
	if not connections:
		self._connections.pop(item_id, None)
```
Cause and effect
```
Browser disconnects
Registry removes connection
Viewer count stays correct
Future broadcasts ignore dead connection
```
#### 13. The problem is what does `get_viewer_count()` solve?
Your page must display 3 people watching
The backend needs to count how many current connections belong to that item
##### The solution is counting the stored connections
```
async def get_viewer_count(
	self,
	item_id: UUID
)-> int:
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
Result
```
viewerCount=3
```
For the first version, this counts browser connections, not necessarily unique users
One person opening three tabs may count as three viewers

#### The problem is what does broadcast() solve?
After a successful bid, the backend has one event
```
{
	"type": "BID_PLACED",
	"itemId": "item-123"
}
```
It needs to send that event to every connection watching item-123
#### The solution is that the registry exposes
```
async def broadcast(
	self,
	item_id: UUID,
	message: dict
)-> None:
	connections = list (
		self._connection.get(item_id, set())
	)
	for connection in connections:
	await connection.send_json(message)
```
Cause and effect
```
Publisher provides itemId and event
    ↓
Registry finds all connections for that item
    ↓
Registry sends JSON to every connection
```
#### 14. The problem is why is importing FastAPI `WebSocket` into the application layer questionable?
The first interface uses
```
async def connect(
	self,
	item_id:UUID,
	websocket:WebSocket,
)->None:
```
This means the application layer knows about FastAPI
Now the core code depends on a specific web framework
If you later use another framework or want to simple unit tests, the interface is tied to FastAPI's class
##### The solution is defining only the connection abilities your application needs
```
class RealtimeConnection(Protocol):
	async def accept(self)-> None: ...
	async def send_json(self, data:dict)-> None:
	async def receive_text(self)->str:
	async def close(self, code:int=1000)->None:
```
This says
```
I do not care whether this is a FastAPI WebSocket
I only care that it can
- accept
- send JSON
- receive text
- close
```
Then the registry interface uses the generic type
```
class AuctionConnectionRegistry(ABC):
	@abstractmethod
	async def connect(
		self, 
		item_id: UUID,
		connection: RealtimeConnection
	)->None:
		raise NotImplementError
```

#### 14. The problem is how can a FastAPI WebSocket satisfy RealtimeConnection?
You may think FastAPI's WebSocket must explicitly inherit from RealtimeConnection

FastAPI’s `WebSocket` already provides those methods:
```
websocket.accept()
websocket.send_json(...)
websocket.receive_text()
websocket.close()
```
So this works:
```
await registry.connect(
    item_id=item_id,
    connection=websocket,
)
```
Even though `WebSocket` does **not** explicitly inherit from `RealtimeConnection`, it still matches the required shape.
##### The solution is passing the FastAPI Web Socket directly 
```
@router.websocket("/ws/auction-items/{item_id}")
async def auction_item_socket(
	websocket: WebSocket,
	item_id: UUID,
):
	await registry.connect(
		item_id=item_id,
		connection=websocket
	)
```
The registry expects a RealtimeConnection
The FastAPI WebSocket has the required methods
Therefore, it satisfies the protocol
No wrapper is required for the first implementation

#### 15. The problem is what is the difference between the publisher and registry?
This is the most important distinction
Event publisher publish this auction event
```
await publisher.publish(
	item_id=item_id,
	event=bid_placed_event
)
```
It works at the event-delivery level
Connection registry tracks browser connections and send messages to them
```
await registry.broadcast(
	item_id=item_id,
	message=message
)
```
It works at the WebSocket connection level

#### 16. The problem is why not use only the connection registry
For a small application, you can.
Your use case could call
```
await registry.broadcast(
	item_id=item_id
	message=event
)
```
