import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cake, 
  Users, 
  CheckCircle, 
  Search, 
  QrCode, 
  Plus, 
  LogOut, 
  Settings,
  Calendar,
  MapPin,
  Baby,
  Instagram,
  Facebook,
  Youtube,
  Mail,
  Phone,
  X,
  MessageCircle,
  Sparkles,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';

const EVENT_DATE = new Date('2026-07-05T16:00:00');

const LOCAL_SESSION_PATH = '/api/sessions/cbf35a2c-52bb-463d-8d38-38487ed8c824/messages/send-text';
const SESSION_URL = import.meta.env.VITE_OPENWA_URL || LOCAL_SESSION_PATH;

const OPENWA_API_KEY = import.meta.env.VITE_OPENWA_API_KEY || 'owa_k1_1df2f9608590d79647db52e85b15ff4a774daabb3de6f52736ca5b7cf1a1e3e5';

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('57') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.length === 10) {
    cleaned = '57' + cleaned;
  }
  return cleaned;
}

function buildChatId(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  return `${normalized}@c.us`;
}

function buildConfirmationMessage(name: string): string {
  return `🎉 *¡Asistencia Confirmada!* 👶🍼

Hola *${name}*, hemos registrado con éxito tu asistencia para el cumpleaños de nuestra bebé Ashly Sofía 🎂✨

📅 *Fecha:* Domingo, 5 de Julio
⏰ *Hora:* 3:00 PM
📍 *Lugar:* Salon de evento el milagroso - Calle 17 # 10 A 58 

💖 ¡Estamos felices de compartir este momento contigo!`;
}

async function sendWhatsAppMessage(chatId: string, text: string): Promise<boolean> {
  const requestHeaders = { 
    'Content-Type': 'application/json',
    'x-api-key': OPENWA_API_KEY
  };

  console.log("🚀 Disparando mensaje directo a Ngrok...");

  try {
    const response = await fetch(SESSION_URL, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({ chatId, text }),
    });
    
    console.log("🛡️ Estatus de respuesta OpenWA:", response.status);
    return response.ok;
  } catch (error) {
    console.error("❌ El túnel bloqueó la petición:", error);
    return false;
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// Types
interface Config {
  totalSpots: number;
  eventName: string;
  eventDate: string;
  registrationOpen: boolean;
}

interface Guest {
  id: string;
  name: string;
  whatsapp: string;
  companions: number;
  checkedIn: boolean;
  registeredAt: any;
  verificationCode: string;
}

export default function App() {
  const [view, setView] = useState<'home' | 'admin'>('home');
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check if user is admin
        const adminDoc = await getDoc(doc(db, 'admins', u.uid));
        const isDefaultAdmin = u.email === 'untalkeiler@gmail.com';
        
        if (adminDoc.exists() || isDefaultAdmin) {
          setIsAdmin(true);
          // If they are default admin but no doc exists, create it for persistence
          if (isDefaultAdmin && !adminDoc.exists()) {
            try {
              await setDoc(doc(db, 'admins', u.uid), { email: u.email });
            } catch (e) {
              console.error("Could not bootstrap admin doc", e);
            }
          }
        } else {
          // If no admins exist, create the first one (bootstrap)
          const adminsSnapshot = await getDocs(collection(db, 'admins'));
          if (adminsSnapshot.empty) {
            await setDoc(doc(db, 'admins', u.uid), { email: u.email });
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
    });

    // Config Listener
    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'general'), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data() as Config);
      } else {
        // Default config if not exists
        setConfig({
          totalSpots: 50,
          eventName: "Mi Primer Cumpleaños Ashly Sofia Vanegas Silva",
          eventDate: "2024-06-15",
          registrationOpen: true
        });
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeConfig();
    };
  }, []);

  // Guests Listener (Only for admins)
  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, 'guests'), orderBy('registeredAt', 'desc'));
      const unsubscribeGuests = onSnapshot(q, (snapshot) => {
        const guestsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Guest));
        setGuests(guestsList);
      });
      return () => unsubscribeGuests();
    }
  }, [isAdmin]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Baby size={48} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Fixed background layer for parallax effect on mobile */}
      <div className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'linear-gradient(rgba(0,0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(/fotoashly.webp)' }} />
      
      <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="w-full border-b border-white/10">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-4 py-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="bg-primary p-2 rounded-full text-white shadow-lg shadow-primary/20">
            <Cake size={24} />
          </div>
          <span className="font-serif font-bold text-xl tracking-tight hidden sm:block text-white drop-shadow-sm">Fiesta Mágica</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView(view === 'home' ? 'admin' : 'home')}
            className="text-sm font-bold text-white/90 hover:text-white transition-colors uppercase tracking-widest"
          >
            {view === 'home' ? 'Administrar' : 'Ir al Registro'}
          </button>
          
          {user ? (
            <div className="flex items-center gap-2 bg-white/10 p-1 pr-2 rounded-full backdrop-blur-sm">
              <img src={user.photoURL || ''} alt="avatar" className="w-8 h-8 rounded-full border border-white/20" />
              <button onClick={handleLogout} className="text-white/70 hover:text-white transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="px-6 py-2 bg-primary text-white rounded-full text-xs font-black uppercase tracking-tighter hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-primary/30"
            >
              Entrar
            </button>
          )}
        </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto px-4 pt-12 pb-32">
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <RegistrationView config={config} />
          ) : isAdmin ? (
            <AdminDashboard config={config} guests={guests} />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white/90 backdrop-blur-md rounded-[3rem] shadow-2xl border border-primary/20 max-w-lg mx-auto">
              <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mb-6 text-zinc-400 shadow-inner">
                <Settings size={48} />
              </div>
              <h2 className="text-3xl font-serif font-bold mb-4 text-zinc-800">Acceso Restringido</h2>
              <p className="text-zinc-600 max-w-md mx-auto mb-8 leading-relaxed">
                Esta sección es exclusiva para los organizadores del evento. 
                {user ? (
                  <> Tu cuenta <strong>{user.email}</strong> no tiene permisos de administrador.</>
                ) : (
                  <> Si eres el dueño, inicia sesión con tu cuenta de Google autorizada.</>
                )}
              </p>
              {!user && (
                <button 
                  onClick={handleLogin}
                  className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  Iniciar Sesión como Organizador
                </button>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      </div>

      {/* Footer */}
      <footer>
        <Footer />
      </footer>
    </div>
  );
}

function Footer() {
  const footerLinks = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Galería', href: '#galeria' },
    { label: 'Confirmar asistencia', href: '#confirmar-asistencia' },
    { label: 'Ubicación', href: 'https://maps.app.goo.gl/8FavgDufEsn4DRYP8' },
    { label: 'Contacto', href: '#contacto' },
  ];

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const socialLinks = [
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
    { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
  ];

  return (
    <div id="contacto" className="bg-zinc-900/80 backdrop-blur-md border-t border-white/5">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-2 rounded-full">
                <Cake size={20} className="text-primary" />
              </div>
              <h3 className="font-serif font-semibold text-lg text-white">Mi Primer Cumpleaños</h3>
            </div>
            <h4 className="font-serif text-xl text-primary font-medium">Ashly Sofía</h4>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Una celebración mágica llena de amor, alegría y momentos preciosos. 
              Gracias por ser parte de este día tan especial.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-serif font-semibold text-lg text-white">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    onClick={(e) => scrollToSection(e, link.href)}
                    className="cursor-pointer text-white/60 text-sm hover:text-primary transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-serif font-semibold text-lg text-white">Síguenos</h3>
            <p className="text-white/60 text-sm">
              Comparte este momento mágico con nosotros
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-primary/20 hover:text-primary transition-all duration-300 border border-white/10 hover:border-primary/30"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
            <div className="pt-2 space-y-2">
              <a href="mailto:celebration@ashly.com" className="flex items-center gap-2 text-white/60 text-sm hover:text-primary transition-colors">
                <Mail size={14} />
                celebration@ashly.com
              </a>
              <a href="tel:+1234567890" className="flex items-center gap-2 text-white/60 text-sm hover:text-primary transition-colors">
                <Phone size={14} />
                +1 234 567 890
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <p className="text-white/40 text-xs">
              © 2026 Mi Primer Cumpleaños Ashly Sofía. Todos los derechos reservados.
            </p>
            <a 
              href="https://portafolio-keyler-silva.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary/80 text-xs hover:text-primary transition-colors duration-300 font-medium"
            >
              Desarrollado por Keyler Silva
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function RegistrationView({ config }: { config: Config | null }) {
  const [formData, setFormData] = useState({ name: '', whatsapp: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [vCode, setVCode] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'guests'), (snapshot) => {
      let count = 0;
      snapshot.forEach(doc => {
        count += 1;
      });
      setTotalRegistered(count);
    });
    return () => unsubscribe();
  }, []);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const update = () => {
      const diff = EVENT_DATE.getTime() - Date.now();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0 });
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setTimeLeft({ days, hours, minutes });
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (showSuccessModal) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98', '#DDA0DD', '#FF6B6B']
      });
    }
  }, [showSuccessModal]);

  const spotsLeft = config ? config.totalSpots - totalRegistered : 0;
  const isFull = spotsLeft <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFull || !config?.registrationOpen) return;
    
    setStatus('loading');
    setShowErrorModal(false);
    try {
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setVCode(verificationCode);
      const guestData = {
        name: formData.name,
        whatsapp: formData.whatsapp,
        companions: 0,
        checkedIn: false,
        registeredAt: Timestamp.now(),
        verificationCode
      };
      
      await addDoc(collection(db, 'guests'), guestData);
      
      const chatId = buildChatId(formData.whatsapp);
      const message = buildConfirmationMessage(formData.name);
      const sent = await sendWhatsAppMessage(chatId, message);
      setWhatsappSent(sent);
      setShowSuccessModal(true);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage("No pudimos completar tu registro. Intenta de nuevo.");
      setShowErrorModal(true);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setFormData({ name: '', whatsapp: '' });
    setStatus('idle');
  };

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    setStatus('idle');
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <motion.div 
        id="inicio"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col justify-center min-h-[80dvh] sm:min-h-0"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <Baby size={14} /> Celebremos Juntos
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif text-white leading-tight mb-6 drop-shadow-md">
            {config?.eventName || "Cargando..."}
          </h1>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-white/90 font-medium">
            <Calendar className="text-primary shrink-0" size={20} />
            <span>{config?.eventDate ? formatDate(config.eventDate) : ''}</span>
          </div>
          <div className="flex items-center gap-3 text-white/90 font-medium">
            <Clock className="text-primary shrink-0" size={20} />
            <span>3:00 PM</span>
          </div>
          <div className="flex items-center gap-3 text-white/90 font-medium">
            <MapPin className="text-primary shrink-0" size={20} />
            <a
              href="https://maps.app.goo.gl/8FavgDufEsn4DRYP8"
              className="text-white/90 font-medium hover:text-primary transition-colors duration-300"
            >
              Cl. 17 # 10A-58, Sabanalarga, Atlántico - Salón de evento El Milagroso
            </a>
          </div>
          {timeLeft.days > 0 && (
            <div className="flex items-center gap-3 text-white/90">
              <Clock className="text-primary shrink-0" size={20} />
              <span className="font-bold">
                <span className="text-primary">{timeLeft.days}</span>
                <span className="text-white/70 text-xs ml-1">días</span>
                <span className="text-primary ml-2">{timeLeft.hours}</span>
                <span className="text-white/70 text-xs ml-1">h</span>
                <span className="text-primary ml-2">{timeLeft.minutes}</span>
                <span className="text-white/70 text-xs ml-1">min</span>
              </span>
            </div>
          )}
        </div>

        <p className="text-lg text-white/80 leading-relaxed max-w-lg italic font-medium drop-shadow-sm">
          "Un año de sonrisas, descubrimientos y mucho amor. Queremos que seas parte de este momento tan especial para nuestra familia."
        </p>

        <button
          onClick={() => document.getElementById('confirmar-asistencia')?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-8 w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
        >
          ✨ Confirmar mi Asistencia
        </button>
      </motion.div>

      <motion.div 
        id="confirmar-asistencia"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] shadow-xl shadow-zinc-200/50 border border-zinc-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4">
           <div className={`px-4 py-1 rounded-full text-xs font-bold ${isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {isFull ? 'Agotado' : `${spotsLeft} Cupos Libres`}
           </div>
        </div>

        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-r from-primary to-accent text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg shadow-primary/20 mb-3">
            ✨ ¡Regístrate Aquí! ✨
          </div>
          <h2 className="text-2xl font-serif">Confirma tu Asistencia</h2>
        </div>
        
        {isFull ? (
          <div className="bg-red-50 p-6 rounded-xl text-red-700 text-sm">
            Lo sentimos, ya hemos alcanzado el límite de invitados para este evento.
          </div>
        ) : !config?.registrationOpen ? (
          <div className="bg-amber-50 p-6 rounded-xl text-amber-700 text-sm">
            El registro para este evento se encuentra cerrado actualmente.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Tu Nombre</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Ej. María García"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Número de WhatsApp</label>
              <input 
                required
                type="tel"
                value={formData.whatsapp}
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="+57 300 123 4567"
              />
            </div>


            <button 
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 active:brightness-90 active:shadow-none transition-all disabled:opacity-50 disabled:scale-100"
            >
              {status === 'loading' ? 'Registrando...' : 'Confirmar Registro'}
            </button>
            
            {status === 'error' && (
              <p className="text-red-500 text-center text-sm">{errorMessage}</p>
            )}
          </form>
        )}
      </motion.div>
    </div>

    <div id="galeria" className="scroll-mt-24" />
    <div id="ubicacion" className="scroll-mt-24" />
    <AnimatePresence>
      {showSuccessModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={handleCloseSuccessModal}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl border border-primary/20 max-w-md w-full p-8 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute -top-4 -left-4 transform -rotate-12">
              <div className="bg-secondary p-3 rounded-2xl shadow-lg text-primary">
                <Cake size={28} />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 transform rotate-12">
              <div className="bg-accent p-3 rounded-2xl shadow-lg text-primary">
                <Baby size={28} />
              </div>
            </div>
            <button
              onClick={handleCloseSuccessModal}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-3xl font-serif font-bold mb-4 text-zinc-800">¡Registro Exitoso!</h2>
              <p className="text-zinc-600 mb-6 leading-relaxed">
                ¡Qué alegría! Te esperamos en la celebración. Presenta este código al llegar:
              </p>
              <div className="bg-secondary/50 p-6 rounded-2xl border-2 border-dashed border-primary/40 mb-6">
                <p className="text-xs uppercase tracking-[0.3em] font-bold text-primary/60 mb-2">Código de Verificación</p>
                <span className="text-4xl font-mono font-black tracking-[0.2em] text-primary">#{vCode}</span>
              </div>
              {whatsappSent ? (
                <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium mb-6">
                  <MessageCircle size={18} />
                  <span>Mensaje de confirmación enviado por WhatsApp</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-amber-600 text-sm font-medium mb-6">
                  <Sparkles size={18} />
                  <span>Prepárate para recibir tu mensaje de confirmación</span>
                </div>
              )}
              <button
                onClick={handleCloseSuccessModal}
                className="px-6 py-2 bg-primary text-white rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showErrorModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={handleCloseErrorModal}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl border border-red-200 max-w-md w-full p-8 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={handleCloseErrorModal}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <X size={40} />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-4 text-zinc-800">Ups, algo salió mal</h2>
              <p className="text-zinc-600 mb-6 leading-relaxed">
                {errorMessage}
              </p>
              <button
                onClick={handleCloseErrorModal}
                className="px-6 py-2 bg-zinc-100 text-zinc-700 rounded-full text-sm font-bold hover:bg-zinc-200 transition-all"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  );
}

function AdminDashboard({ config, guests }: { config: Config | null, guests: Guest[] }) {
  const [activeTab, setActiveTab] = useState<'guests' | 'settings'>('guests');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [localConfig, setLocalConfig] = useState<Config | null>(config);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (config) setLocalConfig(config);
  }, [config]);

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.whatsapp.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.verificationCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localConfig) return;
    setIsSavingConfig(true);
    setSaveStatus('idle');
    try {
      await setDoc(doc(db, 'config', 'general'), localConfig);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCheckIn = async (guest: Guest) => {
    setUpdatingId(guest.id);
    try {
      await updateDoc(doc(db, 'guests', guest.id), {
        checkedIn: !guest.checkedIn
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const totalInvited = guests.reduce((acc, g) => acc + 1 + g.companions, 0);
  const totalCheckedIn = guests.reduce((acc, g) => g.checkedIn ? acc + 1 + g.companions : acc, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-100">
        <button 
          onClick={() => setActiveTab('guests')}
          className={`pb-2 px-4 text-sm font-bold transition-all ${activeTab === 'guests' ? 'border-b-2 border-primary text-primary' : 'text-zinc-400'}`}
        >
          Invitados
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-2 px-4 text-sm font-bold transition-all ${activeTab === 'settings' ? 'border-b-2 border-primary text-primary' : 'text-zinc-400'}`}
        >
          Configuración
        </button>
      </div>

      {activeTab === 'guests' ? (
        <>
          {/* Stats Table */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-zinc-100 shadow-sm">
              <p className="text-zinc-500 text-sm mb-1 uppercase tracking-wider font-bold">Total Registrados</p>
              <p className="text-4xl font-serif text-primary">{totalInvited}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-zinc-100 shadow-sm">
              <p className="text-zinc-500 text-sm mb-1 uppercase tracking-wider font-bold">Presentes</p>
              <p className="text-4xl font-serif text-green-500">{totalCheckedIn}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-zinc-100 shadow-sm">
              <p className="text-zinc-500 text-sm mb-1 uppercase tracking-wider font-bold">Capacidad</p>
              <p className="text-4xl font-serif text-zinc-800">{totalInvited} / {config?.totalSpots || 0}</p>
            </div>
          </div>

          {/* Guest List */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-zinc-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <h2 className="text-xl font-serif font-bold">Lista de Invitados</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-zinc-50 border-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-widest font-bold">
                    <th className="px-6 py-4">Invitado</th>
                    <th className="px-6 py-4 text-center">Cupos</th>
                    <th className="px-6 py-4">Código</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filteredGuests.length > 0 ? (
                    filteredGuests.map(guest => (
                      <tr key={guest.id} className={`hover:bg-zinc-50 transition-colors ${guest.checkedIn ? 'bg-green-50/30' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900">{guest.name}</div>
                          <div className="text-xs text-zinc-500">{guest.whatsapp}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-bold">
                          {1 + guest.companions}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                          {guest.verificationCode}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleCheckIn(guest)}
                            disabled={updatingId === guest.id}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                              guest.checkedIn 
                                ? 'bg-green-500 text-white' 
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            {guest.checkedIn ? <CheckCircle size={14} /> : <Users size={14} />}
                            {guest.checkedIn ? 'Verificado' : 'Verificar'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 italic">
                        No se encontraron invitados para "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white p-8 rounded-3xl border border-zinc-100 max-w-2xl shadow-sm">
          <h2 className="text-2xl font-serif mb-6">Configuración del Evento</h2>
          <form onSubmit={handleUpdateConfig} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2 uppercase tracking-wide">Nombre del Evento</label>
                <input 
                  type="text"
                  value={localConfig?.eventName || ''}
                  onChange={e => setLocalConfig(prev => prev ? {...prev, eventName: e.target.value} : null)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2 uppercase tracking-wide">Fecha</label>
                <input 
                  type="date"
                  value={localConfig?.eventDate || ''}
                  onChange={e => setLocalConfig(prev => prev ? {...prev, eventDate: e.target.value} : null)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2 uppercase tracking-wide">Capacidad Total (Personas)</label>
                <input 
                  type="number"
                  value={localConfig?.totalSpots || 0}
                  onChange={e => setLocalConfig(prev => prev ? {...prev, totalSpots: Number(e.target.value)} : null)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input 
                  type="checkbox"
                  id="regOpen"
                  checked={localConfig?.registrationOpen || false}
                  onChange={e => setLocalConfig(prev => prev ? {...prev, registrationOpen: e.target.checked} : null)}
                  className="w-5 h-5 rounded border-zinc-300 text-primary focus:ring-primary"
                />
                <label htmlFor="regOpen" className="text-sm font-bold text-zinc-700">Registro Abierto</label>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                type="submit"
                disabled={isSavingConfig}
                className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isSavingConfig ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              
              {saveStatus === 'success' && (
                <span className="text-green-500 text-sm font-bold flex items-center gap-1">
                  <CheckCircle size={16} /> Configuración guardada
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-500 text-sm font-bold">Error al guardar</span>
              )}
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
}
