

// ✅ Initialize Firebase if not already done
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "AIzaSyDZXZoNjP4S7esAxIKqk_xNHh-3PkVpsHs",
    authDomain: "beluga-1014.firebaseapp.com",
    databaseURL: "https://beluga-1014-default-rtdb.firebaseio.com",
    projectId: "beluga-1014",
    storageBucket: "beluga-1014.appspot.com",
    messagingSenderId: "63392649535",
    appId: "1:63392649535:web:62b38900a362df99ee438a"
  };
  firebase.initializeApp(firebaseConfig);
}

// ✅ Get group ID from URL
const groupId = new URLSearchParams(window.location.search).get("group");
if (!groupId) {
  alert("No group selected.");
  window.location.href = "home.html";
}

// ✅ Load and display group name + avatar
firebase.database().ref(`groups/${groupId}`).once("value").then(snapshot => {
  const groupData = snapshot.val();
  const groupName = groupData?.name || "Unnamed Group";
  document.getElementById("group-name").textContent = groupName;

  const avatarURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random&rounded=true`;
  document.getElementById("group-avatar").src = avatarURL;
});

// ✅ Setup references
const chatBox = document.getElementById("chat-messages");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const messagesRef = firebase.database().ref(`messages/${groupId}`);

let lastRenderedSenderId = null;

// ✅ Auth and message listeners
firebase.auth().onAuthStateChanged(user => {
  if (!user) return (window.location.href = "index.html");

  const currentUid = user.uid;

  messagesRef.on("child_added", snapshot => {
    const msg = snapshot.val();
    msg._id = snapshot.key;
    displayMessage(msg, currentUid); // ✅ Pass user UID
  });

  sendBtn.addEventListener("click", () => sendMessage(user));
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage(user);
  });
});

// ✅ Send new message
function sendMessage(user) {
  const text = input.value.trim();
  if (!text) return;

  const msg = {
    uid: user.uid,
    name: user.displayName || "Anonymous",
    text,
    timestamp: Date.now()
  };

  messagesRef.push(msg);
  input.value = "";
}

// ✅ Format time for display
function formatTime(timestamp) {
  if (!timestamp || isNaN(timestamp)) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ✅ Render chat message with correct alignment and grouping


function displayMessage(msg, currentUid) {
  const isMine = msg.uid === currentUid;
  const name = msg.name || "Anonymous";
  const time = formatTime(msg.timestamp);
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&rounded=true&size=36`;

  const div = document.createElement("div");
  div.className = `message ${isMine ? "message-right" : "message-left"}`;
  div.dataset.messageId = msg._id;

  if (isMine) {
    // Own messages: no avatar
    div.innerHTML = `
      <div class="message-content">
        <div class="bubble">${msg.text}</div>
        <div class="message-time">${time}</div>
      </div>
    `;
  } else {
    // Always show avatar and name for others
    div.innerHTML = `
      <img class="avatar" src="${avatarUrl}" alt="${name}">
      <div class="message-content">
        <div class="sender-name">${name}</div>
        <div class="bubble">${msg.text}</div>
        <div class="message-time">${time}</div>
      </div>
    `;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Long press menu for own messages
  if (isMine) {
    let pressTimer = null;
    const startPress = () => {
      pressTimer = setTimeout(() => showMessageMenu(div, msg), 600);
    };
    const cancelPress = () => clearTimeout(pressTimer);

    div.addEventListener("mousedown", startPress);
    div.addEventListener("mouseup", cancelPress);
    div.addEventListener("mouseleave", cancelPress);
    div.addEventListener("touchstart", startPress);
    div.addEventListener("touchend", cancelPress);
    div.addEventListener("touchmove", cancelPress);
  }
}


// ✅ Message menu actions
function showMessageMenu(messageDiv, msg) {
  const existing = document.querySelector(".message-menu");
  if (existing) existing.remove();

  const menu = document.createElement("div");
  menu.className = "message-menu";
  menu.innerHTML = `
    <button class="menu-item" data-action="edit">✏️ Edit</button>
    <button class="menu-item" data-action="delete">❌ Delete</button>
    <button class="menu-item" data-action="copy">📋 Copy</button>
  `;
  document.body.appendChild(menu);

  const rect = messageDiv.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;

  menu.style.position = "absolute";
  menu.style.top = `${rect.bottom + scrollY + 4}px`;
  menu.style.left = messageDiv.classList.contains("message-left")
    ? `${rect.left}px`
    : `${rect.right - 160}px`;

  menu.querySelectorAll(".menu-item").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;

      if (action === "delete") {
        messagesRef.child(msg._id).remove();
        messageDiv.remove();
      } else if (action === "edit") {
        const newText = prompt("Edit message:", msg.text);
        if (newText && newText.trim()) {
          messagesRef.child(msg._id).update({ text: newText.trim() });
          messageDiv.querySelector(".bubble").innerHTML = newText.trim();
        }
      } else if (action === "copy") {
        navigator.clipboard.writeText(msg.text);
        alert("Message copied to clipboard!");
      }

      menu.remove();
    });
  });

  document.addEventListener("click", function handler(e) {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener("click", handler);
    }
  }, { once: true });
}

// ✅ Header click to group info
document.getElementById("groupInfoClick").addEventListener("click", () => {
  window.location.href = `group-info.html?group=${groupId}`;
});

// ✅ Back button to home
document.getElementById("backButton").addEventListener("click", (e) => {
  e.stopPropagation();
  window.location.href = "home.html";
});
