let isSending = false;

function removeOldQuickButtons() {
    const oldButtons = document.querySelectorAll("#chat-box .quick-buttons");
    oldButtons.forEach(box => box.remove());
}

function sendSuggestion(text) {
    sendMessage(text);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function createButtonHtml(buttons) {
    if (!buttons || !buttons.length) return "";

    let html = `<div class="quick-buttons">`;
    buttons.forEach(btn => {
        const safeLabel = escapeHtml(btn);
        const safeValue = btn.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        html += `<button onclick="sendMessage('${safeValue}')">${safeLabel}</button>`;
    });
    html += `</div>`;
    return html;
}

function sendMessage(text = null) {
    if (isSending) return;

    const input = document.getElementById("message");
    const chat = document.getElementById("chat-box");
    const msg = text !== null ? text.trim() : input.value.trim();

    if (!msg) return;

    removeOldQuickButtons();
    isSending = true;

    chat.innerHTML += `<div class="user">${escapeHtml(msg)}</div>`;
    chat.scrollTop = chat.scrollHeight;

    fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: msg
        })
    })
    .then(response => response.json())
    .then(data => {
        chat.innerHTML += `<div class="bot">${data.reply}</div>`;
        chat.innerHTML += createButtonHtml(data.buttons || []);
        chat.scrollTop = chat.scrollHeight;
        input.value = "";
        input.focus();
    })
    .catch(() => {
        chat.innerHTML += `<div class="bot">⚠ Unable to connect to server.</div>`;
        chat.scrollTop = chat.scrollHeight;
    })
    .finally(() => {
        isSending = false;
    });
}

function enterSend(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
}