import React, { useLayoutEffect, useRef, useState } from 'react';
import './conversation.css';

const welcome = { kind: 'assistant', text: 'Welcome! What would you like to explore?' };
const reply = { kind: 'assistant', text: 'A fresh idea! This is the fixed demonstration reply.' };

export default function Conversation() {
  const [messages, setMessages] = useState([welcome]);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('Waiting for your first idea');
  const input = useRef(null);
  const log = useRef(null);

  useLayoutEffect(() => {
    document.title = 'Fresh ProtoFlow — Conversation';
    log.current.scrollTop = log.current.scrollHeight;
  }, [messages]);

  function send(event) {
    event.preventDefault();
    const text = input.current.value.trim();
    if (!text) {
      setError(true);
      setStatus('Write a message to continue.');
      input.current.focus();
      return;
    }
    // Clear synchronously so consecutive submissions cannot reuse the draft.
    input.current.value = '';
    setMessages(current => [...current, { kind: 'user', text }, reply]);
    setError(false);
    setStatus('Your idea has a reply');
    input.current.focus();
  }

  function clear() {
    setMessages([welcome]);
    input.current.value = '';
    setError(false);
    setStatus('A fresh conversation is ready');
    input.current.focus();
  }

  return <>
    <header><span className="brand">◈ Fresh ProtoFlow</span><a href="#login">← Workspace entry</a></header>
    <main id="screen">
      <aside>
        <span className="eyebrow">DEMO SPACE</span>
        <h2>Conversations</h2>
        <button id="clear" type="button" onClick={clear}>＋ Fresh conversation</button>
        <div className="thread">Today's ideas<small>One local demonstration</small></div>
        <p>Write something. See a fixed reply. Keep exploring.</p>
      </aside>
      <section>
        <div className="heading">
          <span className="eyebrow">START WITH AN IDEA</span>
          <h1>A fresh conversation</h1>
          <small>Fictional messages · Fixed replies</small>
        </div>
        <div id="messages" ref={log} role="log" aria-label="Conversation">
          {messages.map((message, index) => <article key={index} className={message.kind}>
            <b>{message.kind === 'user' ? 'You' : 'Demo guide'}</b>
            <p>{message.text}</p>
          </article>)}
        </div>
        <form id="message-form" noValidate onSubmit={send}>
          <label htmlFor="message">Your message</label>
          <div className="composer">
            <textarea id="message" ref={input} rows={2} maxLength={280} placeholder="Write your first idea…"
              aria-invalid={error} aria-describedby={error ? 'message-error' : undefined} />
            <button id="send" type="submit">Send →</button>
          </div>
          <p id="message-error" role="alert" hidden={!error}>Write a message to continue.</p>
          <p id="status" role="status">{status}</p>
        </form>
      </section>
    </main>
    <footer>Fresh acceptance baseline</footer>
  </>;
}
