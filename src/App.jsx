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
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDocs,
  onSnapshot,
  query, 
  where,
  limit,
  writeBatch,
  setLogLevel
} from 'firebase/firestore';

// --- Firebase Config ---
// Read from Vite's environment variables (populated by Netlify)
// You MUST set these in your Netlify Build & Deploy settings

// Vite/Netlify variables (used by Netlify)
let viteFirebaseConfig = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_FIREBASE_CONFIG : undefined;
let viteAppId = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_APP_ID : undefined;
let viteInitialAuthToken = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_INITIAL_AUTH_TOKEN : undefined;

// Fallback variables (used for local preview)
let fallbackFirebaseConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : undefined;
let fallbackAppId = typeof __app_id !== 'undefined' ? __app_id : undefined;
let fallbackInitialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

// Prioritize Vite variables for Netlify, but use fallbacks for preview
const firebaseConfigString = viteFirebaseConfig || fallbackFirebaseConfig;
const appId = viteAppId || fallbackAppId || 'default-app-id';
const initialAuthToken = viteInitialAuthToken || fallbackInitialAuthToken;

const firebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : {};


// --- SVG Icons ---
// ... (Icons are unchanged, so hiding for brevity) ...
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

// --- Header Component ---
const Header = ({ isMenuOpen, setIsMenuOpen, auth, user }) => {
  // ... (Component code is unchanged) ...
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // User state will be updated by onAuthStateChanged listener in App
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // User state will be updated by onAuthStateChanged listener in App
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
            <a href="#" className="text-2xl font-bold text-blue-600">
              StayScout
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <a href="#" className="font-medium text-gray-700 hover:text-blue-600 transition-colors">Home</a>
            <a href="#" className="font-medium text-gray-500 hover:text-blue-600 transition-colors">Hotels</a>
            <a href="#" className="font-medium text-gray-500 hover:text-blue-600 transition-colors">Deals</a>
            <a href="#" className="font-medium text-gray-500 hover:text-blue-600 transition-colors">About</a>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <>
                <span className="text-gray-700 text-sm hidden lg:block">Hi, {user.displayName || user.email || 'Friend'}!</span>
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
          <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors">Home</a>
          <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors">Hotels</a>
          <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors">Deals</a>
          <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors">About</a>
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
  // ... (Component code is unchanged) ...
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pass search criteria to parent component
    onSearch({
      destination,
      checkIn,
      checkOut,
      guests,
    });
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl mt-8 max-w-5xl mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        {/* Destination */}
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
            required
          />
        </div>
        
        {/* Check-in */}
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
            required
          />
        </div>
        
        {/* Check-out */}
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
            required
          />
        </div>
        
        {/* Guests */}
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
            required
          />
        </div>

        {/* Search Button */}
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
  // ... (Component code is unchanged) ...
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
const HotelCard = ({ hotel }) => {
  // ... (Component code is unchanged) ...
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
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
          <span className="bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-sm">
            ★ {hotel.rating}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- Add Sample Hotels Button ---
const AddSampleHotelsButton = ({ db, appId }) => {
  // ... (Component code is unchanged) ...
  const [isAdding, setIsAdding] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const mockHotels = [
    {
      name: "The Grand Resort",
      location: "Miami, Florida",
      price: 299,
      rating: 4.8,
      image: "https://placehold.co/600x400/60a5fa/ffffff?text=Grand+Resort",
    },
    {
      name: "Mountain View Lodge",
      location: "Aspen, Colorado",
      price: 349,
      rating: 4.9,
      image: "https://placehold.co/600x400/818cf8/ffffff?text=Mountain+Lodge",
    },
    {
      name: "Urban Oasis Hotel",
      location: "New York, NY",
      price: 249,
      rating: 4.7,
      image: "https://placehold.co/600x400/a78bfa/ffffff?text=Urban+Oasis",
    },
  ];

  const handleAddHotels = async () => {
    setIsAdding(true);
    try {
      const hotelsColRef = collection(db, `/artifacts/${appId}/public/data/hotels`);
      const batch = writeBatch(db);
      
      mockHotels.forEach((hotel) => {
        const docRef = doc(hotelsColRef); // Create a new doc with a random ID
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
const FeaturedHotels = ({ db, appId }) => {
  // ... (Component code is unchanged) ...
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    setLoading(true);
    const hotelsColRef = collection(db, `/artifacts/${appId}/public/data/hotels`);
    // Query for 3 hotels to feature
    const q = query(hotelsColRef, limit(3));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hotelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHotels(hotelsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching featured hotels:", error);
      setLoading(false);
    });

    // Cleanup subscription on unmount
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
              <HotelCard key={hotel.id} hotel={hotel} />
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
  // ... (Component code is unchanged) ...
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
  // ... (Component code is unchanged) ...
  return (
    <footer className="bg-gray-800 text-gray-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h4 className="text-xl font-bold text-white mb-4">StayScout</h4>
            <p className="text-gray-400">
              Your partner in finding the perfect place to stay, wherever your travels take you.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h5 className="font-semibold text-lg text-white mb-4">Quick Links</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Hotels</a></li>
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h5 className="font-semibold text-lg text-white mb-4">Legal</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          
          {/* Social */}
          <div>
            <h5 className="font-semibold text-lg text-white mb-4">Follow Us</h5>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-white transition-colors">Facebook</a>
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-700 text-center">
          <p className="text-gray-400">&copy; {new Date().getFullYear()} StayScout. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// --- Home Page Component ---
const Home = ({ onSearch, db, appId }) => {
  // ... (Component code is unchanged) ...
  return (
    <>
      <Hero onSearch={onSearch} />
      <FeaturedHotels db={db} appId={appId} />
      <Features />
    </>
  );
};

// --- Search Results Page Component ---
const SearchResults = ({ db, appId, criteria, onGoHome }) => {
  // ... (Component code is unchanged) ...
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !criteria) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const hotelsColRef = collection(db, `/artifacts/${appId}/public/data/hotels`);
        // Simple query: match location exactly.
        // Note: Firestore queries are case-sensitive. "Miami, Florida" will not match "miami, florida".
        // A real app would use a search service or normalized data.
        const q = query(hotelsColRef, where("location", "==", criteria.destination));
        
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
            Results for "{criteria.destination}"
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
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 text-lg">
            No hotels found for this location. Try "Miami, Florida", "Aspen, Colorado", or "New York, NY" after adding sample data.
          </p>
        )}
      </div>
    </section>
  );
};


// --- Main App Component ---
export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [page, setPage] = useState('home'); // 'home' or 'searchResults'
  const [searchCriteria, setSearchCriteria] = useState(null);

  // Firebase state
  const [app, setApp] = useState(null);
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // One-time Firebase Initialization and Auth
  useEffect(() => {
    // Check if the config string is present and not empty
    if (firebaseConfigString && firebaseConfig.apiKey) {
      const appInstance = initializeApp(firebaseConfig);
      setApp(appInstance);
      
      const authInstance = getAuth(appInstance);
      setAuth(authInstance);
      
      const dbInstance = getFirestore(appInstance);
      setDb(dbInstance);
      
      // Set log level for debugging
      setLogLevel('Debug');

      const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setIsAuthReady(true); // Set auth ready after user is confirmed
        } else {
          // No user, sign in with token or anonymously
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              // Fallback to anonymous sign-in if no token
              await signInAnonymously(authInstance);
            }
            // onAuthStateChanged will run again with the new user
            // setUser(authInstance.currentUser); // This line is redundant, listener will re-fire
          } catch (error) {
            console.error("Error during initial auth:", error);
            setIsAuthReady(true); // Set ready even if auth fails to stop loading
          }
        }
        // Moved setIsAuthReady to be more precise
      });

      return () => unsubscribe(); // Cleanup listener
    } else {
      console.warn("Firebase config (VITE_FIREBASE_CONFIG) is missing or invalid in .env or Netlify settings.");
      setIsAuthReady(true); // Allow app to render without Firebase
    }
  }, []); // Empty array ensures this runs only once

  const handleSearch = (criteria) => {
    setSearchCriteria(criteria);
    setPage('searchResults');
  };

  const handleGoHome = () => {
    setPage('home');
    setSearchCriteria(null);
  };

  return (
    <div className="font-inter bg-white min-h-screen flex flex-col">
      <Header 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        auth={auth}
        user={user}
      />
      
      <main className="flex-grow">
        {!isAuthReady ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-lg text-gray-600">Authenticating...</p>
          </div>
        ) : !db ? (
          <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
             <p className="text-lg text-red-600">
              Failed to connect to the database. <br/>
              Please ensure <strong>VITE_FIREBASE_CONFIG</strong> is set correctly in your Netlify environment variables.
            </p>
          </div>
        ) : page === 'home' ? (
          <Home 
            onSearch={handleSearch} 
            db={db} 
            appId={appId} 
          />
        ) : (
          <SearchResults 
            db={db} 
            appId={appId} 
            criteria={searchCriteria} 
            onGoHome={handleGoHome}
          />
        )}
      </main>
      
      <Footer />
    </div>
  );
}
