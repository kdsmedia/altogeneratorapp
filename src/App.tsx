/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  sendPasswordResetEmail,
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment,
  User
} from './firebase';
import { 
  Video, 
  Image as ImageIcon, 
  Sparkles, 
  Upload, 
  Play, 
  Loader2, 
  Download, 
  RefreshCw,
  Zap,
  Layers,
  MonitorPlay,
  MessageSquare,
  Gift,
  CreditCard,
  User as UserIcon,
  Send,
  Shield,
  Info,
  FileText,
  Users,
  ExternalLink,
  LogOut,
  CalendarCheck,
  Link2,
  UserPlus,
  Trophy,
  Coins,
  CheckCircle2,
  ArrowRight,
  Plus,
  X,
  Crown,
  Clock,
  Check,
  Building2,
  QrCode,
  Wallet,
  ArrowLeft,
  History,
  Settings,
  Trash2,
  Ban,
  Edit2,
  Save,
  Search,
  MoreVertical,
  AlertTriangle,
  Lock,
  Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types for AI Studio environment
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const PACKAGES = [
  {
    id: 'vip1',
    name: 'VIP 1',
    price: 30000,
    duration: '7 Hari',
    description: 'Akses dasar ke semua fitur AI Video dengan prioritas standar.',
    icon: Zap,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10'
  },
  {
    id: 'vip2',
    name: 'VIP 2',
    price: 85000,
    duration: '14 Hari',
    description: 'Akses premium dengan kecepatan render lebih cepat dan tanpa watermark.',
    icon: Shield,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10'
  },
  {
    id: 'vip3',
    name: 'VIP 3',
    price: 150000,
    duration: '30 Hari',
    description: 'Akses penuh tanpa batas, prioritas tertinggi, dan dukungan 24/7.',
    icon: Crown,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10'
  }
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  state: { hasError: boolean, error: Error | null } = { hasError: false, error: null };
  props: { children: ReactNode };

  constructor(props: { children: ReactNode }) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Terjadi kesalahan sistem. Silakan muat ulang halaman.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error && parsedError.error.includes("insufficient permissions")) {
          errorMessage = "Anda tidak memiliki izin untuk melakukan aksi ini. Pastikan Anda sudah login dengan akun yang benar.";
        }
      } catch (e) {
        // Not a JSON error
      }
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
          <div className="glass p-8 rounded-[2rem] border border-white/10 max-w-md space-y-4">
            <Shield className="w-16 h-16 text-red-400 mx-auto" />
            <h2 className="text-2xl font-black tracking-tighter text-white">Oops! Sesuatu Salah</h2>
            <p className="text-zinc-500 text-sm">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 gradient-bg rounded-2xl font-bold text-sm tracking-widest hover:opacity-90 transition-all"
            >
              MUAT ULANG HALAMAN
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('Video');
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const generateReferralCode = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatFile, setChatFile] = useState<string | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'alto', text: string, image?: string }[]>([
    { role: 'alto', text: 'Halo! Saya ALTO, asisten AI kreatif Anda. Ada yang bisa saya bantu hari ini?' }
  ]);
  const [isChatting, setIsChatting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);

  // Bonus State (Derived from userData)
  const balance = userData?.balance || 0;
  const inviteCount = userData?.inviteCount || 0;
  
  // Daily Reset Logic for Check-in
  const lastCheckInDate = userData?.lastCheckInDate;
  const today = new Date().toISOString().split('T')[0];
  const hasCheckedIn = lastCheckInDate === today;

  // Daily Reset Logic for Sponsor Visits
  const lastSponsorVisitDate = userData?.lastSponsorVisitDate;
  const sponsorVisitCount = lastSponsorVisitDate === today ? (userData?.sponsorVisitCount || 0) : 0;
  const hasVisitedSponsor = sponsorVisitCount >= 20;
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'dana' | 'bank' | 'qris'>('dana');
  const [formData, setFormData] = useState({
    senderBank: '',
    ownerName: '',
    accountNumber: ''
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [adminSubTab, setAdminSubTab] = useState<'Transaksi' | 'User' | 'Settings' | 'Rekening' | 'Aplikasi'>('Transaksi');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserForm, setEditUserForm] = useState({
    fullName: '',
    phone: '',
    balance: 0,
    subscription: {
      isActive: false,
      plan: 'FREE',
      expiryDate: ''
    }
  });

  useEffect(() => {
    if (editingUser) {
      setEditUserForm({
        fullName: editingUser.fullName || '',
        phone: editingUser.phone || '',
        balance: editingUser.balance || 0,
        subscription: {
          isActive: editingUser.subscription?.isActive || false,
          plan: editingUser.subscription?.plan || 'FREE',
          expiryDate: editingUser.subscription?.expiryDate || ''
        }
      });
    }
  }, [editingUser]);

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    try {
      await handleUpdateUser(editingUser.id, editUserForm);
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user edit:', error);
    }
  };

  const adminTabs = [
    { id: 'Transaksi', icon: CreditCard },
    { id: 'User', icon: Users },
    { id: 'Settings', icon: Settings },
    { id: 'Rekening', icon: Wallet },
    { id: 'Aplikasi', icon: Shield },
  ] as const;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authFormData, setAuthFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    referral: ''
  });
  const [customAlert, setCustomAlert] = useState<{ show: boolean, message: string, title?: string } | null>(null);

  const showAlert = (message: string, title: string = 'NOTIFIKASI') => {
    setCustomAlert({ show: true, message, title });
  };

  const [customConfirm, setCustomConfirm] = useState<{ 
    show: boolean, 
    message: string, 
    title?: string, 
    onConfirm: () => void 
  } | null>(null);

  const showConfirm = (message: string, onConfirm: () => void, title: string = 'KONFIRMASI') => {
    setCustomConfirm({ show: true, message, title, onConfirm });
  };

  const isAdmin = user && !user.isAnonymous && user.email?.toLowerCase() === 'appsidhanie@gmail.com';
  const isSubscribed = userData?.subscription?.isActive || isAdmin;
  const isMaintenance = appSettings?.isMaintenance && !isAdmin;
  const isBlocked = userData?.isBlocked;

  useEffect(() => {
    // Fetch global settings
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(docSnap.data());
      } else {
        // Only attempt to initialize if we are sure we are the admin
        // This prevents non-admins from triggering permission-denied errors
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email?.toLowerCase() === 'appsidhanie@gmail.com') {
          setDoc(settingsRef, {
            whatsappUrl: 'https://wa.me/yourgroup',
            telegramUrl: 'https://t.me/yourgroup',
            sponsorUrl: 'https://sponsor-url.com',
            geminiApiKey: '',
            dana: { name: 'ALTOGEN ADMIN', number: '081234567890' },
            bank: { bankName: 'BCA', name: 'PT ALTOGEN LABS INDONESIA', number: '1234567890' },
            qrisUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ALTOGEN_PAYMENT',
            isMaintenance: false
          }, { merge: true }).catch(err => console.error("Failed to initialize settings:", err));
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser && !currentUser.isAnonymous) {
        setShowAuthModal(false);
        // Auto-switch to Admin if it's the admin
        if (currentUser.email?.toLowerCase() === 'appsidhanie@gmail.com') {
          setActiveTab('Admin');
        }
      } else {
        setUserData(null);
        setAppSettings(null); // Clear settings on logout to ensure fresh fetch
      }
    });

    return () => {
      unsubscribeSettings();
      unsubscribeAuth();
    };
  }, []);

  // Re-check settings initialization when user changes
  useEffect(() => {
    if (isAuthReady && isAdmin && !appSettings) {
      const settingsRef = doc(db, 'settings', 'global');
      getDoc(settingsRef).then((docSnap) => {
        if (!docSnap.exists()) {
          setDoc(settingsRef, {
            whatsappUrl: 'https://wa.me/yourgroup',
            telegramUrl: 'https://t.me/yourgroup',
            sponsorUrl: 'https://sponsor-url.com',
            geminiApiKey: '',
            dana: { name: 'ALTOGEN ADMIN', number: '081234567890' },
            bank: { bankName: 'BCA', name: 'PT ALTOGEN LABS INDONESIA', number: '1234567890' },
            qrisUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ALTOGEN_PAYMENT',
            isMaintenance: false
          }, { merge: true }).catch(err => console.error("Failed to initialize settings:", err));
        }
      });
    }
  }, [user, isAuthReady, isAdmin]);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setUserData(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check for subscription expiry
        if (data.subscription?.isActive && data.subscription?.expiryDate) {
          const now = new Date();
          const expiry = new Date(data.subscription.expiryDate);
          if (now > expiry) {
            updateDoc(userRef, {
              'subscription.isActive': false
            });
            showAlert('Masa aktif paket Anda telah habis. Silakan perpanjang atau beli paket baru.');
          }
        }
        
        setUserData(data);
        if (!data.referralCode) {
          updateDoc(userRef, { referralCode: generateReferralCode() });
        }
        // Ensure admin role is set if email matches
        if (user.email === 'appsidhanie@gmail.com' && data.role !== 'admin') {
          updateDoc(userRef, { role: 'admin' });
        }
      } else {
        // Create user doc if not exists (e.g. first time Google login)
        setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || 'User ALTO',
          balance: 0,
          inviteCount: 0,
          lastCheckInDate: '',
          sponsorVisitCount: 0,
          lastSponsorVisitDate: '',
          referralCode: generateReferralCode(),
          subscription: { isActive: false },
          isBlocked: false,
          role: user.email === 'appsidhanie@gmail.com' ? 'admin' : 'user',
          createdAt: serverTimestamp()
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribeUser();
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let email = authFormData.email;
    
    // If it's a phone number (digits and optional + at start), try to find the email
    if (/^\+?\d+$/.test(email)) {
      try {
        const phoneRef = doc(db, 'phone_lookup', email);
        const phoneSnap = await getDoc(phoneRef);
        if (phoneSnap.exists()) {
          email = phoneSnap.data().email;
        } else {
          // Fallback to searching users collection (might fail due to rules)
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('phone', '==', email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            email = querySnapshot.docs[0].data().email;
          } else {
            showAlert('Nomor ponsel tidak terdaftar. Silakan gunakan email atau daftar akun baru.');
            return;
          }
        }
      } catch (error) {
        console.error('Phone lookup error:', error);
      }
    }

    try {
      await signInWithEmailAndPassword(auth, email, authFormData.password);
      setShowAuthModal(false);
    } catch (error: any) {
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Akun tidak ditemukan. Silakan daftar terlebih dahulu.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Password salah. Silakan coba lagi.';
      }
      showAlert('Login gagal: ' + errorMessage);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, authFormData.email, authFormData.password);
      const newUser = userCredential.user;
      
      // Update profile with full name
      await updateProfile(newUser, { displayName: authFormData.fullName });
      
      const initialRole = authFormData.email.toLowerCase() === 'appsidhanie@gmail.com' ? 'admin' : 'user';

      // Store additional info in Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        fullName: authFormData.fullName,
        phone: authFormData.phone,
        email: authFormData.email,
        referral: authFormData.referral || null,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        balance: 0,
        inviteCount: 0,
        lastCheckInDate: '',
        sponsorVisitCount: 0,
        lastSponsorVisitDate: '',
        subscription: {
          isActive: false,
          plan: 'FREE',
          expiryDate: ''
        },
        isBlocked: false,
        role: initialRole,
        createdAt: new Date().toISOString()
      });

      // Create phone lookup mapping
      if (authFormData.phone) {
        await setDoc(doc(db, 'phone_lookup', authFormData.phone), {
          email: authFormData.email,
          uid: newUser.uid
        });
      }

      setShowAuthModal(false);
      showAlert('Pendaftaran berhasil!', 'SUKSES');
    } catch (error: any) {
      showAlert('Registrasi gagal: ' + error.message);
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInAnonymously(auth);
      setShowAuthModal(false);
    } catch (error) {
      console.error('Guest login error:', error);
    }
  };

  const handleForgotPassword = async () => {
    if (!authFormData.email) {
      showAlert('Silakan masukkan email atau nomor ponsel Anda terlebih dahulu.');
      return;
    }
    
    let email = authFormData.email;
    // If it's a phone number, try to find the email
    if (/^\+?\d+$/.test(email)) {
      try {
        const phoneRef = doc(db, 'phone_lookup', email);
        const phoneSnap = await getDoc(phoneRef);
        if (phoneSnap.exists()) {
          email = phoneSnap.data().email;
        } else {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('phone', '==', email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            email = querySnapshot.docs[0].data().email;
          } else {
            showAlert('Nomor ponsel tidak terdaftar.');
            return;
          }
        }
      } catch (error) {
        console.error('Phone lookup error:', error);
      }
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showAlert('Email reset password telah dikirim ke ' + email);
    } catch (error: any) {
      showAlert('Gagal mengirim email reset: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const checkAccess = (tab: string) => {
    if (tab === 'Chat') return true;
    if (user && !user.isAnonymous) return true;
    
    setAuthMode('login');
    setShowAuthModal(true);
    return false;
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'Admin' && !isAdmin) {
      showAlert('Akses ditolak. Hanya admin yang bisa mengakses panel ini.');
      return;
    }
    if (checkAccess(tab)) {
      setActiveTab(tab);
    }
  };

  const fetchTransactions = () => {
    if (!isAuthReady || !user) return;
    
    const q = isAdmin 
      ? query(collection(db, 'transactions'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'transactions'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });
    return unsubscribe;
  };

  const fetchUsers = () => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsersList(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return unsubscribe;
  };

  const handleUpdateUser = async (userId: string, data: any) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const oldData = userSnap.data();
      
      await updateDoc(userRef, data);
      
      // If phone number changed, update phone_lookup
      if (data.phone && oldData && data.phone !== oldData.phone) {
        // Delete old mapping if it exists
        if (oldData.phone) {
          await deleteDoc(doc(db, 'phone_lookup', oldData.phone));
        }
        // Create new mapping
        await setDoc(doc(db, 'phone_lookup', data.phone), {
          email: oldData.email,
          uid: userId
        });
      }
      
      showAlert('Data user berhasil diperbarui!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const syncPhoneMappings = async () => {
    if (!isAdmin) return;
    setIsSubmitting(true);
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      let count = 0;
      for (const userDoc of querySnapshot.docs) {
        const userData = userDoc.data();
        if (userData.phone && userData.email) {
          await setDoc(doc(db, 'phone_lookup', userData.phone), {
            email: userData.email,
            uid: userDoc.id
          });
          count++;
        }
      }
      showAlert(`Berhasil menyinkronkan ${count} nomor ponsel!`, 'SUKSES');
    } catch (error) {
      console.error('Sync error:', error);
      showAlert('Gagal menyinkronkan data.', 'GAGAL');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    showConfirm('Apakah Anda yakin ingin menghapus user ini?', async () => {
      try {
        await deleteDoc(doc(db, 'users', userId));
        showAlert('User berhasil dihapus!');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      }
    });
  };

  const handleUpdateSettings = async (data: any) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), data, { merge: true });
      showAlert('Pengaturan berhasil diperbarui!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
  };

  const handleUpdateStatus = async (txId: string, status: 'confirmed' | 'rejected', userId?: string, duration?: string) => {
    try {
      await updateDoc(doc(db, 'transactions', txId), { status });
      
      if (status === 'confirmed' && userId && duration) {
        const days = parseInt(duration.split(' ')[0]);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        
        const tx = transactions.find(t => t.id === txId);
        
        await updateDoc(doc(db, 'users', userId), {
          subscription: {
            isActive: true,
            expiryDate: expiryDate.toISOString(),
            plan: tx?.packageName || 'VIP'
          }
        });
      }
      
      showAlert(`Transaksi berhasil di${status === 'confirmed' ? 'terima' : 'tolak'}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${txId}`);
    }
  };

  useEffect(() => {
    let unsubscribeTx: any;
    let unsubscribeUsers: any;
    if (activeTab === 'Admin' && user) {
      unsubscribeTx = fetchTransactions();
      unsubscribeUsers = fetchUsers();
    }
    return () => {
      unsubscribeTx && unsubscribeTx();
      unsubscribeUsers && unsubscribeUsers();
    };
  }, [activeTab, user, isAuthReady]);

  const handleSubmitTransaction = async () => {
    if (!user) {
      showAlert('Anda harus login terlebih dahulu.');
      return;
    }
    if (!formData.senderBank || !formData.ownerName || !formData.accountNumber) {
      showAlert('Harap isi semua data pengirim.');
      return;
    }

    setIsSubmitting(true);
    try {
      const txData = {
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        price: selectedPackage.price,
        duration: selectedPackage.duration,
        paymentMethod,
        ...formData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email
      };

      await addDoc(collection(db, 'transactions'), txData);
      
      setStatus('Permintaan pembelian terkirim! Menunggu konfirmasi admin.');
      setShowCheckout(false);
      setFormData({ senderBank: '', ownerName: '', accountNumber: '' });
      setTimeout(() => setStatus(''), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user || hasCheckedIn) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: increment(50),
        lastCheckInDate: today
      });
      setStatus('Check-in berhasil! +Rp. 50');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleVisitSponsor = async () => {
    if (!user || hasVisitedSponsor) return;
    const url = appSettings?.sponsorUrl || 'https://google.com';
    const today = new Date().toISOString().split('T')[0];
    
    window.open(url, '_blank');
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const newCount = sponsorVisitCount + 1;
      
      await updateDoc(userRef, {
        balance: increment(100),
        sponsorVisitCount: newCount,
        lastSponsorVisitDate: today
      });
      
      setStatus(`Terima kasih! Kunjungan ${newCount}/20 berhasil. +Rp. 100`);
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleInviteFriend = async () => {
    if (!user) return;
    // In a real app, this would be triggered by a referral success
    // For now, we'll keep it as a button for demonstration but it should ideally be automatic
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: increment(500),
        inviteCount: increment(1)
      });
      setStatus('Teman berhasil diundang! +Rp. 500');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() && !chatFile) return;
    
    const userMsg = chatInput;
    const userFile = chatFile;
    setMessages(prev => [...prev, { role: 'user', text: userMsg, image: userFile || undefined }]);
    setChatInput('');
    setChatFile(null);
    setIsChatting(true);

    try {
      const apiKey = appSettings?.geminiApiKey || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      if (userFile) {
        // Multimodal request
        const base64Data = userFile.split(',')[1];
        const mimeType = userFile.split(';')[0].split(':')[1];
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: userMsg || "Apa yang ada di gambar ini?" }
              ]
            }
          ],
          config: {
            systemInstruction: "Anda adalah ALTO, asisten AI interaktif yang ramah, kreatif, dan cerdas. Anda membantu pengguna dengan pertanyaan mereka, memberikan inspirasi kreatif, dan selalu memberikan jawaban yang informatif namun ringkas dalam bahasa Indonesia. Anda juga memiliki kemampuan untuk menganalisis gambar yang diunggah pengguna.",
          },
        });
        
        setMessages(prev => [...prev, { role: 'alto', text: response.text || 'Maaf, saya tidak bisa merespons saat ini.' }]);
      } else {
        // Text-only request
        // Check if user is asking for image generation
        const isImageRequest = userMsg.toLowerCase().includes('buatkan gambar') || 
                              userMsg.toLowerCase().includes('generate image') ||
                              userMsg.toLowerCase().includes('gambar');

        if (isImageRequest) {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: userMsg,
            config: {
              imageConfig: {
                aspectRatio: "1:1",
              }
            }
          });

          let foundImage = false;
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64Data = part.inlineData.data;
              const imageUrl = `data:image/png;base64,${base64Data}`;
              setMessages(prev => [...prev, { role: 'alto', text: `Berikut adalah gambar yang Anda minta:\n![Generated Image](${imageUrl})` }]);
              foundImage = true;
              break;
            }
          }
          if (!foundImage) {
            setMessages(prev => [...prev, { role: 'alto', text: response.text || 'Maaf, saya tidak bisa membuat gambar saat ini.' }]);
          }
        } else {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: userMsg,
            config: {
              systemInstruction: "Anda adalah ALTO, asisten AI interaktif yang ramah, kreatif, dan cerdas. Anda membantu pengguna dengan pertanyaan mereka, memberikan inspirasi kreatif, dan selalu memberikan jawaban yang informatif namun ringkas dalam bahasa Indonesia. Anda juga memiliki kemampuan untuk membuat gambar jika diminta.",
            },
          });
          
          setMessages(prev => [...prev, { role: 'alto', text: response.text || 'Maaf, saya tidak bisa merespons saat ini.' }]);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'alto', text: 'Terjadi kesalahan saat menghubungi server AI.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateVideo = async () => {
    if (!user || user.isAnonymous) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    
    if (!isSubscribed) {
      showAlert('Fitur Video memerlukan langganan paket VIP. Silakan beli paket di menu Paket.');
      setActiveTab('Paket');
      return;
    }

    if (!prompt && !image) return;
    
    setIsGenerating(true);
    setVideoUrl(null);
    setStatus('Initializing AI engine...');

    try {
      const apiKey = appSettings?.geminiApiKey || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      let imageConfig = undefined;
      if (image) {
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1];
        imageConfig = {
          imageBytes: base64Data,
          mimeType: mimeType,
        };
      }

      setStatus('Creating cinematic sequences...');
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Strictly follow the provided image and the following prompt: "${prompt || 'A cinematic motion video based on the provided image'}". The output video must be exactly 5 seconds long and maintain high visual consistency with the input image.`,
        image: imageConfig,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio
        }
      });

      setStatus('Processing visual data (this may take a few minutes)...');

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setStatus('Rendering frames and textures...');
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (downloadLink) {
        setStatus('Finalizing video output...');
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.GEMINI_API_KEY || '',
          },
        });
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setStatus('Generation complete!');
      } else {
        throw new Error('Failed to retrieve video link');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      setStatus(`Error: ${error.message || 'Something went wrong'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden">
        <motion.div
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative w-full h-full"
        >
          <img 
            src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgQKGlUyHtK6aOthhsbdmM6DAEgVDWdJ8gEF5MpePdEUR5JQCxzR2fl9-0LcixHc2ZCmeSZK8Q9031PSsFIChDT8vy9OxhW6fKL4HOog15t_q8SZwmyeQL8-agjMv1EUG-Nw7i0Zf1bNboQBhAkVVLZ8KJxDPUxOtsfpPWYEeTGp3lv9FxPdMTWtDro1bU/s2778/15472.jpg" 
            alt="Splash Screen" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          <div className="absolute bottom-12 left-0 w-full text-center space-y-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-3"
            >
              <div className="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 overflow-hidden">
                <img 
                  src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiIddo8VSZa7d9W0n9JhMMSEXVhArh6LuYAqMzNvqZhyungEL7A-vxtPNblvEuNW9LfvdGjF1h4HLRchfinLaUaT9L9bNu-L29TZjksHnCqfP8yH_8V0sSwRaqM1m1yzzxzkQtjbPqLQSEnCwpNK7_Nc_189Xr8yFLeCbAnFf0xX7YeZFrl3r9sBIhVx4M/s500/15766.png" 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase tracking-widest">ALTOGEN</h1>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center justify-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-[0.3em]"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memuat Kreativitas</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-24 h-24 rounded-3xl bg-red-500/20 text-red-400 flex items-center justify-center animate-bounce">
          <Ban className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase tracking-widest">Akses Diblokir</h1>
        <p className="text-zinc-500 max-w-md text-sm">
          Akun Anda telah diblokir oleh admin karena melanggar ketentuan layanan. 
          Hubungi dukungan jika ini adalah kesalahan.
        </p>
        <button onClick={handleLogout} className="px-8 py-3 glass rounded-2xl font-bold text-sm hover:bg-white/10 transition-all">
          LOGOUT
        </button>
      </div>
    );
  }

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-24 h-24 rounded-3xl gradient-bg flex items-center justify-center animate-pulse">
          <Settings className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase tracking-widest">Maintenance Mode</h1>
        <p className="text-zinc-500 max-w-md text-sm">
          Aplikasi sedang dalam pemeliharaan rutin untuk meningkatkan kualitas layanan. 
          Silakan kembali beberapa saat lagi.
        </p>
        <div className="pt-8 flex gap-4">
          <a href={appSettings?.whatsappUrl} target="_blank" rel="noreferrer" className="p-4 glass rounded-2xl text-zinc-400 hover:text-white transition-colors">
            <MessageSquare className="w-6 h-6" />
          </a>
          <a href={appSettings?.telegramUrl} target="_blank" rel="noreferrer" className="p-4 glass rounded-2xl text-zinc-400 hover:text-white transition-colors">
            <Send className="w-6 h-6" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-3 sm:p-6 flex justify-between items-center border-b border-white/5 sticky top-0 bg-black/80 backdrop-blur-md z-40 lg:pl-32">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 gradient-bg rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden shrink-0">
            <img 
              src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiIddo8VSZa7d9W0n9JhMMSEXVhArh6LuYAqMzNvqZhyungEL7A-vxtPNblvEuNW9LfvdGjF1h4HLRchfinLaUaT9L9bNu-L29TZjksHnCqfP8yH_8V0sSwRaqM1m1yzzxzkQtjbPqLQSEnCwpNK7_Nc_189Xr8yFLeCbAnFf0xX7YeZFrl3r9sBIhVx4M/s500/15766.png" 
              alt="Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-lg sm:text-2xl font-black tracking-tighter truncate max-w-[120px] sm:max-w-none">ALTOGEN</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 glass rounded-full border border-white/10 shrink-0">
            <Coins className="w-3 h-3 sm:w-4 h-4 text-amber-400" />
            <span className="text-[10px] sm:text-sm font-bold text-zinc-300">Rp. {balance.toLocaleString('id-ID')}</span>
          </div>
          <button className="p-1.5 sm:p-2 hover:bg-white/5 rounded-full transition-colors hidden sm:block">
            <Layers className="w-5 h-5 text-zinc-400" />
          </button>
          <button className="p-1.5 sm:p-2 hover:bg-white/5 rounded-full transition-colors">
            <MonitorPlay className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 gradient-bg" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">
                    {authMode === 'login' ? 'SELAMAT DATANG' : 'BUAT AKUN'}
                  </h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    {authMode === 'login' ? 'Masuk ke akun ALTO Anda' : 'Daftar untuk akses penuh'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={authMode === 'login' ? handleEmailLogin : handleEmailRegister} className="space-y-4">
                {authMode === 'register' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Nama Lengkap</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                          type="text"
                          required
                          placeholder="Masukkan nama lengkap"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                          value={authFormData.fullName}
                          onChange={(e) => setAuthFormData({...authFormData, fullName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Nomor Ponsel</label>
                      <div className="relative">
                        <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                          type="tel"
                          required
                          placeholder="Contoh: 08123456789"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                          value={authFormData.phone}
                          onChange={(e) => setAuthFormData({...authFormData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">
                    {authMode === 'login' ? 'Email / Nomor Ponsel' : 'Alamat Email'}
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type={authMode === 'login' ? 'text' : 'email'}
                      required
                      placeholder={authMode === 'login' ? 'Masukkan email atau nomor ponsel' : 'Masukkan alamat email aktif'}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                      value={authFormData.email}
                      onChange={(e) => setAuthFormData({...authFormData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Password</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="password"
                      required
                      placeholder="Minimal 6 karakter"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                      value={authFormData.password}
                      onChange={(e) => setAuthFormData({...authFormData, password: e.target.value})}
                    />
                  </div>
                  {authMode === 'login' && (
                    <div className="flex justify-end px-2">
                      <button 
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
                      >
                        Lupa Password?
                      </button>
                    </div>
                  )}
                </div>

                {authMode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Kode Referral (Opsional)</label>
                    <div className="relative">
                      <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="text"
                        placeholder="Masukkan kode referral"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                        value={authFormData.referral}
                        onChange={(e) => setAuthFormData({...authFormData, referral: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 gradient-bg rounded-2xl font-bold text-sm tracking-widest hover:opacity-90 transition-all shadow-[0_10px_20px_rgba(129,140,248,0.3)]"
                >
                  {authMode === 'login' ? 'MASUK SEKARANG' : 'DAFTAR SEKARANG'}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600">
                  <span className="bg-black px-4">Atau</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-2 py-3 glass rounded-2xl text-xs font-bold hover:bg-white/5 transition-all"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                  GOOGLE
                </button>
                <button 
                  onClick={handleGuestLogin}
                  className="flex items-center justify-center gap-2 py-3 glass rounded-2xl text-xs font-bold hover:bg-white/5 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  GUEST
                </button>
              </div>

              <p className="text-center mt-8 text-xs text-zinc-500">
                {authMode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="ml-2 text-indigo-400 font-bold hover:underline"
                >
                  {authMode === 'login' ? 'Daftar di sini' : 'Masuk di sini'}
                </button>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col lg:flex-row p-4 sm:p-6 gap-6 overflow-hidden pb-28 sm:pb-24 lg:pb-6 lg:pl-32">
        <AnimatePresence mode="wait">
          {activeTab === 'Video' && (
            <motion.div 
              key="video"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col gap-6 w-full max-w-5xl mx-auto"
            >
              {/* Top Section: Preview */}
              <div className="flex-1 glass rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden relative flex items-center justify-center min-h-[250px] sm:min-h-[350px] lg:min-h-[450px]">
                <AnimatePresence mode="wait">
                  {videoUrl ? (
                    <motion.div 
                      key="video"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      className="w-full h-full flex flex-col"
                    >
                      <video 
                        src={videoUrl} 
                        controls 
                        autoPlay 
                        loop 
                        className="w-full h-full object-contain bg-black"
                      />
                      <div className="absolute top-6 right-6 flex gap-3">
                        <a 
                          href={videoUrl} 
                          download="altogen-video.mp4"
                          className="p-3 rounded-full gradient-bg shadow-xl hover:scale-110 transition-transform"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                      </div>
                    </motion.div>
                  ) : isGenerating ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-6 p-12 text-center"
                    >
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                        <Video className="w-8 h-8 absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold">Crafting your masterpiece</h2>
                        <p className="text-zinc-500 text-sm max-w-xs mx-auto">{status}</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-6 p-12 text-center opacity-40"
                    >
                      <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                        <Video className="w-12 h-12 text-zinc-500" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold">Ready for generation</h2>
                        <p className="text-zinc-500 text-sm">Upload an image or write a prompt to see the magic.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Section: Chat-like Form */}
              <div className="space-y-4">
                {/* Image Preview & Aspect Ratio Selection */}
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between px-2 gap-4">
                  <div className="flex gap-3">
                    {image && (
                      <div className="relative group">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-lg">
                          <img src={image} alt="Reference" className="w-full h-full object-cover" />
                        </div>
                        <button 
                          onClick={() => setImage(null)}
                          className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-2">Ratio:</span>
                    <select 
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as any)}
                      className="glass px-4 py-2 rounded-full text-[10px] sm:text-xs font-bold text-white outline-none cursor-pointer hover:bg-white/10 transition-colors appearance-none min-w-[100px] text-center"
                    >
                      <option value="16:9" className="bg-zinc-900">16:9</option>
                      <option value="9:16" className="bg-zinc-900">9:16</option>
                      <option value="1:1" className="bg-zinc-900">1:1</option>
                    </select>
                  </div>
                </div>

                {/* Input Bar */}
                <div className="glass rounded-[1.25rem] sm:rounded-[2rem] p-1 sm:p-2 flex items-center gap-1 sm:gap-2 shadow-2xl border border-white/5">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors group shrink-0"
                  >
                    <Plus className="w-4 h-4 sm:w-6 sm:h-6 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    className="hidden" 
                    accept="image/*" 
                  />
                  
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe motion..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-white text-xs sm:text-sm placeholder:text-zinc-600 py-2 px-1 resize-none h-9 sm:h-12 custom-scrollbar min-w-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isGenerating && (prompt || image)) generateVideo();
                      }
                    }}
                  />

                  <button 
                    onClick={generateVideo}
                    disabled={isGenerating || (!prompt && !image)}
                    className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all shrink-0
                      ${isGenerating || (!prompt && !image) 
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                        : 'gradient-bg text-white hover:scale-105 active:scale-95 shadow-lg'}`}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 italic text-center">
                  * AI akan mengikuti gambar dan prompt Anda secara ketat untuk hasil yang konsisten.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'Chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col w-full max-w-4xl mx-auto glass rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-white/5 flex items-center gap-3 sm:gap-4 bg-white/5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 gradient-bg rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">ALTO Interactive Chat</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">AI Assistant Online</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 rounded-2xl sm:rounded-3xl ${
                      msg.role === 'user' 
                        ? 'gradient-bg text-white rounded-tr-none' 
                        : 'glass text-zinc-200 rounded-tl-none'
                    }`}>
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Uploaded" 
                          className="w-full max-w-[200px] sm:max-w-[300px] rounded-xl mb-2 border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
                {isChatting && (
                  <div className="flex justify-start">
                    <div className="glass p-3 sm:p-4 rounded-2xl sm:rounded-3xl rounded-tl-none flex gap-1.5 sm:gap-2">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-6 border-t border-white/5 space-y-3">
                {chatFile && (
                  <div className="relative inline-block">
                    <img 
                      src={chatFile} 
                      alt="Preview" 
                      className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded-xl border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={() => setChatFile(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 sm:gap-4">
                  <input 
                    type="file"
                    ref={chatFileInputRef}
                    onChange={handleChatFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button 
                    onClick={() => chatFileInputRef.current?.click()}
                    className="p-2.5 sm:p-4 glass rounded-xl sm:rounded-2xl hover:bg-white/10 transition-all text-zinc-400 hover:text-white shrink-0"
                  >
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ketik pesan..."
                    className="flex-1 min-w-0 glass rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2.5 sm:py-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isChatting || (!chatInput.trim() && !chatFile)}
                    className="p-2.5 sm:p-4 gradient-bg rounded-xl sm:rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Bonus' && (
            <motion.div 
              key="bonus"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col w-full max-w-4xl mx-auto gap-6 overflow-y-auto custom-scrollbar"
            >
              {/* Balance Card */}
              <div className="glass rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 card-3d overflow-hidden relative group">
                <div className="absolute -right-10 -top-10 w-40 h-40 gradient-bg opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity" />
                <div className="space-y-1 relative z-10 text-center md:text-left">
                  <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest font-bold">Total Saldo Anda</p>
                  <h2 className="text-3xl sm:text-5xl font-black tracking-tighter flex items-center justify-center md:justify-start gap-2 sm:gap-4">
                    <span className="text-amber-400">Rp.</span>
                    {balance.toLocaleString('id-ID')}
                  </h2>
                </div>
                <div className="flex gap-2 sm:gap-3 relative z-10 w-full md:w-auto">
                  <div className="flex-1 md:flex-none p-2 sm:p-4 glass rounded-xl sm:rounded-2xl flex flex-col items-center gap-1 min-w-[70px] sm:min-w-[100px]">
                    <UserPlus className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-400" />
                    <span className="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase">Invites</span>
                    <span className="text-sm sm:text-lg font-black">{inviteCount}</span>
                  </div>
                  <div className="flex-1 md:flex-none p-2 sm:p-4 glass rounded-xl sm:rounded-2xl flex flex-col items-center gap-1 min-w-[70px] sm:min-w-[100px]">
                    <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
                    <span className="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase">Target</span>
                    <span className="text-sm sm:text-lg font-black">50</span>
                  </div>
                </div>
              </div>

              {/* VIP Progress */}
              <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 sm:space-y-6 card-3d">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
                      <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                      Target VIP 1
                    </h3>
                    <p className="text-[10px] sm:text-xs text-zinc-500">Undang 50 teman untuk mendapatkan Paket VIP 1 (7 Hari)</p>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-indigo-400">{Math.min(100, Math.round((inviteCount / 50) * 100))}%</span>
                </div>
                <div className="h-2 sm:h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full gradient-bg"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (inviteCount / 50) * 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between text-[8px] sm:text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  <span>{inviteCount} Teman</span>
                  <span>50 Teman</span>
                </div>
              </div>

              {/* Tasks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Check-in */}
                <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-5 sm:gap-6 card-3d group">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${hasCheckedIn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                      <CalendarCheck className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base sm:text-lg">Check-in Harian</h4>
                      <p className="text-[10px] sm:text-xs text-zinc-500">Dapatkan Rp. 50 setiap hari</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleCheckIn}
                    disabled={hasCheckedIn}
                    className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
                      hasCheckedIn 
                        ? 'bg-emerald-500/10 text-emerald-400 cursor-not-allowed' 
                        : 'glass hover:bg-white/10 text-white'
                    }`}
                  >
                    {hasCheckedIn ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>SUDAH CHECK-IN</span>
                      </>
                    ) : (
                      <>
                        <span>CHECK-IN SEKARANG</span>
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>

                {/* Visit Sponsor */}
                <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-5 sm:gap-6 card-3d group">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${hasVisitedSponsor ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      <Link2 className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base sm:text-lg">Kunjungi Sponsor</h4>
                      <p className="text-[10px] sm:text-xs text-zinc-500">Dapatkan Rp. 100 per kunjungan ({sponsorVisitCount}/20)</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleVisitSponsor}
                    disabled={hasVisitedSponsor}
                    className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
                      hasVisitedSponsor 
                        ? 'bg-emerald-500/10 text-emerald-400 cursor-not-allowed' 
                        : 'glass hover:bg-white/10 text-white'
                    }`}
                  >
                    {hasVisitedSponsor ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>LIMIT HARIAN TERCAPAI</span>
                      </>
                    ) : (
                      <>
                        <span>KUNJUNGI SPONSOR ({sponsorVisitCount}/20)</span>
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>

                {/* Invite Friend */}
                <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-5 sm:gap-6 card-3d group md:col-span-2">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <UserPlus className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base sm:text-lg">Undang Teman</h4>
                      <p className="text-[10px] sm:text-xs text-zinc-500">Dapatkan Rp. 500 per teman</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[8px] sm:text-xs text-zinc-500 uppercase font-bold">Reward</p>
                      <p className="text-lg sm:text-xl font-black text-amber-400">Rp. 500</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 glass rounded-xl sm:rounded-2xl p-3 sm:p-4 text-xs sm:text-sm text-zinc-400 flex items-center justify-between overflow-hidden">
                      <span className="truncate mr-2">https://altogen.ai/ref/user_alto_123</span>
                      <button className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors shrink-0">COPY</button>
                    </div>
                    <button 
                      onClick={handleInviteFriend}
                      className="px-6 sm:px-8 py-3 sm:py-4 gradient-bg rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>SHARE LINK</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col w-full max-w-6xl mx-auto gap-6 overflow-y-auto custom-scrollbar pb-20 lg:pb-0"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black tracking-tighter">Panel Admin</h2>
                  <p className="text-zinc-500 text-sm">Kelola seluruh aspek aplikasi ALTO.</p>
                </div>
                
                <div className="flex items-center gap-1.5 sm:gap-2 p-1 glass rounded-2xl self-start overflow-x-auto max-w-full">
                  {adminTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAdminSubTab(tab.id as any)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                        adminSubTab === tab.id 
                          ? 'gradient-bg text-white shadow-lg' 
                          : 'text-zinc-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5 sm:w-4 h-4" />
                      <span className="inline">{tab.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaksi Tab */}
              {adminSubTab === 'Transaksi' && (
                <div className="glass rounded-[2rem] overflow-hidden border border-white/5">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-lg">Konfirmasi Pembayaran</h3>
                    <button onClick={fetchTransactions} className="p-2 glass rounded-lg hover:bg-white/10 transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                          <th className="p-6">Waktu</th>
                          <th className="p-6">Paket</th>
                          <th className="p-6">Metode</th>
                          <th className="p-6">Pengirim</th>
                          <th className="p-6">Status</th>
                          <th className="p-6 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-zinc-600 italic">Belum ada transaksi.</td>
                          </tr>
                        ) : (
                          transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="p-6">
                                <div className="text-xs text-white font-medium">{new Date(tx.createdAt).toLocaleDateString('id-ID')}</div>
                                <div className="text-[10px] text-zinc-500">{new Date(tx.createdAt).toLocaleTimeString('id-ID')}</div>
                              </td>
                              <td className="p-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                    <Crown className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-white">{tx.packageName}</div>
                                    <div className="text-[10px] text-amber-400">Rp. {tx.price.toLocaleString('id-ID')}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-6">
                                <div className="flex items-center gap-2">
                                  {tx.paymentMethod === 'dana' && <Wallet className="w-3 h-3 text-emerald-400" />}
                                  {tx.paymentMethod === 'bank' && <Building2 className="w-3 h-3 text-indigo-400" />}
                                  {tx.paymentMethod === 'qris' && <QrCode className="w-3 h-3 text-purple-400" />}
                                  <span className="text-[10px] font-bold uppercase text-zinc-400">{tx.paymentMethod}</span>
                                </div>
                              </td>
                              <td className="p-6">
                                <div className="text-xs font-medium text-white">{tx.ownerName}</div>
                                <div className="text-[10px] text-zinc-500">{tx.senderBank} • {tx.accountNumber}</div>
                              </td>
                              <td className="p-6">
                                <span className={`px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                                  tx.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                  tx.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="p-6 text-right">
                                {tx.status === 'pending' && (
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => handleUpdateStatus(tx.id, 'confirmed', tx.userId, tx.duration)}
                                      className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateStatus(tx.id, 'rejected', tx.userId, tx.duration)}
                                      className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* User Tab */}
              {adminSubTab === 'User' && (
                <div className="glass rounded-[2rem] overflow-hidden border border-white/5">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-lg">Kelola Pengguna</h3>
                    <div className="flex items-center gap-2">
                      <div className="glass rounded-xl px-3 py-1 flex items-center gap-2">
                        <Search className="w-3 h-3 text-zinc-500" />
                        <input 
                          type="text" 
                          placeholder="Cari user..." 
                          className="bg-transparent border-none outline-none text-xs w-32"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                        />
                      </div>
                      <button onClick={fetchUsers} className="p-2 glass rounded-lg hover:bg-white/10 transition-colors">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                          <th className="p-6">User</th>
                          <th className="p-6">Saldo</th>
                          <th className="p-6">Paket</th>
                          <th className="p-6">Status</th>
                          <th className="p-6 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {usersList
                          .filter(u => 
                            u.fullName?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                            u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.uid?.toLowerCase().includes(userSearchQuery.toLowerCase())
                          )
                          .map((u) => (
                          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                                  {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-zinc-600" />}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white">{u.fullName || 'User ALTO'}</div>
                                  <div className="text-[10px] text-zinc-500">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="text-xs font-bold text-amber-400">Rp. {(u.balance || 0).toLocaleString('id-ID')}</div>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${u.subscription?.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-500'}`}>
                                  {u.subscription?.isActive ? u.subscription.plan : 'FREE'}
                                </span>
                                {u.subscription?.isActive && (
                                  <div className="text-[8px] text-zinc-500">Exp: {new Date(u.subscription.expiryDate).toLocaleDateString()}</div>
                                )}
                              </div>
                            </td>
                            <td className="p-6">
                              <span className={`px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${u.isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {u.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                              </span>
                            </td>
                            <td className="p-6 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setEditingUser(u)}
                                  className="w-8 h-8 rounded-lg glass text-zinc-400 flex items-center justify-center hover:text-white transition-all"
                                  title="Edit User"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleUpdateUser(u.id, { isBlocked: !u.isBlocked })}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${u.isBlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
                                  title={u.isBlocked ? 'Unblock User' : 'Block User'}
                                >
                                  {u.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                  title="Hapus User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {adminSubTab === 'Settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Link2 className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg">URL Management</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">WhatsApp URL</label>
                        <input 
                          type="text" 
                          value={appSettings?.whatsappUrl || ''} 
                          onChange={(e) => setAppSettings((prev: any) => ({ ...prev, whatsappUrl: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Telegram URL</label>
                        <input 
                          type="text" 
                          value={appSettings?.telegramUrl || ''} 
                          onChange={(e) => setAppSettings((prev: any) => ({ ...prev, telegramUrl: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sponsor URL</label>
                        <input 
                          type="text" 
                          value={appSettings?.sponsorUrl || ''} 
                          onChange={(e) => setAppSettings((prev: any) => ({ ...prev, sponsorUrl: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUpdateSettings({ 
                        whatsappUrl: appSettings?.whatsappUrl,
                        telegramUrl: appSettings?.telegramUrl,
                        sponsorUrl: appSettings?.sponsorUrl
                      })}
                      className="w-full py-4 gradient-bg rounded-2xl font-bold text-sm tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      SIMPAN PERUBAHAN
                    </button>
                  </div>

                  <div className="glass rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg">API Key Management</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gemini API Key</label>
                        <div className="relative">
                          <input 
                            type="password" 
                            value={appSettings?.geminiApiKey || ''} 
                            onChange={(e) => setAppSettings((prev: any) => ({ ...prev, geminiApiKey: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all pr-12"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600">
                            <Shield className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic">Key ini digunakan untuk layanan Chat & Image Generation.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUpdateSettings({ geminiApiKey: appSettings?.geminiApiKey })}
                      className="w-full py-4 glass hover:bg-white/10 rounded-2xl font-bold text-sm tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      SIMPAN API KEY
                    </button>
                  </div>
                </div>
              )}

              {/* Rekening Tab */}
              {adminSubTab === 'Rekening' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Dana */}
                  <div className="glass rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg">DANA</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nama Pemilik</label>
                        <input 
                          type="text" 
                          value={appSettings?.dana?.name || ''} 
                          onChange={(e) => setAppSettings((prev: any) => ({ ...prev, dana: { ...prev?.dana, name: e.target.value } }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nomor Dana</label>
                        <input 
                          type="text" 
                          value={appSettings?.dana?.number || ''} 
                          onChange={(e) => setAppSettings((prev: any) => ({ ...prev, dana: { ...prev?.dana, number: e.target.value } }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bank */}
                  <div className="glass rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg">BANK</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nama Bank</label>
                        <input 
                          type="text" 
                          value={appSettings?.bank?.bankName || ''} 
                          onChange={(e) => setAppSettings((prev: any) => ({ ...prev, bank: { ...prev?.bank, bankName: e.target.value } }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nama Pemilik</label>
                        <input 
                          type="text" 
                          value={appSettings?.bank?.name || ''} 
                          onChange={(e) => setAppSettings((prev: any) => ({ ...prev, bank: { ...prev?.bank, name: e.target.value } }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nomor Rekening</label>
                        <input 
                          type="text" 
                          value={appSettings?.bank?.number || ''} 
                          onChange={(e) => setAppSettings((prev: any) => ({ ...prev, bank: { ...prev?.bank, number: e.target.value } }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* QRIS */}
                  <div className="glass rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg">QRIS</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">URL Gambar QRIS</label>
                        <input 
                          type="text" 
                          value={appSettings?.qrisUrl || ''} 
                          onChange={(e) => setAppSettings((prev: any) => ({ ...prev, qrisUrl: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                        />
                      </div>
                      {appSettings?.qrisUrl && (
                        <div className="w-full aspect-square glass rounded-xl overflow-hidden">
                          <img src={appSettings.qrisUrl} alt="QRIS" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <button 
                      onClick={() => handleUpdateSettings({ 
                        dana: appSettings?.dana,
                        bank: appSettings?.bank,
                        qrisUrl: appSettings?.qrisUrl
                      })}
                      className="w-full py-4 gradient-bg rounded-2xl font-bold text-sm tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      SIMPAN SEMUA REKENING
                    </button>
                  </div>
                </div>
              )}

              {/* Aplikasi Tab */}
              {adminSubTab === 'Aplikasi' && (
                <div className="max-w-2xl mx-auto w-full">
                  <div className="glass rounded-[2rem] p-8 space-y-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${appSettings?.isMaintenance ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Status Aplikasi</h3>
                        <p className="text-zinc-500 text-sm">Aktifkan mode maintenance untuk membatasi akses user.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-6 glass rounded-2xl border border-white/5">
                      <div className="space-y-1">
                        <p className="font-bold">Maintenance Mode</p>
                        <p className="text-xs text-zinc-500">User non-admin tidak akan bisa menggunakan aplikasi.</p>
                      </div>
                      <button 
                        onClick={() => handleUpdateSettings({ isMaintenance: !appSettings.isMaintenance })}
                        className={`w-14 h-8 rounded-full relative transition-all ${appSettings?.isMaintenance ? 'bg-amber-500' : 'bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${appSettings?.isMaintenance ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="p-6 glass rounded-2xl border border-white/5 space-y-4">
                      <h4 className="font-bold text-sm">Informasi Sistem</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Users</p>
                          <p className="text-xl font-black">{usersList.length}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Transaksi</p>
                          <p className="text-xl font-black">{transactions.length}</p>
                        </div>
                      </div>
                      <button 
                        onClick={syncPhoneMappings}
                        disabled={isSubmitting}
                        className="w-full py-3 glass hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all mt-4 disabled:opacity-50"
                      >
                        {isSubmitting ? 'SINKRONISASI...' : 'SINKRONISASI NOMOR PONSEL'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
          {activeTab === 'Profil' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col w-full max-w-4xl mx-auto gap-6 overflow-y-auto custom-scrollbar"
            >
              {/* Profile Header */}
              <div className="glass rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8 card-3d">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full gradient-bg p-1">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-700" />
                    )}
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-bold">{userData?.fullName || user?.displayName || 'User ALTO'}</h2>
                  <p className="text-sm text-zinc-500">{user?.email || 'Belum Login'}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-3 pt-2">
                    {user && !user.isAnonymous ? (
                      <>
                        <span className={`px-3 py-1 glass rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${userData?.subscription?.isActive ? 'text-indigo-400' : 'text-zinc-500'}`}>
                          {userData?.subscription?.isActive ? `${userData.subscription.plan} Member` : 'Free Member'}
                        </span>
                        {userData?.subscription?.isActive && (
                          <span className="px-3 py-1 glass rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                            Exp: {new Date(userData.subscription.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                        {isAdmin && (
                          <span className="px-3 py-1 glass rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-amber-400">Admin</span>
                        )}
                      </>
                    ) : (
                      <button 
                        onClick={() => {
                          setAuthMode('login');
                          setShowAuthModal(true);
                        }}
                        className="px-6 py-2 gradient-bg rounded-full text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                      >
                        LOGIN / REGISTER
                      </button>
                    )}
                  </div>
                </div>
                {user && !user.isAnonymous && (
                  <button 
                    onClick={handleLogout}
                    className="p-3 sm:p-4 glass rounded-xl sm:rounded-2xl hover:bg-red-500/10 hover:text-red-400 transition-all group"
                  >
                    <LogOut className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>

              {/* Referral Code */}
              {user && !user.isAnonymous && userData?.referralCode && (
                <div className="glass rounded-2xl p-6 flex items-center justify-between gap-4 card-3d">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Kode Referral</p>
                      <p className="text-xl font-black tracking-tighter">{userData.referralCode}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(userData.referralCode);
                      showAlert('Kode referral berhasil disalin!');
                    }}
                    className="p-3 glass rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-bold"
                  >
                    <Link2 className="w-4 h-4" />
                    SALIN
                  </button>
                </div>
              )}

              {/* Community Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <a 
                  href={appSettings?.whatsappUrl || 'https://wa.me/yourgroup'} 
                  target="_blank"
                  rel="noreferrer"
                  className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex items-center gap-4 sm:gap-6 hover:bg-white/5 transition-all card-3d group"
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base sm:text-lg">WhatsApp Group</h3>
                    <p className="text-[10px] sm:text-xs text-zinc-500">Join our creative community</p>
                  </div>
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700 group-hover:text-white transition-colors shrink-0" />
                </a>
                <a 
                  href={appSettings?.telegramUrl || 'https://t.me/yourgroup'} 
                  target="_blank"
                  rel="noreferrer"
                  className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex items-center gap-4 sm:gap-6 hover:bg-white/5 transition-all card-3d group"
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                    <Send className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base sm:text-lg">Telegram Group</h3>
                    <p className="text-[10px] sm:text-xs text-zinc-500">Get latest AI updates</p>
                  </div>
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700 group-hover:text-white transition-colors shrink-0" />
                </a>
              </div>

              {/* Info Sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 sm:space-y-4 card-3d">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Info className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl">About ALTO</h3>
                  <p className="text-[10px] sm:text-xs text-zinc-500 leading-relaxed">
                    ALTO adalah platform AI generasi terbaru yang dirancang untuk membantu kreator mewujudkan visi visual mereka melalui teknologi video generatif tercanggih.
                  </p>
                </div>
                <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 sm:space-y-4 card-3d">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl">Disclaimer</h3>
                  <p className="text-[10px] sm:text-xs text-zinc-500 leading-relaxed">
                    Konten yang dihasilkan oleh AI adalah representasi digital. Pengguna bertanggung jawab penuh atas penggunaan dan distribusi konten yang dibuat.
                  </p>
                </div>
                <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 sm:space-y-4 card-3d">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl">Privacy</h3>
                  <p className="text-[10px] sm:text-xs text-zinc-500 leading-relaxed">
                    Kami menghargai privasi Anda. Data Anda dienkripsi dan tidak akan pernah dibagikan kepada pihak ketiga tanpa persetujuan eksplisit Anda.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Paket' && (
            <motion.div 
              key="paket"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col w-full max-w-4xl mx-auto gap-6 overflow-y-auto custom-scrollbar pb-20 lg:pb-0"
            >
              <div className="text-center space-y-2 mb-4">
                <h2 className="text-3xl font-black tracking-tighter">Pilih Paket VIP Anda</h2>
                <p className="text-zinc-500 text-sm">Tingkatkan pengalaman kreatif Anda dengan fitur premium.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PACKAGES.map((pkg) => (
                  <div key={pkg.id} className="glass rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 flex flex-col gap-5 sm:gap-6 card-3d group relative overflow-hidden">
                    <div className={`absolute -right-10 -top-10 w-32 h-32 ${pkg.bg} opacity-20 rounded-full blur-3xl group-hover:opacity-40 transition-opacity`} />
                    
                    <div className="space-y-3 sm:space-y-4 relative z-10">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${pkg.bg} ${pkg.color} flex items-center justify-center`}>
                        <pkg.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight">{pkg.name}</h3>
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">
                          <Clock className="w-3 h-3" />
                          {pkg.duration}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 relative z-10">
                      <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed min-h-[2.5rem] sm:min-h-[3rem]">
                        {pkg.description}
                      </p>
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Harga</p>
                        <p className="text-2xl sm:text-3xl font-black text-white">
                          <span className="text-xs sm:text-sm font-bold text-amber-400 mr-1">Rp.</span>
                          {pkg.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setShowCheckout(true);
                      }}
                      className="w-full py-3.5 sm:py-4 gradient-bg rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm tracking-widest hover:opacity-90 transition-all relative z-10"
                    >
                      BELI SEKARANG
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && selectedPackage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCheckout(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 relative z-10 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <button 
                onClick={() => setShowCheckout(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>

              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black tracking-tighter">Halaman Transaksi</h3>
                  <p className="text-zinc-500 text-sm">Selesaikan pembayaran untuk mengaktifkan paket.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left: Package Info & Payment Method */}
                  <div className="space-y-6">
                    <div className="glass rounded-3xl p-6 space-y-4 border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl ${selectedPackage.bg} ${selectedPackage.color} flex items-center justify-center`}>
                          <selectedPackage.icon className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{selectedPackage.name}</h4>
                          <p className="text-xs text-zinc-500">{selectedPackage.duration} Akses Premium</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Bayar</p>
                        <p className="text-3xl font-black text-white">
                          <span className="text-sm font-bold text-amber-400 mr-1">Rp.</span>
                          {selectedPackage.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Metode Pembayaran</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'dana', label: 'DANA', icon: Wallet, color: 'text-emerald-400' },
                          { id: 'bank', label: 'BANK', icon: Building2, color: 'text-indigo-400' },
                          { id: 'qris', label: 'QRIS', icon: QrCode, color: 'text-purple-400' }
                        ].map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id as any)}
                            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                              paymentMethod === method.id 
                                ? 'bg-white/10 border-white/20' 
                                : 'bg-transparent border-white/5 hover:border-white/10'
                            }`}
                          >
                            <method.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${method.id === paymentMethod ? method.color : 'text-zinc-500'}`} />
                            <span className={`text-[9px] sm:text-[10px] font-bold ${method.id === paymentMethod ? 'text-white' : 'text-zinc-500'}`}>{method.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Admin Payment Info */}
                    <div className="glass rounded-2xl p-5 border border-white/5 bg-white/[0.02]">
                      {paymentMethod === 'dana' && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">DANA Admin</p>
                          <p className="text-lg font-black tracking-tight">0812-3456-7890</p>
                          <p className="text-xs text-zinc-500">A/N: ALTOGEN ADMIN</p>
                        </div>
                      )}
                      {paymentMethod === 'bank' && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">BANK BCA Admin</p>
                          <p className="text-lg font-black tracking-tight">123-456-7890</p>
                          <p className="text-xs text-zinc-500">A/N: PT ALTOGEN LABS INDONESIA</p>
                        </div>
                      )}
                      {paymentMethod === 'qris' && (
                        <div className="space-y-3 flex flex-col items-center text-center">
                          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">QRIS Pembayaran</p>
                          <div className="w-32 h-32 bg-white rounded-xl p-2">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ALTOGEN_PAYMENT" alt="QRIS" className="w-full h-full" />
                          </div>
                          <p className="text-[10px] text-zinc-500">Scan QR di atas menggunakan aplikasi pembayaran Anda</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Sender Form */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Data Pengirim</p>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Nama Bank / E-Wallet</label>
                          <input 
                            type="text" 
                            placeholder="Contoh: BCA, DANA, Mandiri"
                            value={formData.senderBank}
                            onChange={(e) => setFormData({...formData, senderBank: e.target.value})}
                            className="w-full glass rounded-xl p-4 text-sm outline-none border border-white/5 focus:border-indigo-500/50 transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Nama Pemilik Rekening</label>
                          <input 
                            type="text" 
                            placeholder="Sesuai buku tabungan / aplikasi"
                            value={formData.ownerName}
                            onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                            className="w-full glass rounded-xl p-4 text-sm outline-none border border-white/5 focus:border-indigo-500/50 transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Nomor Rekening / HP</label>
                          <input 
                            type="text" 
                            placeholder="Masukkan nomor pengirim"
                            value={formData.accountNumber}
                            onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                            className="w-full glass rounded-xl p-4 text-sm outline-none border border-white/5 focus:border-indigo-500/50 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <button 
                        onClick={handleSubmitTransaction}
                        disabled={isSubmitting}
                        className="w-full py-5 gradient-bg rounded-2xl font-bold text-sm tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        KONFIRMASI PEMBAYARAN
                      </button>
                      <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest font-bold">
                        Admin akan memverifikasi dalam 5-30 menit
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer / Stats */}
      <footer className="p-4 px-8 border-t border-white/5 hidden sm:flex justify-between items-center text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-20 lg:mb-0 lg:pl-32">
        <div className="flex gap-6">
          <span>VEO 3.1 ENGINE</span>
          <span>720P RESOLUTION</span>
          <span>{aspectRatio} ASPECT RATIO</span>
        </div>
        <div>
          © 2026 ALTOGEN LABS
        </div>
      </footer>

      {/* Bottom Navigation Bar (Floating) */}
      <nav className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[95%] sm:w-[90%] max-w-md flex justify-around items-center z-50 lg:hidden bg-black/20 backdrop-blur-lg rounded-3xl p-2 border border-white/5">
        {[
          { name: 'Chat', icon: MessageSquare },
          { name: 'Bonus', icon: Gift },
          { name: 'Video', icon: Video },
          { name: 'Paket', icon: CreditCard },
          { name: 'Profil', icon: UserIcon },
          isAdmin && { name: 'Admin', icon: Settings },
        ].filter(Boolean).map((item: any) => (
          <button
            key={item.name}
            onClick={() => handleTabChange(item.name)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${
              activeTab === item.name 
                ? 'text-indigo-400 scale-110 sm:scale-125 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${activeTab === item.name ? 'animate-pulse' : ''}`} />
            <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
          </button>
        ))}
      </nav>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass rounded-[2.5rem] p-8 border border-white/10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 gradient-bg" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Edit2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase">Edit User</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{editingUser.email}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nama Lengkap</label>
                    <input 
                      type="text" 
                      value={editUserForm.fullName}
                      onChange={(e) => setEditUserForm({...editUserForm, fullName: e.target.value})}
                      className="w-full glass rounded-xl p-4 text-sm outline-none border border-white/5 focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nomor Ponsel</label>
                    <input 
                      type="text" 
                      value={editUserForm.phone}
                      onChange={(e) => setEditUserForm({...editUserForm, phone: e.target.value})}
                      className="w-full glass rounded-xl p-4 text-sm outline-none border border-white/5 focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Saldo (Rp)</label>
                  <input 
                    type="number" 
                    value={editUserForm.balance}
                    onChange={(e) => setEditUserForm({...editUserForm, balance: parseInt(e.target.value) || 0})}
                    className="w-full glass rounded-xl p-4 text-sm outline-none border border-white/5 focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                <div className="space-y-4 p-6 glass rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status VIP</label>
                    <button 
                      onClick={() => setEditUserForm({
                        ...editUserForm, 
                        subscription: { ...editUserForm.subscription, isActive: !editUserForm.subscription.isActive }
                      })}
                      className={`w-12 h-6 rounded-full relative transition-all ${editUserForm.subscription.isActive ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editUserForm.subscription.isActive ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {editUserForm.subscription.isActive && (
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Paket</label>
                        <select 
                          value={editUserForm.subscription.plan}
                          onChange={(e) => setEditUserForm({
                            ...editUserForm, 
                            subscription: { ...editUserForm.subscription, plan: e.target.value }
                          })}
                          className="w-full glass rounded-xl p-4 text-sm outline-none border border-white/5 focus:border-indigo-500/50 transition-colors appearance-none"
                        >
                          <option value="VIP 1" className="bg-zinc-900">VIP 1</option>
                          <option value="VIP 2" className="bg-zinc-900">VIP 2</option>
                          <option value="VIP 3" className="bg-zinc-900">VIP 3</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tanggal Kadaluarsa</label>
                        <input 
                          type="date" 
                          value={editUserForm.subscription.expiryDate ? editUserForm.subscription.expiryDate.split('T')[0] : ''}
                          onChange={(e) => setEditUserForm({
                            ...editUserForm, 
                            subscription: { ...editUserForm.subscription, expiryDate: new Date(e.target.value).toISOString() }
                          })}
                          className="w-full glass rounded-xl p-4 text-sm outline-none border border-white/5 focus:border-indigo-500/50 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="py-4 glass rounded-2xl font-bold text-sm tracking-widest hover:bg-white/5 transition-all"
                >
                  BATAL
                </button>
                <button 
                  onClick={handleSaveUserEdit}
                  className="py-4 gradient-bg rounded-2xl font-bold text-sm tracking-widest hover:opacity-90 transition-all shadow-[0_10px_20px_rgba(129,140,248,0.3)]"
                >
                  SIMPAN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert Modal */}
      <AnimatePresence>
        {customAlert && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomAlert(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass rounded-[2.5rem] p-8 border border-white/10 overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1 gradient-bg" />
              
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase">
                    {customAlert.title || 'NOTIFIKASI'}
                  </h2>
                </div>
              </div>

              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                {customAlert.message}
              </p>

              <button 
                onClick={() => setCustomAlert(null)}
                className="w-full py-4 gradient-bg rounded-2xl font-bold text-sm tracking-widest hover:opacity-90 transition-all shadow-[0_10px_20px_rgba(129,140,248,0.3)]"
              >
                MENGERTI
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirm Modal */}
      <AnimatePresence>
        {customConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomConfirm(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass rounded-[2.5rem] p-8 border border-white/10 overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
              
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase">
                    {customConfirm.title || 'KONFIRMASI'}
                  </h2>
                </div>
              </div>

              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                {customConfirm.message}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setCustomConfirm(null)}
                  className="py-4 glass rounded-2xl font-bold text-sm tracking-widest hover:bg-white/5 transition-all"
                >
                  BATAL
                </button>
                <button 
                  onClick={() => {
                    customConfirm.onConfirm();
                    setCustomConfirm(null);
                  }}
                  className="py-4 bg-red-500 rounded-2xl font-bold text-sm tracking-widest hover:bg-red-600 transition-all shadow-[0_10px_20px_rgba(239,68,68,0.3)]"
                >
                  YA, LANJUT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar Navigation (Floating) */}
      <div className="hidden lg:flex fixed left-10 top-1/2 -translate-y-1/2 flex-col gap-10 z-50 bg-transparent border-none">
        {[
          { name: 'Chat', icon: MessageSquare },
          { name: 'Bonus', icon: Gift },
          { name: 'Video', icon: Video },
          { name: 'Paket', icon: CreditCard },
          { name: 'Profil', icon: UserIcon },
          isAdmin && { name: 'Admin', icon: Settings },
        ].filter(Boolean).map((item: any) => (
          <button
            key={item.name}
            onClick={() => handleTabChange(item.name)}
            className={`group relative flex items-center justify-center transition-all duration-300 ${
              activeTab === item.name 
                ? 'text-indigo-400 scale-125 drop-shadow-[0_0_15px_rgba(129,140,248,0.6)]' 
                : 'text-zinc-600 hover:text-zinc-300'
            }`}
          >
            <item.icon className="w-7 h-7" />
            <span className="absolute left-full ml-6 px-3 py-1 glass rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
