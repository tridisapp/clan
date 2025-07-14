// src/App.js
import React, { useState, useEffect } from 'react';
import io    from 'socket.io-client';
import axios from 'axios';
import Signup from './Signup';
import Profile from './Profile';
import './App.css';

const API = 'http://127.0.0.1:3001';

function App() {
  const [stage, setStage]       = useState('login');    // 'login'|'signup'|'menu'|'create'|'join'|'chat'|'profile'
  const [token, setToken]       = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [userId, setUserId]     = useState(localStorage.getItem('userId') || '');

  const [u, setU] = useState(''), [p, setP] = useState('');

  const [servers, setServers]   = useState([]);         // liste { name, code }
  const [selected, setSelected] = useState('');         // nom du serveur actif
  const [channels, setChannels] = useState([]);        // canaux du serveur
  const [selectedChan, setSelectedChan] = useState('');
  const [members, setMembers] = useState([]);          // membres du serveur
  const [owner, setOwner] = useState('');
  const [msgList, setMsgList]   = useState([]);         // messages du room
  const [input, setInput]       = useState('');
  const [socket, setSocket]     = useState(null);

  // Nouveaux états pour les formulaires
  const [newName, setNewName]   = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [newChanName, setNewChanName] = useState('');

  // Persist token+username
  useEffect(() => {
    if (token && username) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      localStorage.setItem('userId', userId);
    }
  }, [token, username, userId]);

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

  // Charger les détails d'un serveur
  useEffect(() => {
    if (selected) {
      axios.get(`${API}/servers/${selected}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setChannels(res.data.channels);
        setMembers(res.data.members);
        setOwner(res.data.owner);
        setSelectedChan(res.data.channels[0] || '');
      }).catch(() => {
        setChannels([]);
        setMembers([]);
      });
    }
  }, [selected, token]);

  // Initialiser Socket.IO dès qu’un serveur est sélectionné
  useEffect(() => {
    if (selected && selectedChan) {
      const room = `${selected}/${selectedChan}`;
      const s = io(API, { auth: { token } });
      s.emit('join room', room);
      s.on('chat message', m => {
        if (m.room === room) setMsgList(prev => [...prev, m]);
      });
      setSocket(s);
      return () => s.disconnect();
    }
  }, [selected, selectedChan, token]);

  // Charger l'historique des messages
  useEffect(() => {
    if (selected && selectedChan) {
      axios.get(`${API}/servers/${selected}/messages/${selectedChan}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setMsgList(res.data.messages))
        .catch(() => setMsgList([]));
    }
  }, [selected, selectedChan, token]);

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
      setUserId(res.data.id);
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
      socket.emit('chat message', { room: `${selected}/${selectedChan}`, message: input });
      setInput('');
    }
  };

  const createChannel = async () => {
    if (!newChanName) return;
    try {
      await axios.post(`${API}/servers/${selected}/channels`, { name: newChanName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChannels(prev => [...prev, newChanName]);
      setNewChanName('');
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
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

  if (stage === 'profile') {
    return (
      <Profile
        token={token}
        onClose={()=>setStage('chat')}
        onUpdate={data=>{
          setUsername(data.username);
          setToken(data.token);
        }}
      />
    );
  }

  // Chat principal
  return (
    <div className="container">
      <aside className="sidebar">
        <button onClick={()=>setStage('profile')}>⚙️</button>
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
                setChannels([]);
                setSelectedChan('');
              }}
            >
              {s.name[0].toUpperCase()}
            </li>
          ))}
        </ul>
      </aside>
      <aside className="channelbar">
        <div style={{ marginBottom:8 }}>
          <strong>{selected}</strong>
        </div>
        <ul className="channel-list">
          {channels.map(c => (
            <li
              key={c}
              className={`channel ${c===selectedChan?'active':''}`}
              onClick={()=>{ setSelectedChan(c); }}
            >#{c}</li>
          ))}
        </ul>
        {owner===userId && (
          <div style={{ marginTop:10 }}>
            <input
              placeholder="Nouveau canal"
              value={newChanName}
              onChange={e=>setNewChanName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&createChannel()}
              style={{ width:'100%', marginTop:8 }}
            />
            <button onClick={createChannel} style={{ width:'100%', marginTop:4 }}>+
            </button>
          </div>
        )}
      </aside>
      <section className="chat">
        <header>
          {selected} / {selectedChan}
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
      <aside className="memberbar">
        <strong>Membres</strong>
        {members.map(m => (
          <div key={m.username} className="member" style={{ display:'flex', alignItems:'center', marginBottom:4 }}>
            {m.avatar && <img src={m.avatar} alt="av" style={{ width:24, height:24, borderRadius:'50%', marginRight:4 }} />}
            <span>{m.username} - {m.online ? 'en ligne' : 'hors ligne'}</span>
          </div>
        ))}
      </aside>
    </div>
  );
}

export default App;

