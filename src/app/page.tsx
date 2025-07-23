'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';

// Firebase Imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Import the CSS module for ALL page styles.
import styles from './page.module.css';

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCNH4OESR8ICj246wPHfS4cvh20ulQ1e-k",
    authDomain: "spelling-nads.firebaseapp.com",
    projectId: "spelling-nads",
    storageBucket: "spelling-nads.appspot.com",
    messagingSenderId: "966502508469",
    appId: "1:966502508469:web:bf9abe8b83efd0f2e1dbfc"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// --- Type Definitions ---
type UserProfile = {
  username: string;
  pfpUrl: string;
  walletAddress: string;
};

// --- Child Components ---

const ConnectWalletScreen = () => (
    <div className={styles.connectScreen}>
      <h1 className={`${styles.title} text-shadow`}>Spelling Nads</h1>
      <p className={styles.subtitle}>
        The AI-Powered Spelling Showdown
      </p>
      <ConnectButton.Custom>
        {({ openConnectModal, mounted }) => (
          <button
            onClick={openConnectModal}
            type="button"
            className={styles.connectButton}
            disabled={!mounted}
          >
            <div className={styles.connectButtonText}>
              <span>CONNECT</span><br /><span>WALLET</span>
            </div>
          </button>
        )}
      </ConnectButton.Custom>
    </div>
);

// MODIFIED: This component now accepts a 'soloUrl' prop
const MainMenuScreen = ({ profile, soloUrl, onDisconnect, onEditProfile }: { profile: UserProfile, soloUrl: string, onDisconnect: () => void, onEditProfile: () => void }) => (
    <div className={styles.mainMenuContainer}>
        <div className={styles.mainMenuCard}>
            <div className={styles.profileSection}>
                <Image 
                    src={profile.pfpUrl || '/profile-pics/1.png'} 
                    alt="Player Avatar" 
                    width={80} 
                    height={80}
                    className={styles.profileAvatar}
                    unoptimized
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/80x80/0f172a/e2e8f0?text=PFP'; }}
                />
                <div>
                    <h2 className={styles.profileName}>{profile.username}</h2>
                    <p className={styles.profileAddress}>
                        {`${profile.walletAddress.slice(0, 6)}...${profile.walletAddress.slice(-4)}`}
                    </p>
                </div>
                <div className={styles.profileButtons}>
                    <button onClick={onEditProfile} className={styles.editButton}>
                        Edit Profile
                    </button>
                    <button onClick={onDisconnect} className={styles.disconnectButton}>
                        Disconnect
                    </button>
                </div>
            </div>
            <div className={styles.gameModeButtons}>
                {/* MODIFIED: This is now a standard 'a' tag with a dynamic href */}
                <a href={soloUrl} className={styles.menuButton}>
                    SOLO
                </a>
                <Link href="/multiplayer" className={styles.menuButton}>
                    MULTIPLAYER
                </Link>
            </div>
        </div>
    </div>
);

const EditProfileModal = ({ profile, onSave, onCancel }: { profile: UserProfile, onSave: (newProfile: UserProfile) => void, onCancel: () => void }) => {
    const [username, setUsername] = useState(profile.username || 'Anonymous');
    const [pfpUrl, setPfpUrl] = useState(profile.pfpUrl || '/profile-pics/1.png');
    const [isSaving, setIsSaving] = useState(false);

    const regeneratePfp = () => {
        const randomPfpId = Math.floor(Math.random() * 93) + 1;
        setPfpUrl(`/profile-pics/${randomPfpId}.png`);
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave({ ...profile, username, pfpUrl });
        setIsSaving(false);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3 className={styles.modalHeader}>Edit Profile</h3>
                <div className="space-y-4">
                    <div className={styles.formGroup}>
                        <label htmlFor="username-input" className={styles.formLabel}>Username</label>
                        <input type="text" id="username-input" value={username} onChange={(e) => setUsername(e.target.value)} className={styles.formInput} placeholder="Enter your username" />
                    </div>
                    <div className={styles.pfpSection}>
                        <div className={styles.pfpTextContainer}>
                            <label className={styles.formLabel}>Profile Picture</label>
                            <p className={styles.pfpSubtext}>Regenerate your avatar.</p>
                        </div>
                        <button onClick={regeneratePfp} className={`${styles.modalButton} ${styles.modalButtonPrimary}`}>Regenerate</button>
                    </div>
                    <div className="flex justify-center">
                        <Image 
                            src={pfpUrl} 
                            alt="PFP Preview" 
                            width={96} 
                            height={96} 
                            className={`${styles.pfpPreview} w-24 h-24`}
                            unoptimized
                            onError={(e) => { e.currentTarget.src = 'https://placehold.co/96x96/0f172a/e2e8f0?text=PFP'; }} />
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button onClick={onCancel} className={`${styles.modalButton} ${styles.modalButtonSecondary}`}>Cancel</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className={`${styles.modalButton} ${styles.modalButtonPrimary} ${isSaving ? styles.modalButtonDisabled : ''}`}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- The Main Page Component ---
export default function HomePage() {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    const appId = 'spelling-nads-dev';

    const funnyUsernames = ["Smelly Foot", "Bad Haircut", "Foot Fetish", "Nerd Boy", "Farmer", "Femboy", "MILF Hunter", "Boombaclat", "Bleep Destroyer", "Gamer God", "Sussy Baka", "Chad Thundercock", "Karen", "Keyboard Warrior", "NoobMaster69"];

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                signInAnonymously(auth).catch((error) => {
                    console.error("Anonymous sign-in failed:", error);
                });
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const loadProfile = async () => {
            if (isAuthReady && isConnected && address) {
                setIsLoading(true);
                const profileRef = doc(db, "artifacts", appId, "public", "data", "profiles", address);
                const profileSnap = await getDoc(profileRef);

                let profileData: UserProfile;

                if (profileSnap.exists()) {
                    profileData = profileSnap.data() as UserProfile;
                } else {
                    const randomUsername = funnyUsernames[Math.floor(Math.random() * funnyUsernames.length)];
                    const randomPfpId = Math.floor(Math.random() * 93) + 1;
                    profileData = {
                        username: `${randomUsername}#${address.slice(2, 6)}`,
                        pfpUrl: `/profile-pics/${randomPfpId}.png`,
                        walletAddress: address,
                    };
                    await setDoc(profileRef, { ...profileData, createdAt: serverTimestamp() });
                }
                
                localStorage.setItem('spellingNadsProfile', JSON.stringify(profileData));
                setProfile(profileData);
                setIsLoading(false);

            } else if (isAuthReady) {
                localStorage.removeItem('spellingNadsProfile');
                setProfile(null);
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [isAuthReady, isConnected, address, appId]);

    const handleSaveProfile = async (newProfile: UserProfile) => {
        if (!address) return;
        const profileRef = doc(db, "artifacts", appId, "public", "data", "profiles", address);
        await setDoc(profileRef, { ...newProfile, updatedAt: serverTimestamp() }, { merge: true });
        
        localStorage.setItem('spellingNadsProfile', JSON.stringify(newProfile));
        setProfile(newProfile);
        setIsModalOpen(false);
    };
    
    const handleDisconnect = () => {
        localStorage.removeItem('spellingNadsProfile');
        disconnect();
    };

    // ** ADDED: Function to generate the solo mode URL **
    const getSoloUrl = () => {
        if (!profile) return '#';
        const profileString = JSON.stringify(profile);
        // We use encodeURIComponent to safely pass the JSON string as a URL parameter
        const encodedProfile = encodeURIComponent(profileString);
        // This creates the full URL to your existing solo game
        return `https://spelling-nads.marksocratests.xyz/solo.html?profile=${encodedProfile}`;
    };

    if (!isAuthReady || isLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-slate-950">
                <h1 className="text-3xl font-bold text-white animate-pulse">Initializing...</h1>
            </div>
        );
    }

    return (
        <main className="flex items-center justify-center h-screen w-screen bg-slate-950">
            {isConnected && profile ? (
                <>
                    <MainMenuScreen 
                        profile={profile} 
                        soloUrl={getSoloUrl()} // Pass the generated URL as a prop
                        onDisconnect={handleDisconnect} 
                        onEditProfile={() => setIsModalOpen(true)} 
                    />
                    {isModalOpen && (
                        <EditProfileModal 
                            profile={profile} 
                            onSave={handleSaveProfile} 
                            onCancel={() => setIsModalOpen(false)} 
                        />
                    )}
                </>
            ) : (
                <ConnectWalletScreen />
            )}
        </main>
    );
}
