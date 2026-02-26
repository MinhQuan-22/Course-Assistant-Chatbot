//src\components\student\ChatComposer.tsx
import { useState } from "react";
import micIcon from "../../assets/icons/icon_mic.png";
import sendIcon from "../../assets/icons/search_chatbot.png";

export default function ChatComposer({ onSend }: { onSend: (text: string) => void }) {
const [value, setValue] = useState("");

return (
<div className="chat-composer">
<button className="chat-ico-btn" type="button" aria-label="Mic">
<img src={micIcon} alt="" />
</button>
  <input
    className="chat-input"
    placeholder="Hey...ask me.."
    value={value}
    onChange={(e) => setValue(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") onSend(value);
    }}
  />

  <button
    className="chat-ico-btn-send"
    type="button"
    aria-label="Send"
    onClick={() => onSend(value)}
  >
    <img src={sendIcon} alt="" />
  </button>
</div>
);
}