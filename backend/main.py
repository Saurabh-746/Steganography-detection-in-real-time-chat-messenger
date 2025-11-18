from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from datetime import datetime
import json
import hashlib
import uuid
import io
import os
import sys

import numpy as np
from PIL import Image

app = FastAPI(title="Real-Time Chat API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (replace with database in production)
users_db: Dict[str, dict] = {}
messages_db: Dict[str, List[dict]] = {}  # Key: conversation_id (sorted usernames joined by '|')
active_connections: Dict[str, WebSocket] = {}

# Helper functions
def hash_password(password: str) -> str:
    """Hash a password using SHA-256 (for development only - use proper auth in production)"""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(plain_password) == hashed_password

def create_user(username: str, email: str, password: str) -> dict:
    user_id = str(uuid.uuid4())
    user = {
        "user_id": user_id,
        "username": username,
        "email": email,
        "password_hash": hash_password(password),
        "created_at": datetime.now().isoformat()
    }
    users_db[username] = user
    return user

def authenticate_user(username: str, password: str) -> Optional[dict]:
    user = users_db.get(username)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user

def get_conversation_id(user1: str, user2: str) -> str:
    """Generate a unique conversation ID for two users"""
    return '|'.join(sorted([user1, user2]))

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket
        # Send user list update
        await self.broadcast_user_list()
        # Send message history to new user
        await self.send_message_history(websocket)

    def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str, exclude_user: Optional[str] = None):
        for username, connection in self.active_connections.items():
            if username != exclude_user:
                try:
                    await connection.send_text(message)
                except:
                    pass

    async def broadcast_all(self, message: str):
        for connection in self.active_connections.values():
            try:
                await connection.send_text(message)
            except:
                pass

    async def broadcast_user_list(self):
        user_list = list(self.active_connections.keys())
        message = json.dumps({
            "type": "user_list",
            "users": user_list
        })
        await self.broadcast_all(message)

    async def send_message_history(self, websocket: WebSocket):
        # This will be sent per conversation, not globally
        pass
    
    async def send_personal_notification(self, recipient: str, message: str):
        """Send notification to a specific user if they're online"""
        if recipient in self.active_connections:
            try:
                await self.active_connections[recipient].send_text(message)
            except:
                pass

manager = ConnectionManager()

# Initialize admin users on startup
@app.on_event("startup")
async def startup_event():
    """Create default admin and dummy users if they don't exist"""
    default_users = [
        {"username": "User 1", "email": "user1@admin.com", "password": "admin"},
        {"username": "User 2", "email": "user2@admin.com", "password": "admin"},
        {"username": "Alice", "email": "alice@example.com", "password": "password123"},
        {"username": "Bob", "email": "bob@example.com", "password": "password123"},
        {"username": "Charlie", "email": "charlie@example.com", "password": "password123"}
    ]
    
    for user in default_users:
        if user["username"] not in users_db:
            create_user(user["username"], user["email"], user["password"])
            print(f"Created user: {user['username']}")

    # Load steganalysis CNN model once at startup
    try:
        # Add PyTorch model folder to path
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
        stega_dir = os.path.join(repo_root, 'steganalysis_with_CNN_Yedroudj-Net', 'pytorch_version')
        if stega_dir not in sys.path:
            sys.path.insert(0, stega_dir)
        # Try import model definition
        try:
            import yed as yed_model
        except Exception:
            # Some variants keep modules under src/
            src_dir = os.path.join(stega_dir, 'src')
            if src_dir not in sys.path:
                sys.path.insert(0, src_dir)
            import yed as yed_model  # retry

        model = yed_model.Net()
        model.eval()
        app.state.steg_model = model
        app.state.model_loaded = True
        print('Steganalysis CNN model loaded for inference (randomly initialized).')
    except Exception as e:
        app.state.steg_model = None
        app.state.model_loaded = False
        print(f"Warning: Failed to initialize steganalysis model: {e}")


# Routes
@app.get("/")
async def root():
    return {"message": "Real-Time Chat API with Steganography Detection"}


@app.post("/api/register")
async def register(data: dict):
    """Register a new user"""
    username = data.get("username")
    email = data.get("email", "")
    password = data.get("password")
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if username in users_db:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists (only when an email was provided)
    if email:
        for existing_user in users_db.values():
            if existing_user.get("email") == email:
                raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = create_user(username, email, password)
    
    return {
        "message": "User registered successfully",
        "user": {
            "user_id": new_user["user_id"],
            "username": new_user["username"],
            "email": new_user["email"]
        }
    }

@app.post("/api/login")
async def login(data: dict):
    """Login user"""
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing username or password")
    
    authenticated_user = authenticate_user(username, password)
    if not authenticated_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return {
        "message": "Login successful",
        "user": {
            "user_id": authenticated_user["user_id"],
            "username": authenticated_user["username"],
            "email": authenticated_user["email"]
        }
    }

@app.get("/api/users")
async def get_users():
    """Get all registered users"""
    users = [
        {
            "username": user["username"],
            "email": user["email"],
            "created_at": user["created_at"]
        }
        for user in users_db.values()
    ]
    return {"users": users}

@app.get("/api/online-users")
async def get_online_users():
    """Get currently online users"""
    return {"online_users": list(active_connections.keys())}

@app.get("/api/messages/{user1}/{user2}")
async def get_conversation_messages(user1: str, user2: str, limit: int = 50):
    """Get chat message history for a specific conversation"""
    conv_id = get_conversation_id(user1, user2)
    messages = messages_db.get(conv_id, [])
    recent_messages = messages[-limit:] if len(messages) > limit else messages
    return {"messages": recent_messages, "conversation_id": conv_id}

@app.post("/api/send-message")
async def send_message(data: dict):
    """Send a message to another user"""
    sender = data.get("sender")
    receiver = data.get("receiver")
    content = data.get("content")
    
    if not sender or not receiver or not content:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if sender not in users_db or receiver not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    conv_id = get_conversation_id(sender, receiver)
    
    # Create message object
    message_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    chat_message = {
        "message_id": message_id,
        "sender": sender,
        "receiver": receiver,
        "content": content,
        "timestamp": timestamp,
        "type": "message"
    }
    
    # Save message to conversation
    if conv_id not in messages_db:
        messages_db[conv_id] = []
    messages_db[conv_id].append(chat_message)
    
    # Notify receiver if online
    notification = json.dumps(chat_message)
    await manager.send_personal_notification(receiver, notification)
    
    return {"message": "Message sent", "data": chat_message}

@app.delete("/api/messages")
async def clear_messages():
    """Clear all messages (admin function)"""
    messages_db.clear()
    return {"message": "All messages cleared"}

@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    """WebSocket endpoint for real-time presence and message notifications"""
    # Check if user exists
    if username not in users_db:
        await websocket.close(code=1008, reason="User not found")
        return
    
    await manager.connect(websocket, username)
    
    # Broadcast user online status
    online_message = json.dumps({
        "type": "user_online",
        "username": username,
        "timestamp": datetime.now().isoformat()
    })
    await manager.broadcast(online_message, exclude_user=username)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Handle different message types
            if message_data.get("type") == "message":
                receiver = message_data.get("receiver")
                content = message_data.get("content", "")
                
                if not receiver or not content:
                    continue
                
                # Create message object
                message_id = str(uuid.uuid4())
                timestamp = datetime.now().isoformat()
                conv_id = get_conversation_id(username, receiver)
                
                chat_message = {
                    "message_id": message_id,
                    "sender": username,
                    "receiver": receiver,
                    "content": content,
                    "timestamp": timestamp,
                    "type": "message"
                }
                
                # Save message to conversation
                if conv_id not in messages_db:
                    messages_db[conv_id] = []
                messages_db[conv_id].append(chat_message)
                
                # Send to receiver if online
                notification = json.dumps(chat_message)
                await manager.send_personal_notification(receiver, notification)
                
                # Send confirmation back to sender
                await websocket.send_text(notification)
            
            elif message_data.get("type") == "typing":
                # Forward typing indicator
                receiver = message_data.get("receiver")
                if receiver:
                    typing_msg = json.dumps({
                        "type": "typing",
                        "sender": username,
                        "timestamp": datetime.now().isoformat()
                    })
                    await manager.send_personal_notification(receiver, typing_msg)
            
    except WebSocketDisconnect:
        manager.disconnect(username)
        # Broadcast user offline status
        offline_message = json.dumps({
            "type": "user_offline",
            "username": username,
            "timestamp": datetime.now().isoformat()
        })
        await manager.broadcast(offline_message)
        await manager.broadcast_user_list()
    except Exception as e:
        print(f"Error: {e}")
        manager.disconnect(username)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
