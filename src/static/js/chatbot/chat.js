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
      str += `<div class="${containerClass}"><div class="${bubbleClass}">${msg.msg}</div></div>`;
    });
    chatLog.innerHTML = str;
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function disableInput() {
    chatMessageInput.disabled = true;
    chatMessageSubmit.disabled = true;
  }

  function enableInput() {
    chatMessageInput.disabled = false;
    chatMessageSubmit.disabled = false;
    chatMessageInput.focus();
  }

  function removeSystemMessages() {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].source === "system") {
        chatMessages.splice(i, 1);
      }
    }
  }

  let responseTimeout = null;
  function startResponseTimeout() {
    clearTimeout(responseTimeout);
    responseTimeout = setTimeout(() => {
      chatMessages.push({ msg: "An error occurred. No response from the bot.", source: "system" });
      renderMessages();
      enableInput();
    }, 10000);
  }

  chatSocket.onmessage = e => {
    const data = JSON.parse(e.data);
    removeSystemMessages();
    console.log(data);
    if (data.text?.msg && data.text?.source) {
      chatMessages.push(data.text);
      renderMessages();
    }
    if (data.text?.source === 'bot') {
      clearTimeout(responseTimeout);
      enableInput();
    }
  };

  chatSocket.onclose = () => {
    removeSystemMessages();
    chatMessages.push({ msg: "Disconnected. Reload to reconnect.", source: "system" });
    renderMessages();
    disableInput();
  };

  chatSocket.onerror = () => {
    removeSystemMessages();
    chatMessages.push({ msg: "An error occurred. Reload the page.", source: "system" });
    renderMessages();
    disableInput();
  };

  chatMessageInput.onkeyup = e => {
    if (e.key === 'Enter') chatMessageSubmit.click();
  };

  chatMessageInput.addEventListener('input', function() {
    const maxLength = 500;
    if (this.value.length > maxLength) {
      this.value = this.value.slice(0, maxLength);
    }
  });

  chatMessageSubmit.onclick = () => {
    const message = chatMessageInput.value.trim();
    if (message.length > 0 && chatSocket.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify({ text: message }));
      chatMessageInput.value = "";
      disableInput();
      removeSystemMessages();
      // startResponseTimeout();
    }
  };
}
