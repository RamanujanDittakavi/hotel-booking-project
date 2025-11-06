import React, { useState, useEffect } from 'react';
// Firebase imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  getRedirectResult, // <-- NEW: For handling sign-in more reliably
  signInWithRedirect
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs,
  onSnapshot,
  query, 
  where,
  limit,
  writeBatch,
  addDoc, // <-- NEW: For adding bookings
  serverTimestamp, // <-- NEW: For booking dates
  setLogLevel
} from 'firebase/firestore';

// --- Firebase Config ---
let viteFirebaseConfig = undefined;
let viteAppId = undefined;
let viteInitialAuthToken = undefined;

if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
  viteFirebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG;
  viteAppId = import.meta.env.VITE_APP_ID;
  viteInitialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN;
}

let fallbackFirebaseConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : undefined;
let fallbackAppId = typeof __app_id !== 'undefined' ? __app_id : undefined;
let fallbackInitialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

const firebaseConfigString = viteFirebaseConfig || fallbackFirebaseConfig;
const appId = viteAppId || fallbackAppId || 'default-app-id';
const initialAuthToken = viteInitialAuthToken || fallbackInitialAuthToken;

const firebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : {};

// --- SVG Icons ---
const MenuIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);
const XIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const TagIcon = ({ className = "w-12 h-12 mx-auto text-blue-600 mb-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.737.563l3.491-1.246c.956-.34 1.657-1.208 1.657-2.19v-4.318a2.25 2.25 0 00-.659-1.591L9.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9h.008v.008H6V9z" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-12 h-12 mx-auto text-blue-600 mb-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0115 2.714" />
  </svg>
);
const ClockIcon = ({ className = "w-12 h-12 mx-auto text-blue-600 mb-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const WifiIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856a9.75 9.75 0 0113.788 0M1.923 8.674a14.25 14.25 0 0120.154 0M12 18.375a.375.375 0 110-.75.375.375 0 010 .75z" />
  </svg>
);
const SparklesIcon = ({ className = "w-5 h-5" }) => ( // Using Sparkles for 'Spa'
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.475-2.475L14.25 6l1.036-.259a3.375 3.375 0 002.475-2.475L18 2.25l.259 1.035a3.375 3.375 0 002.475 2.475L21.75 6l-1.035.259a3.375 3.375 0 00-2.475 2.475z" />
  </svg>
);
const BuildingIcon = ({ className = "w-5 h-5" }) => ( // Using Building for 'Gym'
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18M18.75 3v18M9 6.75h6M9 12h6m-6 5.25h6M4.5 21h15" />
  </svg>
);
const WaterIcon = ({ className = "w-5 h-5" }) => ( // Using Water drop for 'Pool'
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214a.818.818 0 01.432 1.205l-4.266 7.42a.818.818 0 01-1.42 0l-4.266-7.42a.818.818 0 01.432-1.205A11.96 11.96 0 0112 3c1.94 0 3.814.453 5.362 1.214zM12 12.75v6.188a.818.818 0 01-1.22 0v-6.188" />
  </svg>
);
const StarIcon = ({ className = "w-5 h-5 text-yellow-400" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.868 2.884c.321-.662 1.135-.662 1.456 0l1.82 3.75 4.12 1.013c.72.176 1.006.993.486 1.488l-3.23 3.148.86 4.545c.12 1.054-.87 1.848-1.84 1.353l-3.928-2.065-3.928 2.065c-.97.495-1.96-.299-1.84-1.353l.86-4.545-3.23-3.148c-.52-.495-.234-1.312.486-1.488l4.12-1.013 1.82-3.75z" clipRule="evenodd" />
  </svg>
);
// NEW: Credit Card Icon for Payment
const CreditCardIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6M3 17.25l1.5-1.5M15 17.25l1.5-1.5M16.5 12h.008v.008h-.008V12z" />
    <path d="M2.25 6.75C2.25 5.64543 3.14543 4.75 4.25 4.75H19.75C20.8546 4.75 21.75 5.64543 21.75 6.75V17.25C21.75 18.3546 20.8546 19.25 19.75 19.25H4.25C3.14543 19.25 2.25 18.3546 2.25 17.25V6.75Z" strokeWidth="1.5" />
  </svg>
);
// NEW: Calendar Icon for Bookings
const CalendarIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);


// --- Header Component ---
const Header = ({ isMenuOpen, setIsMenuOpen, auth, user, onNavigate }) => {
  
  // NEW SIGN-IN FIX: Use signInWithRedirect
  // This avoids pop-up blockers entirely.
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // This will redirect the user to Google's sign-in page
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onNavigate('home'); // Go to home page after sign out
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  return (
    <header className="bg-white shadow-sm relative z-10">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <button onClick={() => onNavigate('home')} className="text-2xl font-bold text-blue-600">
              StayScout
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <button onClick={() => onNavigate('home')} className="font-medium text-gray-700 hover:text-blue-600 transition-colors">Home</button>
            <button onClick={() => onNavigate('searchResults', { destination: 'All' })} className="font-medium text-gray-500 hover:text-blue-600 transition-colors">Hotels</button>
            {/* NEW: Show My Bookings if logged in */}
            {user && (
              <button onClick={() => onNavigate('bookings')} className="font-medium text-gray-500 hover:text-blue-600 transition-colors">My Bookings</button>
            )}
            <button onClick={() => onNavigate('about')} className="font-medium text-gray-500 hover:text-blue-600 transition-colors">About</button>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <>
                <span className="text-gray-700 text-sm hidden lg:block">Hi, {user.displayName || 'Friend'}!</span>
                <button
                  onClick={handleSignOut}
                  className="font-medium text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSignIn}
                  className="font-medium text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={handleSignIn}
                  className="font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-controls="mobile-menu"
              aria-expanded={isMenuOpen}
              aria-label="Toggle main menu"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden absolute top-16 inset-x-0 bg-white shadow-lg z-20`} id="mobile-menu">
        <div className="pt-2 pb-3 space-y-1 px-2">
          <button onClick={() => { onNavigate('home'); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors">Home</button>
          <button onClick={() => { onNavigate('searchResults', { destination: 'All' }); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors">Hotels</button>
          {user && (
            <button onClick={() => { onNavigate('bookings'); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors">My Bookings</button>
          )}
          <button onClick={() => { onNavigate('about'); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors">About</button>
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200 px-2">
          <div className="flex flex-col space-y-2">
            {user ? (
                <button
                  onClick={handleSignOut}
                  className="block w-full text-center px-4 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Sign Out
                </button>
            ) : (
              <>
                <button
                  onClick={handleSignIn}
                  className="block w-full text-center px-4 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={handleSignIn}
                  className="block w-full text-center px-4 py-2 rounded-lg text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// --- Booking Form Component ---
const BookingForm = ({ onSearch }) => {
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!destination) {
      alert("Please enter a destination."); // Using alert here for simplicity, but a modal would be better
      return;
    }
    onSearch({ destination, checkIn, checkOut, guests });
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl mt-8 max-w-5xl mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div className="lg:col-span-2">
          <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
            Destination
          </label>
          <input
            type="text"
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="e.g., Miami, Florida"
          />
        </div>
        <div>
          <label htmlFor="check-in" className="block text-sm font-medium text-gray-700 mb-1">
            Check-in
          </label>
          <input
            type="date"
            id="check-in"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={today}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label htmlFor="check-out" className="block text-sm font-medium text-gray-700 mb-1">
            Check-out
          </label>
          <input
            type="date"
            id="check-out"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || today}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <div className="md:col-span-1 lg:col-span-1">
           <label htmlFor="guests" className="block text-sm font-medium text-gray-700 mb-1">
            Guests
          </label>
          <input
            type="number"
            id="guests"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            min="1"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <div className="md:col-span-2 lg:col-span-1">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg shadow-lg hover:shadow-xl"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
};

// --- Hero Component ---
const Hero = ({ onSearch }) => {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-teal-500 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold !leading-tight mb-4">
          Find Your Perfect Stay
        </h1>
        <p className="text-lg sm:text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto">
          Book hotels, resorts, and apartments at the best prices. Your next adventure awaits.
        </p>
        <BookingForm onSearch={onSearch} />
      </div>
    </section>
  );
};

// --- Hotel Card Component ---
const HotelCard = ({ hotel, onSelectHotel }) => {
  return (
    <button 
      onClick={() => onSelectHotel(hotel.id)} 
      className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 text-left w-full"
    >
      <img 
        className="w-full h-56 object-cover" 
        src={hotel.image} 
        alt={`Exterior of ${hotel.name}`} 
        onError={(e) => { e.target.src = 'https://placehold.co/600x400/e2e8f0/334155?text=Image+Not+Available'; }}
      />
      <div className="p-6">
        <h3 className="font-bold text-2xl text-gray-900 mb-2">{hotel.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{hotel.location}</p>
        <div className="flex justify-between items-center">
          <span className="font-bold text-2xl text-blue-600">
            ${hotel.price}
            <span className="text-sm font-normal text-gray-500">/night</span>
          </span>
          <span className="bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-sm flex items-center space-x-1">
            <StarIcon className="w-4 h-4" />
            <span>{hotel.rating}</span>
          </span>
        </div>
      </div>
    </button>
  );
};

// --- Add Sample Hotels Button ---
const AddSampleHotelsButton = ({ db, appId }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const mockHotels = [
    {
      name: "The Grand Resort",
      location: "Miami, Florida",
      price: 299,
      rating: 4.8,
      image: "https://placehold.co/600x400/60a5fa/ffffff?text=Grand+Resort",
      description: "Experience the ultimate luxury at The Grand Resort, located on the beautiful shores of Miami. Enjoy breathtaking ocean views, world-class dining, and an unforgettable stay.",
      amenities: ["Pool", "Wi-Fi", "Gym", "Spa", " beachfront"]
    },
    {
      name: "Mountain View Lodge",
      location: "Aspen, Colorado",
      price: 349,
      rating: 4.9,
      image: "https://placehold.co/600x400/818cf8/ffffff?text=Mountain+Lodge",
      description: "Nestled in the heart of the Rocky Mountains, the Mountain View Lodge offers stunning vistas and cozy, luxurious accommodations. Perfect for a ski trip or a summer getaway.",
      amenities: ["Wi-Fi", "Gym", "Spa", "Ski-in/Ski-out"]
    },
    {
      name: "Urban Oasis Hotel",
      location: "New York, NY",
      price: 249,
      rating: 4.7,
      image: "https://placehold.co/600x400/a78bfa/ffffff?text=Urban+Oasis",
      description: "An oasis of calm in the middle of the bustling city. The Urban Oasis Hotel provides a chic, modern retreat with easy access to all major attractions.",
      amenities: ["Pool", "Wi-Fi", "Gym", "Rooftop Bar"]
    },
  ];

  const handleAddHotels = async () => {
    setIsAdding(true);
    try {
      const hotelsColRef = collection(db, `/artifacts/${appId}/public/data/hotels`);
      const batch = writeBatch(db);
      
      mockHotels.forEach((hotel) => {
        const docRef = doc(hotelsColRef);
        batch.set(docRef, hotel);
      });
      
      await batch.commit();
      console.log("Sample hotels added successfully!");
      setIsDone(true);
    } catch (error) {
      console.error("Error adding sample hotels:", error);
    }
    setIsAdding(false);
  };

  return (
    <div className="text-center mt-8">
      <button
        onClick={handleAddHotels}
        disabled={isAdding || isDone}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400"
      >
        {isDone ? "Sample Hotels Added!" : isAdding ? "Adding..." : "Add Sample Hotels to DB"}
      </button>
      <p className="text-sm text-gray-600 mt-2">
        Click this button once to populate the empty database with sample data.
      </p>
    </div>
  );
};

// --- Featured Hotels Component ---
const FeaturedHotels = ({ db, appId, onSelectHotel }) => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    setLoading(true);
    const hotelsColRef = collection(db, `/artifacts/${appId}/public/data/hotels`);
    const q = query(hotelsColRef, limit(3));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hotelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHotels(hotelsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching featured hotels:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, appId]);

  return (
    <section className="py-16 sm:py-24 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-900 mb-12">
          Featured Properties
        </h2>
        {loading ? (
          <p className="text-center text-gray-600">Loading featured hotels...</p>
        ) : hotels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} onSelectHotel={onSelectHotel} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">
            No featured hotels found. Try adding sample data.
          </p>
        )}
        <AddSampleHotelsButton db={db} appId={appId} />
      </div>
    </section>
  );
};

// --- Features Component ---
const Features = () => {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-900 mb-12">
          Why Book With StayScout?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <TagIcon />
            <h3 className="font-semibold text-xl text-gray-900 mb-2">Best Price Guarantee</h3>
            <p className="text-gray-600">
              We find you the best deals on the market, so you can book with confidence.
            </p>
          </div>
          <div className="p-6">
            <ShieldCheckIcon />
            <h3 className="font-semibold text-xl text-gray-900 mb-2">Secure & Easy Booking</h3>
            <p className="text-gray-600">
              Our booking process is simple, fast, and protected by industry-standard security.
            </p>
          </div>
          <div className="p-6">
            <ClockIcon />
            <h3 className="font-semibold text-xl text-gray-900 mb-2">24/7 Customer Support</h3>
            <p className="text-gray-600">
              Our team is here to help you around the clock with any questions or issues.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Footer Component ---
const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-xl font-bold text-white mb-4">StayScout</h4>
            <p className="text-gray-400">
              Your partner in finding the perfect place to stay, wherever your travels take you.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-lg text-white mb-4">Quick Links</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Hotels</a></li>
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-lg text-white mb-4">Legal</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-lg text-white mb-4">Follow Us</h5>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-white transition-colors">Facebook</a>
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700 text-center">
          <p className="text-gray-400">&copy; {new Date().getFullYear()} StayScout. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// --- Home Page Component ---
const Home = ({ onSearch, db, appId, onSelectHotel }) => {
  return (
    <>
      <Hero onSearch={onSearch} />
      <FeaturedHotels db={db} appId={appId} onSelectHotel={onSelectHotel} />
      <Features />
    </>
  );
};

// --- Search Results Page Component ---
const SearchResults = ({ db, appId, criteria, onGoHome, onSelectHotel }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const hotelsColRef = collection(db, `/artifacts/${appId}/public/data/hotels`);
        let q;
        if (criteria.destination && criteria.destination !== 'All') {
          // Specific search
          q = query(hotelsColRef, where("location", "==", criteria.destination));
        } else {
          // "Hotels" link clicked, show all
          q = query(hotelsColRef);
        }
        
        const querySnapshot = await getDocs(q);
        const hotelsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setResults(hotelsData);
        
      } catch (error) {
        console.error("Error searching hotels:", error);
      }
      setLoading(false);
    };

    fetchResults();
  }, [db, appId, criteria]);

  return (
    <section className="py-16 sm:py-24 bg-white min-h-[60vh]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            {criteria.destination === 'All' ? "All Hotels" : `Results for "${criteria.destination}"`}
          </h2>
          <button
            onClick={onGoHome}
            className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            &larr; Back to Home
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-600">Searching for hotels...</p>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {results.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} onSelectHotel={onSelectHotel} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 text-lg">
            No hotels found. Try "Miami, Florida", "Aspen, Colorado", or "New York, NY" after adding sample data.
          </p>
        )}
      </div>
    </section>
  );
};

// --- Amenity Icon Helper ---
const AmenityIcon = ({ name }) => {
  const iconProps = { className: "w-6 h-6 text-blue-600" };
  const nameLower = name.toLowerCase();

  if (nameLower.includes('pool')) return <WaterIcon {...iconProps} />;
  if (nameLower.includes('wi-fi')) return <WifiIcon {...iconProps} />;
  if (nameLower.includes('gym')) return <BuildingIcon {...iconProps} />;
  if (nameLower.includes('spa')) return <SparklesIcon {...iconProps} />;
  
  // Default icon
  return <StarIcon className="w-6 h-6 text-blue-600" />;
};


// --- Hotel Details Page Component ---
const HotelDetailsPage = ({ db, appId, hotelId, onNavigate, user }) => {
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !hotelId) return;

    const fetchHotel = async () => {
      setLoading(true);
      try {
        const hotelDocRef = doc(db, `/artifacts/${appId}/public/data/hotels`, hotelId);
        const docSnap = await getDoc(hotelDocRef);

        if (docSnap.exists()) {
          setHotel({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("No such hotel found!");
        }
      } catch (error) {
        console.error("Error fetching hotel details:", error);
      }
      setLoading(false);
    };

    fetchHotel();
  }, [db, appId, hotelId]);

  const handleBookNow = () => {
    if (!user) {
      alert("Please sign in to book this hotel.");
      return;
    }
    // Navigate to the payment page, passing the hotel info
    onNavigate('payment', { hotel });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-gray-600">Loading hotel details...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-lg text-red-600 mb-4">Error: Hotel not found.</p>
        <button
          onClick={() => onNavigate('home')}
          className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          &larr; Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => onNavigate('home')} // Simple go back home for now
          className="font-medium text-blue-600 hover:text-blue-800 transition-colors mb-6"
        >
          &larr; Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-2">{hotel.name}</h1>
          <p className="text-lg text-gray-600">{hotel.location}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <img 
              className="w-full h-96 object-cover rounded-xl shadow-lg mb-8" 
              src={hotel.image} 
              alt={`Main view of ${hotel.name}`}
              onError={(e) => { e.target.src = 'https://placehold.co/800x600/e2e8f0/334155?text=Image+Not+Available'; }}
            />
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">About this hotel</h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-8">
              {hotel.description || "No description available for this hotel."}
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mb-6">What this place offers</h2>
            <div className="grid grid-cols-2 gap-4">
              {hotel.amenities && hotel.amenities.length > 0 ? (
                hotel.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <AmenityIcon name={amenity} />
                    <span className="text-gray-700 text-lg">{amenity}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No amenities listed.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-gray-50 p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-3xl text-blue-600">
                  ${hotel.price}
                  <span className="text-base font-normal text-gray-500">/night</span>
                </span>
                <span className="bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-full text-lg flex items-center space-x-1">
                  <StarIcon className="w-5 h-5" />
                  <span>{hotel.rating}</span>
                </span>
              </div>

              <button
                onClick={handleBookNow}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-300 text-lg shadow-lg hover:shadow-xl"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NEW: About Page Component ---
const AboutPage = () => (
  <div className="py-16 sm:py-24 bg-white">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 text-center">About StayScout</h1>
      <p className="text-lg text-gray-700 leading-relaxed mb-4">
        Welcome to StayScout, your number one partner in finding the perfect accommodation for your travels. We are dedicated to giving you the very best of hotel bookings, with a focus on dependability, customer service, and uniqueness.
      </p>
      <p className="text-lg text-gray-700 leading-relaxed mb-4">
        Founded in 2025, StayScout has come a long way from its beginnings. When we first started out, our passion for easy and reliable travel booking drove us to create this platform. We now serve customers all over the world and are thrilled to be a part of the exciting wing of the travel industry.
      </p>
      <p className="text-lg text-gray-700 leading-relaxed">
        We hope you enjoy our service as much as we enjoy offering it to you. If you have any questions or comments, please don't hesitate to contact us.
      </p>
    </div>
  </div>
);

// --- NEW: My Bookings Page Component ---
const MyBookingsPage = ({ db, appId, user, onSelectHotel }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      setLoading(false);
      return;
    };

    const fetchBookings = async () => {
      setLoading(true);
      try {
        const bookingsColRef = collection(db, `/artifacts/${appId}/users/${user.uid}/bookings`);
        const q = query(bookingsColRef);
        
        const querySnapshot = await getDocs(q);
        const bookingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Format date for display
        const formattedBookings = bookingsData.map(b => ({
          ...b,
          bookedOn: b.bookedOn?.toDate ? b.bookedOn.toDate().toLocaleDateString() : 'N/A'
        }));
        
        setBookings(formattedBookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
      setLoading(false);
    };

    fetchBookings();
  }, [db, appId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-gray-600">Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="py-16 sm:py-24 bg-gray-50 min-h-[60vh]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-12 text-center">My Bookings</h1>
        {bookings.length > 0 ? (
          <div className="space-y-6">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-6">
                <img 
                  src={booking.hotel.image} 
                  alt={booking.hotel.name}
                  className="w-32 h-32 object-cover rounded-lg"
                  onError={(e) => { e.target.src = 'https://placehold.co/150x150/e2e8f0/334155?text=Hotel'; }}
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{booking.hotel.name}</h2>
                  <p className="text-gray-600">{booking.hotel.location}</p>
                  <p className="text-gray-800 mt-2 font-semibold">${booking.hotel.price}/night</p>
                  <p className="text-sm text-gray-500 mt-1">Booked on: {booking.bookedOn}</p>
                </div>
                <button 
                  onClick={() => onSelectHotel(booking.hotel.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  View Hotel
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 text-lg">You have no bookings yet.</p>
        )}
      </div>
    </div>
  );
};

// --- NEW: Payment Page Component ---
const PaymentPage = ({ db, appId, user, bookingDetails, onNavigate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '', name: '' });

  if (!bookingDetails || !bookingDetails.hotel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-lg text-red-600 mb-4">Error: No hotel selected for booking.</p>
        <button
          onClick={() => onNavigate('home')}
          className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          &larr; Back to Home
        </button>
      </div>
    );
  }

  const { hotel } = bookingDetails;
  
  const handleInputChange = (e) => {
    setCardDetails({ ...cardDetails, [e.target.name]: e.target.value });
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name) {
      setErrorMessage("Please fill in all card details.");
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage('');

    // --- This is a FAKE payment simulation ---
    // In a real app, you would use Stripe, Braintree, etc.
    await new Promise(resolve => setTimeout(resolve, 1500));
    // --- End of fake simulation ---

    try {
      // Payment "succeeded", now create the booking in Firestore
      const bookingsColRef = collection(db, `/artifacts/${appId}/users/${user.uid}/bookings`);
      
      await addDoc(bookingsColRef, {
        userId: user.uid,
        hotel: { // Store a denormalized copy of the hotel info
          id: hotel.id,
          name: hotel.name,
          location: hotel.location,
          price: hotel.price,
          image: hotel.image
        },
        bookedOn: serverTimestamp(),
        status: "confirmed"
      });

      // Redirect to "My Bookings" page
      onNavigate('bookings');

    } catch (error) {
      console.error("Error creating booking:", error);
      setErrorMessage("Payment succeeded, but failed to save booking. Please contact support.");
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="py-16 sm:py-24 bg-gray-50 min-h-[70vh]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-12 text-center">Complete Your Booking</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Order Summary */}
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
            <img 
              src={hotel.image} 
              alt={hotel.name}
              className="w-full h-48 object-cover rounded-lg mb-4"
              onError={(e) => { e.target.src = 'https://placehold.co/400x300/e2e8f0/334155?text=Hotel'; }}
            />
            <h3 className="text-xl font-semibold text-gray-800">{hotel.name}</h3>
            <p className="text-gray-600 mb-4">{hotel.location}</p>
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Price per night</span>
                <span className="font-semibold text-gray-900">${hotel.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nights (Assumed)</span>
                <span className="font-semibold text-gray-900">1</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 mt-4 border-t pt-4">
                <span>Total</span>
                <span>${hotel.price}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Details</h2>
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
                <input type="text" name="name" id="name" className="w-full p-3 border border-gray-300 rounded-lg" value={cardDetails.name} onChange={handleInputChange} />
              </div>
              <div>
                <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <div className="relative">
                  <input type="text" name="number" id="number" className="w-full p-3 border border-gray-300 rounded-lg pl-10" value={cardDetails.number} onChange={handleInputChange} placeholder="0000 0000 0000 0000" />
                  <CreditCardIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="text" name="expiry" id="expiry" className="w-full p-3 border border-gray-300 rounded-lg" value={cardDetails.expiry} onChange={handleInputChange} placeholder="MM / YY" />
                </div>
                <div>
                  <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                  <input type="text" name="cvc" id="cvc" className="w-full p-3 border border-gray-300 rounded-lg" value={cardDetails.cvc} onChange={handleInputChange} placeholder="123" />
                </div>
              </div>
              
              {errorMessage && (
                <p className="text-red-600 text-sm text-center">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-300 text-lg shadow-lg hover:shadow-xl disabled:bg-gray-400"
              >
                {isProcessing ? "Processing..." : `Pay $${hotel.price}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Main App Component ---
export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [page, setPage] = useState('home');
  const [pageData, setPageData] = useState({}); // To pass data between pages
  
  // Firebase state
  const [app, setApp] = useState(null);
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // One-time Firebase Initialization and Auth
  useEffect(() => {
    if (firebaseConfigString && firebaseConfig.apiKey) {
      const appInstance = initializeApp(firebaseConfig);
      setApp(appInstance);
      const authInstance = getAuth(appInstance);
      setAuth(authInstance);
      const dbInstance = getFirestore(appInstance);
      setDb(dbInstance);
      setLogLevel('Debug');

      // Check for redirect result from Google Sign-in
      getRedirectResult(authInstance)
        .then((result) => {
          if (result) {
            // User just signed in via redirect
            setUser(result.user);
          }
        }).catch((error) => {
          console.error("Error getting redirect result:", error);
        }).finally(() => {
          // Listen for auth state changes
          const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
            if (currentUser) {
              setUser(currentUser);
              setIsAuthReady(true);
            } else {
              // No user, try to sign in anonymously
              try {
                if (initialAuthToken) {
                  await signInWithCustomToken(authInstance, initialAuthToken);
                } else {
                  await signInAnonymously(authInstance);
                }
                setUser(authInstance.currentUser); // Set anonymous user
              } catch (error) {
                console.error("Error during initial auth:", error);
              }
              setIsAuthReady(true);
            }
          });
          return () => unsubscribe();
        });
    } else {
      console.warn("Firebase config is missing.");
      setIsAuthReady(true);
    }
  }, []); // Empty array ensures this runs only once

  // --- NEW Navigation Function ---
  const handleNavigate = (targetPage, data = {}) => {
    setPage(targetPage);
    setPageData(data);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  // --- Render Logic ---
  const renderPage = () => {
    if (!isAuthReady) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-lg text-gray-600">Authenticating...</p>
        </div>
      );
    }
    if (!db) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
           <p className="text-lg text-red-600">
            Failed to connect to the database. <br/>
            Please ensure <strong>VITE_FIREBASE_CONFIG</strong> is set correctly in your Netlify environment variables.
          </p>
        </div>
      );
    }

    switch (page) {
      case 'home':
        return <Home onSearch={(criteria) => handleNavigate('searchResults', criteria)} db={db} appId={appId} onSelectHotel={(id) => handleNavigate('hotelDetails', { hotelId: id })} />;
      case 'searchResults':
        return <SearchResults db={db} appId={appId} criteria={pageData} onGoHome={() => handleNavigate('home')} onSelectHotel={(id) => handleNavigate('hotelDetails', { hotelId: id })} />;
      case 'hotelDetails':
        return <HotelDetailsPage db={db} appId={appId} hotelId={pageData.hotelId} onNavigate={handleNavigate} user={user} />;
      case 'about':
        return <AboutPage />;
      case 'bookings':
        if (!user) {
          handleNavigate('home'); // Redirect to home if not logged in
          return null;
        }
        return <MyBookingsPage db={db} appId={appId} user={user} onSelectHotel={(id) => handleNavigate('hotelDetails', { hotelId: id })} />;
      case 'payment':
        if (!user) {
          alert("Please sign in to continue.");
          handleNavigate('home');
          return null;
        }
        return <PaymentPage db={db} appId={appId} user={user} bookingDetails={pageData} onNavigate={handleNavigate} />;
      default:
        return <Home onSearch={(criteria) => handleNavigate('searchResults', criteria)} db={db} appId={appId} onSelectHotel={(id) => handleNavigate('hotelDetails', { hotelId: id })} />;
    }
  };

  return (
    <div className="font-inter bg-white min-h-screen flex flex-col">
      <Header 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        auth={auth}
        user={user}
        onNavigate={handleNavigate}
      />
      
      <main className="flex-grow">
        {renderPage()}
      </main>
      
      <Footer />
    </div>
  );
}
