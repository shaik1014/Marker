// --- Navigation Logic ---
document.querySelectorAll(".action-wrapper").forEach(wrapper => {
    wrapper.addEventListener("click", () => {
      document.querySelectorAll(".action-wrapper").forEach(w => w.classList.remove("active"));
      wrapper.classList.add("active");
  
      const link = wrapper.getAttribute("data-link");
      if (link && link !== "#") {
        window.location.href = link;
      }
    });
  });
  
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
  
  // --- Registration ---
  function register() {
    const name = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (!name || !email || !password) return alert("Please fill out all fields.");
  
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(cred => firebase.database().ref("users/" + cred.user.uid).set({ name, email }))
      .then(() => {
        alert("Registered successfully!");
        window.location.href = "home.html";
      })
      .catch(e => alert(e.message));
  }
  
  // --- Login ---
  function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (!email || !password) return alert("Please enter both email and password.");
  
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(() => window.location.href = "home.html")
      .catch(e => alert(e.message));
  }
  
  // --- Logout ---
  function logout() {
    firebase.auth().signOut().then(() => alert("Logged out"));
  }
  
  // --- Send Message ---
  function sendMessage() {
    const msg = document.getElementById("msg").value.trim();
    const user = firebase.auth().currentUser;
    if (!user || !msg) return;
  
    firebase.database().ref("users/" + user.uid).once("value").then(snapshot => {
      const name = snapshot.val()?.name || "Anonymous";
      firebase.database().ref("messages").push({
        uid: user.uid,
        name,
        text: msg,
        time: Date.now()
      });
      document.getElementById("msg").value = "";
    });
  }
  
  // --- Update Profile ---
  function updateProfile() {
    const user = firebase.auth().currentUser;
    const newName = document.getElementById("displayName").value;
    if (!user || !newName.trim()) return alert("Please enter a valid name");
  
    firebase.database().ref("users/" + user.uid).update({ name: newName })
      .then(() => {
        alert("Profile updated!");
        document.getElementById("profile-pic").src =
          `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=random&rounded=true`;
      });
  }
  
  // --- Save Attendance ---
  function saveAttendance() {
    const selectedDate = sessionStorage.getItem("selectedDate") || "Unknown-Date";
    const updates = {};
    document.querySelectorAll("input[type='checkbox'][data-uid]").forEach(cb => {
      updates[cb.dataset.uid] = cb.checked;
    });
  
    firebase.database().ref(`attendance/${selectedDate}`).set(updates)
      .then(() => alert("Attendance saved!"));
  }
  
  // --- Auth State Listener ---
  firebase.auth().onAuthStateChanged(user => {
    if (!user) return;
  
    // --- Profile Page ---
    const displayNameInput = document.getElementById("displayName");
    const profilePic = document.getElementById("profile-pic");
    if (displayNameInput && profilePic) {
      firebase.database().ref("users/" + user.uid).once("value").then(snapshot => {
        const data = snapshot.val();
        if (data) {
          displayNameInput.value = data.name || "";
          profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&rounded=true`;
        }
      });
    }
  
    // --- Chat Page ---
    const chatbox = document.getElementById("chatbox");
    if (chatbox) {
      chatbox.innerHTML = "";
      let lastSender = null;
      firebase.database().ref("messages").on("child_added", snap => {
        const data = snap.val();
        const isSameSender = lastSender === data.uid;
        lastSender = data.uid;
  
        const messageDiv = document.createElement("div");
        messageDiv.className = "chat-message";
        const time = new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
        const avatarHTML = !isSameSender
          ? `<div class="chat-avatar"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&rounded=true" alt="avatar"></div>`
          : `<div style="width: 45px;"></div>`;
  
        messageDiv.innerHTML = `
          ${avatarHTML}
          <div class="chat-content">
            ${!isSameSender ? `<div class="chat-username">${data.name}</div>` : ""}
            <div class="chat-text">${data.text}</div>
            <div class="chat-time">${time}</div>
          </div>`;
  
        chatbox.appendChild(messageDiv);
        chatbox.scrollTop = chatbox.scrollHeight;
      });
    }
  
    // --- Attendance Pages ---
    const attendanceList = document.getElementById("memberList");
    if (attendanceList) {
      const selectedDate = sessionStorage.getItem("selectedDate") || "Unknown-Date";
      const isTogglePage = window.location.pathname.includes("attendance-toggle");
  
      firebase.database().ref("users").once("value").then(snapshot => {
        attendanceList.innerHTML = "";
        snapshot.forEach(child => {
          const { name } = child.val();
          const uid = child.key;
          const item = document.createElement("div");
          item.className = "member-item";
          item.innerHTML = `
            <div class="member-info">
              <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&rounded=true" />
              <span>${name}</span>
            </div>
            ${isTogglePage ? `
              <label class="toggle-switch">
                <input type="checkbox" data-uid="${uid}">
                <span class="toggle-slider"></span>
              </label>` : ""}
          `;
          attendanceList.appendChild(item);
        });
  
        if (isTogglePage) {
          firebase.database().ref(`attendance/${selectedDate}`).once("value").then(dataSnap => {
            const data = dataSnap.val() || {};
            document.querySelectorAll("input[type='checkbox'][data-uid]").forEach(cb => {
              cb.checked = !!data[cb.dataset.uid];
            });
          });
        }
      });
    }
  });
  
  // --- DOM Ready ---
  document.addEventListener("DOMContentLoaded", () => {
    // Chat Input
    const input = document.getElementById("msg");
    if (input) {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }
  
    // Search Filter
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        document.querySelectorAll(".member-item").forEach(item => {
          const name = item.querySelector("span").textContent.toLowerCase();
          item.style.display = name.includes(query) ? "flex" : "none";
        });
      });
    }
  
    // Calendar Generation
    const calendarGrid = document.querySelector(".calendar-grid");
    const calendarMonth = document.getElementById("calendar-month");
  
    if (calendarGrid && calendarMonth) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
  
      const monthName = monthNames[month];
      calendarMonth.textContent = `${monthName} ${year}`;
  
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const offset = (firstDay + 6) % 7;
  
      document.querySelectorAll(".calendar-grid .date, .calendar-grid .empty").forEach(el => el.remove());
  
      for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        empty.classList.add("empty");
        calendarGrid.appendChild(empty);
      }
  
      for (let d = 1; d <= daysInMonth; d++) {
        const dateEl = document.createElement("div");
        dateEl.classList.add("date");
        dateEl.textContent = String(d).padStart(2, "0");
  
        if (d < day) dateEl.classList.add("past-date");
        else if (d === day) dateEl.classList.add("highlighted");
  
        dateEl.addEventListener("click", () => {
          const selectedDate = `${monthName}-${String(d).padStart(2, "0")}`;
          sessionStorage.setItem("selectedDate", selectedDate);
          window.location.href = "attendance-toggle.html";
        });
  
        calendarGrid.appendChild(dateEl);
      }
    }
  });
  