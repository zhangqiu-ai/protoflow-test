import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import loginCss from './login.css?inline';
import chatCss from './chat.css?inline';
import helpCss from './help.css?inline';

function Wordmark() {
  return <span className="wordmark"><span className="brand-mark">P</span> ProtoFlow</span>;
}

function Login() {
  const email = useRef(null);
  const password = useRef(null);
  const logout = useRef(null);
  const session = useRef(false);
  const [signedIn, setSignedIn] = useState(false);
  const [errors, setErrors] = useState(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('Ready');

  useLayoutEffect(() => {
    if (signedIn) logout.current.focus();
    else if (status.startsWith('Signed out')) email.current.focus();
  }, [signedIn, status]);

  function signIn(event) {
    event.preventDefault();
    if (session.current) return;
    const address = email.current.value.trim().toLowerCase();
    const secret = password.current.value;
    const nextErrors = {
      email: !address ? 'Enter your email address.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? 'Enter a valid email address.' : '',
      password: !secret ? 'Enter your password.' : secret.length < 8 ? 'Use at least 8 characters.' : '',
    };
    setErrors(nextErrors);
    setMessage('');
    if (nextErrors.email || nextErrors.password) {
      setStatus('Check the highlighted fields.');
      (nextErrors.email ? email : password).current.focus();
      return;
    }
    if (address !== 'demo@protoflow.test' || secret !== 'FlowDemo!42') {
      setMessage('Use the demo email and password shown below.');
      setStatus('Demo sign in was not completed.');
      return;
    }
    session.current = true;
    event.currentTarget.reset();
    setSignedIn(true);
    setStatus('Signed in');
  }

  function signOut() {
    session.current = false;
    email.current.form.reset();
    setErrors({ email: '', password: '' });
    setMessage('');
    setSignedIn(false);
    setStatus('Signed out. You can sign in again.');
  }

  return <>
    <div className="page-caption"><Wordmark /><span className="demo-label">LOCAL DEMO · NO ACCOUNT SERVICE</span></div>
    <main id="panel">
      <section className="intro" aria-label="About the demo">
        <span className="eyebrow">FROM IDEA TO WORKING PRODUCT</span>
        <h1>Your next version<br />starts here.</h1>
        <p className="intro-copy">A prototype commit becomes a verified application. Try the sign-in flow, then see the same experience on both sides.</p>
        <div className="flow">{[
          ['01', 'Prototype', 'Design the interaction'],
          ['02', 'Commit', 'Freeze the exact version'],
          ['03', 'Application', 'Build and verify the result'],
        ].map(([number, title, text]) => <div key={number}><span>{number}</span><strong>{title}</strong><small>{text}</small></div>)}</div>
        <p className="intro-note"><span className="live-dot" /> One commit. One verified checkpoint.</p>
      </section>
      <section className="content">
        <div id="sign-in" hidden={signedIn}>
          <span className="section-tag">WELCOME BACK</span><h2>Sign in to ProtoFlow</h2><p className="subtitle">Explore your demo workspace.</p>
          <form id="login-form" noValidate autoComplete="off" onSubmit={signIn}>
            <label htmlFor="email">Email address</label>
            <input ref={email} id="email" name="email" type="email" placeholder="you@example.com" autoComplete="off" aria-describedby="email-error" aria-invalid={errors ? Boolean(errors.email) : undefined} />
            <p id="email-error" className="field-error" hidden={!errors?.email}>{errors?.email}</p>
            <label htmlFor="password">Password</label>
            <input ref={password} id="password" name="password" type="password" placeholder="At least 8 characters" autoComplete="off" aria-describedby="password-error" aria-invalid={errors ? Boolean(errors.password) : undefined} />
            <p id="password-error" className="field-error" hidden={!errors?.password}>{errors?.password}</p>
            <p id="form-message" className="form-message" role="alert" hidden={!message}>{message}</p>
            <button id="action" type="submit">Sign in <span aria-hidden="true">→</span></button>
          </form>
          <div className="demo-credentials"><strong>Try the demo</strong><p>demo@protoflow.test <span> / </span> FlowDemo!42</p><small>Fictional credentials. Nothing is saved or sent.</small></div>
        </div>
        <div id="signed-in" hidden={!signedIn}>
          <div className="success-symbol" aria-hidden="true">✓</div><span className="section-tag">DEMO WORKSPACE</span><h2>You're signed in</h2><p className="subtitle">Welcome back. Your workspace is ready.</p>
          <div className="account"><span className="avatar" aria-hidden="true">D</span><div><strong>Demo member</strong><p id="user-email">demo@protoflow.test</p></div><span className="session-label">Demo session</span></div>
          <div className="workspace-card"><span className="card-label">CURRENT CHECKPOINT</span><strong>Mock login experience</strong><p>Email validation, sign in and log out — all in your browser.</p></div>
          <button ref={logout} id="logout" type="button" onClick={signOut}>Log out</button>
        </div>
        <p id="status" role="status" aria-live="polite">{status}</p>
      </section>
    </main>
    <footer><a href="#/chat">Open the demo conversation →</a><span>·</span>ProtoFlow test workspace</footer>
  </>;
}

const welcome = 'Hi! Write a message to try this local conversation.';
const reply = 'Thanks for your message. This is a fixed local demo reply.';

function Chat() {
  const input = useRef(null);
  const log = useRef(null);
  const [messages, setMessages] = useState([{ speaker: 'assistant', text: welcome }]);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('Ready');
  useLayoutEffect(() => { log.current.scrollTop = log.current.scrollHeight; }, [messages]);

  function send(event) {
    event.preventDefault();
    const text = input.current.value.trim();
    if (!text) {
      setError(true);
      setStatus('Type a message first.');
    } else {
      input.current.value = '';
      setMessages(previous => [...previous, { speaker: 'user', text }, { speaker: 'assistant', text: reply }]);
      setError(false);
      setStatus('Reply added.');
    }
    input.current.focus();
  }

  function restart() {
    setMessages([{ speaker: 'assistant', text: welcome }]);
    input.current.form.reset();
    setError(false);
    setStatus('Conversation cleared.');
    input.current.focus();
  }

  return <>
    <header className="page-header" data-testid="chat.header"><Wordmark /><a href="#/login" data-testid="chat.back">← Back to sign in</a></header>
    <main id="panel" data-testid="chat.panel">
      <aside data-testid="chat.sidebar">
        <span className="section-tag">YOUR WORKSPACE</span><h2 data-testid="chat.sidebar-title">Conversations</h2>
        <button id="restart" type="button" data-testid="chat.restart" onClick={restart}>＋ Start new</button>
        <div className="selected-thread"><span className="thread-dot" /><div><strong>Demo conversation</strong><small>Ready to explore</small></div></div>
        <div className="aside-note"><strong>Keep it simple.</strong><p>Write a message and see a fixed demo reply. Refresh starts a new conversation.</p><span>LOCAL DEMO</span></div>
      </aside>
      <section className="conversation" data-testid="chat.conversation">
        <div className="conversation-header"><div><span className="section-tag">ONE COMMIT, ONE EXPERIENCE</span><h1 data-testid="chat.title">Local demo conversation</h1></div><span className="demo-badge">Canned replies</span></div>
        <div ref={log} id="messages" role="log" aria-label="Conversation" aria-live="polite" data-testid="chat.messages">
          {messages.map(({ speaker, text }, index) => <article key={index} className={`message ${speaker}`} data-speaker={speaker}>
            <span className="avatar">{speaker === 'user' ? 'Y' : 'P'}</span><div><strong>{speaker === 'user' ? 'You' : 'ProtoFlow demo'}</strong><p>{text}</p></div>
          </article>)}
        </div>
        <form id="message-form" noValidate autoComplete="off" data-testid="chat.form" onSubmit={send}>
          <label htmlFor="message-input">Your message</label>
          <div className="composer"><textarea ref={input} id="message-input" name="message" rows="2" maxLength="280" placeholder="Try: Hello, ProtoFlow!" aria-describedby="input-error" data-testid="chat.input" /><button id="action" type="submit" data-testid="chat.send">Send →</button></div>
          <p id="input-error" role="alert" data-testid="chat.error" hidden={!error}>Type a message first.</p>
          <div className="composer-meta"><p id="status" role="status" data-testid="chat.status">{status}</p><span>Fictional demo messages only</span></div>
        </form>
      </section>
    </main>
    <footer data-testid="chat.footer">Prototype-driven development <span>·</span> Every version gets its own verification</footer>
  </>;
}

function Help() {
  const tips = [
    ['Prototype first', 'Each design commit becomes one frozen version.'],
    ['One version at a time', 'The application follows prototype versions in order.'],
    ['Checked by anchors', 'Structure, colours, layout and pixels are compared for every screen.'],
  ];
  return <>
    <header className="page-header" data-testid="help.header"><Wordmark /><a href="#/chat" data-testid="help.back">← Back to conversation</a></header>
    <main className="help" data-testid="help.panel">
      <span className="section-tag">GETTING STARTED</span>
      <h1 data-testid="help.title">How this demo works</h1>
      <ul className="tips" data-testid="help.tips">
        {tips.map(([title, text]) => <li key={title} data-testid="help.tip"><strong>{title}</strong><p>{text}</p></li>)}
      </ul>
    </main>
    <footer data-testid="help.footer">Prototype-driven development</footer>
  </>;
}

function App() {
  const readScreen = () => ['chat', 'help'].includes(location.hash.slice(2)) ? location.hash.slice(2) : 'login';
  const [screen, setScreen] = useState(readScreen);
  useEffect(() => {
    const route = () => setScreen(readScreen());
    window.addEventListener('hashchange', route);
    return () => window.removeEventListener('hashchange', route);
  }, []);
  useLayoutEffect(() => {
    document.body.dataset.testid = screen;
    document.title = screen === 'help' ? 'ProtoFlow — Help' : screen === 'chat' ? 'ProtoFlow — Demo conversation' : 'ProtoFlow — Demo sign in';
    const style = document.createElement('style');
    style.textContent = screen === 'help' ? helpCss : screen === 'chat' ? chatCss : loginCss;
    document.head.append(style);
    return () => { style.remove(); delete document.body.dataset.testid; };
  }, [screen]);
  return screen === 'help' ? <Help /> : screen === 'chat' ? <Chat /> : <Login />;
}

createRoot(document.getElementById('root')).render(<App />);
