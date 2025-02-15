const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');

// 初始化国际化文本
document.addEventListener('DOMContentLoaded', () => {
    // 设置欢迎消息
    document.getElementById('welcomeText').textContent = chrome.i18n.getMessage('welcomeMessage');
    
    // 设置输入框占位符
    userInput.placeholder = chrome.i18n.getMessage('inputPlaceholder');
    
    // 设置发送按钮文本
    sendButton.textContent = chrome.i18n.getMessage('sendButton');
    
    // 设置清空按钮文本
    clearButton.textContent = chrome.i18n.getMessage('clearButton');
    
    // 聚焦输入框
    userInput.focus();
    
    // 加载保存的聊天记录
    loadChatHistory();
});

const userAvatarSvg = `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="16" r="8" fill="#999"/>
        <circle cx="20" cy="44" r="16" fill="#999"/>
    </svg>
`;

// 保存聊天记录
function saveChatHistory() {
    const messages = [];
    chatBox.querySelectorAll('.message').forEach(msg => {
        const text = msg.querySelector('.text').textContent;
        const isAI = msg.classList.contains('ai');
        messages.push({ text, isAI });
    });
    
    chrome.storage.local.set({ chatHistory: messages });
}

// 加载聊天记录
async function loadChatHistory() {
    const result = await chrome.storage.local.get(['chatHistory']);
    if (result.chatHistory) {
        chatBox.innerHTML = ''; // 清空默认欢迎消息
        result.chatHistory.forEach(msg => {
            displayMessageWithAnimation(msg.isAI ? 'ai' : 'user', msg.text, false, false);
        });
    }
}

function displayMessageWithAnimation(sender, text, shouldSave = true, useTypewriter = true, skipSave = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    if (sender === 'ai') {
        avatarDiv.innerHTML = '<img src="images/icon48.png" alt="AI">';
    } else {
        avatarDiv.innerHTML = userAvatarSvg;
    }

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'text';
    messageContent.appendChild(textDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(messageContent);
    chatBox.appendChild(messageDiv);

    if (!skipSave && shouldSave) {
        textDiv.textContent = text;
        saveChatHistory();
        textDiv.textContent = '';
    }

    if (sender === 'ai' && useTypewriter) {
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex < text.length) {
                let displayText = text.slice(0, currentIndex + 1);
                textDiv.innerHTML = displayText.replace(/\n/g, '<br>');
                currentIndex++;
                chatBox.scrollTop = chatBox.scrollHeight;
            } else {
                clearInterval(interval);
            }
        }, 50);
    } else {
        textDiv.innerHTML = text.replace(/\n/g, '<br>');
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 清空聊天记录
function clearChat() {
    if (confirm(chrome.i18n.getMessage('confirmClear'))) {
        chrome.storage.local.remove('chatHistory', () => {
            chatBox.innerHTML = '';
            // 重新显示欢迎消息，不使用打字机效果
            displayMessageWithAnimation('ai', chrome.i18n.getMessage('welcomeMessage'), false, false);
        });
    }
}

async function sendMessage(message) {
    if (!message) {
        message = userInput.value.trim();
    }
    
    if (!message) return;

    // 禁用输入和发送按钮
    userInput.disabled = true;
    sendButton.disabled = true;

    // 显示用户消息
    displayMessageWithAnimation('user', message);
    userInput.value = '';

    // 显示加载动画
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'message ai';
    loadingMessage.innerHTML = `
        <div class="avatar">
            <img src="images/icon48.png" alt="AI">
        </div>
        <div class="message-content">
            <div class="text">${chrome.i18n.getMessage('loadingMessage')}<span class="loading-dots"></span></div>
        </div>
    `;
    chatBox.appendChild(loadingMessage);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch('https://www.lingjiai.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                message,
                source: 'chrome'
            })
        });

        const data = await response.json();
        
        loadingMessage.remove();

        if (data.reply) {
            displayMessageWithAnimation('ai', data.reply, true, true, false);
        }
    } catch (error) {
        console.error('Error:', error);
        loadingMessage.remove();
        displayMessageWithAnimation('ai', chrome.i18n.getMessage('errorMessage'));
    } finally {
        // 恢复输入和发送按钮
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// 事件监听器
sendButton.addEventListener('click', () => sendMessage());
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 事件监听器
clearButton.addEventListener('click', clearChat); 