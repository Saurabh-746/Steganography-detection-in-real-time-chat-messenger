/*
	Lightweight client-side chat that stores users and conversations in localStorage.
	Conversations keyed by sorted pair: convId = [userA,userB].sort().join('|')
*/

function convId(a,b){ return [a,b].sort().join('|'); }

document.addEventListener('DOMContentLoaded', () => {
	const currentUser = localStorage.getItem('currentUser');
	const meEl = document.getElementById('me');
	const contactsList = document.getElementById('contactsList');
	const messagesEl = document.getElementById('messages');
	const convHeader = document.getElementById('conversationHeader');
	const sendForm = document.getElementById('sendForm');
	const messageInput = document.getElementById('messageInput');
	const addContactForm = document.getElementById('addContactForm');
	const newContact = document.getElementById('newContact');
	const logoutBtn = document.getElementById('logout');

	if (!currentUser) {
		location.href = '../login page/index.html';
		return;
	}

	meEl.textContent = `Signed in as: ${currentUser}`;

	function getUsers(){ return JSON.parse(localStorage.getItem('users')||'[]'); }
	function getMessages(){ return JSON.parse(localStorage.getItem('messages')||'{}'); }
	function saveMessages(obj){ localStorage.setItem('messages', JSON.stringify(obj)); }

	let selected = null; // currently selected contact username

	function renderContacts(){
		const users = getUsers().filter(u => u !== currentUser);
		contactsList.innerHTML = '';
		users.forEach(u => {
			const li = document.createElement('li');
			li.textContent = u;
			li.className = 'contact';
			li.addEventListener('click', () => selectContact(u));
			contactsList.appendChild(li);
		});
		if (users.length === 0) contactsList.innerHTML = '<li class="muted">No contacts. Register or add one.</li>';
	}

	function selectContact(username){
		selected = username;
		convHeader.textContent = `Chat with ${username}`;
		renderMessages();
	}

	function renderMessages(){
		messagesEl.innerHTML = '';
		if (!selected) return;
		const all = getMessages();
		const id = convId(currentUser, selected);
		const arr = all[id] || [];
		arr.forEach(m => {
			const div = document.createElement('div');
			div.className = 'msg ' + (m.from === currentUser ? 'out' : 'in');
			div.textContent = m.text;
			messagesEl.appendChild(div);
		});
		messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	sendForm.addEventListener('submit', (e) => {
		e.preventDefault();
		if (!selected) return alert('Select a contact first');
		const text = messageInput.value.trim();
		if (!text) return;
		const all = getMessages();
		const id = convId(currentUser, selected);
		all[id] = all[id] || [];
		const msg = {from: currentUser, to: selected, text, ts: Date.now()};
		all[id].push(msg);
		saveMessages(all);
		messageInput.value = '';
		renderMessages();

		// simulate a quick auto-reply for demo
		setTimeout(() => {
			const reply = {from: selected, to: currentUser, text: 'Got: ' + text, ts: Date.now()};
			const all2 = getMessages();
			all2[id] = all2[id] || [];
			all2[id].push(reply);
			saveMessages(all2);
			if (selected) renderMessages();
		}, 800);
	});

	addContactForm.addEventListener('submit', (e) => {
		e.preventDefault();
		const name = newContact.value.trim();
		if (!name) return;
		const users = getUsers();
		if (!users.includes(name)) {
			users.push(name);
			localStorage.setItem('users', JSON.stringify(users));
		}
		newContact.value = '';
		renderContacts();
	});

	logoutBtn.addEventListener('click', () => {
		localStorage.removeItem('currentUser');
		location.href = '../login page/index.html';
	});

	// initial render
	renderContacts();
	renderMessages();
});
