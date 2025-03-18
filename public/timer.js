let timer = 1800; // 30 minutes
const timerDiv = document.createElement("div");
timerDiv.id = "timer";
timerDiv.style.position = "fixed";
timerDiv.style.top = "10px";
timerDiv.style.right = "10px";
timerDiv.style.background = "rgba(0,0,0,0.7)";
timerDiv.style.color = "white";
timerDiv.style.padding = "10px";
timerDiv.style.borderRadius = "5px";
document.body.appendChild(timerDiv);

const countdown = setInterval(() => {
    timer--;
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    timerDiv.innerText = `Time Left: ${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

    if (timer <= 0) {
        clearInterval(countdown);
        timerDiv.innerText = "Time's up!";
        window.location.href = "/timeup";
    }
}, 1000);