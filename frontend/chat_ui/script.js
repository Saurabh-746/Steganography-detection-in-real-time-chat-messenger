/*
	Real-time one-on-one chat using WebSocket connection to FastAPI backend
*/

const WS_URL = 'wss://steganography-detection-in-real-time.onrender.com';
const API_URL = 'https://steganography-detection-in-real-time.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
	const currentUser = localStorage.getItem('currentUser');
	const meEl = document.getElementById('me');
	const contactsList = document.getElementById('contactsList');
	const onlineCount = document.getElementById('onlineCount');
	const messagesEl = document.getElementById('messages');
	const convHeader = document.getElementById('conversationHeader');
	const sendForm = document.getElementById('sendForm');
	const messageInput = document.getElementById('messageInput');
	const sendBtn = document.getElementById('sendBtn');
	const logoutBtn = document.getElementById('logout');
	const connectionStatus = document.getElementById('connectionStatus');

	// Redirect to login if not logged in
	if (!currentUser) {
		location.href = '../login_page/index.html';
		return;
	}

	meEl.textContent = `Signed in as: ${currentUser}`;

	let ws = null;
	let reconnectAttempts = 0;
	const maxReconnectAttempts = 5;
	let selectedContact = null;
	let allUsers = [];
	let onlineUsers = [];

	// Load all registered users
	async function loadAllUsers() {
		try {
			const response = await fetch(`${API_URL}/api/users`);
			const data = await response.json();
			allUsers = data.users.map(u => u.username).filter(u => u !== currentUser);
			updateContactsList();
		} catch (error) {
			console.error('Error loading users:', error);
		}
	}

	// Connect to WebSocket
	function connectWebSocket() {
		try {
			connectionStatus.textContent = 'Connecting...';
			connectionStatus.style.color = 'orange';
			
			ws = new WebSocket(`${WS_URL}/ws/${currentUser}`);

			ws.onopen = () => {
				console.log('WebSocket connected');
				connectionStatus.textContent = '● Connected';
				connectionStatus.style.color = 'green';
				reconnectAttempts = 0;
				sendBtn.disabled = false;
			};

			ws.onmessage = (event) => {
				const data = JSON.parse(event.data);
				console.log('Received:', data);

				if (data.type === 'message') {
					// New chat message - only show if it's from/to selected contact
					if (selectedContact && 
						((data.sender === selectedContact && data.receiver === currentUser) ||
						 (data.sender === currentUser && data.receiver === selectedContact))) {
						addMessageToUI(data);
					}
				} else if (data.type === 'user_online' || data.type === 'user_offline') {
					// Update online status
					if (data.type === 'user_online' && !onlineUsers.includes(data.username)) {
						onlineUsers.push(data.username);
					} else if (data.type === 'user_offline') {
						onlineUsers = onlineUsers.filter(u => u !== data.username);
					}
					updateContactsList();
				} else if (data.type === 'user_list') {
					// Update online users list
					onlineUsers = data.users.filter(u => u !== currentUser);
					updateContactsList();
				} else if (data.type === 'typing') {
					// Show typing indicator
					if (data.sender === selectedContact) {
						showTypingIndicator(data.sender);
					}
				}
			};

			ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				connectionStatus.textContent = '● Connection error';
				connectionStatus.style.color = 'red';
			};

			ws.onclose = () => {
				console.log('WebSocket disconnected');
				connectionStatus.textContent = '● Disconnected';
				connectionStatus.style.color = 'red';
				sendBtn.disabled = true;

				// Attempt to reconnect
				if (reconnectAttempts < maxReconnectAttempts) {
					reconnectAttempts++;
					setTimeout(() => {
						console.log(`Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`);
						connectWebSocket();
					}, 2000 * reconnectAttempts);
				} else {
					connectionStatus.textContent = '● Connection failed';
					alert('Connection lost. Please refresh the page.');
				}
			};
		} catch (error) {
			console.error('Error connecting to WebSocket:', error);
			connectionStatus.textContent = '● Connection failed';
			connectionStatus.style.color = 'red';
		}
	}

	// Add message to UI
	function addMessageToUI(message) {
		const div = document.createElement('div');
		div.className = 'msg ' + (message.sender === currentUser ? 'out' : 'in');
		
		const time = new Date(message.timestamp).toLocaleTimeString([], { 
			hour: '2-digit', 
			minute: '2-digit' 
		});
		
		const contentSpan = document.createElement('span');
		contentSpan.className = 'content';
		contentSpan.textContent = message.content;
		
		const timeSpan = document.createElement('span');
		timeSpan.className = 'time';
		timeSpan.textContent = time;
		
		div.appendChild(contentSpan);
		div.appendChild(timeSpan);
		
		messagesEl.appendChild(div);
		messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	// Load conversation history
	async function loadConversationHistory(contact) {
		try {
			const response = await fetch(`${API_URL}/api/messages/${currentUser}/${contact}`);
			const data = await response.json();
			messagesEl.innerHTML = '';
			if (data.messages && data.messages.length > 0) {
				data.messages.forEach(msg => {
					addMessageToUI(msg);
				});
			}
		} catch (error) {
			console.error('Error loading conversation:', error);
		}
	}

	// Update contacts list
	function updateContactsList() {
		contactsList.innerHTML = '';
		onlineCount.textContent = onlineUsers.length;
		
		if (allUsers.length === 0) {
			contactsList.innerHTML = '<li class="muted">No other users registered</li>';
			return;
		}

		allUsers.forEach(username => {
			const li = document.createElement('li');
			const isOnline = onlineUsers.includes(username);
			li.className = 'contact' + (isOnline ? ' online' : ' offline');
			li.textContent = username;
			li.title = isOnline ? 'Online' : 'Offline';
			
			if (selectedContact === username) {
				li.classList.add('selected');
			}
			
			li.addEventListener('click', () => selectContact(username));
			contactsList.appendChild(li);
		});
	}

	// Select a contact to chat with
	async function selectContact(username) {
		selectedContact = username;
		convHeader.textContent = `Chat with ${username}`;
		updateContactsList();
		await loadConversationHistory(username);
		messageInput.disabled = false;
		sendBtn.disabled = false;
	}

	// Show typing indicator
	let typingTimeout;
	function showTypingIndicator(username) {
		if (username !== selectedContact) return;
		
		const existingIndicator = document.getElementById('typing-indicator');
		if (existingIndicator) {
			clearTimeout(typingTimeout);
		} else {
			const indicator = document.createElement('div');
			indicator.id = 'typing-indicator';
			indicator.className = 'typing-indicator';
			indicator.textContent = `${username} is typing...`;
			messagesEl.appendChild(indicator);
		}
		
		typingTimeout = setTimeout(() => {
			const indicator = document.getElementById('typing-indicator');
			if (indicator) indicator.remove();
		}, 3000);
	}

	// Send message
	sendForm.addEventListener('submit', (e) => {
		e.preventDefault();
		const text = messageInput.value.trim();
		
		if (!text) return;
		
		if (!selectedContact) {
			alert('Please select a contact to chat with.');
			return;
		}
		
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			alert('Not connected to server. Please wait or refresh the page.');
			return;
		}

		try {
			// Send message through WebSocket
			ws.send(JSON.stringify({
				type: 'message',
				receiver: selectedContact,
				content: text
			}));
			
			messageInput.value = '';
		} catch (error) {
			console.error('Error sending message:', error);
			alert('Failed to send message. Please try again.');
		}
	});

	// Send typing indicator
	let typingIndicatorTimeout;
	messageInput.addEventListener('input', () => {
		if (!selectedContact || !ws || ws.readyState !== WebSocket.OPEN) return;
		
		clearTimeout(typingIndicatorTimeout);
		
		ws.send(JSON.stringify({
			type: 'typing',
			receiver: selectedContact
		}));
		
		typingIndicatorTimeout = setTimeout(() => {
			// Stop typing indicator
		}, 1000);
	});

	// Logout
	logoutBtn.addEventListener('click', () => {
		if (ws) {
			ws.close();
		}
		localStorage.removeItem('currentUser');
		localStorage.removeItem('userInfo');
		location.href = '../login_page/index.html';
	});

	// Initialize
	messageInput.disabled = true;
	sendBtn.disabled = true;
	loadAllUsers();
	connectWebSocket();

	// Handle page unload
	window.addEventListener('beforeunload', () => {
		if (ws) {
			ws.close();
		}
	});
});
