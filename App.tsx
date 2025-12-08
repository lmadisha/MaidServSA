import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import { User, UserRole, Job, JobStatus, Application, ApplicationStatus, Message, Review, Notification, PaymentType, JobHistoryEntry, ExperienceAnswer } from './types';
import { generateJobDescription, analyzeCandidateMatch } from './services/geminiService';
import { IconCalendar, IconCheckCircle, IconHome, IconMapPin, IconMessageSquare, IconSparkles, IconUser, IconXCircle, IconSend, IconStar, IconBell, IconChevronLeft, IconChevronRight, IconClock, IconLock, IconMail, IconLogOut, IconInfo, IconAlertTriangle, IconAlertCircle, IconFileText, IconEdit } from './components/Icons';

// --- MOCK DATA ---
const MOCK_USERS: User[] = [
  { id: 'client1', name: 'Sarah Connor', email: 'sarah@example.com', role: UserRole.CLIENT, avatar: 'https://picsum.photos/200/200?random=1', rating: 4.8, ratingCount: 12, location: 'Cape Town', firstName: 'Sarah', surname: 'Connor', nationality: 'South African', residencyStatus: 'Citizen (Born)' },
  { id: 'maid1', name: 'Martha Kent', email: 'martha@example.com', role: UserRole.MAID, avatar: 'https://picsum.photos/200/200?random=2', rating: 4.9, ratingCount: 24, bio: 'Experienced cleaner with 10 years in luxury homes. Specialized in deep cleaning.', location: 'Cape Town', firstName: 'Martha', surname: 'Kent', nationality: 'South African', residencyStatus: 'Permanent Resident' },
  { id: 'maid2', name: 'Diana Prince', email: 'diana@example.com', role: UserRole.MAID, avatar: 'https://picsum.photos/200/200?random=3', rating: 5.0, ratingCount: 8, bio: 'Fast, efficient, and reliable. I bring my own eco-friendly supplies.', location: 'Johannesburg', firstName: 'Diana', surname: 'Prince', nationality: 'Zimbabwean', residencyStatus: 'Work Visa' },
  { id: 'admin1', name: 'System Admin', email: 'admin@maidservsa.com', role: UserRole.ADMIN, avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D9488&color=fff', rating: 5.0, ratingCount: 0, location: 'HQ', nationality: 'South African', residencyStatus: 'Citizen (Born)' },
];

const MAID_EXPERIENCE_QUESTIONS = [
  { id: 'q1', text: "How many years of professional cleaning experience do you have?" },
  { id: 'q2', text: "Are you comfortable working in homes with pets?" },
  { id: 'q3', text: "Do you have experience with deep cleaning or specialized surfaces (e.g., marble, hardwood)?" },
  { id: 'q4', text: "Are you available for weekend shifts?" }
];

const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Antiguans", "Argentinean", "Armenian", "Australian", "Austrian", "Azerbaijani",
  "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Barbudans", "Batswana", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese", "Bolivian", "Bosnian", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe", "Burmese", "Burundian",
  "Cambodian", "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", "Chilean", "Chinese", "Colombian", "Comoran", "Congolese", "Costa Rican", "Croatian", "Cuban", "Cypriot", "Czech",
  "Danish", "Djibouti", "Dominican", "Dutch",
  "East Timorese", "Ecuadorian", "Egyptian", "Emirati", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian", "Fijian", "Filipino", "Finnish", "French", "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan", "Guinea-Bissauan", "Guinean", "Guyanese", "Haitian", "Herzegovinian", "Honduran", "Hungarian", "I-Kiribati", "Icelander", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli", "Italian", "Ivorian", "Jamaican", "Japanese", "Jordanian", "Kazakhstani", "Kenyan", "Kittian and Nevisian", "Kuwaiti", "Kyrgyz", "Laotian", "Latvian", "Lebanese", "Liberian", "Libyan", "Liechtensteiner", "Lithuanian", "Luxembourger", "Macedonian", "Malagasy", "Malawian", "Malaysian", "Maldivian", "Malian", "Maltese", "Marshallese", "Mauritanian", "Mauritian", "Mexican", "Micronesian", "Moldovan", "Monacan", "Mongolian", "Moroccan", "Mosotho", "Motswana", "Mozambican", "Namibian", "Nauruan", "Nepalese", "New Zealander", "Ni-Vanuatu", "Nicaraguan", "Nigerian", "Nigerien", "North Korean", "Northern Irish", "Norwegian", "Omani", "Pakistani", "Palauan", "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian", "Polish", "Portuguese", "Qatari", "Romanian", "Russian", "Rwandan", "Saint Lucian", "Salvadoran", "Samoan", "San Marinese", "Sao Tomean", "Saudi", "Scottish", "Senegalese", "Serbian", "Seychellois", "Sierra Leonean", "Singaporean", "Slovakian", "Slovenian", "Solomon Islander", "Somali", "South African", "South Korean", "Spanish", "Sri Lankan", "Sudanese", "Surinamer", "Swazi", "Swedish", "Swiss", "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese", "Tongan", "Trinidadian or Tobagonian", "Tunisian", "Turkish", "Tuvaluan",
  "Ugandan", "Ukrainian", "Uruguayan", "Uzbekistani", "Venezuelan", "Vietnamese", "Welsh", "Yemenite", "Zambian", "Zimbabwean"
];

const RESIDENCY_STATUSES = [
  "Citizen (Born)",
  "Citizen (Naturalized)",
  "Permanent Resident",
  "Work Visa",
  "Study Visa",
  "Spousal Visa",
  "Refugee Status",
  "Other"
];

const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);

const MOCK_JOBS: Job[] = [
  {
    id: 'job1',
    clientId: 'client1',
    title: 'Deep Clean for 3 Bed Apartment',
    description: 'Looking for a thorough spring clean. Focus on bathrooms and kitchen windows.',
    location: 'Sea Point, Cape Town',
    areaSize: 120,
    price: 800,
    currency: 'R',
    date: tomorrow.toISOString().split('T')[0],
    status: JobStatus.OPEN,
    rooms: 3,
    bathrooms: 2,
    images: ['https://picsum.photos/800/600?random=10'],
    paymentType: PaymentType.FIXED,
    startTime: '08:00',
    endTime: '16:00',
    duration: 8,
    workDates: [tomorrow.toISOString().split('T')[0]],
    history: [
      { status: JobStatus.OPEN, timestamp: new Date(today.getTime() - 86400000).toISOString(), note: 'Job posted' }
    ]
  },
  {
    id: 'job2',
    clientId: 'client1',
    title: 'Weekly Maintenance Clean',
    description: 'Regular cleaning needed for a small studio. Dusting, mopping, and laundry.',
    location: 'City Bowl, Cape Town',
    areaSize: 45,
    price: 50, // Hourly rate example
    currency: 'R',
    date: nextWeek.toISOString().split('T')[0],
    status: JobStatus.OPEN,
    rooms: 1,
    bathrooms: 1,
    images: ['https://picsum.photos/800/600?random=11'],
    paymentType: PaymentType.HOURLY,
    startTime: '09:00',
    endTime: '12:00',
    duration: 3,
    workDates: [nextWeek.toISOString().split('T')[0]],
    history: [
      { status: JobStatus.OPEN, timestamp: new Date().toISOString(), note: 'Job posted' }
    ]
  },
];

// --- COMPONENTS ---

const Navbar: React.FC<{ 
  currentUser: User | null; 
  notifications: Notification[]; 
  onLogout: () => void;
  onMarkNotificationsRead: () => void;
}> = ({ currentUser, notifications, onLogout, onMarkNotificationsRead }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const myNotifications = currentUser ? notifications
    .filter(n => n.userId === currentUser.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];
  
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
  };

  const handleToggleProfile = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotifications(false);
  }

  const getNotificationIcon = (type: string) => {
      switch (type) {
          case 'success': return <IconCheckCircle className="w-5 h-5 text-green-500" />;
          case 'warning': return <IconAlertTriangle className="w-5 h-5 text-yellow-500" />;
          case 'error': return <IconAlertCircle className="w-5 h-5 text-red-500" />;
          default: return <IconInfo className="w-5 h-5 text-teal-500" />;
      }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <IconSparkles className="h-8 w-8 text-teal-600 mr-2" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">MaidServ<span className="text-teal-600">SA</span></span>
          </div>
          <div className="flex items-center space-x-4">
            
            {currentUser && (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button 
                    onClick={handleToggleNotifications}
                    className="relative p-2 text-gray-600 hover:text-teal-600 transition-colors focus:outline-none"
                  >
                    <IconBell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
                    )}
                  </button>

                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                          <div className="flex gap-2 items-center">
                             <span className="text-xs text-gray-500">{myNotifications.length} Total</span>
                             {unreadCount > 0 && (
                                <button onClick={onMarkNotificationsRead} className="text-xs text-teal-600 hover:text-teal-800 font-medium">
                                    Mark all read
                                </button>
                             )}
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {myNotifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-500">
                              No notifications yet
                            </div>
                          ) : (
                            myNotifications.map(notification => (
                              <div 
                                key={notification.id} 
                                className={`px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-teal-50/30' : ''}`}
                              >
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 mt-0.5 mr-3">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-800">{notification.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(notification.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(notification.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <button onClick={handleToggleProfile} className="flex items-center space-x-3 focus:outline-none">
                    <span className="text-sm font-medium text-gray-700 hidden md:block">{currentUser.name}</span>
                    <img src={currentUser.avatar} alt="Profile" className="h-8 w-8 rounded-full object-cover border border-gray-200" />
                  </button>

                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 py-1">
                        <Link 
                          to="/profile" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          Your Profile
                        </Link>
                        <button 
                          onClick={() => { setShowProfileMenu(false); onLogout(); }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {!currentUser && (
              <button 
                onClick={() => navigate('/auth')}
                className="text-sm font-medium text-white bg-teal-600 px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const ProfilePage: React.FC<{ user: User; onUpdate: (u: User) => void }> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState<Partial<User>>({ ...user });
  const [answers, setAnswers] = useState<{[key:string]: string}>({});
  const [cvFile, setCvFile] = useState<File | null>(null);

  useEffect(() => {
    setFormData({...user});
    if (user.experienceAnswers) {
      const ans: {[key:string]:string} = {};
      user.experienceAnswers.forEach(a => ans[a.questionId] = a.answer);
      setAnswers(ans);
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct display name
    const newName = `${formData.firstName || ''} ${formData.surname || ''}`.trim() || formData.name;

    let updatedUser: User = {
      ...user,
      ...formData,
      name: newName || user.name, // Fallback
    };

    if (user.role === UserRole.MAID) {
      const expAnswers: ExperienceAnswer[] = MAID_EXPERIENCE_QUESTIONS.map(q => ({
        questionId: q.id,
        question: q.text,
        answer: answers[q.id] || ''
      }));
      updatedUser.experienceAnswers = expAnswers;
      
      if (cvFile) {
        updatedUser.cvFileName = cvFile.name;
      }
    }

    onUpdate(updatedUser);
    alert('Profile updated successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Settings</h3>
          {user.role === UserRole.MAID && <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">Service Provider Account</span>}
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Personal Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input type="text" name="firstName" value={formData.firstName || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                <input type="text" name="middleName" value={formData.middleName || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Surname</label>
                <input type="text" name="surname" value={formData.surname || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Place of Birth</label>
                <input type="text" name="placeOfBirth" value={formData.placeOfBirth || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nationality</label>
                <select
                  name="nationality"
                  value={formData.nationality || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900"
                >
                  <option value="">Select Nationality</option>
                  {NATIONALITIES.map((nat) => (
                    <option key={nat} value={nat}>{nat}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Residency / Visa Status</label>
                <select
                  name="residencyStatus"
                  value={formData.residencyStatus || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900"
                >
                  <option value="">Select Status</option>
                  {RESIDENCY_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Residential Address</label>
                <input type="text" name="address" value={formData.address || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Bio</label>
                <textarea rows={3} name="bio" value={formData.bio || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900" placeholder="Tell us a bit about yourself..." />
              </div>
            </div>
          </div>

          {/* Maid Specifics */}
          {user.role === UserRole.MAID && (
            <>
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Experience & Qualifications</h4>
                <div className="space-y-4">
                  {MAID_EXPERIENCE_QUESTIONS.map((q) => (
                    <div key={q.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{q.text}</label>
                      <input 
                        type="text" 
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900"
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Documents</h4>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <IconFileText className="h-8 w-8 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Curriculum Vitae (CV)</p>
                      {formData.cvFileName ? (
                        <p className="text-xs text-teal-600">Current: {formData.cvFileName}</p>
                      ) : (
                        <p className="text-xs text-gray-500">No file uploaded</p>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button type="button" className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                      {cvFile ? 'Change File' : 'Upload CV'}
                    </button>
                  </div>
                </div>
                {cvFile && <p className="mt-2 text-xs text-green-600">Selected: {cvFile.name}</p>}
              </div>
            </>
          )}

          <div className="pt-5 border-t border-gray-200 flex justify-end">
            <button type="button" onClick={() => window.history.back()} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none mr-3">
              Cancel
            </button>
            <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ... JobHistoryList, CalendarInput, CalendarView, RatingModal, AuthPage, LandingPage ...
// (Keeping existing implementations)

const JobHistoryList: React.FC<{ history: JobHistoryEntry[] }> = ({ history }) => {
  if (!history || history.length === 0) return null;
  const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center mb-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Job History</h4>
        <div className="ml-2 h-px bg-gray-200 flex-1"></div>
      </div>
      <div className="space-y-3 relative before:absolute before:inset-0 before:ml-1.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
        {sortedHistory.map((entry, idx) => (
          <div key={idx} className="relative flex items-start group">
             <div className="absolute left-0 mt-1 h-3 w-3 rounded-full border-2 border-white bg-gray-300 group-hover:bg-teal-500 transition-colors shadow-sm"></div>
             <div className="ml-6 w-full">
                <div className="flex justify-between items-start">
                   <span className={`text-xs font-medium ${
                      entry.status === JobStatus.COMPLETED ? 'text-green-600' :
                      entry.status === JobStatus.CANCELLED ? 'text-red-600' :
                      entry.status === JobStatus.IN_PROGRESS ? 'text-blue-600' :
                      'text-gray-700'
                   }`}>
                      {entry.status.replace('_', ' ')}
                   </span>
                   <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                      {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </span>
                </div>
                {entry.note && <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ... CalendarInput ...
// (Keeping existing implementation, abbreviating for space in this XML block but full content is assumed preserved by the user's tool)
const CalendarInput: React.FC<{
  selectedDates: string[];
  onChange: (dates: string[]) => void;
}> = ({ selectedDates, onChange }) => {
  // ... existing implementation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const getDateStr = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  useEffect(() => {
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, []);
  const handleDateAction = (day: number) => {
    const dateStr = getDateStr(year, month, day);
    const isSelected = selectedDates.includes(dateStr);
    if (isDragging) {
      if (dragMode === 'add' && !isSelected) onChange([...selectedDates, dateStr].sort());
      else if (dragMode === 'remove' && isSelected) onChange(selectedDates.filter(d => d !== dateStr));
    }
  };
  const handleMouseDown = (day: number) => {
    const dateStr = getDateStr(year, month, day);
    const isSelected = selectedDates.includes(dateStr);
    setIsDragging(true);
    setDragMode(isSelected ? 'remove' : 'add');
    if (isSelected) onChange(selectedDates.filter(d => d !== dateStr));
    else onChange([...selectedDates, dateStr].sort());
  };
  return (
     <div className="bg-white border border-gray-200 rounded-lg p-4 select-none">
        <div className="flex justify-between items-center mb-4">
           <span className="font-semibold text-gray-700">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
           <div className="flex gap-1">
             <button type="button" onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-gray-100 rounded"><IconChevronLeft className="w-5 h-5 text-gray-600"/></button>
             <button type="button" onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-gray-100 rounded"><IconChevronRight className="w-5 h-5 text-gray-600"/></button>
           </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
           {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-xs font-bold text-gray-400">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
           {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
           {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = getDateStr(year, month, day);
              const isSelected = selectedDates.includes(dateStr);
              return (
                 <div key={day} onMouseDown={() => handleMouseDown(day)} onMouseEnter={() => handleDateAction(day)} className={`h-8 w-8 rounded-full flex items-center justify-center text-sm cursor-pointer transition-colors ${isSelected ? 'bg-teal-600 text-white' : 'hover:bg-teal-50 text-gray-700'}`}>{day}</div>
              )
           })}
        </div>
        <div className="mt-3 text-xs text-gray-400 text-center flex items-center justify-center"><IconSparkles className="w-3 h-3 mr-1" />Click or drag to select multiple dates</div>
     </div>
  )
}

// ... CalendarView, RatingModal ...
// (Keeping existing implementations)
const CalendarView: React.FC<{ applications: Application[]; jobs: Job[]; currentUserId: string; }> = ({ applications, jobs, currentUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const myApps = applications.filter(a => a.maidId === currentUserId);
  const getEventsForDay = (day: number) => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return myApps.filter(app => {
      const job = jobs.find(j => j.id === app.jobId);
      return job?.workDates?.includes(dateStr);
    }).map(app => ({ app, job: jobs.find(j => j.id === app.jobId)! }));
  };
  const changeMonth = (offset: number) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in-down">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900">{currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}</h2>
        <div className="flex space-x-2">
           <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><IconChevronLeft className="w-5 h-5"/></button>
           <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><IconChevronRight className="w-5 h-5"/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="h-28 bg-gray-50/50 rounded-lg"></div>)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const events = getEventsForDay(day);
          const hasConfirmed = events.some(e => e.app.status === ApplicationStatus.ACCEPTED);
          const isConflict = events.length > 1;
          return (
             <div key={day} className={`h-28 border rounded-lg p-2 text-xs relative overflow-hidden transition-all hover:shadow-md ${hasConfirmed ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'} ${isConflict ? 'ring-2 ring-red-300' : ''}`}>
                <span className={`font-medium ${hasConfirmed ? 'text-green-800' : 'text-gray-700'}`}>{day}</span>
                <div className="mt-1 space-y-1">
                  {events.map((e, idx) => (
                    <div key={idx} className={`truncate px-1.5 py-1 rounded text-[10px] font-medium ${e.app.status === ApplicationStatus.ACCEPTED ? 'bg-green-200 text-green-900' : e.app.status === ApplicationStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>{e.job.title}</div>
                  ))}
                  {isConflict && <div className="text-[10px] text-red-600 font-bold text-center mt-1">! Conflict</div>}
                </div>
             </div>
          );
        })}
      </div>
      <div className="mt-6 flex gap-4 text-xs text-gray-500">
          <div className="flex items-center"><div className="w-3 h-3 bg-green-200 rounded mr-2"></div> Confirmed Booking</div>
          <div className="flex items-center"><div className="w-3 h-3 bg-yellow-100 rounded mr-2"></div> Pending Application</div>
          <div className="flex items-center"><div className="w-3 h-3 border-2 border-red-300 rounded mr-2"></div> Potential Conflict</div>
      </div>
    </div>
  );
};

const RatingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  targetName: string;
}> = ({ isOpen, onClose, onSubmit, targetName }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100"><IconStar className="h-6 w-6 text-yellow-600" filled /></div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Rate {targetName}</h3>
              <div className="mt-4 flex justify-center space-x-1">{[1, 2, 3, 4, 5].map((star) => (<button key={star} type="button" className="focus:outline-none" onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(star)}><IconStar className={`h-8 w-8 ${star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'}`} filled={star <= (hoverRating || rating)} /></button>))}</div>
              <div className="mt-4"><textarea rows={3} className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 border rounded-md p-2" placeholder="Leave a comment (optional)..." value={comment} onChange={(e) => setComment(e.target.value)} /></div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6 flex gap-2">
            <button type="button" className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:text-sm" onClick={onClose}>Cancel</button>
            <button type="button" disabled={rating === 0} className={`inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:text-sm ${rating === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => { onSubmit(rating, comment); setRating(0); setComment(''); onClose(); }}>Submit</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... AuthPage, LandingPage, ClientDashboard, MaidDashboard, AdminDashboard, ChatPage ...
// (These components are generally unchanged except for linking to profile logic if needed, but Profile is global via Navbar)

const AuthPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  // ... existing implementation
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLogin) {
      const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        onLogin(user);
        navigate(user.role === UserRole.CLIENT ? '/client/dashboard' : user.role === UserRole.MAID ? '/maid/dashboard' : '/admin/dashboard');
      } else { setError('Invalid email or password.'); }
    } else {
      if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
      const newUser: User = {
        id: `user_${Date.now()}`,
        name,
        email,
        role,
        avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
        rating: 0,
        ratingCount: 0,
        location: 'Unknown',
        bio: 'New user'
      };
      onLogin(newUser);
      navigate(newUser.role === UserRole.CLIENT ? '/client/dashboard' : '/maid/dashboard');
    }
  };
  const handleQuickLogin = (email: string) => {
    const user = MOCK_USERS.find(u => u.email === email);
    if (user) {
      onLogin(user);
      navigate(user.role === UserRole.CLIENT ? '/client/dashboard' : user.role === UserRole.MAID ? '/maid/dashboard' : '/admin/dashboard');
    }
  };
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center"><IconSparkles className="h-8 w-8 text-teal-600" /></div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{isLogin ? 'Sign in to your account' : 'Create a new account'}</h2>
          <p className="mt-2 text-sm text-gray-600">Or{' '}<button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-medium text-teal-600 hover:text-teal-500">{isLogin ? 'start your 14-day free trial' : 'sign in to your existing account'}</button></p>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm text-center">{error}</div>}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (<div><label className="sr-only">Full Name</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IconUser className="h-5 w-5 text-gray-400" /></div><input type="text" required className="appearance-none rounded-lg relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} /></div></div>)}
            <div><label className="sr-only">Email address</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IconMail className="h-5 w-5 text-gray-400" /></div><input type="email" required className="appearance-none rounded-lg relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
            <div><label className="sr-only">Password</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IconLock className="h-5 w-5 text-gray-400" /></div><input type="password" required className="appearance-none rounded-lg relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div>
            {!isLogin && (<div><label className="block text-sm font-medium text-gray-700 mb-1">I want to:</label><div className="flex gap-4"><label className="flex items-center"><input type="radio" name="role" className="form-radio text-teal-600" checked={role === UserRole.CLIENT} onChange={() => setRole(UserRole.CLIENT)} /><span className="ml-2 text-sm text-gray-700">Hire a Maid</span></label><label className="flex items-center"><input type="radio" name="role" className="form-radio text-teal-600" checked={role === UserRole.MAID} onChange={() => setRole(UserRole.MAID)} /><span className="ml-2 text-sm text-gray-700">Find Work</span></label></div></div>)}
          </div>
          <div><button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">{isLogin ? 'Sign in' : 'Create Account'}</button></div>
        </form>
        {isLogin && (<div className="mt-6"><div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Quick Demo Login</span></div></div><div className="mt-6 grid grid-cols-3 gap-3"><button onClick={() => handleQuickLogin('sarah@example.com')} className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-xs font-medium text-gray-500 hover:bg-gray-50">Client</button><button onClick={() => handleQuickLogin('martha@example.com')} className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-xs font-medium text-gray-500 hover:bg-gray-50">Maid</button><button onClick={() => handleQuickLogin('admin@maidservsa.com')} className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-xs font-medium text-gray-500 hover:bg-gray-50">Admin</button></div></div>)}
      </div>
    </div>
  );
};

const LandingPage: React.FC<{ currentUser: User | null }> = ({ currentUser }) => {
  const navigate = useNavigate();
  return (
    <div className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            <div className="sm:text-center lg:text-left">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl"><span className="block xl:inline">Premium cleaning services</span>{' '}<span className="block text-teal-600 xl:inline">for your home</span></h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">Connect with verified, professional maids in your area. Smart matching powered by AI ensures you find the perfect help for your home.</p>
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                {!currentUser ? (<div className="rounded-md shadow"><button onClick={() => navigate('/auth')} className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 md:py-4 md:text-lg">Get Started</button></div>) : (<div className="rounded-md shadow"><button onClick={() => navigate(currentUser.role === UserRole.CLIENT ? '/client/dashboard' : currentUser.role === UserRole.MAID ? '/maid/dashboard' : '/admin/dashboard')} className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 md:py-4 md:text-lg">Go to Dashboard</button></div>)}
              </div>
            </div>
          </main>
        </div>
      </div>
      <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2"><img className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full" src="https://images.unsplash.com/photo-1581578731117-104f2a863a30?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" alt="Cleaning home" /></div>
    </div>
  );
};

const ClientDashboard: React.FC<{
  user: User;
  jobs: Job[];
  applications: Application[];
  users: User[];
  reviews: Review[];
  onPostJob: (job: Job) => void;
  onAcceptApplication: (appId: string, jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onCompleteJob: (jobId: string) => void;
  onRateUser: (jobId: string, revieweeId: string, rating: number, comment: string) => void;
}> = ({ user, jobs, applications, users, reviews, onPostJob, onAcceptApplication, onCancelJob, onCompleteJob, onRateUser }) => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'post'>('jobs');
  const [newJob, setNewJob] = useState<Partial<Job>>({ rooms: 1, bathrooms: 1, areaSize: 50, location: '', price: 300, paymentType: PaymentType.FIXED });
  const [requirements, setRequirements] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{jobId: string, userId: string, name: string} | null>(null);
  const myJobs = jobs.filter(j => j.clientId === user.id);
  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    const desc = await generateJobDescription(newJob.rooms || 0, newJob.bathrooms || 0, newJob.areaSize || 0, newJob.location || '', requirements);
    setNewJob(prev => ({ ...prev, description: desc, title: `${newJob.rooms} Bed / ${newJob.bathrooms} Bath Clean in ${newJob.location}` }));
    setIsGenerating(false);
  };
  const handleSubmitJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.description || selectedDates.length === 0) { alert("Please fill in all fields and select at least one date."); return; }
    const job: Job = {
      id: `job_${Date.now()}`, clientId: user.id, title: newJob.title!, description: newJob.description!, location: newJob.location!, areaSize: newJob.areaSize!, price: newJob.price!, currency: 'R', date: selectedDates[0], status: JobStatus.OPEN, rooms: newJob.rooms!, bathrooms: newJob.bathrooms!, images: [], paymentType: newJob.paymentType!, startTime: '08:00', endTime: '12:00', duration: 4, workDates: selectedDates, history: [{ status: JobStatus.OPEN, timestamp: new Date().toISOString(), note: 'Job created' }]
    };
    onPostJob(job); setActiveTab('jobs'); setSelectedDates([]); setRequirements('');
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-900">Client Dashboard</h2><div className="flex space-x-4"><button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 rounded-lg ${activeTab === 'jobs' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700'}`}>My Jobs</button><button onClick={() => setActiveTab('post')} className={`px-4 py-2 rounded-lg ${activeTab === 'post' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700'}`}>Post New Job</button></div></div>
      {activeTab === 'post' ? (
        <div className="bg-white shadow rounded-lg p-6">
           <form onSubmit={handleSubmitJob} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-gray-700">Location</label><input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Price (R)</label><input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border" value={newJob.price} onChange={e => setNewJob({...newJob, price: Number(e.target.value)})} /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700">Rooms</label><input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border" value={newJob.rooms} onChange={e => setNewJob({...newJob, rooms: Number(e.target.value)})} /></div><div><label className="block text-sm font-medium text-gray-700">Bathrooms</label><input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border" value={newJob.bathrooms} onChange={e => setNewJob({...newJob, bathrooms: Number(e.target.value)})} /></div></div>
                <div><label className="block text-sm font-medium text-gray-700">Size (sqm)</label><input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border" value={newJob.areaSize} onChange={e => setNewJob({...newJob, areaSize: Number(e.target.value)})} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Select Dates</label><CalendarInput selectedDates={selectedDates} onChange={setSelectedDates} /></div>
              <div><label className="block text-sm font-medium text-gray-700">Specific Requirements (for AI generation)</label><textarea className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border" rows={3} value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="e.g. Need deep cleaning for windows, have pets..." /></div>
              <div className="flex justify-end"><button type="button" onClick={handleGenerateDescription} disabled={isGenerating} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"><IconSparkles className="mr-2 h-5 w-5 text-yellow-500" />{isGenerating ? 'Generating...' : 'Generate Description with AI'}</button></div>
              <div><label className="block text-sm font-medium text-gray-700">Job Title</label><input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border" value={newJob.title || ''} onChange={e => setNewJob({...newJob, title: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700">Description</label><textarea className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border" rows={5} value={newJob.description || ''} onChange={e => setNewJob({...newJob, description: e.target.value})} /></div>
              <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none">Post Job</button>
           </form>
        </div>
      ) : (
        <div className="space-y-6">
            {myJobs.length === 0 && <div className="text-center text-gray-500 py-10">No jobs posted yet.</div>}
            {myJobs.map(job => (
                <div key={job.id} className="bg-white shadow rounded-lg p-6">
                    <div className="flex justify-between items-start"><div><h3 className="text-lg font-medium text-gray-900">{job.title}</h3><p className="text-sm text-gray-500 mt-1">{job.location} • {job.rooms} Bed, {job.bathrooms} Bath</p><p className="text-sm text-gray-500">{job.workDates.length} days • R{job.price}</p></div><span className={`px-2 py-1 text-xs font-semibold rounded-full ${job.status === JobStatus.OPEN ? 'bg-green-100 text-green-800' : job.status === JobStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' : job.status === JobStatus.COMPLETED ? 'bg-gray-800 text-white' : 'bg-red-100 text-red-800'}`}>{job.status}</span></div>
                    {job.status === JobStatus.OPEN && (<div className="mt-6 border-t border-gray-200 pt-4"><h4 className="text-sm font-medium text-gray-900 mb-3">Applications</h4><div className="space-y-3">{applications.filter(a => a.jobId === job.id && a.status === ApplicationStatus.PENDING).map(app => { const maid = users.find(u => u.id === app.maidId); if (!maid) return null; return (<div key={app.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"><div className="flex items-center"><img src={maid.avatar} alt="" className="h-10 w-10 rounded-full" /><div className="ml-3"><p className="text-sm font-medium text-gray-900">{maid.name}</p><p className="text-xs text-gray-500">Rating: {maid.rating.toFixed(1)} ★</p><p className="text-xs text-gray-600 mt-1">"{app.message}"</p></div></div><div className="flex gap-2"><Link to={`/chat/${app.id}`} className="p-2 text-gray-400 hover:text-gray-600"><IconMessageSquare className="w-5 h-5"/></Link><button onClick={() => onAcceptApplication(app.id, job.id)} className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700">Accept</button></div></div>) })}{applications.filter(a => a.jobId === job.id && a.status === ApplicationStatus.PENDING).length === 0 && (<p className="text-xs text-gray-500 italic">No pending applications.</p>)}</div></div>)}
                    {job.status === JobStatus.IN_PROGRESS && (<div className="mt-6 border-t border-gray-200 pt-4 flex justify-between items-center"><div className="flex items-center"><span className="text-sm text-gray-500 mr-2">Assigned to:</span><span className="text-sm font-medium">{users.find(u => u.id === job.assignedMaidId)?.name}</span><Link to={`/chat/${applications.find(a => a.jobId === job.id && a.status === ApplicationStatus.ACCEPTED)?.id}`} className="ml-2 text-teal-600 hover:text-teal-800"><IconMessageSquare className="w-5 h-5"/></Link></div><div className="flex gap-2"><button onClick={() => onCompleteJob(job.id)} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Mark Completed</button></div></div>)}
                    {job.status === JobStatus.COMPLETED && !reviews.some(r => r.jobId === job.id && r.reviewerId === user.id) && (<div className="mt-4 flex justify-end"><button onClick={() => { const maid = users.find(u => u.id === job.assignedMaidId); if(maid) { setRatingTarget({ jobId: job.id, userId: maid.id, name: maid.name }); setRatingModalOpen(true); } }} className="text-sm text-teal-600 hover:text-teal-800 font-medium">Rate Service</button></div>)}
                    <JobHistoryList history={job.history} />
                </div>
            ))}
        </div>
      )}
      {ratingTarget && (<RatingModal isOpen={ratingModalOpen} onClose={() => setRatingModalOpen(false)} targetName={ratingTarget.name} onSubmit={(rating, comment) => onRateUser(ratingTarget.jobId, ratingTarget.userId, rating, comment)} />)}
    </div>
  );
};

// ... MaidDashboard, AdminDashboard, ChatPage ...
const MaidDashboard: React.FC<{
  user: User;
  jobs: Job[];
  applications: Application[];
  reviews: Review[];
  users: User[];
  onApply: (jobId: string, message: string) => void;
  onCancelBooking: (appId: string) => void;
  onRateUser: (jobId: string, revieweeId: string, rating: number, comment: string) => void;
}> = ({ user, jobs, applications, reviews, users, onApply, onCancelBooking, onRateUser }) => {
  const [activeTab, setActiveTab] = useState<'find' | 'schedule' | 'history'>('find');
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null);
  const [matchAnalysis, setMatchAnalysis] = useState<{[key:string]: string}>({});
  const [applicationMsg, setApplicationMsg] = useState('');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const availableJobs = jobs.filter(j => j.status === JobStatus.OPEN);
  const handleAnalyze = async (job: Job) => {
      setAnalyzingJobId(job.id);
      const analysis = await analyzeCandidateMatch(job.description, user.bio || '');
      setMatchAnalysis(prev => ({...prev, [job.id]: analysis}));
      setAnalyzingJobId(null);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-900">Maid Dashboard</h2><div className="flex space-x-2"><button onClick={() => setActiveTab('find')} className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'find' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700'}`}>Find Work</button><button onClick={() => setActiveTab('schedule')} className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'schedule' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700'}`}>My Schedule</button><button onClick={() => setActiveTab('history')} className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'history' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700'}`}>History</button></div></div>
      {activeTab === 'find' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableJobs.map(job => {
                const hasApplied = applications.some(a => a.jobId === job.id && a.maidId === user.id);
                return (
                    <div key={job.id} className="bg-white rounded-lg shadow p-6 flex flex-col"><div className="flex-1"><h3 className="text-lg font-medium text-gray-900">{job.title}</h3><p className="text-sm text-gray-500 mb-4">{job.location}</p><div className="flex items-center text-sm text-gray-600 mb-2"><IconCalendar className="w-4 h-4 mr-2"/>{job.workDates.length} days starting {new Date(job.date).toLocaleDateString()}</div><div className="flex items-center text-sm text-gray-600 mb-2"><IconHome className="w-4 h-4 mr-2"/>{job.rooms} Bed, {job.bathrooms} Bath ({job.areaSize}m²)</div><div className="flex items-center text-sm font-semibold text-teal-600 mb-4">R {job.price}</div>{matchAnalysis[job.id] && (<div className="bg-teal-50 p-3 rounded text-xs text-teal-800 mb-4 italic border border-teal-100"><IconSparkles className="w-3 h-3 inline mr-1" />AI: {matchAnalysis[job.id]}</div>)}</div><div className="mt-4 border-t pt-4">{!hasApplied ? (<div className="space-y-2"><button onClick={() => handleAnalyze(job)} disabled={analyzingJobId === job.id} className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">{analyzingJobId === job.id ? 'Analyzing...' : 'AI Match Check'}</button>{applyingJobId === job.id ? (<div className="space-y-2"><textarea className="w-full text-sm border-gray-300 rounded-md shadow-sm p-2 border" placeholder="Short message to client..." value={applicationMsg} onChange={e => setApplicationMsg(e.target.value)} /><div className="flex gap-2"><button onClick={() => { onApply(job.id, applicationMsg); setApplyingJobId(null); setApplicationMsg(''); }} className="flex-1 bg-teal-600 text-white py-2 rounded text-sm">Send</button><button onClick={() => setApplyingJobId(null)} className="px-3 py-2 border rounded text-sm">Cancel</button></div></div>) : (<button onClick={() => setApplyingJobId(job.id)} className="w-full flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">Apply Now</button>)}</div>) : (<span className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-teal-700 bg-teal-100">Applied</span>)}</div></div>
                );
            })}
        </div>
      )}
      {activeTab === 'schedule' && (<CalendarView applications={applications} jobs={jobs} currentUserId={user.id} />)}
      {activeTab === 'history' && (<div className="bg-white shadow overflow-hidden sm:rounded-md"><ul className="divide-y divide-gray-200">{jobs.filter(j => j.assignedMaidId === user.id).map(job => (<li key={job.id} className="px-6 py-4"><div className="flex flex-col gap-4"><div className="flex items-center justify-between"><div><h4 className="text-lg font-medium text-gray-900">{job.title}</h4><p className="text-sm text-gray-500">{new Date(job.date).toLocaleDateString()} - {job.status}</p></div>{job.status === JobStatus.IN_PROGRESS && (<button onClick={() => { if(window.confirm('Cancel this booking?')) onCancelBooking(applications.find(a => a.jobId === job.id && a.maidId === user.id)?.id || '') }} className="text-red-600 text-sm hover:underline">Cancel Booking</button>)}</div><JobHistoryList history={job.history} /></div></li>))}{jobs.filter(j => j.assignedMaidId === user.id).length === 0 && (<li className="px-6 py-4 text-gray-500 text-center text-sm">No job history yet.</li>)}</ul></div>)}
    </div>
  );
};

const AdminDashboard: React.FC<{ users: User[]; jobs: Job[]; applications: Application[]; onSuspendUser: (userId: string) => void; onCancelJob: (jobId: string) => void; }> = ({ users, jobs, applications, onSuspendUser, onCancelJob }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg overflow-hidden"><div className="px-4 py-5 sm:px-6 border-b border-gray-200"><h3 className="text-lg leading-6 font-medium text-gray-900">Users</h3></div><ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">{users.map((user) => (<li key={user.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50"><div className="flex items-center"><img className="h-10 w-10 rounded-full" src={user.avatar} alt="" /><div className="ml-3"><p className="text-sm font-medium text-gray-900">{user.name}</p><p className="text-sm text-gray-500">{user.email}</p><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' : user.role === UserRole.MAID ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{user.role}</span></div></div>{user.role !== UserRole.ADMIN && (<button onClick={() => onSuspendUser(user.id)} className={`text-sm font-medium ${user.isSuspended ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}`}>{user.isSuspended ? 'Activate' : 'Suspend'}</button>)}</li>))}</ul></div>
        <div className="bg-white shadow rounded-lg overflow-hidden"><div className="px-4 py-5 sm:px-6 border-b border-gray-200"><h3 className="text-lg leading-6 font-medium text-gray-900">Recent Jobs</h3></div><ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">{jobs.map((job) => (<li key={job.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50"><div><p className="text-sm font-medium text-gray-900">{job.title}</p><p className="text-sm text-gray-500">{job.location}</p><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.status === JobStatus.OPEN ? 'bg-green-100 text-green-800' : job.status === JobStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' : job.status === JobStatus.COMPLETED ? 'bg-gray-800 text-white' : 'bg-red-100 text-red-800'}`}>{job.status}</span></div>{job.status === JobStatus.OPEN && (<button onClick={() => onCancelJob(job.id)} className="text-sm font-medium text-red-600 hover:text-red-900">Cancel</button>)}</li>))}</ul></div>
      </div>
    </div>
  );
};

const ChatPage: React.FC<{ user: User; applications: Application[]; jobs: Job[]; users: User[]; messages: Message[]; onSendMessage: (content: string, receiverId: string, jobId: string) => void; }> = ({ user, applications, jobs, users, messages, onSendMessage }) => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const application = applications.find(a => a.id === applicationId);
  const job = application ? jobs.find(j => j.id === application.jobId) : null;
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, applicationId]);
  if (!application || !job) { return (<div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]"><IconAlertCircle className="w-12 h-12 text-gray-400 mb-4" /><h3 className="text-lg font-medium text-gray-900">Chat Unavailable</h3><p className="text-gray-500 mt-2">The requested chat session could not be found.</p><button onClick={() => navigate(-1)} className="mt-6 text-teal-600 hover:text-teal-800">Go Back</button></div>); }
  const otherUserId = user.role === UserRole.CLIENT ? application.maidId : job.clientId;
  const otherUser = users.find(u => u.id === otherUserId);
  const relevantMessages = messages.filter(m => m.jobId === job.id && ((m.senderId === user.id && m.receiverId === otherUserId) || (m.senderId === otherUserId && m.receiverId === user.id))).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const handleSend = (e: React.FormEvent) => { e.preventDefault(); if (!newMessage.trim()) return; onSendMessage(newMessage, otherUserId, job.id); setNewMessage(''); };
  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-64px)] flex flex-col bg-white shadow-xl">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white z-10"><div className="flex items-center"><button onClick={() => navigate(-1)} className="mr-4 text-gray-400 hover:text-gray-600"><IconChevronLeft className="w-6 h-6" /></button><div className="relative"><img src={otherUser?.avatar || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-full" /><span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span></div><div className="ml-3"><h3 className="text-sm font-bold text-gray-900">{otherUser?.name}</h3><p className="text-xs text-gray-500">{job.title}</p></div></div></div>
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">{relevantMessages.length === 0 && (<div className="text-center text-gray-400 text-sm py-10">Start the conversation...</div>)}{relevantMessages.map((msg) => { const isMe = msg.senderId === user.id; return (<div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${isMe ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}><p className="text-sm">{msg.content}</p><p className={`text-[10px] mt-1 text-right ${isMe ? 'text-teal-100' : 'text-gray-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div></div>); })}<div ref={messagesEndRef} /></div>
      <div className="p-4 bg-white border-t border-gray-200"><form onSubmit={handleSend} className="flex gap-2"><input type="text" className="flex-1 rounded-full border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-2" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} /><button type="submit" disabled={!newMessage.trim()} className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"><IconSend className="w-5 h-5" /></button></form></div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactElement; requiredRole?: UserRole; currentUser: User | null; }> = ({ children, requiredRole, currentUser }) => {
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (requiredRole && currentUser.role !== requiredRole && currentUser.role !== UserRole.ADMIN) return <Navigate to="/" replace />;
  return children;
};

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  const navigate = useNavigate();
  const location = useLocation();

  const addNotification = (userId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newNotification: Notification = { id: `notif_${Date.now()}_${Math.random()}`, userId, message, type, read: false, timestamp: new Date().toISOString() };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const handleMarkNotificationsRead = () => { if (currentUser) { setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, read: true } : n)); } };
  const handleLogin = (user: User) => { if (!users.find(u => u.id === user.id)) { setUsers(prev => [...prev, user]); } setCurrentUser(user); };
  const handleLogout = () => { setCurrentUser(null); navigate('/'); };
  const handlePostJob = (job: Job) => { setJobs(prev => [job, ...prev]); };
  
  const handleUpdateProfile = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleApply = (jobId: string, message: string) => {
    if (!currentUser) return;
    const newApp: Application = { id: `app_${Date.now()}`, jobId, maidId: currentUser.id, status: ApplicationStatus.PENDING, message, appliedAt: new Date().toISOString() };
    setApplications(prev => [...prev, newApp]);
    const job = jobs.find(j => j.id === jobId);
    const autoMsg: Message = { id: `msg_${Date.now()}`, senderId: currentUser.id, receiverId: job?.clientId || '', jobId, content: message, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, autoMsg]);
    if (job) { addNotification(job.clientId, `New application received for "${job.title}"`, 'info'); }
  };

  const handleAcceptApplication = (appId: string, jobId: string) => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: ApplicationStatus.ACCEPTED } : a.jobId === jobId ? { ...a, status: ApplicationStatus.REJECTED } : a));
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: JobStatus.IN_PROGRESS, assignedMaidId: applications.find(a=>a.id===appId)?.maidId, history: [...j.history, { status: JobStatus.IN_PROGRESS, timestamp: new Date().toISOString(), note: 'Application accepted' }] } : j));
    const job = jobs.find(j => j.id === jobId);
    if (job) { addNotification(job.clientId, `You have successfully booked a maid for "${job.title}"`, 'success'); }
  };
  
  const handleCancelJob = (jobId: string) => { setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: JobStatus.CANCELLED, history: [...j.history, { status: JobStatus.CANCELLED, timestamp: new Date().toISOString(), note: 'Job cancelled by client' }] } : j)); };
  const handleCompleteJob = (jobId: string) => { setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: JobStatus.COMPLETED, history: [...j.history, { status: JobStatus.COMPLETED, timestamp: new Date().toISOString(), note: 'Job completed' }] } : j)); };
  const handleCancelBooking = (appId: string) => {
      const app = applications.find(a => a.id === appId);
      if(!app) return;
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: ApplicationStatus.CANCELLED } : a));
      setJobs(prev => prev.map(j => j.id === app.jobId ? { ...j, status: JobStatus.OPEN, assignedMaidId: undefined, history: [...j.history, { status: JobStatus.OPEN, timestamp: new Date().toISOString(), note: 'Booking cancelled by maid' }] } : j));
      alert("Booking cancelled. A penalty has been applied to your rating.");
      const job = jobs.find(j => j.id === app.jobId);
      if (job) { addNotification(job.clientId, `URGENT: Booking for "${job.title}" was cancelled by the maid.`, 'error'); }
  };
  const handleRateUser = (jobId: string, revieweeId: string, rating: number, comment: string) => {
    if (!currentUser) return;
    const newReview: Review = { id: `rev_${Date.now()}`, jobId, reviewerId: currentUser.id, revieweeId, rating, comment, createdAt: new Date().toISOString() };
    setReviews(prev => [...prev, newReview]);
    setUsers(prevUsers => prevUsers.map(u => { if (u.id === revieweeId) { const newCount = u.ratingCount + 1; const newAverage = ((u.rating * u.ratingCount) + rating) / newCount; return { ...u, rating: newAverage, ratingCount: newCount }; } return u; }));
    alert("Review submitted successfully!");
  };
  const handleSendMessage = (content: string, receiverId: string, jobId: string) => { if (!currentUser) return; const newMsg: Message = { id: `msg_${Date.now()}_${Math.random()}`, senderId: currentUser.id, receiverId, content, timestamp: new Date().toISOString(), jobId }; setMessages(prev => [...prev, newMsg]); };
  const handleSuspendUser = (userId: string) => { setUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuspended: !u.isSuspended } : u)); };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar currentUser={currentUser} notifications={notifications} onLogout={handleLogout} onMarkNotificationsRead={handleMarkNotificationsRead} />
      <Routes>
        <Route path="/" element={<LandingPage currentUser={currentUser} />} />
        <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />
        <Route path="/client/dashboard" element={<ProtectedRoute requiredRole={UserRole.CLIENT} currentUser={currentUser}><ClientDashboard user={currentUser!} jobs={jobs} applications={applications} users={users} reviews={reviews} onPostJob={handlePostJob} onAcceptApplication={handleAcceptApplication} onCancelJob={handleCancelJob} onCompleteJob={handleCompleteJob} onRateUser={handleRateUser} /></ProtectedRoute>} />
        <Route path="/maid/dashboard" element={<ProtectedRoute requiredRole={UserRole.MAID} currentUser={currentUser}><MaidDashboard user={currentUser!} jobs={jobs} applications={applications} reviews={reviews} users={users} onApply={handleApply} onCancelBooking={handleCancelBooking} onRateUser={handleRateUser} /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole={UserRole.ADMIN} currentUser={currentUser}><AdminDashboard users={users} jobs={jobs} applications={applications} onSuspendUser={handleSuspendUser} onCancelJob={handleCancelJob} /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute currentUser={currentUser}><ProfilePage user={currentUser!} onUpdate={handleUpdateProfile} /></ProtectedRoute>} />
        <Route path="/chat/:applicationId" element={<ProtectedRoute requiredRole={currentUser?.role || UserRole.CLIENT} currentUser={currentUser}><ChatPage user={currentUser!} applications={applications} jobs={jobs} users={users} messages={messages} onSendMessage={handleSendMessage} /></ProtectedRoute>} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;