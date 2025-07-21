'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  useIsTogether,
  useJoinUrl,
  useLeaveSession,
  useCreateRandomSession,
  useStateTogether,
  useConnectedUsers,
  useMyId,
} from 'react-together';
import QRCode from 'qrcode';

// =======================================================================
// TYPE DEFINITIONS (No changes here)
// =======================================================================
type GameSettings = { roomName: string; difficulty: string; gameMode: string; theme: string; isPublic: boolean; maxPlayers: number; };
type PublicRoom = { sessionName: string; name: string; playerCount: number; maxPlayers: number; };
type Player = { id: string; nickname: string; pfpUrl: string; team: 'A' | 'B' | 'SPECTATOR'; isHost: boolean; };

// =======================================================================
// UI COMPONENTS (No changes here, but included for completeness)
// =======================================================================
const PlayerCard = ({ player, isMe, isHost, onKick }: { player: Player, isMe: boolean, isHost: boolean, onKick: (id: string) => void }) => ( <div className="player-slot"> <Image src={player.pfpUrl} alt="avatar" className="player-avatar" width={48} height={48} onError={(e) => { e.currentTarget.src = 'https://placehold.co/96x96/0f172a/e2e8f0?text=PFP'; }} /> <div className="flex flex-col"> <span className="font-semibold">{player.nickname}{isMe ? ' (You)' : ''}</span> {player.isHost && <span className="host-badge">HOST</span>} </div> {isHost && !isMe && <button onClick={() => onKick(player.id)} className="btn btn-danger kick-btn">Kick</button>} </div> );
const TeamPanel = ({ teamName, players, isHost, onKick }: { teamName: string, players: Player[], isHost: boolean, onKick: (id: string) => void }) => { const teamColor = teamName === 'Team A' ? 'text-red-400' : 'text-blue-400'; const myId = useMyId(); return ( <div className="team-panel"> <h2 className={`text-2xl font-bold ${teamColor} mb-4 text-center`}>{teamName}</h2> <div className="space-y-2"> {players.map(player => ( <PlayerCard key={player.id} player={player} isMe={player.id === myId} isHost={isHost} onKick={onKick} /> ))} </div> </div> ); };
const GameLobby = ({ onLeave, onKickPlayer, joinUrl }: { onLeave: () => void, onKickPlayer: (id: string) => void, joinUrl: string | null }) => { const [qrCodeUrl, setQrCodeUrl] = useState(''); const [settings] = useStateTogether<GameSettings | null>('game-settings', null); const [players] = useStateTogether<Player[]>('players', []); const myId = useMyId(); const isHost = players.find(p => p.id === myId)?.isHost ?? false; const roomCode = joinUrl?.split('rtName=')[1]?.split('&')[0] || '...'; useEffect(() => { if (joinUrl) { QRCode.toDataURL(joinUrl, { width: 128, margin: 1, color: { dark: '#e2e8f0', light: '#0000' } }, (err, url) => { if (!err) setQrCodeUrl(url); }); } }, [joinUrl]); const teamA = players.filter(p => p.team === 'A'); const teamB = players.filter(p => p.team === 'B'); if (!settings) { return <div className="text-3xl font-bold animate-pulse text-shadow">Syncing Room Details...</div>; } return ( <div className="lobby-grid"> <header className="lobby-header flex justify-between items-center"> <div> <h1 id="lobby-room-name" className="text-3xl font-bold text-shadow">{settings.roomName}</h1> <p id="lobby-game-mode" className="text-slate-400">{settings.gameMode} | {settings.difficulty}</p> </div> <button id="leave-lobby-btn" onClick={onLeave} className="btn btn-danger">Leave Room</button> </header> <aside className="lobby-settings flex flex-col gap-4"> <div className="bg-slate-800/50 p-4 rounded-lg"> <h3 className="font-bold text-sky-300 mb-2">Theme</h3> <p id="lobby-map-display" className="text-xl">{settings.theme}</p> </div> <div className="bg-slate-800/50 p-4 rounded-lg"> <h3 className="font-bold text-sky-300 mb-2">Room Code</h3> <p id="lobby-invite-code" className="text-2xl font-mono bg-slate-900 p-2 rounded text-center cursor-pointer" title="Click to copy" onClick={() => navigator.clipboard.writeText(roomCode)}>{roomCode}</p> </div> <div className="bg-slate-800/50 p-4 rounded-lg flex-grow flex flex-col items-center justify-center"> <h3 className="font-bold text-sky-300 mb-2">Scan to Join</h3> {qrCodeUrl && <Image src={qrCodeUrl} alt="Join QR Code" width={128} height={128} className="rounded-lg bg-slate-900/50 p-1" />} </div> </aside> <main id="lobby-players-container" className="lobby-players grid grid-cols-1 md:grid-cols-2 gap-4"> <TeamPanel teamName="Team A" players={teamA} isHost={isHost} onKick={onKickPlayer} /> <TeamPanel teamName="Team B" players={teamB} isHost={isHost} onKick={onKickPlayer} /> </main> <aside className="lobby-chat-invite flex flex-col"> <div className="team-panel"> <h2 className="text-2xl font-bold text-center text-slate-300 mb-4">Chat</h2> <div className="chat-messages flex-grow"> <p className="text-slate-500 text-center p-4">Chat is coming soon!</p> </div> <input type="text" placeholder="Type a message..." className="w-full" disabled /> </div> </aside> <footer className="lobby-footer flex justify-between items-center"> <div> <button id="change-team-btn" className="btn">Change Team</button> </div> {isHost && <button id="start-game-btn" className="btn btn-primary text-2xl px-12 py-4">START GAME</button>} {!isHost && <p className="text-slate-400">Waiting for host to start the game...</p>} </footer> </div> ); };
const CreateRoomSettings = ({ onCreate, onCancel }: { onCreate: (settings: GameSettings) => void; onCancel: () => void; }) => { const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const formData = new FormData(e.currentTarget); const settings: GameSettings = { roomName: formData.get('roomName') as string || 'My Spelling Room', difficulty: formData.get('difficulty') as string, gameMode: formData.get('gameMode') as string, theme: formData.get('theme') as string, isPublic: true, maxPlayers: parseInt(formData.get('maxPlayers') as string, 10), }; onCreate(settings); }; return ( <div className="w-full max-w-2xl p-8 rounded-2xl bg-slate-900/80 border border-slate-700 backdrop-blur-sm"> <h2 className="text-5xl font-black text-white text-shadow mb-8 text-center">Create Game Room</h2> <form onSubmit={handleSubmit} className="space-y-6"> <div> <label htmlFor="roomName" className="block text-sm font-medium text-slate-300 mb-2">Room Name</label> <input type="text" name="roomName" id="roomName" defaultValue="Mark's Spelling Nads" className="w-full" /> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div> <label htmlFor="difficulty" className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label> <select name="difficulty" id="difficulty" defaultValue="Moderate" className="w-full"> <option>Beginner</option> <option>Novice</option> <option>Moderate</option> <option>Advanced</option> <option>Expert</option> </select> </div> <div> <label htmlFor="gameMode" className="block text-sm font-medium text-slate-300 mb-2">Game Mode</label> <select name="gameMode" id="gameMode" defaultValue="2v2" className="w-full"> <option>1v1</option> <option>2v2</option> <option>3v3</option> <option>4v4</option> <option>Free-for-All</option> </select> </div> <div> <label htmlFor="maxPlayers" className="block text-sm font-medium text-slate-300 mb-2">Max Players</label> <select name="maxPlayers" id="maxPlayers" defaultValue="4" className="w-full"> <option>2</option> <option>4</option> <option>6</option> <option>8</option> </select> </div> <div> <label htmlFor="theme" className="block text-sm font-medium text-slate-300 mb-2">Theme</label> <select name="theme" id="theme" defaultValue="Spaceship" className="w-full"> <option>Desert</option> <option>Ice</option> <option>Jungle</option> <option>Spaceship</option> <option>Volcano</option> </select> </div> </div> <div className="text-center pt-4 flex gap-4 justify-center"> <button type="button" onClick={onCancel} className="btn text-xl">Cancel</button> <button type="submit" className="btn btn-primary text-xl">Confirm & Create</button> </div> </form> </div> ); };
const MainMenu = ({ onShowCreate, onJoin }: { onShowCreate: () => void; onJoin: (code: string) => void; }) => { const [joinCode, setJoinCode] = useState(''); const [publicRooms] = useStateTogether<PublicRoom[]>('public-rooms-list', []); return ( <div className="w-full screen"> <div className="w-full max-w-6xl mx-auto"> <a href="/" className="btn absolute top-4 left-4">&larr; Main Menu</a> <div className="text-center mb-12"> <h1 className="text-7xl md:text-8xl font-black text-white text-shadow">Spelling Nads</h1> <p className="text-xl text-slate-400">The AI-Powered Spelling Showdown</p> </div> <div className="flex flex-col md:flex-row gap-8 justify-center"> <div className="w-full md:w-96 bg-slate-900/50 p-6 rounded-lg border border-slate-800 backdrop-blur-sm"> <h2 className="text-3xl font-bold text-sky-300 mb-6 text-center">Play Now</h2> <div className="space-y-4"> <button onClick={onShowCreate} className="btn btn-primary w-full text-xl">Create Room</button> <form onSubmit={(e) => { e.preventDefault(); onJoin(joinCode); }} className="flex gap-2"> <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter Room Code..." className="w-full" /> <button type="submit" className="btn">Join</button> </form> </div> </div> <div className="w-full md:w-[40rem] bg-slate-900/50 p-6 rounded-lg border border-slate-800 flex flex-col backdrop-blur-sm"> <h2 className="text-3xl font-bold text-sky-300 mb-4 text-center">Public Rooms</h2> <div className="h-48 overflow-y-auto border-y border-slate-700 p-2 space-y-2"> {publicRooms && publicRooms.length > 0 ? ( publicRooms.map(room => ( <div key={room.sessionName} className="p-3 bg-slate-800/70 rounded flex justify-between items-center hover:bg-slate-700/70 cursor-pointer transition-colors" onClick={() => onJoin(room.sessionName)}> <span className="font-semibold">{room.name}</span> <span className="text-slate-400">{room.playerCount}/{room.maxPlayers}</span> </div> )) ) : ( <div className="flex items-center justify-center h-full"> <p className="text-slate-500">No public rooms available.</p> </div> )} </div> </div> </div> </div> </div> ); };

// =======================================================================
// Wrapper component to contain the client-side only logic
// =======================================================================
function MultiplayerClient() {
  const [screen, setScreen] = useState<'home' | 'settings' | 'lobby'>('home');
  const isInSession = useIsTogether();
  const joinUrl = useJoinUrl();
  const leaveSession = useLeaveSession();
  const createRandomSession = useCreateRandomSession();

  const [settings, setSettings] = useStateTogether<GameSettings | null>('game-settings', null);
  const [, setPlayers] = useStateTogether<Player[]>('players', []);

  useEffect(() => {
    if (isInSession && settings) {
      setScreen('lobby');
    } else if (!isInSession) {
      setScreen('home');
    }
  }, [isInSession, settings]);

  const connectedUsers = useConnectedUsers();
  useEffect(() => {
    if (!isInSession) return;

    setPlayers(currentPlayers => {
        const existingPlayerMap = new Map(currentPlayers.map(p => [p.id, p]));
        const hostId = currentPlayers.find(p => p.isHost)?.id;
        const newPlayerList = connectedUsers.map(user => {
            if (existingPlayerMap.has(user.userId)) {
                return existingPlayerMap.get(user.userId)!;
            }
            const newPlayer: Player = { id: user.userId, nickname: user.nickname, pfpUrl: `/profile-pics/${(Math.floor(Math.random() * 93) + 1)}.png`, team: 'A', isHost: false, };
            return newPlayer;
        });

        if (!newPlayerList.find(p => p.id === hostId) && newPlayerList.length > 0) {
            newPlayerList[0].isHost = true;
        }
        
        let teamACount = newPlayerList.filter(p => p.team === 'A').length;
        let teamBCount = newPlayerList.filter(p => p.team === 'B').length;
        newPlayerList.forEach(p => {
            if (p.team !== 'A' && p.team !== 'B') {
                if (teamACount <= teamBCount) { p.team = 'A'; teamACount++; } else { p.team = 'B'; teamBCount++; }
            }
        });
        return newPlayerList;
    });
  }, [connectedUsers, isInSession, setPlayers]);

  const handleCreateRoom = useCallback((newSettings: GameSettings) => { setSettings(newSettings); createRandomSession(); }, [createRandomSession, setSettings]);
  const handleJoinRoom = useCallback((roomCode: string) => { if (roomCode) { const url = new URL(window.location.href); url.searchParams.set('rtName', roomCode.trim()); window.location.href = url.toString(); } }, []);
  const handleLeave = useCallback(() => { const currentUrl = new URL(window.location.href); currentUrl.searchParams.delete('rtName'); window.history.replaceState({}, '', currentUrl); leaveSession(); setSettings(null); setPlayers([]); setScreen('home'); }, [leaveSession, setSettings, setPlayers]);
  const handleKickPlayer = useCallback((playerIdToKick: string) => { console.log(`Host wants to kick player: ${playerIdToKick}`); setPlayers(currentPlayers => currentPlayers.filter(p => p.id !== playerIdToKick)); }, [setPlayers]);

  const renderScreen = () => {
    switch (screen) {
      case 'settings': return <CreateRoomSettings onCreate={handleCreateRoom} onCancel={() => setScreen('home')} />;
      case 'lobby': return <GameLobby onLeave={handleLeave} onKickPlayer={handleKickPlayer} joinUrl={joinUrl} />;
      case 'home': default: return <MainMenu onShowCreate={() => setScreen('settings')} onJoin={handleJoinRoom} />;
    }
  };

  return <>{renderScreen()}</>;
}


// =======================================================================
// MAIN PAGE COMPONENT
// =======================================================================
export default function MultiplayerPage() {
  const [isClient, setIsClient] = useState(false);

  // This effect runs only on the client, after the initial server render.
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      {/* On the server, isClient is false, so we render a loading state. 
          On the client, isClient becomes true, and we render the actual component
          which can safely use the Multisynq hooks. */}
      {isClient ? <MultiplayerClient /> : <div className="text-3xl font-bold animate-pulse text-shadow">Loading Multiplayer...</div>}
    </main>
  );
}
