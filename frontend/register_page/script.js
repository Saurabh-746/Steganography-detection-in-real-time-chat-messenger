// Backend API URL
const API_URL = 'https://steganography-detection-in-real-time.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('registerForm');
	const msg = document.getElementById('msg');
	const usersList = document.getElementById('usersList');

	async function refreshUsers() {
		try {
			const response = await fetch(`${API_URL}/api/users`);
			const data = await response.json();
			usersList.innerHTML = '';
			if (data.users && data.users.length > 0) {
				data.users.forEach(u => {
					const li = document.createElement('li');
					li.textContent = u.username;
					usersList.appendChild(li);
				});
			} else {
				usersList.innerHTML = '<li>No users registered yet</li>';
			}
		} catch (error) {
			usersList.innerHTML = '<li>Error loading users</li>';
			console.error('Error fetching users:', error);
		}
	}

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const username = document.getElementById('username').value.trim();
		const email = document.getElementById('email').value.trim();
		const password = document.getElementById('password').value;
		
		if (!username || !email || !password) {
			msg.textContent = 'All fields are required';
			msg.style.color = 'red';
			return;
		}

		try {
			msg.textContent = 'Registering...';
			msg.style.color = 'black';
			
			const response = await fetch(`${API_URL}/api/register`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, email, password }),
			});

			const data = await response.json();

			if (response.ok) {
				msg.textContent = 'Registered successfully! Redirecting to login...';
				msg.style.color = 'green';
				setTimeout(() => location.href = '../login_page/index.html', 800);
			} else {
				msg.textContent = data.detail || 'Registration failed. Please try again.';
				msg.style.color = 'red';
			}
		} catch (error) {
			msg.textContent = 'Error connecting to server. Make sure the backend is running.';
			msg.style.color = 'red';
			console.error('Registration error:', error);
		}
	});

	refreshUsers();
});
