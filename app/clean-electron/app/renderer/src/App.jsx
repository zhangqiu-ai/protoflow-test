import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Conversation from './Conversation.jsx';

export default function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const navigate = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);

  return route === '#conversation'
    ? <div className="conversation-page"><Conversation /></div>
    : <div className="login-page"><Login /></div>;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [status, setStatus] = useState('Ready for a fresh start');
  const emailInput = useRef(null);
  const passwordInput = useRef(null);

  useLayoutEffect(() => {
    document.title = 'Fresh ProtoFlow — Workspace access';
    if (status === 'You can start again') emailInput.current.focus();
  }, [status]);

  function enterWorkspace(event) {
    event.preventDefault();
    if (userEmail) return;
    const address = email.trim().toLowerCase();
    const addressError = !address
      ? 'Email is required.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
        ? 'Use a valid email address.' : '';
    const secretError = !password
      ? 'Password is required.'
      : password.length < 8 ? 'Use 8 or more characters.' : '';
    setEmailError(addressError);
    setPasswordError(secretError);
    setLoginError(false);
    if (addressError || secretError) {
      setStatus('Check the highlighted fields');
      (addressError ? emailInput : passwordInput).current.focus();
      return;
    }
    // Fictional local demonstration; all session state stays in React memory.
    if (address !== 'demo@fresh.protoflow.test' || password !== 'FreshDemo42!') {
      setLoginError(true);
      setStatus('Try the fictional test details');
      return;
    }
    setUserEmail(address);
    setPassword('');
    setStatus('Workspace opened');
  }

  function leaveWorkspace() {
    setEmail('');
    setPassword('');
    setEmailError('');
    setPasswordError('');
    setLoginError(false);
    setUserEmail('');
    setStatus('You can start again');
  }

  return <>
    <header><span className="brand">◈ Fresh ProtoFlow</span><span>LOCAL DEMONSTRATION</span></header>
    <main id="screen">
      <aside>
        <span className="eyebrow">A CLEAN START</span>
        <h1>Make room for<br />your next idea.</h1>
        <p>Explore a small workspace, one verified version at a time.</p>
        <div className="steps">
          <div><b>01</b><span>Describe an experience</span></div>
          <div><b>02</b><span>Build a working version</span></div>
          <div><b>03</b><span>Check the result</span></div>
        </div>
        <small>A new baseline. A new version history.</small>
      </aside>
      <section>
        <div id="sign-in" hidden={Boolean(userEmail)}>
          <span className="eyebrow">DEMO WORKSPACE</span>
          <h2>Let's get started</h2>
          <p className="subtext">Use the fictional details below to try the flow.</p>
          <form id="login-form" noValidate autoComplete="off" onSubmit={enterWorkspace}>
            <label htmlFor="email">Email address</label>
            <input id="email" ref={emailInput} type="email" placeholder="name@example.test"
              value={email} onChange={event => setEmail(event.target.value)}
              aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'email-error' : undefined} />
            <p className="error" id="email-error" hidden={!emailError}>{emailError}</p>
            <label htmlFor="password">Password</label>
            <input id="password" ref={passwordInput} type="password" placeholder="At least 8 characters"
              value={password} onChange={event => setPassword(event.target.value)}
              aria-invalid={Boolean(passwordError)} aria-describedby={passwordError ? 'password-error' : undefined} />
            <p className="error" id="password-error" hidden={!passwordError}>{passwordError}</p>
            <p id="login-error" role="alert" hidden={!loginError}>Those demo details don't match.</p>
            <button id="submit" type="submit">Enter workspace →</button>
          </form>
          <div className="fixture">
            <strong>Fictional test details</strong>
            <p>demo@fresh.protoflow.test</p><p>FreshDemo42!</p>
            <small>In-memory demonstration only.</small>
          </div>
        </div>
        <div id="signed-in" hidden={!userEmail}>
          <span className="success">✓</span><span className="eyebrow">YOU'RE READY</span>
          <h2>Demo workspace</h2><p className="subtext">Your next idea can start here.</p>
          <div className="account"><strong id="user-email">{userEmail}</strong><small>Fictional demo profile</small></div>
          <button id="logout" type="button" onClick={leaveWorkspace}>Leave workspace</button>
        </div>
        <p id="status" role="status">{status}</p>
      </section>
    </main>
    <footer><a href="#conversation">Open a fresh conversation →</a></footer>
  </>;
}
