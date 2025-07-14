// src/App.js
import React, { useState, useEffect } from 'react';
import io    from 'socket.io-client';
import axios from 'axios';
import Signup from './Signup';
import './App.css';

const API = 'http://127.0.0.1:3001';

function App() {
  const [stage, setStage]       = useState('login');    // 'login'|'signup'|'menu'|'create'|'join'|'chat'
  const [token, setToken]       = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  const [u, setU] = useState(''), [p, setP] = useState('');

  const [servers, setServers]   = useState([]);         // liste { name, code }
  const [selected, setSelected] = useState('');         // nom du serveur actif
  const [msgList, setMsgList]   = useState([]);         // messages du room
  const [input, setInput]       = useState('');
  const [socket, setSocket]     = useState(null);

  // Nouveaux états pour les formulaires
  const [newName, setNewName]   = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Persist token+username
  useEffect(() => {
    if (token && username) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
    }
  }, [token, username]);

  // Après connexion, charger mes serveurs
  useEffect(() => {
    if (stage === 'chat') {
      axios.get(`${API}/my-servers`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setServers(res.data.servers);
        if (res.data.servers.length) {
          setSelected(res.data.servers[0].name);
        }
      }).catch(() => alert('Impossible de charger vos serveurs'));
    }
  }, [stage, token]);

  // Initialiser Socket.IO dès qu’un serveur est sélectionné
  useEffect(() => {
    if (selected) {
      const s = io(API, { auth: { token } });
      s.emit('join room', selected);
      s.on('chat message', m => {
        if (m.room === selected) setMsgList(prev => [...prev, m]);
      });
      setSocket(s);
      return () => s.disconnect();
    }
  }, [selected, token]);

  // Callback signup
  const onSignedUp = name => {
    setU(name);
    setStage('login');
  };

  // Form login
  const doLogin = async e => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/login`, { username: u, password: p });
      setToken(res.data.token);
      setUsername(res.data.username);
      setStage('chat');
    } catch {
      alert('Erreur de connexion');
    }
  };

  // Form create
  const doCreate = async e => {
    e.preventDefault();
    if (!newName) return;
    try {
      const res = await axios.post(`${API}/servers`, { name: newName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const srv = { name: newName, code: res.data.invitationCode };
      setServers(prev => [...prev, srv]);
      setSelected(newName);
      setMsgList([]);
      alert(`Invitation générée : ${srv.code}`);
      setNewName('');
      setStage('chat');
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur de création');
    }
  };

  // Form join
  const doJoin = async e => {
    e.preventDefault();
    if (!joinCode) return;
    try {
      const res = await axios.post(`${API}/servers/join`, { code: joinCode }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const srv = { name: res.data.name, code: joinCode };
      setServers(prev => [...prev, srv]);
      setSelected(res.data.name);
      setMsgList([]);
      setJoinCode('');
      setStage('chat');
    } catch {
      alert('Code invalide');
    }
  };

  // Envoi d’un message
  const send = () => {
    if (socket && input.trim()) {
      socket.emit('chat message', { room: selected, message: input });
      setInput('');
    }
  };

  // Code du serveur sélectionné
  const current = servers.find(s => s.name === selected);

  // Rendu selon stage
  if (stage === 'signup') {
    return <Signup onSignedUp={onSignedUp} />;
  }

  if (stage === 'login') {
    return (
      <div className="centered">
        <form onSubmit={doLogin} className="form">
          <h2>Connexion</h2>
          <input placeholder="Utilisateur" value={u} onChange={e=>setU(e.target.value)} required/>
          <input type="password" placeholder="Mot de passe" value={p} onChange={e=>setP(e.target.value)} required/>
          <button type="submit">Se connecter</button>
          <p className="link" onClick={()=>setStage('signup')}>S’inscrire</p>
        </form>
      </div>
    );
  }

  // Barre menu (non utilisé ici, passez directement en chat)
  if (stage === 'menu') {
    return (
      <div className="centered">
        <button onClick={()=>setStage('create')} className="menuBtn">Créer un serveur</button>
        <button onClick={()=>setStage('join')}   className="menuBtn">Rejoindre un serveur</button>
      </div>
    );
  }

  // Formulaire création
  if (stage === 'create') {
    return (
      <div className="centered">
        <form onSubmit={doCreate} className="form">
          <h2>Créer un serveur</h2>
          <input
            placeholder="Nom du serveur"
            value={newName}
            onChange={e=>setNewName(e.target.value)}
            required
          />
          <button type="submit">Créer</button>
          <p className="link" onClick={()=>setStage('chat')}>← Retour</p>
        </form>
      </div>
    );
  }

  // Formulaire jonction
  if (stage === 'join') {
    return (
      <div className="centered">
        <form onSubmit={doJoin} className="form">
          <h2>Rejoindre un serveur</h2>
          <input
            placeholder="Code d’invitation (clan.nom)"
            value={joinCode}
            onChange={e=>setJoinCode(e.target.value)}
            required
          />
          <button type="submit">Rejoindre</button>
          <p className="link" onClick={()=>setStage('chat')}>← Retour</p>
        </form>
      </div>
    );
  }

  // Chat principal
  return (
    <div className="container">
      <aside className="sidebar">
        <button onClick={()=>setStage('create')}>➕</button>
        <button onClick={()=>setStage('join')}>➡️</button>
        <ul className="server-list">
          {servers.map(s => (
            <li
              key={s.name}
              className={`server ${s.name===selected?'active':''}`}
              title={s.name}
              onClick={()=>{
                setSelected(s.name);
                setMsgList([]);
              }}
            >
              {s.name[0].toUpperCase()}
            </li>
          ))}
        </ul>
      </aside>
      <section className="chat">
        <header>
          Salon : {selected}
          {current && (
            <div style={{ fontSize:'0.9em', color:'#ccc', marginTop:4 }}>
              Invitation : <code>{current.code}</code>
            </div>
          )}
        </header>
        <div className="messages">
          {msgList.map((m,i)=>
            <p key={i}><strong>{m.user}:</strong> {m.message}</p>
          )}
        </div>
        <footer>
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder="Écris un message…"
          />
          <button onClick={send}>Envoyer</button>
        </footer>
      </section>
    </div>
  );
}

export default App;

