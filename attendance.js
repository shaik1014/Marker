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
  
  // --- Helpers ---
  function getParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
  
  // --- Save Attendance ---
  function saveAttendance() {
    const selectedDate = sessionStorage.getItem("selectedDate");
    const group = getParam("group") || "general";
  
    firebase.auth().onAuthStateChanged(user => {
      if (!user) return;
      firebase.database().ref("users/" + user.uid).once("value").then(userSnap => {
        if (userSnap.val()?.role !== "admin") return alert("Unauthorized");
  
        const updates = {};
        document.querySelectorAll("input[type='checkbox'][data-uid]").forEach(cb => {
          updates[cb.dataset.uid] = cb.checked;
        });
        updates.__meta__ = {
          saved: true,
          savedBy: userSnap.val().name || "Unknown",
          timestamp: Date.now()
        };
  
        firebase.database().ref(`attendance/${group}/${selectedDate}`).set(updates)
          .then(() => alert("Attendance saved!"));
      });
    });
  }
  
  // --- Publish Attendance (Admin Only) ---
  function publishAttendance() {
    const selectedDate = sessionStorage.getItem("selectedDate") || "Unknown-Date";
    const groupId = getParam("group") || "general";
  
    firebase.auth().onAuthStateChanged(user => {
      if (!user) return;
  
      firebase.database().ref("users/" + user.uid).once("value").then(userSnap => {
        const currentUser = userSnap.val();
        if (currentUser?.role !== "admin") {
          alert("You are not authorized to publish attendance.");
          return;
        }
  
        firebase.database().ref(`attendance/${groupId}/${selectedDate}/__meta__`).once("value").then(metaSnap => {
          const meta = metaSnap.val();
          if (!meta?.saved) {
            alert("Please save attendance before publishing.");
            return;
          }
  
          firebase.database().ref(`groups/${groupId}`).once("value").then(groupSnap => {
            const groupName = groupSnap.val()?.name || groupId;
  
            const allCheckboxes = document.querySelectorAll("input[type='checkbox'][data-uid]");
            const present = [], absent = [];
  
            allCheckboxes.forEach(cb => {
              const uid = cb.dataset.uid;
              (cb.checked ? present : absent).push(uid);
            });
  
            const attendanceData = {};
            present.forEach(uid => attendanceData[uid] = true);
            absent.forEach(uid => attendanceData[uid] = false);
  
            attendanceData.__meta__ = {
              saved: true,
              published: true,
              publishedBy: currentUser.name || "Unknown",
              timestamp: Date.now()
            };
  
            firebase.database().ref(`attendance/${groupId}/${selectedDate}`).set(attendanceData)
              .then(() => {
                alert("Attendance published!");
  
                const total = present.length + absent.length;
                const summaryText = `${groupName} - ${selectedDate}<br>Total: ${total}<br>Present: ${present.length}<br>Absent: ${absent.length}`;
  
                firebase.database().ref(`messages/${groupId}`).push({
                    uid: user.uid,
                    name: currentUser.name || "Admin",
                    text: summaryText,
                    timestamp: Date.now() // ✅ fixed
                  });
                  
              });
          });
        });
      });
    });
  }
  
  // --- DOM Ready ---
  document.addEventListener("DOMContentLoaded", () => {
    const group = getParam("group") || "general";
  
    // --- Render Calendar (attendance-calendar.html) ---
    const calendarGrid = document.querySelector(".calendar-grid");
    const calendarMonth = document.getElementById("calendar-month");
  
    if (calendarGrid && calendarMonth) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      const monthName = monthNames[month];
      calendarMonth.textContent = `${monthName} ${year}`;
      const offset = (new Date(year, month, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
  
      document.querySelectorAll(".calendar-grid .date, .calendar-grid .empty").forEach(el => el.remove());
  
      for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        empty.className = "empty";
        calendarGrid.appendChild(empty);
      }
  
      for (let d = 1; d <= daysInMonth; d++) {
        const el = document.createElement("div");
        el.className = "date";
        el.textContent = String(d).padStart(2, "0");
  
        if (d < day) el.classList.add("past-date");
        if (d === day) el.classList.add("highlighted");
  
        el.addEventListener("click", () => {
          const selectedDate = `${monthName}-${String(d).padStart(2, "0")}`;
          sessionStorage.setItem("selectedDate", selectedDate);
          window.location.href = `attendance-toggle.html?group=${encodeURIComponent(group)}`;
        });
  
        calendarGrid.appendChild(el);
      }
    }
  
    // --- Render Attendance List (attendance-toggle.html) ---
    const list = document.getElementById("memberList");
    const header = document.getElementById("attendance-date");
    const selectedDate = sessionStorage.getItem("selectedDate");
  
    if (list && header) {
      firebase.auth().onAuthStateChanged(user => {
        if (!user) return;
  
        firebase.database().ref("users/" + user.uid).once("value").then(userSnap => {
          const isAdmin = userSnap.val()?.role === "admin";
  
          firebase.database().ref(`groups/${group}`).once("value").then(groupSnap => {
            const groupName = groupSnap.val()?.name || group;
            header.textContent = `${groupName} - ${selectedDate}`;
  
            firebase.database().ref("users").once("value").then(snapshot => {
              list.innerHTML = "";
              let found = false;
  
              snapshot.forEach(child => {
                const user = child.val();
                const uid = child.key;
  
                if (user.branch?.toLowerCase() === groupName.toLowerCase()) {
                  found = true;
  
                  const item = document.createElement("div");
                  item.className = "member-item";
                  item.innerHTML = `
                    <div class="member-info">
                      <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&rounded=true" />
                      <span>${user.name}</span>
                    </div>
                    <label class="toggle-switch">
                      <input type="checkbox" data-uid="${uid}" ${isAdmin ? "" : "disabled"}>
                      <span class="toggle-slider"></span>
                    </label>`;
                  list.appendChild(item);
                }
              });
  
              if (!found) {
                list.innerHTML = "<div style='text-align:center;padding:1rem;'>No students found for this group.</div>";
              }
  
              firebase.database().ref(`attendance/${group}/${selectedDate}`).once("value").then(dataSnap => {
                const data = dataSnap.val() || {};
                document.querySelectorAll("input[data-uid]").forEach(cb => {
                  cb.checked = !!data[cb.dataset.uid];
                });
  
                if (!isAdmin) {
                  const saveBtn = document.getElementById("saveAttendanceBtn");
                  const publishBtn = document.getElementById("publishAttendanceBtn");
                  if (saveBtn) saveBtn.style.display = "none";
                  if (publishBtn) publishBtn.style.display = "none";
                }
              });
            });
          });
        });
      });
    }
  
    // --- Search ---
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
  
    // --- Buttons ---
    const saveBtn = document.getElementById("saveAttendanceBtn");
    if (saveBtn) saveBtn.addEventListener("click", saveAttendance);
  
    const publishBtn = document.getElementById("publishAttendanceBtn");
    if (publishBtn) publishBtn.addEventListener("click", publishAttendance);
  
    // --- Back Button ---
    const backButton = document.getElementById("backButton");
    if (backButton) {
      backButton.addEventListener("click", () => {
        const group = getParam("group") || "general";
        const currentPath = window.location.pathname;
  
        if (currentPath.includes("attendance-toggle")) {
          window.location.href = `attendance-calendar.html?group=${encodeURIComponent(group)}`;
        } else if (currentPath.includes("attendance-calendar")) {
          window.location.href = `group-info.html?group=${encodeURIComponent(group)}`;
        } else {
          window.location.href = "home.html";
        }
      });
    }
  });
  