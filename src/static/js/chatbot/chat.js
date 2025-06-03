function initChatbot(sessionKey) {
  const chatSocket = new WebSocket(
    (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host + `/ws/chat/${sessionKey}/`
  );

  const chatMessages = [];
  const chatLog = document.querySelector("#chat-log");
  const chatMessageInput = document.querySelector("#chat-message-input");
  const chatMessageSubmit = document.querySelector("#chat-message-submit");

  function renderMessages() {
    let filteredMessages = chatMessages.filter(msg => msg.source !== "system");
    let lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg && lastMsg.source === "bot") {
      filteredMessages = chatMessages.filter(msg => msg.source !== "system");
    } else {
      filteredMessages = chatMessages;
    }
    let str = "";
    filteredMessages.forEach(msg => {
      let containerClass = "", bubbleClass = "message-bubble";
      if (msg.source === "bot") {
        containerClass = "bot-message";
      } else if (msg.source === "user") {
        containerClass = "user-message";
      } else if (msg.source === "system") {
        containerClass = "system-message";
      }
      str += `<div class="${containerClass}"><div class="${bubbleClass}"><span>${escapeHTML(msg.msg)}</span></div></div>`;
    });
    chatLog.innerHTML = str;
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  chatSocket.onmessage = e => {
    const data = JSON.parse(e.data);
    if (data.text?.msg && data.text?.source) {
      chatMessages.push(data.text);
      renderMessages();
    }
  };

  chatSocket.onclose = () => {
    chatMessages.push({ msg: "Disconnected. Reload to reconnect.", source: "system" });
    renderMessages();
    chatMessageInput.disabled = true;
    chatMessageSubmit.disabled = true;
  };

  chatSocket.onerror = () => {
    chatMessages.push({ msg: "An error occurred. Reload the page.", source: "system" });
    renderMessages();
    chatMessageInput.disabled = true;
    chatMessageSubmit.disabled = true;
  };

  chatMessageInput.onkeyup = e => { if (e.key === 'Enter') chatMessageSubmit.click(); };

  chatMessageSubmit.onclick = () => {
    const message = chatMessageInput.value.trim();
    if (message.length > 0 && chatSocket.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify({ text: message }));
      chatMessageInput.value = "";
    }
  };
}
