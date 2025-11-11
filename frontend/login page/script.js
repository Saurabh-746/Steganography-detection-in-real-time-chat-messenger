// Simple login logic using localStorage
document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('loginForm');
	const msg = document.getElementById('msg');

	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const username = document.getElementById('username').value.trim();
		if (!username) {
			msg.textContent = 'Please enter a username.';
			return;
		}

		const users = JSON.parse(localStorage.getItem('users') || '[]');
		if (!users.includes(username)) {
			msg.textContent = 'User not found. Please register first.';
			return;
		}

		localStorage.setItem('currentUser', username);
		// go to chat UI
		location.href = '../chat ui/index.html';
	});
});

// Helper for quick debugging: create default users if none exist
(() => {
	const users = JSON.parse(localStorage.getItem('users') || '[]');
	if (users.length === 0) {
		localStorage.setItem('users', JSON.stringify(['alice','bob','carol']));
	}
})();
