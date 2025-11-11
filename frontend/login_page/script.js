// Backend API URL
const API_URL = 'https://steganography-detection-in-real-time.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('loginForm');
	const msg = document.getElementById('msg');

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const username = document.getElementById('username').value.trim();
		const password = document.getElementById('password').value;
		
		if (!username || !password) {
			msg.textContent = 'Please enter both username and password.';
			return;
		}

		try {
			msg.textContent = 'Logging in...';
			const response = await fetch(`${API_URL}/api/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password }),
			});

			const data = await response.json();

			if (response.ok) {
				// Store user info in localStorage
				localStorage.setItem('currentUser', username);
				localStorage.setItem('userInfo', JSON.stringify(data.user));
				msg.textContent = 'Login successful! Redirecting...';
				msg.style.color = 'green';
				setTimeout(() => {
					location.href = '/chat_ui/index.html';
				}, 500);
			} else {
				msg.textContent = data.detail || 'Login failed. Please try again.';
				msg.style.color = 'red';
			}
		} catch (error) {
			msg.textContent = 'Error connecting to server. Make sure the backend is running.';
			msg.style.color = 'red';
			console.error('Login error:', error);
		}
	});
});
