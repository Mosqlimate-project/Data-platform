function initChatbot(sessionKey) {
  const wss_protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
  const chatSocket = new WebSocket(
    wss_protocol + window.location.host + `/ws/chat/${sessionKey}/`
  );

  const chatMessages = [];

  const chatHeader = document.querySelector("#chat-header");
  const chatLog = document.querySelector("#chat-log");
  const chatMessageInput = document.querySelector("#chat-message-input");
  const chatMessageSubmit = document.querySelector("#chat-message-submit");

  function renderMessages() {
    let str = '<ul class="space-y-2">';
    chatMessages.forEach(function(msg) {
      str += `
                <li class="flex ${msg.source === "bot" ? "justify-start" : "justify-end"}">
                    <div class="relative max-w-xl px-4 py-2 rounded-lg shadow-md
                        ${msg.source === "bot" ? "text-gray-700 bg-white border border-gray-200" : "bg-blue-600 text-black"}">
                        <span class="block font-normal">${escapeHTML(msg.msg)}</span>
                    </div>
                </li>
            `;
    });
    str += "</ul>";
    chatLog.innerHTML = str;
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  chatSocket.onopen = function() {
    chatHeader.innerHTML = "Chatbot";
  };

  chatSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    const message = data.text;
    if (message?.msg && message?.source) {
      chatMessages.push(message);
      renderMessages();
    }
  };

  chatSocket.onclose = function() {
    const msg = { msg: "Disconnected. Reload to reconnect.", source: "bot-info" };
    chatMessages.push(msg);
    renderMessages();
    chatMessageInput.disabled = true;
    chatMessageSubmit.disabled = true;
  };

  chatSocket.onerror = function() {
    const msg = { msg: "An error occurred. Reload the page.", source: "bot-error" };
    chatMessages.push(msg);
    renderMessages();
    chatMessageInput.disabled = true;
    chatMessageSubmit.disabled = true;
  };

  chatMessageInput.onkeyup = function(e) {
    if (e.key === 'Enter') chatMessageSubmit.click();
  };

  chatMessageSubmit.onclick = function() {
    const message = chatMessageInput.value.trim();
    if (message.length > 0 && chatSocket.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify({ text: message }));
      chatMessageInput.value = "";
    }
  };
}
