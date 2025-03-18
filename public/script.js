const socket = io();

document.getElementById("joinDuel").addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();
    if (username) {
        socket.emit("joinDuel", username);
        document.getElementById("status").textContent = "Finding an opponent...";
    } else {
        alert("Please enter a username!");
    }
});

document.getElementById("generateInviteCode").addEventListener("click", () => {
    socket.emit("generateInviteCode");
});

socket.on("inviteCodeGenerated", (inviteCode) => {
    document.getElementById("status").textContent = `Your invite code: ${inviteCode}`;
    alert(`Share this code with your friend: ${inviteCode}`);
});

document.getElementById("joinByInviteCode").addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();
    const inviteCode = document.getElementById("inviteCodeInput").value.trim();
    if (username && inviteCode) {
        socket.emit("joinByInviteCode", inviteCode, username);
        document.getElementById("status").textContent = "Joining duel...";
    } else {
        alert("Please enter a username and invite code!");
    }
});

socket.on("invalidInviteCode", (message) => {
    alert(message);
});

socket.on("noProblemFound", (message) => {
    alert(message);
    document.getElementById("status").textContent = message;
});

socket.on("startDuel", ({ duelId, opponent, problemUrl }) => {
    window.location.href = `/matchmaking?player1=${encodeURIComponent(
        document.getElementById("username").value.trim()
    )}&player2=${encodeURIComponent(opponent)}&problemUrl=${encodeURIComponent(problemUrl)}`;
});

socket.on("duelCompleted", ({ duelId, winner }) => {
    document.getElementById("status").textContent = `Duel completed! Winner: ${winner}`;
});

document.getElementById("viewLeaderboard").addEventListener("click", () => {
    window.location.href = "/leaderboard";
});