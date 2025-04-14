// ✅ Firebase init (if not done in script.js already)
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
  
  // ✅ Get groupId from URL
  const groupId = new URLSearchParams(window.location.search).get("group");
  if (!groupId) {
    alert("No group selected.");
    window.location.href = "home.html";
  }
  
  // ✅ Back button behavior
  document.getElementById("backButton").addEventListener("click", (e) => {
    e.preventDefault();
    const groupId = new URLSearchParams(window.location.search).get("group");
    window.location.href = `chats.html?group=${encodeURIComponent(groupId)}`;
  });
  
  
  // ✅ Load group info and members by branch
  const memberList = document.getElementById("memberList");
  firebase.database().ref(`groups/${groupId}`).once("value").then(snapshot => {
    const groupData = snapshot.val();
    const groupName = groupData?.name || "Unnamed Group";
    document.getElementById("groupNameHeader").textContent = groupName;
  
    const avatarURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random&rounded=true&size=128`;
    document.getElementById("groupAvatar").src = avatarURL;
  
    // ✅ Load users where branch === group name
    firebase.database().ref("users").once("value").then(usersSnap => {
      memberList.innerHTML = ""; // clear placeholder
      let found = false;
  
      usersSnap.forEach(child => {
        const user = child.val();
        if (user.branch?.toLowerCase() === groupName.toLowerCase()) {
          found = true;
          const li = document.createElement("li");
          li.innerHTML = `
            <div class="member-info">
              <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username || "User")}&background=random&rounded=true&size=42" alt="Avatar">
              <span>${user.name || user.username || "Unknown User"}</span>
            </div>
          `;
          memberList.appendChild(li);
        }
      });
  
      if (!found) {
        memberList.innerHTML = "<li>No members found for this group</li>";
      }
    });
  });
  
  // ✅ Attendance link
  document.getElementById("attendanceLinkWrapper").addEventListener("click", () => {
    window.location.href = `attendance-calendar.html?group=${groupId}`;
  });
  