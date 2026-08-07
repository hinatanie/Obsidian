You are working on my existing auction application.
Technology stack:
```text
Backend: Python FastAPI
Database: MySQL
ORM: Async SQLAlchemy
Frontend: React + TypeScript
Architecture: Clean Architecture
Real-time communication: WebSocket
```
The auction item detail page route is:
```text
/auction-items/{itemId}
```
The backend already has a WebSocket endpoint similar to:
```text
/ws/auction-items/{itemId}
```
The WebSocket is currently used for real-time viewer tracking.
# Main Problem
I need to add a live chat box to the auction item detail page.
Users viewing the same auction item must be able to send and receive chat messages through the existing auction item WebSocket connection.
All chat messages received from the WebSocket must remain visible inside the chat box while the user stays on the page.
Example:
```text
User A opens auction item 123
User B opens auction item 123
User A sends:
"Hello"
User B immediately sees:
User A: Hello
User B sends:
"How much is the current price?"
Both users immediately see:
User A: Hello
User B: How much is the current price?
```
# Requirements
## 1. Reuse the existing WebSocket connection
Do not create a separate WebSocket connection only for chat unless the current architecture makes reuse impossible.
Use the existing connection:
```text
/ws/auction-items/{itemId}
```
The same connection should support:
```text
viewer count updates
chat messages
ping/pong
future auction events
```
Use a message type field to distinguish events.
Example viewer-count event:
```json
{
  "type": "VIEWER_COUNT_UPDATED",
  "itemId": "item-123",
  "timestamp": "2026-08-04T10:00:00Z",
  "data": {
    "viewerCount": 2
  }
}
```
Example chat-message event:
```json
{
  "type": "CHAT_MESSAGE_SENT",
  "itemId": "item-123",
  "timestamp": "2026-08-04T10:01:00Z",
  "data": {
    "messageId": "uuid",
    "userId": "user-uuid",
    "senderName": "Nguyen Van A",
    "content": "Hello"
  }
}
```
## 2. Create the chat UI
Add a chat box to the auction item detail page.
The chat box should contain:
```text
Chat header
Scrollable message list
Sender name
Message content
Message timestamp
Text input
Send button
Connection status
```
Example layout:
```text
┌──────────────────────────────────┐
│ Live Chat              Connected │
├──────────────────────────────────┤
│ Nguyen Van A                    │
│ Hello                            │
│ 17:20                            │
│                                  │
│ Tran Van B                       │
│ How much is the current price?   │
│ 17:21                            │
├──────────────────────────────────┤
│ Type a message...        [Send]  │
└──────────────────────────────────┘
```
The message list must automatically scroll to the newest message.
Older messages already received during the current page session must remain visible.
Do not replace the previous message when a new message arrives.
Append every new chat message to the existing message array.
Correct behavior:
```tsx
setMessages((currentMessages) => [
  ...currentMessages,
  newMessage,
]);
```
Wrong behavior:
```tsx
setMessages([newMessage]);
```
## 3. Create frontend types
Create clear TypeScript types such as:
```tsx
type ChatMessage = {
  messageId: string;
  itemId: string;
  userId: string;
  senderName: string;
  content: string;
  timestamp: string;
};
type ViewerCountUpdatedEvent = {
  type: "VIEWER_COUNT_UPDATED";
  itemId: string;
  timestamp: string;
  data: {
    viewerCount: number;
  };
};
type ChatMessageSentEvent = {
  type: "CHAT_MESSAGE_SENT";
  itemId: string;
  timestamp: string;
  data: {
    messageId: string;
    userId: string;
    senderName: string;
    content: string;
  };
};
type AuctionWebSocketEvent =
  | ViewerCountUpdatedEvent
  | ChatMessageSentEvent;
```
Avoid using `any`.
## 4. Update the WebSocket client
The frontend WebSocket client must:
```text
Connect when the auction item page mounts
Use the current itemId
Receive JSON messages
Handle multiple event types
Append chat messages
Update viewer count
Send chat messages
Send ping messages
Reconnect when appropriate
Close when the page unmounts
```
The message handler should use the event type:
```tsx
socket.onmessage = (event) => {
  const message: AuctionWebSocketEvent = JSON.parse(event.data);
  switch (message.type) {
    case "VIEWER_COUNT_UPDATED":
      setViewerCount(message.data.viewerCount);
      break;
    case "CHAT_MESSAGE_SENT":
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          messageId: message.data.messageId,
          itemId: message.itemId,
          userId: message.data.userId,
          senderName: message.data.senderName,
          content: message.data.content,
          timestamp: message.timestamp,
        },
      ]);
      break;
  }
};
```
Do not allow one event type to overwrite state belonging to another event type.
## 5. Send chat messages through WebSocket
When the user submits a message, send JSON similar to:
```json
{
  "type": "SEND_CHAT_MESSAGE",
  "data": {
    "content": "Hello"
  }
}
```
The item ID should come from the WebSocket route.
The authenticated user should come from the backend authentication context.
Do not trust the frontend to provide:
```text
userId
senderName
role
```
The backend should determine those values from the authenticated user.
Validate the message before sending:
```text
Must not be empty
Trim leading and trailing whitespace
Maximum length: 500 characters
Disable sending while disconnected
Disable sending while the input is empty
```
Allow sending with:
```text
Send button
Enter key
```
Use:
```text
Shift + Enter
```
for a new line if a multiline text area is used.
## 6. Handle chat messages in FastAPI
Update the WebSocket receive loop so that it can process JSON messages.
Example:
```python
while True:
    raw_message = await websocket.receive_json()
    message_type = raw_message.get("type")
    if message_type == "PING":
        await websocket.send_json({
            "type": "PONG",
        })
    elif message_type == "SEND_CHAT_MESSAGE":
        await send_chat_message_use_case.execute(
            item_id=item_id,
            user=current_user,
            content=raw_message["data"]["content"],
        )
```
Do not treat every incoming WebSocket message as plain text.
Use explicit message types.
## 7. Create a chat use case
Follow Clean Architecture.
Create a use case similar to:
```text
SendAuctionChatMessage
```
Responsibilities:
```text
Validate that the auction item exists
Validate that the user is authenticated
Trim the message
Reject empty messages
Reject messages longer than 500 characters
Create a unique message ID
Create the chat event
Broadcast the event to all connections in the same item room
```
The use case should not directly depend on FastAPI WebSocket.
It should depend on existing ports such as:
```text
AuctionConnectionRegistry
AuctionEventPublisher
```
## 8. Create a domain event
Create a domain event similar to:
```text
ChatMessageSent
```
Example payload:
```python
{
    "type": "CHAT_MESSAGE_SENT",
    "itemId": str(item_id),
    "timestamp": current_utc_time,
    "data": {
        "messageId": str(message_id),
        "userId": str(user.id),
        "senderName": user.full_name,
        "content": content,
    },
}
```
Broadcast the event to every active WebSocket connection for the same auction item.
This includes the sender.
The sender should receive the broadcasted event and append it to the chat like every other viewer.
Do not append the message locally before the server confirms it unless optimistic updates are intentionally implemented with duplicate prevention.
## 9. Keep messages visible during the page session
Store messages in React state:
```tsx
const [messages, setMessages] = useState<ChatMessage[]>([]);
```
Every received message must be appended.
Do not clear the array when:
```text
A viewer-count event arrives
A ping/pong event arrives
The input field changes
The component rerenders
```
It is acceptable for messages to disappear after a full page refresh for the first version.
Do not add database persistence unless required for the implementation.
Clearly explain that this first version stores chat history only in frontend memory while the page remains open.
## 10. Prevent duplicate messages
A WebSocket reconnect or duplicate server event could cause duplicate messages.
Use `messageId` to avoid adding the same message twice.
Example:
```tsx
setMessages((currentMessages) => {
  const alreadyExists = currentMessages.some(
    (message) => message.messageId === incomingMessage.messageId,
  );
  if (alreadyExists) {
    return currentMessages;
  }
  return [...currentMessages, incomingMessage];
});
```
## 11. Handle connection states
Display one of these states:
```text
Connecting
Connected
Disconnected
Reconnecting
```
Disable the send button when the socket is not open.
Display a small warning such as:
```text
Chat is temporarily disconnected.
```
Do not remove existing messages when disconnected.
## 12. Authentication
The auction item page may require an access token for sending chat messages.
Use the application's existing JWT authentication mechanism.
Use the safest WebSocket authentication method already supported by the project.
Possible approaches include:
```text
Secure HTTP-only cookie
Short-lived WebSocket ticket
Existing project-approved query token
Initial authentication WebSocket message
```
Do not invent a completely separate authentication system.
Do not log the access token.
Unauthenticated users may either:
```text
View chat but cannot send
```
or:
```text
Be rejected from the WebSocket
```
Choose the behavior that best matches the existing project and explain the decision.
## 13. Chat component structure
Use a reusable component structure similar to:
```text
components/auction-chat/
├── AuctionChatBox.tsx
├── AuctionChatMessageList.tsx
├── AuctionChatMessageItem.tsx
├── AuctionChatInput.tsx
└── auction-chat.types.ts
```
Reuse the existing auction WebSocket hook or create a unified hook such as:
```text
useAuctionItemWebSocket
```
The hook may return:
```tsx
{
  connected,
  connectionStatus,
  viewerCount,
  messages,
  sendChatMessage,
}
```
Avoid opening one socket in the viewer-count hook and another socket in the chat hook.
There should normally be one WebSocket connection per browser tab per auction item.
## 14. Error handling
Handle:
```text
Invalid JSON
Unsupported event type
Empty content
Message too long
Disconnected socket
Invalid item ID
Auction item not found
Unauthenticated sender
Broadcast failure
Unexpected disconnect
```
The backend should not crash because one WebSocket sends an invalid message.
Send a structured error event where appropriate:
```json
{
  "type": "ERROR",
  "data": {
    "code": "INVALID_CHAT_MESSAGE",
    "message": "Chat message cannot be empty."
  }
}
```
## 15. Test cases
Implement and explain how to test these cases.
### Use Case 1: First viewer opens the page
```text
Open the auction item page
WebSocket connects
Chat status shows Connected
Message list is empty
```
### Use Case 2: Two viewers open the same item
```text
Open the exact same item URL in two browser tabs
Both tabs connect to the same WebSocket room
Viewer count becomes 2
```
### Use Case 3: First user sends a message
User A sends:
```text
Hello
```
Expected in both tabs:
```text
User A: Hello
```
### Use Case 4: Second user replies
User B sends:
```text
Hello, I can see your message.
```
Expected in both tabs:
```text
User A: Hello
User B: Hello, I can see your message.
```
The first message must remain visible.
### Use Case 5: Multiple messages arrive
Send five messages.
Expected:
```text
All five messages remain in the chat box
Messages appear in receive order
Chat scrolls to the newest message
```
### Use Case 6: Empty message
Try to send:
```text
"   "
```
Expected:
```text
Message is not sent
Validation message is displayed
```
### Use Case 7: One viewer closes the tab
Expected:
```text
Viewer count decreases
Remaining user's chat messages stay visible
WebSocket remains connected in the remaining tab
```
### Use Case 8: Socket disconnects
Stop the backend temporarily.
Expected:
```text
Connection status becomes Disconnected or Reconnecting
Previous chat messages remain visible
Send button becomes disabled
```
## 16. Deliverables
Provide:
```text
1. Files to create
2. Files to modify
3. Complete backend code
4. Complete frontend code
5. TypeScript types
6. WebSocket event schemas
7. Dependency injection changes
8. Clean Architecture explanation
9. Execution flow
10. Browser testing steps
11. Common mistakes and why they fail
```
Do not provide only isolated code snippets.
Review the existing project structure first and adapt the implementation to the current codebase.
Do not replace unrelated existing functionality.
Preserve the current viewer-count implementation.
# Complete Expected Flow
```text
User opens auction item page
→ frontend opens one WebSocket connection
→ backend adds the connection to the item room
→ backend broadcasts viewer count
→ frontend updates viewer count
User enters a chat message
→ frontend validates the input
→ frontend sends SEND_CHAT_MESSAGE
→ FastAPI WebSocket router receives the event
→ SendAuctionChatMessage use case validates it
→ backend creates CHAT_MESSAGE_SENT
→ event publisher broadcasts it to the item room
→ every connected tab receives the event
→ each frontend appends the message to its existing message array
→ chat scrolls to the newest message
→ previous messages remain visible
```