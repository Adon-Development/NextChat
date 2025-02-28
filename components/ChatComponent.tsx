import React, { useState } from 'react';

const ChatComponent: React.FC = () => {
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState<string>('');

    const handleSend = () => {
        if (input.trim()) {
            setMessages([...messages, input]);
            setInput('');
        }
    };

    const handleClear = () => {
        setMessages([]);
    };

    return (
        <div>
            <div>
                {messages.map((msg, index) => (
                    <div key={index}>{msg}</div>
                ))}
            </div>
            <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
            />
            <button onClick={handleSend}>Send</button>
            <button onClick={handleClear}>Clear</button>
        </div>
    );
};

export default ChatComponent;
