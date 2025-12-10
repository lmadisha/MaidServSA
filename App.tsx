import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import { User, UserRole, Job, JobStatus, Application, ApplicationStatus, Message, Review, Notification, PaymentType, JobHistoryEntry, ExperienceAnswer } from './types';
import { generateJobDescription, analyzeCandidateMatch } from './services/geminiService';
import { db } from './services/db';
import { IconCalendar, IconCheckCircle, IconHome, IconMapPin, IconMessageSquare, IconSparkles, IconUser, IconXCircle, IconSend, IconStar, IconBell, IconChevronLeft, IconChevronRight, IconClock, IconLock, IconMail, IconLogOut, IconInfo, IconAlertTriangle, IconAlertCircle, IconFileText, IconEdit, IconTrash, IconFilter } from './components/Icons';
import { LocationAutocomplete } from './components/LocationAutocomplete';

// --- DATA CONSTANTS ---
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

  const handleLogoClick = () => {
      if (currentUser) {
          if (currentUser.role === UserRole.CLIENT) navigate('/client/dashboard');
          else if (currentUser.role === UserRole.MAID) navigate('/maid/dashboard');
          else if (currentUser.role === UserRole.ADMIN) navigate('/admin/dashboard');
          else navigate('/');
      } else {
          navigate('/');
      }
  };

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
          <div className="flex items-center cursor-pointer" onClick={handleLogoClick}>
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
                <LocationAutocomplete 
                  name="placeOfBirth" 
                  value={formData.placeOfBirth || ''} 
                  onChange={(val) => setFormData(prev => ({ ...prev, placeOfBirth: val }))} 
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900" 
                />
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
                <LocationAutocomplete 
                  name="address" 
                  value={formData.address || ''} 
                  onChange={(val) => setFormData(prev => ({ ...prev, address: val }))} 
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 bg-white text-gray-900" 
                />
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

const CalendarInput: React.FC<{
  selectedDates: string[];
  onChange: (dates: string[]) => void;
}> = ({ selectedDates, onChange }) => {
  const handleAddDate = () => {
    onChange([...selectedDates, new Date().toISOString().split('T')[0]]);
  };

  const handleDateChange = (index: number, val: string) => {
    const newDates = [...selectedDates];
    newDates[index] = val;
    onChange(newDates);
  };

  const handleRemoveDate = (index: number) => {
    const newDates = selectedDates.filter((_, i) => i !== index);
    onChange(newDates);
  };

  return (
    <div className="space-y-2">
      {selectedDates.map((date, index) => (
        <div key={index} className="flex gap-2">
           <input type="date" value={date} onChange={(e) => handleDateChange(index, e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2" />
           <button type="button" onClick={() => handleRemoveDate(index)} className="text-red-500 hover:text-red-700"><IconTrash className="w-5 h-5"/></button>
        </div>
      ))}
      <button type="button" onClick={handleAddDate} className="text-sm text-teal-600 hover:text-teal-800 font-medium">+ Add Date</button>
    </div>
  );
};

const JobModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Job) => void;
  initialJob?: Job;
  clientId: string;
}> = ({ isOpen, onClose, onSave, initialJob, clientId }) => {
  const [step, setStep] = useState(1);
  const [jobData, setJobData] = useState<Partial<Job>>(initialJob || {
    title: '', description: '', location: '', price: 0, paymentType: PaymentType.FIXED,
    rooms: 1, bathrooms: 1, areaSize: 50, startTime: '09:00', endTime: '17:00', duration: 8, workDates: []
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (initialJob) setJobData(initialJob);
  }, [initialJob]);

  if (!isOpen) return null;

  const handleGenerateDescription = async () => {
    setGenerating(true);
    const desc = await generateJobDescription(
      jobData.rooms || 0,
      jobData.bathrooms || 0,
      jobData.areaSize || 0,
      jobData.location || '',
      jobData.title || 'General cleaning'
    );
    setJobData(prev => ({ ...prev, description: desc }));
    setGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: Job = {
      id: initialJob?.id || `job_${Date.now()}`,
      clientId,
      status: initialJob?.status || JobStatus.OPEN,
      currency: 'R',
      images: [],
      date: jobData.workDates?.[0] || new Date().toISOString(), // Primary date
      history: initialJob?.history || [{ status: JobStatus.OPEN, timestamp: new Date().toISOString(), note: 'Job created' }],
      ...jobData as Job
    };
    onSave(newJob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}><div className="absolute inset-0 bg-gray-500 opacity-75"></div></div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{initialJob ? 'Edit Job' : 'Post a New Job'}</h3>
            
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" value={jobData.title} onChange={e => setJobData({...jobData, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rooms</label>
                  <input type="number" min="0" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" value={jobData.rooms} onChange={e => setJobData({...jobData, rooms: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bathrooms</label>
                  <input type="number" min="0" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" value={jobData.bathrooms} onChange={e => setJobData({...jobData, bathrooms: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Area (sqm)</label>
                  <input type="number" min="0" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" value={jobData.areaSize} onChange={e => setJobData({...jobData, areaSize: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <LocationAutocomplete 
                    required 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" 
                    value={jobData.location || ''} 
                    onChange={(val) => setJobData({...jobData, location: val})} 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                   <label className="block text-sm font-medium text-gray-700">Description</label>
                   <button type="button" onClick={handleGenerateDescription} disabled={generating} className="text-xs text-teal-600 hover:text-teal-800 flex items-center">
                     {generating ? 'Generating...' : <><IconSparkles className="w-3 h-3 mr-1"/> AI Generate</>}
                   </button>
                </div>
                <textarea rows={3} required className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500 sm:text-sm" value={jobData.description} onChange={e => setJobData({...jobData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Type</label>
                    <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" value={jobData.paymentType} onChange={e => setJobData({...jobData, paymentType: e.target.value as PaymentType})}>
                       <option value={PaymentType.FIXED}>Fixed Price</option>
                       <option value={PaymentType.HOURLY}>Hourly Rate</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Price (R)</label>
                    <input type="number" min="0" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" value={jobData.price} onChange={e => setJobData({...jobData, price: parseInt(e.target.value)})} />
                 </div>
              </div>

              {/* Dates */}
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Select Dates</label>
                 <CalendarInput 
                    selectedDates={jobData.workDates || []} 
                    onChange={(dates) => setJobData({...jobData, workDates: dates})} 
                 />
                 <p className="text-xs text-gray-500 mt-1">{jobData.workDates?.length} days selected</p>
              </div>

            </div>

            <div className="mt-5 sm:mt-6 flex gap-2">
               <button type="button" onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:text-sm">Cancel</button>
               <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 sm:text-sm">Save Job</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const CalendarView: React.FC<{
  applications: Application[];
  jobs: Job[];
  currentUserId: string;
}> = ({ applications, jobs, currentUserId }) => {
  const myApps = applications.filter(a => a.maidId === currentUserId && a.status === ApplicationStatus.ACCEPTED);
  const myJobs = myApps.map(app => jobs.find(j => j.id === app.jobId)).filter(j => !!j) as Job[];
  
  myJobs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Schedule</h3>
      </div>
      <ul className="divide-y divide-gray-200">
        {myJobs.map(job => (
          <li key={job.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
               <p className="text-sm font-medium text-teal-600 truncate">{job.title}</p>
               <div className="ml-2 flex-shrink-0 flex">
                  <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {job.status}
                  </p>
               </div>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-gray-500 mr-6">
                  <IconCalendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {new Date(job.date).toLocaleDateString()}
                </p>
                <p className="flex items-center text-sm text-gray-500">
                  <IconClock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {job.startTime} - {job.endTime}
                </p>
              </div>
            </div>
          </li>
        ))}
        {myJobs.length === 0 && <li className="px-4 py-8 text-center text-gray-500">No upcoming jobs scheduled.</li>}
      </ul>
    </div>
  );
};

const MaidDashboard: React.FC<{
  user: User;
  jobs: Job[];
  applications: Application[];
  onApply: (jobId: string, message: string) => void;
}> = ({ user, jobs, applications, onApply }) => {
  const [activeTab, setActiveTab] = useState<'find' | 'schedule'>('find');
  const [filterLocation, setFilterLocation] = useState('');
  
  const openJobs = jobs.filter(j => j.status === JobStatus.OPEN && !applications.find(a => a.jobId === j.id && a.maidId === user.id));
  const myApplications = applications.filter(a => a.maidId === user.id);
  
  const filteredJobs = openJobs.filter(j => 
     j.title.toLowerCase().includes(filterLocation.toLowerCase()) || 
     j.location.toLowerCase().includes(filterLocation.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
         <button className={`pb-2 px-1 text-sm font-medium ${activeTab === 'find' ? 'border-b-2 border-teal-500 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('find')}>Find Work</button>
         <button className={`pb-2 px-1 text-sm font-medium ${activeTab === 'schedule' ? 'border-b-2 border-teal-500 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('schedule')}>My Schedule</button>
      </div>

      {activeTab === 'find' && (
         <div>
            <div className="mb-6 relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 mt-2"><IconFilter className="h-5 w-5 text-gray-400"/></div>
               <LocationAutocomplete 
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm" 
                  placeholder="Search by location or keywords..." 
                  value={filterLocation} 
                  onChange={setFilterLocation} 
               />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
               {filteredJobs.map(job => (
                  <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                     <div className="p-5">
                        <div className="flex justify-between items-start">
                           <h3 className="text-lg font-medium text-gray-900 truncate" title={job.title}>{job.title}</h3>
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                             R{job.price}
                           </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 flex items-center"><IconMapPin className="w-4 h-4 mr-1"/> {job.location}</p>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                           <div className="flex items-center"><IconHome className="w-4 h-4 mr-1"/> {job.rooms} bed, {job.bathrooms} bath</div>
                           <div className="flex items-center"><IconCalendar className="w-4 h-4 mr-1"/> {new Date(job.date).toLocaleDateString()}</div>
                        </div>
                        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{job.description}</p>
                        <div className="mt-5">
                           <button onClick={() => { const msg = prompt('Message to client:'); if(msg !== null) onApply(job.id, msg); }} className="w-full flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">
                              Apply Now
                           </button>
                        </div>
                     </div>
                  </div>
               ))}
               {filteredJobs.length === 0 && <p className="text-center text-gray-500 col-span-full py-8">No jobs found matching your criteria.</p>}
            </div>
         </div>
      )}

      {activeTab === 'schedule' && (
         <div className="space-y-8">
            <CalendarView applications={applications} jobs={jobs} currentUserId={user.id} />
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">My Applications</h3>
              <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                 <ul className="divide-y divide-gray-200">
                    {myApplications.map(app => {
                       const job = jobs.find(j => j.id === app.jobId);
                       if (!job) return null;
                       return (
                          <li key={app.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                             <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-teal-600 truncate">{job.title}</div>
                                <div className="ml-2 flex-shrink-0 flex">
                                   <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      app.status === ApplicationStatus.ACCEPTED ? 'bg-green-100 text-green-800' :
                                      app.status === ApplicationStatus.REJECTED ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                   }`}>
                                      {app.status}
                                   </span>
                                </div>
                             </div>
                             <div className="mt-2 sm:flex sm:justify-between">
                                <div className="sm:flex">
                                   <p className="flex items-center text-sm text-gray-500 mr-6"><IconMapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"/> {job.location}</p>
                                   <p className="flex items-center text-sm text-gray-500"><IconCalendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"/> {new Date(job.date).toLocaleDateString()}</p>
                                </div>
                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                   <Link to={`/chat/${app.id}`} className="text-teal-600 hover:text-teal-900 flex items-center"><IconMessageSquare className="w-4 h-4 mr-1"/> Chat</Link>
                                </div>
                             </div>
                          </li>
                       );
                    })}
                    {myApplications.length === 0 && <li className="px-4 py-8 text-center text-gray-500 text-sm">No applications yet.</li>}
                 </ul>
              </div>
            </div>
         </div>
      )}
    </div>
  );
};

const ApplicantProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User;
}> = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
       <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
         <div className="fixed inset-0 transition-opacity" onClick={onClose}><div className="absolute inset-0 bg-gray-500 opacity-75"></div></div>
         <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                 <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-teal-100 sm:mx-0 sm:h-10 sm:w-10">
                    <IconUser className="h-6 w-6 text-teal-600" />
                 </div>
                 <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{user.name}</h3>
                    <div className="mt-2">
                       <p className="text-sm text-gray-500">{user.bio || "No bio provided."}</p>
                       
                       <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div><span className="font-semibold">Rating:</span> {user.rating.toFixed(1)} ({user.ratingCount})</div>
                          <div><span className="font-semibold">Nationality:</span> {user.nationality || 'N/A'}</div>
                          <div><span className="font-semibold">Languages:</span> {user.languages || 'N/A'}</div>
                          <div><span className="font-semibold">Experience:</span></div>
                       </div>
                       
                       {user.experienceAnswers && (
                          <div className="mt-4 space-y-2">
                             {user.experienceAnswers.map(a => (
                                <div key={a.questionId} className="text-sm">
                                   <p className="font-medium text-gray-700">{a.question}</p>
                                   <p className="text-gray-600">{a.answer}</p>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="button" onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 sm:ml-3 sm:w-auto sm:text-sm">Close</button>
            </div>
         </div>
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
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
       <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
         <div className="fixed inset-0 transition-opacity" onClick={onClose}><div className="absolute inset-0 bg-gray-500 opacity-75"></div></div>
         <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
               <h3 className="text-lg font-medium text-gray-900 mb-4">Rate {targetName}</h3>
               <div className="flex items-center justify-center space-x-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                       <IconStar className={`w-8 h-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`} filled={star <= rating} />
                    </button>
                  ))}
               </div>
               <textarea 
                 className="w-full border border-gray-300 rounded-md p-2" 
                 rows={3} 
                 placeholder="Share your experience..." 
                 value={comment} 
                 onChange={e => setComment(e.target.value)}
               />
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
               <button onClick={() => { onSubmit(rating, comment); onClose(); }} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 sm:ml-3 sm:w-auto sm:text-sm">Submit Review</button>
               <button onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
            </div>
         </div>
       </div>
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
  onEditJob: (job: Job) => void;
  onDeleteJob: (jobId: string) => void;
  onAcceptApplication: (appId: string, jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onCompleteJob: (jobId: string) => void;
  onRateUser: (jobId: string, revieweeId: string, rating: number, comment: string) => void;
}> = ({ user, jobs, applications, users, reviews, onPostJob, onEditJob, onDeleteJob, onAcceptApplication, onCancelJob, onCompleteJob, onRateUser }) => {
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);
  const [selectedJobIdForApplicants, setSelectedJobIdForApplicants] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<User | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{jobId: string, userId: string, name: string} | null>(null);
  
  const myJobs = jobs.filter(j => j.clientId === user.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openEdit = (job: Job) => { setEditingJob(job); setShowPostModal(true); };
  const openRate = (job: Job) => {
     if(!job.assignedMaidId) return;
     const maid = users.find(u => u.id === job.assignedMaidId);
     if(maid) {
        setRatingTarget({ jobId: job.id, userId: maid.id, name: maid.name });
        setShowRatingModal(true);
     }
  };

  const getJobApplicants = (jobId: string) => {
    return applications
      .filter(a => a.jobId === jobId && a.status === ApplicationStatus.PENDING)
      .map(a => {
        const maid = users.find(u => u.id === a.maidId);
        return { application: a, maid };
      })
      .filter(item => item.maid !== undefined) as { application: Application, maid: User }[];
  };
  
  const analyzeApplicant = async (job: Job, maid: User) => {
      const res = await analyzeCandidateMatch(job.description, maid.bio || 'No bio');
      alert(res);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <button onClick={() => { setEditingJob(undefined); setShowPostModal(true); }} className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700">
           <IconSparkles className="h-5 w-5 mr-2"/> Post New Job
        </button>
      </div>

      {myJobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <IconHome className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs posted</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new job posting.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {myJobs.map(job => {
             const applicants = getJobApplicants(job.id);
             const maid = users.find(u => u.id === job.assignedMaidId);
             
             return (
               <div key={job.id} className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
                  <div className="px-4 py-5 sm:px-6 flex justify-between items-start bg-gray-50">
                     <div>
                        <div className="flex items-center gap-3">
                           <h3 className="text-lg leading-6 font-medium text-gray-900">{job.title}</h3>
                           <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                             job.status === JobStatus.OPEN ? 'bg-green-100 text-green-800' : 
                             job.status === JobStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                             job.status === JobStatus.COMPLETED ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                           }`}>{job.status}</span>
                        </div>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 flex items-center gap-4">
                           <span className="flex items-center"><IconCalendar className="w-4 h-4 mr-1"/> {new Date(job.date).toLocaleDateString()}</span>
                           <span className="flex items-center"><IconMapPin className="w-4 h-4 mr-1"/> {job.location}</span>
                           <span className="font-semibold text-teal-600">R{job.price} {job.paymentType === PaymentType.HOURLY ? '/hr' : 'Fixed'}</span>
                        </p>
                     </div>
                     <div className="flex gap-2">
                        {job.status === JobStatus.OPEN && (
                           <>
                             <button onClick={() => openEdit(job)} className="text-gray-400 hover:text-gray-500"><IconEdit className="w-5 h-5"/></button>
                             <button onClick={() => { if(window.confirm('Delete this job?')) onDeleteJob(job.id); }} className="text-gray-400 hover:text-red-500"><IconTrash className="w-5 h-5"/></button>
                           </>
                        )}
                     </div>
                  </div>
                  
                  {/* Job Content */}
                  <div className="px-4 py-4 sm:px-6">
                     {job.status === JobStatus.OPEN && applicants.length > 0 && (
                        <div className="mb-4">
                           <h4 className="text-sm font-medium text-gray-900 mb-2">Applicants ({applicants.length})</h4>
                           <ul className="divide-y divide-gray-200 border rounded-md">
                              {applicants.map(({application, maid}) => (
                                 <li key={application.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center cursor-pointer" onClick={() => setSelectedApplicant(maid)}>
                                       <img src={maid.avatar} alt="" className="h-8 w-8 rounded-full mr-3"/>
                                       <div>
                                          <p className="text-sm font-medium text-gray-900">{maid.name}</p>
                                          <div className="flex items-center text-xs text-yellow-500">
                                            <IconStar className="w-3 h-3 mr-1" filled/> {maid.rating.toFixed(1)} ({maid.ratingCount})
                                          </div>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <button onClick={() => analyzeApplicant(job, maid)} className="text-xs text-purple-600 hover:text-purple-800 border border-purple-200 px-2 py-1 rounded">AI Analyze</button>
                                       <Link to={`/chat/${application.id}`} className="p-1 text-gray-400 hover:text-teal-600"><IconMessageSquare className="w-5 h-5"/></Link>
                                       <button onClick={() => onAcceptApplication(application.id, job.id)} className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full hover:bg-green-200 font-medium">Accept</button>
                                    </div>
                                 </li>
                              ))}
                           </ul>
                        </div>
                     )}

                     {job.status === JobStatus.IN_PROGRESS && maid && (
                        <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
                           <div className="flex items-center">
                              <img src={maid.avatar} alt="" className="h-10 w-10 rounded-full mr-3"/>
                              <div>
                                 <p className="text-sm font-medium text-blue-900">Job in progress with {maid.name}</p>
                                 <p className="text-xs text-blue-700">Contact: {maid.email}</p>
                              </div>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => onCancelJob(job.id)} className="px-3 py-1 bg-white text-red-600 border border-red-200 rounded text-sm hover:bg-red-50">Cancel Job</button>
                               <button onClick={() => onCompleteJob(job.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Mark Complete</button>
                           </div>
                        </div>
                     )}

                     {job.status === JobStatus.COMPLETED && maid && (
                         <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center">
                               <IconCheckCircle className="h-5 w-5 text-green-500 mr-2"/>
                               <span className="text-sm text-gray-700">Completed by {maid.name}</span>
                            </div>
                            {!reviews.find(r => r.jobId === job.id && r.reviewerId === user.id) && (
                                <button onClick={() => openRate(job)} className="text-sm text-teal-600 hover:underline">Rate Service</button>
                            )}
                         </div>
                     )}
                  </div>
               </div>
             );
          })}
        </div>
      )}

      {showPostModal && <JobModal isOpen={showPostModal} onClose={() => setShowPostModal(false)} onSave={editingJob ? onEditJob : onPostJob} initialJob={editingJob} clientId={user.id} />}
      {selectedApplicant && <ApplicantProfileModal isOpen={!!selectedApplicant} onClose={() => setSelectedApplicant(null)} user={selectedApplicant} />}
      {showRatingModal && ratingTarget && <RatingModal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} onSubmit={(r, c) => onRateUser(ratingTarget.jobId, ratingTarget.userId, r, c)} targetName={ratingTarget.name} />}
    </div>
  );
};

const AdminDashboard: React.FC = () => (
    <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
        <p>System administration tools would go here.</p>
    </div>
);

const ChatPage: React.FC<{
  currentUser: User | null;
  applications: Application[];
  jobs: Job[];
  users: User[];
  messages: Message[];
  onSendMessage: (receiverId: string, content: string, jobId: string) => void;
}> = ({ currentUser, applications, jobs, users, messages, onSendMessage }) => {
    const { applicationId } = useParams<{ applicationId: string }>();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const application = applications.find(a => a.id === applicationId);
    const job = application ? jobs.find(j => j.id === application.jobId) : null;

    let otherUserId = '';
    if (application && job && currentUser) {
        if (currentUser.id === job.clientId) {
            otherUserId = application.maidId;
        } else if (currentUser.id === application.maidId) {
            otherUserId = job.clientId;
        }
    }
    const otherUser = users.find(u => u.id === otherUserId);

    const chatMessages = useMemo(() => {
        if (!currentUser || !job || !otherUserId) return [];
        return messages.filter(m => 
            m.jobId === job.id && 
            ((m.senderId === currentUser.id && m.receiverId === otherUserId) || 
             (m.senderId === otherUserId && m.receiverId === currentUser.id))
        ).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, job, currentUser, otherUserId]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !otherUserId || !job || !currentUser) return;
        onSendMessage(otherUserId, newMessage, job.id);
        setNewMessage('');
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    if (!currentUser) return <Navigate to="/auth" />;

    if (!application || !job || !otherUser) {
        return <div className="p-8 text-center text-gray-500">Conversation not found.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-64px)] flex flex-col">
            <div className="bg-white shadow-sm border-b border-gray-200 rounded-t-lg px-6 py-4 flex justify-between items-center">
                <div className="flex items-center">
                    <img src={otherUser.avatar} className="w-10 h-10 rounded-full mr-3 object-cover" alt={otherUser.name} />
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">{otherUser.name}</h3>
                        <p className="text-xs text-gray-500">{job.title}</p>
                    </div>
                </div>
                <Link to={currentUser.role === UserRole.CLIENT ? "/client/dashboard" : "/maid/dashboard"} className="text-sm text-teal-600 hover:text-teal-800">
                    Back to Dashboard
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                {chatMessages.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-10">Start the conversation with {otherUser.firstName || otherUser.name}...</p>
                )}
                {chatMessages.map(msg => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm shadow-sm ${
                                isMe ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                            }`}>
                                <p>{msg.content}</p>
                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-teal-200' : 'text-gray-400'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-200 p-4 rounded-b-lg">
                <form onSubmit={handleSend} className="flex gap-3">
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 border-gray-300 rounded-full focus:ring-teal-500 focus:border-teal-500 shadow-sm px-4 py-2 border bg-gray-50 text-sm text-gray-900"
                        placeholder="Type your message..."
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="bg-teal-600 text-white rounded-full p-2 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <IconSend className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

const LandingPage: React.FC<{ currentUser: User | null }> = ({ currentUser }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white">
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Professional cleaning</span>{' '}
                  <span className="block text-teal-600 xl:inline">made simple</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Connect with trusted, vetted maids in South Africa. Whether you need a one-time deep clean or regular assistance, MaidServSA connects you with the best.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <button onClick={() => navigate(currentUser ? (currentUser.role === 'CLIENT' ? '/client/dashboard' : '/maid/dashboard') : '/auth')} className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 md:py-4 md:text-lg md:px-10">
                      Get Started
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <img className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full" src="https://images.unsplash.com/photo-1581578731117-104f2a41272c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" alt="Cleaning service" />
        </div>
      </div>
    </div>
  );
};

const AuthPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isLogin) {
                // Mock login using db or just simple check since db logic is hidden
                const users = await db.getUsers();
                const user = users.find(u => u.email === email);
                if (user) {
                    onLogin(user);
                    navigate(user.role === UserRole.CLIENT ? '/client/dashboard' : (user.role === UserRole.MAID ? '/maid/dashboard' : '/admin/dashboard'));
                } else {
                    alert('Invalid credentials');
                }
            } else {
                const newUser: User = {
                    id: `u_${Date.now()}`,
                    name,
                    email,
                    role,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                    rating: 0,
                    ratingCount: 0,
                    isSuspended: false
                };
                await db.saveUser(newUser);
                onLogin(newUser);
                navigate(role === UserRole.CLIENT ? '/client/dashboard' : '/maid/dashboard');
            }
        } catch (err) {
            console.error(err);
            alert('Authentication failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <IconSparkles className="mx-auto h-12 w-12 text-teal-600" />
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{isLogin ? 'Sign in to your account' : 'Create a new account'}</h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        {!isLogin && (
                           <>
                            <div>
                                <label className="sr-only">Full Name</label>
                                <input type="text" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white rounded-t-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="p-2 bg-white border border-gray-300 flex justify-around">
                                <label className="flex items-center space-x-2">
                                    <input type="radio" checked={role === UserRole.CLIENT} onChange={() => setRole(UserRole.CLIENT)} className="text-teal-600 focus:ring-teal-500" />
                                    <span className="text-sm text-gray-700">I need a Maid</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="radio" checked={role === UserRole.MAID} onChange={() => setRole(UserRole.MAID)} className="text-teal-600 focus:ring-teal-500" />
                                    <span className="text-sm text-gray-700">I am a Maid</span>
                                </label>
                            </div>
                           </>
                        )}
                        <div>
                            <label className="sr-only">Email address</label>
                            <input type="email" required className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white ${isLogin ? 'rounded-t-md' : ''} focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm`} placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <label className="sr-only">Password</label>
                            <input type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white rounded-b-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                            {isLogin ? 'Sign in' : 'Sign up'}
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-teal-600 hover:text-teal-500">
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // INITIAL DATA LOAD
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, j, a, r, n, m] = await Promise.all([
          db.getUsers(),
          db.getJobs(),
          db.getApplications(),
          db.getReviews(),
          db.getNotifications(),
          db.getMessages()
        ]);
        setUsers(u);
        setJobs(j);
        setApplications(a);
        setReviews(r);
        setNotifications(n);
        setMessages(m);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // In a real app, this might set a token in localStorage
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handlePostJob = async (job: Job) => {
    const newJob = await db.saveJob(job);
    setJobs(prev => [...prev, newJob]);
    
    const note: Notification = {
        id: Date.now().toString(),
        userId: job.clientId,
        message: `Job "${job.title}" posted successfully.`,
        type: 'success',
        read: false,
        timestamp: new Date().toISOString()
    };
    await db.saveNotification(note);
    setNotifications(prev => [...prev, note]);
  };

  const handleEditJob = async (updatedJob: Job) => {
    await db.saveJob(updatedJob); // SaveJob handles update if ID exists
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
  };

  const handleDeleteJob = async (jobId: string) => {
    await db.deleteJob(jobId);
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };
  
  const handleAcceptApplication = async (appId: string, jobId: string) => {
      const app = applications.find(a => a.id === appId);
      if (!app) return;

      const updatedApps = await Promise.all(applications.map(async (a) => {
          if (a.id === appId) {
              const updated = { ...a, status: ApplicationStatus.ACCEPTED };
              await db.saveApplication(updated);
              return updated;
          }
          if (a.jobId === jobId && a.id !== appId) {
              const updated = { ...a, status: ApplicationStatus.REJECTED };
              await db.saveApplication(updated);
              return updated;
          }
          return a;
      }));
      setApplications(updatedApps);

      const jobToUpdate = jobs.find(j => j.id === jobId);
      if (jobToUpdate) {
          const updatedJob = { ...jobToUpdate, status: JobStatus.IN_PROGRESS, assignedMaidId: app.maidId };
          await db.saveJob(updatedJob);
          setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));
      }
  };

  const handleCancelJob = async (jobId: string) => {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
          const updated = { ...job, status: JobStatus.CANCELLED };
          await db.saveJob(updated);
          setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
      }
  };

  const handleCompleteJob = async (jobId: string) => {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
          const updated = { ...job, status: JobStatus.COMPLETED };
          await db.saveJob(updated);
          setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
      }
  };

  const handleRateUser = async (jobId: string, revieweeId: string, rating: number, comment: string) => {
      if (!currentUser) return;
      const review: Review = {
          id: Date.now().toString(),
          jobId,
          reviewerId: currentUser.id,
          revieweeId,
          rating,
          comment,
          createdAt: new Date().toISOString()
      };
      await db.saveReview(review);
      setReviews(prev => [...prev, review]);
      
      // Recalculate and update user rating
      const targetUser = users.find(u => u.id === revieweeId);
      if (targetUser) {
          const newCount = targetUser.ratingCount + 1;
          const newRating = ((targetUser.rating * targetUser.ratingCount) + rating) / newCount;
          const updatedUser = { ...targetUser, rating: newRating, ratingCount: newCount };
          await db.saveUser(updatedUser);
          setUsers(prev => prev.map(u => u.id === revieweeId ? updatedUser : u));
      }
  };
  
  const handleUpdateProfile = async (updatedUser: User) => {
      await db.saveUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      if (currentUser && currentUser.id === updatedUser.id) {
          setCurrentUser(updatedUser);
      }
  };

  const handleApply = async (jobId: string, message: string) => {
    if (!currentUser) return;
    const newApp: Application = {
      id: `app_${Date.now()}`,
      jobId,
      maidId: currentUser.id,
      status: ApplicationStatus.PENDING,
      message,
      appliedAt: new Date().toISOString()
    };
    await db.saveApplication(newApp);
    setApplications(prev => [...prev, newApp]);
  };

  const handleMarkNotificationsRead = async () => {
    if (!currentUser) return;
    await db.markNotificationsRead(currentUser.id);
    setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, read: true } : n));
  };

  const handleSendMessage = async (receiverId: string, content: string, jobId: string) => {
      if (!currentUser) return;
      const newMessage: Message = {
          id: `msg_${Date.now()}`,
          senderId: currentUser.id,
          receiverId,
          content,
          timestamp: new Date().toISOString(),
          jobId
      };
      await db.saveMessage(newMessage);
      setMessages(prev => [...prev, newMessage]);
  };

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center">
                  <IconSparkles className="h-12 w-12 text-teal-600 animate-pulse" />
                  <p className="mt-4 text-gray-500 text-sm">Loading MaidServSA...</p>
              </div>
          </div>
      );
  }

  return (
    <HashRouter>
      <Navbar currentUser={currentUser} notifications={notifications} onLogout={handleLogout} onMarkNotificationsRead={handleMarkNotificationsRead} />
      <Routes>
        <Route path="/" element={<LandingPage currentUser={currentUser} />} />
        <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />
        <Route path="/profile" element={currentUser ? <ProfilePage user={currentUser} onUpdate={handleUpdateProfile} /> : <Navigate to="/auth" />} />
        <Route path="/client/dashboard" element={
            currentUser?.role === UserRole.CLIENT ? 
            <ClientDashboard 
                user={currentUser} 
                jobs={jobs} 
                applications={applications} 
                users={users} 
                reviews={reviews}
                onPostJob={handlePostJob}
                onEditJob={handleEditJob}
                onDeleteJob={handleDeleteJob}
                onAcceptApplication={handleAcceptApplication}
                onCancelJob={handleCancelJob}
                onCompleteJob={handleCompleteJob}
                onRateUser={handleRateUser}
            /> : <Navigate to="/" />
        } />
        <Route path="/maid/dashboard" element={
            currentUser?.role === UserRole.MAID ?
            <MaidDashboard 
               user={currentUser}
               jobs={jobs}
               applications={applications}
               onApply={handleApply}
            /> : <Navigate to="/" />
        } />
        <Route path="/admin/dashboard" element={currentUser?.role === UserRole.ADMIN ? <AdminDashboard /> : <Navigate to="/" />} />
        <Route path="/chat/:applicationId" element={
            <ChatPage 
                currentUser={currentUser} 
                applications={applications} 
                jobs={jobs} 
                users={users} 
                messages={messages} 
                onSendMessage={handleSendMessage} 
            />
        } />
      </Routes>
    </HashRouter>
  );
};

export default App;