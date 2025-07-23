'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// --- Type Definitions ---
type GameSettings = {
    difficulty: string;
    players: string;
    theme: string;
};

type UserProfile = {
    username: string;
    pfpUrl: string;
    walletAddress: string;
};

// PlayerData now includes state for bot typing simulation
type PlayerData = {
    id: number;
    name: string;
    pfpUrl: string;
    team: 'player' | 'enemy';
    isBot: boolean;
    x: number; y: number; targetX: number; targetY: number;
    isEliminated: boolean; isWalking: boolean; alpha: number;
    width: number; height: number; isFloating: boolean; floatAngle: number;
    streak: number; lastWPM: number; turnStartTime: number;
    currentWordData: { word: string; type: string; definition: string; } | null;
    baseSkill?: number;
    typingSpeed?: number;
    isTyping?: boolean; // To show "...is typing"
};

type Particle = {
    x: number; y: number; size: number; speed: number; opacity: number; type: string;
};

// A more granular state machine to match the required game flow
type GameFlowState = 'LOADING_ASSETS' | 'MENU' | 'SETUP_GAME' | 'START_ROUND' | 'NEXT_TURN' | 'FETCH_WORD' | 'PLAY_AUDIO' | 'PLAYER_ACTION' | 'PROCESSING_ANSWER' | 'GAME_OVER';

type EliminationAnimation = {
    id: number;
    x: number;
    y: number;
    alpha: number;
    size: number;
    startTime: number;
};

// --- Child Components ---

const GameSettingsMenu = ({ onStartGame }: { onStartGame: (settings: GameSettings) => void }) => {
    const [settings, setSettings] = useState<GameSettings>({
        difficulty: 'Beginner',
        players: '1v1',
        theme: 'Spaceship',
    });

    const handleSettingChange = (key: keyof GameSettings, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const difficulties = ['Beginner', 'Novice', 'Moderate', 'Advanced', 'Expert', 'Genius', 'Master', 'Randomize'];
    const playerOptions = ['1v1', '2v2', '3v3', '4v4', '5v5', 'Free For All'];
    const themeOptions = ['Spaceship', 'Underwater', 'Volcano', 'Ice', 'Desert'];

    return (
        <div className={styles.menuContainer}>
            <Link href="/" className={styles.backButton}>&larr; Back</Link>
            <h2 className={styles.menuHeader}>Game Settings</h2>
            <div className={styles.settingsSections}>
                <div className={styles.configSection}>
                    <h3 className={styles.configHeader}>Difficulty</h3>
                    <div className={styles.optionsGrid}>
                        {difficulties.map(d => (
                            <button
                                key={d}
                                onClick={() => handleSettingChange('difficulty', d)}
                                className={`${styles.configButton} ${settings.difficulty === d ? styles.active : ''}`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={styles.configSection}>
                    <h3 className={styles.configHeader}>Game Mode</h3>
                    <div className={styles.optionsGrid}>
                        {playerOptions.map(p => (
                            <button
                                key={p}
                                onClick={() => handleSettingChange('players', p)}
                                className={`${styles.configButton} ${settings.players === p ? styles.active : ''}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={styles.configSection}>
                    <h3 className={styles.configHeader}>Theme</h3>
                    <div className={styles.optionsGrid}>
                        {themeOptions.map(t => (
                            <button
                                key={t}
                                onClick={() => handleSettingChange('theme', t)}
                                className={`${styles.configButton} ${settings.theme === t ? styles.active : ''}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className={styles.startGameButtonContainer}>
                <button onClick={() => onStartGame(settings)} className={styles.startGameButton}>
                    START GAME
                </button>
            </div>
        </div>
    );
};

const GameScreen = ({ settings, onGameEnd }: { settings: GameSettings, onGameEnd: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const spellInputRef = useRef<HTMLInputElement>(null);
    const animationFrameId = useRef<number>();
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // --- State Management ---
    const [gameState, setGameState] = useState<GameFlowState>('LOADING_ASSETS');
    const [loadingMessage, setLoadingMessage] = useState("Initializing...");

    // Game data state
    const playersRef = useRef<PlayerData[]>([]);
    const turnOrderRef = useRef<PlayerData[]>([]);
    const turnIndexRef = useRef(-1);
    const particlesRef = useRef<Particle[]>([]);
    const eliminationsRef = useRef<EliminationAnimation[]>([]);

    // Asset state
    const assetsRef = useRef({
        images: {} as Record<string, HTMLImageElement>,
        themeImages: {} as Record<string, HTMLImageElement>,
        soundEffects: {} as Record<string, HTMLAudioElement>,
        narratorAudio: {} as Record<string, HTMLAudioElement[]>,
        wordLists: {} as Record<string, string[]>,
    });

    // UI state
    const [uiState, setUiState] = useState({
        realtimeTypedText: "",
        gameMessage: "",
        gameMessageColor: "#facc15", // yellow-400
        definition: "",
        wordType: "",
        timerWidth: 100,
        timerColor: "#22c55e", // green-500
        timerText: "",
        streaks: [] as { id: number, streak: number }[],
        showRepeatButton: false,
        isBotTyping: false,
        typingPlayerName: "",
    });

    // --- Asset Loading ---
    useEffect(() => {
        let isMounted = true;
        async function preloadAssets() {
            if (!isMounted) return;
            setLoadingMessage("Loading assets...");

            const allPfpUrls = Array.from({ length: 93 }, (_, i) => `/profile-pics/${i + 1}.png`);
            const profile: UserProfile = JSON.parse(localStorage.getItem('spellingNadsProfile') || '{}');
            const uniqueImageUrls = [...new Set([profile.pfpUrl, ...allPfpUrls, '/effects/background/angel-wings.png', '/effects/background/mic-stand.png'])];

            const audioUrls = {
                typing: '/effects/audio/typing.mp3', correct: '/effects/audio/correct.mp3',
                wrong: '/effects/audio/wrong.mp3', win: '/effects/audio/win.mp3'
            };
            const themeImageUrls = {
                'Ice': '/effects/background/ice.jpg', 'Desert': '/effects/background/desert.jpg',
                'Spaceship': '/effects/background/spaceship.avif', 'Underwater': '/effects/background/underwater.jpg',
                'Volcano': '/effects/background/volcano.jpg'
            };
            const narratorVoices = ['alloy', 'ash', 'echo', 'onyx', 'shimmer'];
            const difficultyTiers = ['Beginner', 'Novice', 'Moderate', 'Advanced', 'Expert', 'Genius', 'Master'];

            const promises = [];
            const assets = assetsRef.current;

            uniqueImageUrls.forEach(url => {
                if (!url) return;
                promises.push(new Promise<void>(resolve => {
                    const img = new Image();
                    img.src = url;
                    img.onload = () => { assets.images[url] = img; resolve(); };
                    img.onerror = () => { console.error(`Failed to load image: ${url}`); resolve(); };
                }));
            });

            Object.entries(themeImageUrls).forEach(([key, url]) => {
                promises.push(new Promise<void>(resolve => {
                    const img = new Image();
                    img.src = url;
                    img.onload = () => { assets.themeImages[key] = img; resolve(); };
                    img.onerror = () => { console.error(`Failed to load theme: ${url}`); resolve(); };
                }));
            });

            Object.entries(audioUrls).forEach(([key, url]) => {
                promises.push(new Promise<void>(resolve => {
                    const audio = new Audio(url);
                    audio.oncanplaythrough = () => { assets.soundEffects[key] = audio; resolve(); };
                    audio.onerror = () => { console.error(`Failed to load sound: ${url}`); resolve(); };
                }));
            });

            narratorVoices.forEach(voice => {
                assets.narratorAudio[voice] = [];
                for (let i = 1; i <= 5; i++) {
                    const path = `/effects/narrator/${voice}${i}.mp3`;
                    promises.push(new Promise<void>(resolve => {
                        const audio = new Audio(path);
                        audio.oncanplaythrough = () => { assets.narratorAudio[voice].push(audio); resolve(); };
                        audio.onerror = () => { console.error(`Failed to load narrator audio: ${path}`); resolve(); };
                    }));
                }
            });

            difficultyTiers.forEach(tier => {
                promises.push(
                    fetch(`/wordlist/${tier.toLowerCase()}.txt`)
                        .then(res => res.text())
                        .then(text => { assets.wordLists[tier] = text.split(/\r?\n/).filter(word => word.trim() !== ''); })
                        .catch(err => console.error(`Failed to load wordlist for ${tier}:`, err))
                );
            });

            await Promise.all(promises);
            if (isMounted) {
                setGameState('SETUP_GAME');
            }
        }
        preloadAssets();
        return () => { isMounted = false; };
    }, []);


    // --- Game Flow Controller (State Machine) ---
    useEffect(() => {
        let isMounted = true;
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        const gameFlow = async () => {
            if (!isMounted) return;

            switch (gameState) {
                case 'SETUP_GAME':
                    const profile: UserProfile = JSON.parse(localStorage.getItem('spellingNadsProfile') || '{}');
                    const numEnemies = settings.players === 'Free For All' ? 3 : parseInt(settings.players[0]);
                    const allPfpKeys = Object.keys(assetsRef.current.images);

                    const mainPlayer: PlayerData = {
                        id: 1, name: profile.username || "Player", pfpUrl: profile.pfpUrl, team: 'player', isBot: false,
                        x: 0, y: 0, targetX: 0, targetY: 0, isEliminated: false, isWalking: false, alpha: 1,
                        width: 100, height: 100, isFloating: false, floatAngle: 0, streak: 0, lastWPM: 0,
                        turnStartTime: 0, currentWordData: null, isTyping: false
                    };
                    playersRef.current = [mainPlayer];

                    for (let i = 0; i < numEnemies; i++) {
                        playersRef.current.push({
                            id: i + 2, name: `Bot ${i + 1}`, pfpUrl: allPfpKeys[Math.floor(Math.random() * allPfpKeys.length)],
                            team: 'enemy', isBot: true, x: 0, y: 0, targetX: 0, targetY: 0, isEliminated: false, isWalking: false,
                            alpha: 1, width: 100, height: 100, isFloating: false, floatAngle: 0, streak: 0, lastWPM: 0,
                            turnStartTime: 0, currentWordData: null, baseSkill: 0.5 + Math.random() * 0.4, typingSpeed: 80 + Math.random() * 100,
                            isTyping: false
                        });
                    }
                    setGameState('START_ROUND');
                    break;

                case 'START_ROUND':
                    const activePlayers = playersRef.current.filter(p => !p.isEliminated);
                    if (activePlayers.length <= 1) {
                        setGameState('GAME_OVER');
                        return;
                    }
                    turnOrderRef.current = activePlayers.sort(() => Math.random() - 0.5);
                    turnIndexRef.current = -1;
                    setGameState('NEXT_TURN');
                    break;

                case 'NEXT_TURN':
                    turnIndexRef.current++;
                    if (turnIndexRef.current >= turnOrderRef.current.length) {
                        turnIndexRef.current = 0; // Loop back for the new round
                    }
                    setGameState('FETCH_WORD');
                    break;

                case 'FETCH_WORD':
                    const currentPlayer = turnOrderRef.current[turnIndexRef.current];
                    const word = getWordForRound();
                    const details = await fetchWordDetails(word);
                    currentPlayer.currentWordData = { word, ...details };
                    setUiState(prev => ({ ...prev, wordType: details.type?.toUpperCase() || '?', definition: details.definition || '...' }));
                    setGameState('PLAY_AUDIO');
                    break;

                case 'PLAY_AUDIO':
                    const playerForAudio = turnOrderRef.current[turnIndexRef.current];
                    await speakWord(playerForAudio.currentWordData!.word, true);
                    setGameState('PLAYER_ACTION');
                    break;

                case 'PLAYER_ACTION':
                    const playerForAction = turnOrderRef.current[turnIndexRef.current];
                    playerForAction.turnStartTime = performance.now();
                    setUiState(prev => ({ ...prev, gameMessage: `${playerForAction.name}'s Turn!`, gameMessageColor: '#facc15' }));
                    
                    startTimer(10, playerForAction);

                    if (playerForAction.isBot) {
                        simulateBotTyping(playerForAction);
                    } else {
                        setUiState(prev => ({ ...prev, showRepeatButton: true }));
                        spellInputRef.current?.focus();
                    }
                    break;
                
                case 'PROCESSING_ANSWER':
                    await delay(2000); // Wait for user to see the result
                    setUiState(prev => ({ ...prev, gameMessage: "" }));
                    setGameState('NEXT_TURN');
                    break;

                case 'GAME_OVER':
                    assetsRef.current.soundEffects.win?.play();
                    const winner = playersRef.current.find(p => !p.isEliminated);
                    setUiState(prev => ({ ...prev, gameMessage: `${winner ? winner.name : 'Nobody'} WINS!`, gameMessageColor: '#f59e0b' }));
                    await delay(5000);
                    onGameEnd();
                    break;
            }
        };

        gameFlow();

        return () => { isMounted = false; };
    }, [gameState, onGameEnd, settings]);


    // --- Game Logic Functions ---

    const getWordForRound = useCallback(() => {
        const difficulty = settings.difficulty === 'Randomize' ? ['Beginner', 'Novice', 'Moderate'][Math.floor(Math.random() * 3)] : settings.difficulty;
        const wordList = assetsRef.current.wordLists[difficulty] || [];
        if (wordList.length === 0) return "developer";
        return wordList[Math.floor(Math.random() * wordList.length)].toLowerCase();
    }, [settings.difficulty]);

    const fetchWordDetails = useCallback(async (word: string) => {
        try {
            const response = await fetch('/api/get-word', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word })
            });
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (error) {
            console.error("Error fetching word details:", error);
            return { type: '?', definition: 'Could not load definition.' };
        }
    }, []);

    const speakWord = useCallback(async (word: string, withIntro: boolean) => {
        try {
            const voice = ['alloy', 'ash', 'echo', 'onyx', 'shimmer'][Math.floor(Math.random() * 5)];
            if (withIntro) {
                const introAudios = assetsRef.current.narratorAudio[voice];
                if (introAudios?.length > 0) {
                    const intro = introAudios[Math.floor(Math.random() * introAudios.length)];
                    intro.currentTime = 0;
                    intro.play();
                    await new Promise(resolve => intro.onended = resolve);
                }
            }
            const response = await fetch('/api/get-speech', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: word, voice: voice })
            });
            if (!response.ok) throw new Error('Speech API Error');
            const audioBlob = await response.blob();
            const audio = new Audio(URL.createObjectURL(audioBlob));
            audio.play();
            await new Promise(resolve => audio.onended = resolve);
        } catch (error) { console.error("Could not play audio sequence:", error); }
    }, []);

    const handleAnswer = useCallback((player: PlayerData, answer: string) => {
        if (gameState === 'PROCESSING_ANSWER' || gameState === 'GAME_OVER') return;

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setUiState(prev => ({ ...prev, showRepeatButton: false, realtimeTypedText: "" }));
        player.isTyping = false;

        const isCorrect = answer.trim().toLowerCase() === player.currentWordData?.word;

        if (isCorrect) {
            assetsRef.current.soundEffects.correct?.play();
            const timeTaken = (performance.now() - player.turnStartTime) / 1000;
            player.lastWPM = Math.round((player.currentWordData!.word.length / 5) / (timeTaken / 60));
            player.streak++;
            if (player.streak > 1) {
                setUiState(prev => ({ ...prev, streaks: [...prev.streaks, { id: Date.now(), streak: player.streak }] }));
            }
            setUiState(prev => ({ ...prev, gameMessage: `CORRECT! (+${player.lastWPM} WPM)`, gameMessageColor: '#22c55e' }));
        } else {
            assetsRef.current.soundEffects.wrong?.play();
            player.streak = 0;
            player.lastWPM = 0;
            player.isEliminated = true;
            eliminationsRef.current.push({ id: Date.now(), x: player.x, y: player.y, alpha: 1, size: 1, startTime: Date.now() });
            setUiState(prev => ({ ...prev, gameMessage: `ELIMINATED!`, gameMessageColor: '#ef4444' }));
        }
        setGameState('PROCESSING_ANSWER');
    }, [gameState]);

    const startTimer = (totalTime: number, player: PlayerData) => {
        let timeLeft = totalTime;
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
            timeLeft -= 0.01;
            const width = (timeLeft / totalTime) * 100;
            setUiState(prev => ({
                ...prev,
                timerWidth: width,
                timerText: timeLeft.toFixed(1),
                timerColor: width > 50 ? '#a3e635' : width > 25 ? '#f59e0b' : '#ef4444'
            }));
            if (timeLeft <= 0) {
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                handleAnswer(player, ''); // Time's up
            }
        }, 10);
    };

    const simulateBotTyping = useCallback(async (bot: PlayerData) => {
        bot.isTyping = true;
        setUiState(prev => ({ ...prev, isBotTyping: true, typingPlayerName: bot.name }));

        const word = bot.currentWordData!.word;
        let willBeCorrect = Math.random() < (bot.baseSkill || 0.7);
        const targetWord = willBeCorrect ? word : "fail";

        for (let i = 0; i < targetWord.length; i++) {
            if (gameState === 'GAME_OVER') return; // Stop if game ends mid-type
            await new Promise(r => setTimeout(r, bot.typingSpeed || 120));
            setUiState(prev => ({ ...prev, realtimeTypedText: targetWord.substring(0, i + 1) }));
            manageTypingSound();
        }

        await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
        setUiState(prev => ({ ...prev, isBotTyping: false, typingPlayerName: "" }));
        handleAnswer(bot, targetWord);
    }, [handleAnswer, gameState]);

    // --- Drawing & Animation Loop ---
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgImage = assetsRef.current.themeImages[settings.theme];
        if (bgImage) ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

        // Particle drawing logic from solo.html
        particlesRef.current.forEach(p => {
            p.y -= p.speed;
            if (p.y < 0) p.y = canvas.height;
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Mic stand drawing logic
        const micStandImg = assetsRef.current.images['/effects/background/mic-stand.png'];
        if (micStandImg) {
            const micWidth = 150;
            const micHeight = micWidth * (micStandImg.height / micStandImg.width);
            ctx.drawImage(micStandImg, canvas.width / 2 - micWidth / 2, canvas.height * 0.75 - micHeight, micWidth, micHeight);
        }

        // Player drawing and updates
        playersRef.current.forEach(p => {
            // Update position
            if (p.isFloating) {
                p.alpha = Math.max(0, p.alpha - 0.005);
                p.y -= 0.5;
                p.floatAngle += 0.02;
                p.x += Math.sin(p.floatAngle) * 0.5;
            }

            // Draw player
            if (p.alpha > 0) {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                const pfp = assetsRef.current.images[p.pfpUrl];
                if (pfp) ctx.drawImage(pfp, p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
                ctx.textAlign = 'center';
                ctx.fillStyle = p.team === 'player' ? '#38bdf8' : '#f87171';
                ctx.font = 'bold 14px Inter';
                ctx.fillText(p.name, p.x, p.y + p.height / 2 + 15);
                ctx.restore();
            }
        });
        
        // Elimination animation drawing
        const angelWingsImg = assetsRef.current.images['/effects/background/angel-wings.png'];
        eliminationsRef.current.forEach(anim => {
            const elapsed = (Date.now() - anim.startTime) / 1000;
            anim.y -= 20 * elapsed;
            anim.alpha = Math.max(0, 1 - elapsed / 2);
            anim.size += 0.5 * elapsed;
            if (angelWingsImg && anim.alpha > 0) {
                ctx.globalAlpha = anim.alpha;
                const wingWidth = 100 * anim.size;
                const wingHeight = wingWidth * (angelWingsImg.height / angelWingsImg.width);
                ctx.drawImage(angelWingsImg, anim.x - wingWidth / 2, anim.y - wingHeight / 2, wingWidth, wingHeight);
            }
        });
        eliminationsRef.current = eliminationsRef.current.filter(a => a.alpha > 0);
        ctx.globalAlpha = 1;


        // Realtime typing text drawing
        if (uiState.realtimeTypedText) {
            ctx.font = 'bold 72px Inter';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            if (uiState.isBotTyping) {
                ctx.font = '20px Inter';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillText(`${uiState.typingPlayerName} is typing...`, canvas.width / 2, canvas.height * 0.45 - 80);
                ctx.font = 'bold 72px Inter';
                ctx.fillStyle = 'white';
            }
            ctx.fillText(uiState.realtimeTypedText, canvas.width / 2, canvas.height * 0.45 - 20);
        }

        animationFrameId.current = requestAnimationFrame(gameLoop);
    }, [settings.theme, uiState.realtimeTypedText, uiState.isBotTyping, uiState.typingPlayerName]);

    // --- Event Handlers & Setup Listeners ---
    const typingSoundTimeout = useRef<NodeJS.Timeout | null>(null);
    const manageTypingSound = () => {
        if (typingSoundTimeout.current) clearTimeout(typingSoundTimeout.current);
        const typingSound = assetsRef.current.soundEffects.typing;
        if (typingSound) {
            if (typingSound.paused) {
                typingSound.play().catch(e => console.error("Error playing typing sound:", e));
            }
            typingSoundTimeout.current = setTimeout(() => {
                if (typingSound && !typingSound.paused) {
                    typingSound.pause();
                    typingSound.currentTime = 0;
                }
            }, 350);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUiState(prev => ({ ...prev, realtimeTypedText: e.target.value }));
        manageTypingSound();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const humanPlayer = playersRef.current.find(p => !p.isBot);
            if (humanPlayer) {
                handleAnswer(humanPlayer, spellInputRef.current?.value || '');
            }
        }
    };

    // --- Component Lifecycle ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeObserver = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            // Recalculate player positions on resize
            const activePlayers = playersRef.current.filter(p => !p.isEliminated);
            const playerSpacing = canvas.width / (activePlayers.length + 1);
            let activePlayerIndex = 0;
            playersRef.current.forEach(p => {
                if (!p.isEliminated) {
                    const spotX = playerSpacing * (activePlayerIndex + 1);
                    const spotY = canvas.height * 0.88;
                    p.x = spotX; p.y = spotY;
                    p.targetX = spotX; p.targetY = spotY;
                    activePlayerIndex++;
                }
            });
            // Setup particles on initial resize
            if (particlesRef.current.length === 0) {
                 for (let i = 0; i < 150; i++) {
                    particlesRef.current.push({
                        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                        size: Math.random() * 2, speed: Math.random() * 0.5 + 0.1,
                        opacity: Math.random() * 0.5 + 0.2, type: 'star'
                    });
                }
            }
        });
        resizeObserver.observe(canvas);

        if (gameState !== 'LOADING_ASSETS') {
            animationFrameId.current = requestAnimationFrame(gameLoop);
        }

        return () => {
            resizeObserver.disconnect();
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (typingSoundTimeout.current) clearTimeout(typingSoundTimeout.current);
        };
    }, [gameState, gameLoop]);

    if (gameState === 'LOADING_ASSETS') {
        return <div className={styles.soloPageContainer}><h1 className="text-3xl font-bold animate-pulse">{loadingMessage}</h1></div>;
    }

    return (
        <div className={styles.gameContainer}>
            <canvas ref={canvasRef} className={styles.gameCanvas}></canvas>
            <div className={styles.overlayUi}>
                <div className={`${styles.definitionBox} ${styles.textShadow}`}>
                    <div className="text-center flex-grow">
                        <p className={styles.wordTypeText}>[{uiState.wordType}]</p>
                        <h1 className={styles.definitionText}>{uiState.definition}</h1>
                    </div>
                    {uiState.showRepeatButton && (
                        <button className={styles.repeatWordBtn} disabled={gameState !== 'PLAYER_ACTION'} onClick={() => speakWord(playersRef.current.find(p => !p.isBot)?.currentWordData?.word || '', false)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        </button>
                    )}
                </div>
                <div className={styles.gameInfo}>
                    <div className={`${styles.gameMessage} ${styles.textShadow}`} style={{ color: uiState.gameMessageColor }}>
                        {uiState.gameMessage}
                    </div>
                    <div className={styles.timerContainer}>
                        <div className={styles.timerBar}>
                            <div className={styles.timerBarInner} style={{ width: `${uiState.timerWidth}%`, backgroundColor: uiState.timerColor }}></div>
                        </div>
                        <div className={`${styles.timerText} ${styles.textShadow}`}>{uiState.timerText}</div>
                    </div>
                    <input
                        type="text"
                        ref={spellInputRef}
                        className="opacity-0 pointer-events-none absolute"
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={gameState !== 'PLAYER_ACTION'}
                    />
                </div>
            </div>
            <div className={styles.streakContainer}>
                {uiState.streaks.map(s => (
                    <div key={s.id} className={styles.streakIndicator} onAnimationEnd={() => setUiState(prev => ({ ...prev, streaks: prev.streaks.filter(streak => streak.id !== s.id) }))}>🔥 {s.streak} STREAK!</div>
                ))}
            </div>
        </div>
    );
};


// --- The Main Solo Page Component ---
export default function SoloPage() {
    const [pageState, setPageState] = useState<'MENU' | 'PLAYING'>('MENU');
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const router = useRouter();

    // --- Authentication Check ---
    useEffect(() => {
        const profile = localStorage.getItem('spellingNadsProfile');
        if (!profile) {
            router.push('/');
        }
    }, [router]);

    const handleStartGame = (settings: GameSettings) => {
        setGameSettings(settings);
        setPageState('PLAYING');
    };

    const handleGameEnd = () => {
        setPageState('MENU');
        setGameSettings(null);
    };

    return (
        <main className={styles.soloPageContainer}>
            {pageState === 'MENU' || !gameSettings ? (
                <GameSettingsMenu onStartGame={handleStartGame} />
            ) : (
                <GameScreen settings={gameSettings} onGameEnd={handleGameEnd} />
            )}
        </main>
    );
}
