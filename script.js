// --- Firebase Setup ---
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

// --- Register Function ---
function register() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const username = document.getElementById("username").value.trim();

  if (!email || !password || !username) {
    alert("Please fill all fields.");
    return;
  }

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      const user = userCredential.user;
      return user.updateProfile({ displayName: username }).then(() => {
        return firebase.database().ref("users/" + user.uid).set({
          email,
          username,
          name: username
        });
      });
    })
    .then(() => {
      alert("Registration successful!");
      window.location.href = "home.html";
    })
    .catch(error => {
      console.error("Registration error:", error);
      alert(error.message);
    });
}

// --- Login Function ---
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) return alert("Please enter both email and password.");

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => window.location.href = "home.html")
    .catch(e => alert(e.message));
}

// --- Add Group Button ---
document.addEventListener('DOMContentLoaded', function () {
  const addGroupBtn = document.getElementById('addGroupBtn');
  if (addGroupBtn) {
    addGroupBtn.addEventListener('click', function () {
      const user = firebase.auth().currentUser;
      if (!user) return alert("Please log in to create a group.");
      const groupName = prompt("Enter the name of the new group:");
      if (!groupName) return alert("Group name is required.");

      const newGroupRef = firebase.database().ref("groups").push();
      newGroupRef.set({
        name: groupName,
        createdBy: user.uid,
        createdAt: Date.now()
      })
        .then(() => {
          alert(`New group "${groupName}" created!`);
          addChatToUI(newGroupRef.key, groupName);
        })
        .catch(error => alert('Error creating group: ' + error.message));
    });
  }
});

function addChatToUI(groupId, groupName) {
  const chatList = document.getElementById("chatList");
  const chatItem = document.createElement("div");
  chatItem.classList.add("chat-item");
  chatItem.setAttribute("onclick", `location.href='chats.html?group=${groupId}'`);
  chatItem.innerHTML = `
    <div class="chat-avatar">
      <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random&rounded=true" alt="${groupName}" />
    </div>
    <div class="chat-details">
      <h2>${groupName}</h2>
    </div>
  `;
  chatList.appendChild(chatItem);
}

// --- Load Groups ---
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    const userId = user.uid;
    const chatList = document.getElementById("chatList");

    firebase.database().ref(`users/${userId}`).once('value').then(userSnap => {
      const userData = userSnap.val();
      const userBranch = userData?.branch?.toLowerCase();
      const isAdmin = userData?.role === "admin";

      firebase.database().ref("groups").once("value").then(groupSnap => {
        chatList.innerHTML = "";
        let hasGroups = false;
        groupSnap.forEach(child => {
          const group = child.val();
          const groupId = child.key;
          const groupName = group?.name?.toLowerCase();
          if (isAdmin || groupName === userBranch) {
            addChatToUI(groupId, group.name);
            hasGroups = true;
          }
        });
        if (!hasGroups) {
          chatList.innerHTML = "<p>No groups available for your branch.</p>";
        }
      });
    });
  }
});

// --- Profile Modal ---
document.querySelector('.profile-button').addEventListener('click', () => {
  document.getElementById('profileModal').style.display = 'flex';
});

function closeProfileModal() {
  document.getElementById('profileModal').style.display = 'none';
}

// --- Load Profile Info ---
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    const ref = firebase.database().ref("users/" + user.uid);
    ref.once("value").then(snapshot => {
      const data = snapshot.val();
      const name = data?.name || "User";
      const username = data?.username || "Not set";
      const branch = data?.branch || "Not set";
      const regid = data?.regid || "Not set";
      const phone = data?.phone || "Not set";

      document.getElementById("profileName").innerText = name;
      document.getElementById("profileUsername").innerText = username;
      document.getElementById("profileEmail").innerText = data?.email || user.email;
      document.getElementById("profileBranch").innerText = branch;
      document.getElementById("profileRegId").innerText = regid;
      document.getElementById("profileRole").innerText = data?.role || "User";
      document.getElementById("profilePhone").innerText = phone;

      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&rounded=true&size=128`;
      document.querySelector('.modal-avatar').src = avatarUrl;
    });
  }
});

// --- Logout ---
function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = 'index.html';
  });
}

// --- Edit Modal ---
function openEditModal() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const ref = firebase.database().ref("users/" + user.uid);
  ref.once("value").then(dataSnap => {
    const data = dataSnap.val();
    document.getElementById("editName").value = data?.name || "";
    document.getElementById("editUsername").value = data?.username || "";
    document.getElementById("editEmail").value = data?.email || user.email;
    document.getElementById("editBranch").value = data?.branch || "";
    document.getElementById("editRegId").value = data?.regid || "";
    document.getElementById("editPhone").value = data?.phone || "";
    document.getElementById("editModal").style.display = "flex";
  });
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
}

function saveProfile() {
  const name = document.getElementById("editName").value.trim();
  const username = document.getElementById("editUsername").value.trim();
  const branch = document.getElementById("editBranch").value.trim();
  const regid = document.getElementById("editRegId").value.trim();
  const phone = document.getElementById("editPhone").value.trim();

  const user = firebase.auth().currentUser;
  if (!user) return;

  firebase.database().ref("users/" + user.uid).update({
    name,
    username,
    branch,
    regid,
    phone
  }).then(() => {
    alert("Profile updated!");
    closeEditModal();
    location.reload();
  });
}
