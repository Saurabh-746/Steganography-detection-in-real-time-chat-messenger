document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('registerForm');
	const msg = document.getElementById('msg');
	const usersList = document.getElementById('usersList');

	function refreshUsers() {
		const users = JSON.parse(localStorage.getItem('users') || '[]');
		usersList.innerHTML = '';
		users.forEach(u => {
			const li = document.createElement('li');
			li.textContent = u;
			usersList.appendChild(li);
		});
	}

	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const username = document.getElementById('username').value.trim();
		if (!username) { msg.textContent = 'Enter a username'; return; }
		const users = JSON.parse(localStorage.getItem('users') || '[]');
		if (users.includes(username)) { msg.textContent = 'Username already taken'; return; }
		users.push(username);
		localStorage.setItem('users', JSON.stringify(users));
		msg.textContent = 'Registered. Redirecting to login...';
		setTimeout(() => location.href = '../login page/index.html', 800);
	});

	refreshUsers();
});
