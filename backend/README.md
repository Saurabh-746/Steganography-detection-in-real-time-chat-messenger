# Real-Time Chat Backend with FastAPI and WebSockets

## Features

- **User Registration & Authentication**: Secure user registration with password hashing
- **Real-Time Messaging**: WebSocket-based instant messaging
- **User Management**: Track online users and user list
- **Message History**: Persistent storage of chat messages
- **CORS Enabled**: Ready for frontend integration

## Installation

1. Install dependencies:
```powershell
pip install -r requirements.txt
```

## Running the Server

```powershell
python main.py
```

Or using uvicorn directly:
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will start at `http://localhost:8000`

## API Endpoints

### REST Endpoints

- **POST /api/register** - Register a new user
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```

- **POST /api/login** - Login user
  ```json
  {
    "username": "john_doe",
    "password": "securepassword"
  }
  ```

- **GET /api/users** - Get all registered users

- **GET /api/online-users** - Get currently online users

- **GET /api/messages?limit=50** - Get message history (default last 50 messages)

- **DELETE /api/messages** - Clear all messages (admin function)

### WebSocket Endpoint

- **WS /ws/{username}** - WebSocket connection for real-time chat

## WebSocket Message Format

### Sending a message (Client → Server):
```json
{
  "content": "Hello, everyone!"
}
```

### Receiving messages (Server → Client):

**Chat Message:**
```json
{
  "type": "message",
  "message_id": "uuid",
  "sender": "username",
  "content": "Hello, everyone!",
  "timestamp": "2025-11-12T10:30:00"
}
```

**System Message:**
```json
{
  "type": "system",
  "content": "user joined the chat",
  "timestamp": "2025-11-12T10:30:00"
}
```

**User List Update:**
```json
{
  "type": "user_list",
  "users": ["user1", "user2", "user3"]
}
```

**Message History:**
```json
{
  "type": "message_history",
  "messages": [...]
}
```

## Interactive API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Testing with curl

### Register a user:
```powershell
curl -X POST "http://localhost:8000/api/register" -H "Content-Type: application/json" -d '{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"password123\"}'
```

### Login:
```powershell
curl -X POST "http://localhost:8000/api/login" -H "Content-Type: application/json" -d '{\"username\":\"testuser\",\"password\":\"password123\"}'
```

### Get messages:
```powershell
curl http://localhost:8000/api/messages
```

## Production Considerations

This implementation uses in-memory storage. For production:

1. **Database Integration**: Replace in-memory dicts with a proper database (PostgreSQL, MongoDB, etc.)
2. **Authentication**: Implement JWT tokens for secure authentication
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **CORS**: Configure specific origins instead of allowing all
5. **Environment Variables**: Use environment variables for sensitive configuration
6. **Logging**: Add proper logging and monitoring
7. **File Storage**: Implement file upload/download for images
8. **Steganography Detection**: Add image analysis for steganography detection

## Notes

- Users must be registered before connecting via WebSocket
- Messages are broadcast to all connected users in real-time
- Message history is automatically sent when a user connects
- User list is updated when users join/leave the chat
