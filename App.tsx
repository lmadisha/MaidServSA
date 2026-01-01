import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  useParams,
  Navigate,
} from 'react-router-dom';
import {
  User,
  UserRole,
  Job,
  JobStatus,
  Application,
  ApplicationStatus,
  Message,
  Review,
  Notification,
  PaymentType,
  JobHistoryEntry,
  ExperienceAnswer,
} from './types';
import { generateJobDescription, analyzeCandidateMatch } from './services/geminiService';
import { db } from './services/db';
import {
  IconCalendar,
  IconCheckCircle,
  IconHome,
  IconMapPin,
  IconMessageSquare,
  IconSparkles,
  IconUser,
  IconXCircle,
  IconSend,
  IconStar,
  IconBell,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconClock,
  IconLock,
  IconMail,
  IconLogOut,
  IconInfo,
  IconAlertTriangle,
  IconAlertCircle,
  IconFileText,
  IconEdit,
  IconTrash,
  IconFilter,
} from './components/Icons';
import { LocationAutocomplete } from './components/LocationAutocomplete';

// --- DATA CONSTANTS ---
const MAID_EXPERIENCE_QUESTIONS = [
  { id: 'q1', text: 'How many years of professional cleaning experience do you have?' },
  { id: 'q2', text: 'Are you comfortable working in homes with pets?' },
  {
    id: 'q3',
    text: 'Do you have experience with deep cleaning or specialized surfaces (e.g., marble, hardwood)?',
  },
  { id: 'q4', text: 'Are you available for weekend shifts?' },
];

const NATIONALITIES = [
  'Afghan',
  'Albanian',
  'Algerian',
  'American',
  'Andorran',
  'Angolan',
  'Antiguans',
  'Argentinean',
  'Armenian',
  'Australian',
  'Austrian',
  'Azerbaijani',
  'Bahamian',
  'Bahraini',
  'Bangladeshi',
  'Barbadian',
  'Barbudans',
  'Batswana',
  'Belarusian',
  'Belgian',
  'Belizean',
  'Beninese',
  'Bhutanese',
  'Bolivian',
  'Bosnian',
  'Brazilian',
  'British',
  'Bruneian',
  'Bulgarian',
  'Burkinabe',
  'Burmese',
  'Burundian',
  'Cambodian',
  'Cameroonian',
  'Canadian',
  'Cape Verdean',
  'Central African',
  'Chadian',
  'Chilean',
  'Chinese',
  'Colombian',
  'Comoran',
  'Congolese',
  'Costa Rican',
  'Croatian',
  'Cuban',
  'Cypriot',
  'Czech',
  'Danish',
  'Djibouti',
  'Dominican',
  'Dutch',
  'East Timorese',
  'Ecuadorian',
  'Egyptian',
  'Emirati',
  'Equatorial Guinean',
  'Eritrean',
  'Estonian',
  'Ethiopian',
  'Fijian',
  'Filipino',
  'Finnish',
  'French',
  'Gabonese',
  'Gambian',
  'Georgian',
  'German',
  'Ghanaian',
  'Greek',
  'Grenadian',
  'Guatemalan',
  'Guinea-Bissauan',
  'Guinean',
  'Guyanese',
  'Haitian',
  'Herzegovinian',
  'Honduran',
  'Hungarian',
  'I-Kiribati',
  'Icelander',
  'Indian',
  'Indonesian',
  'Iranian',
  'Iraqi',
  'Irish',
  'Israeli',
  'Italian',
  'Ivorian',
  'Jamaican',
  'Japanese',
  'Jordanian',
  'Kazakhstani',
  'Kenyan',
  'Kittian and Nevisian',
  'Kuwaiti',
  'Kyrgyz',
  'Laotian',
  'Latvian',
  'Lebanese',
  'Liberian',
  'Libyan',
  'Liechtensteiner',
  'Lithuanian',
  'Luxembourger',
  'Macedonian',
  'Malagasy',
  'Malawian',
  'Malaysian',
  'Maldivian',
  'Malian',
  'Maltese',
  'Marshallese',
  'Mauritanian',
  'Mauritian',
  'Mexican',
  'Micronesian',
  'Moldovan',
  'Monacan',
  'Mongolian',
  'Moroccan',
  'Mosotho',
  'Motswana',
  'Mozambican',
  'Namibian',
  'Nauruan',
  'Nepalese',
  'New Zealander',
  'Ni-Vanuatu',
  'Nicaraguan',
  'Nigerian',
  'Nigerien',
  'North Korean',
  'Northern Irish',
  'Norwegian',
  'Omani',
  'Pakistani',
  'Palauan',
  'Panamanian',
  'Papua New Guinean',
  'Paraguayan',
  'Peruvian',
  'Polish',
  'Portuguese',
  'Qatari',
  'Romanian',
  'Russian',
  'Rwandan',
  'Saint Lucian',
  'Salvadoran',
  'Samoan',
  'San Marinese',
  'Sao Tomean',
  'Saudi',
  'Scottish',
  'Senegalese',
  'Serbian',
  'Seychellois',
  'Sierra Leonean',
  'Singaporean',
  'Slovakian',
  'Slovenian',
  'Solomon Islander',
  'Somali',
  'South African',
  'South Korean',
  'Spanish',
  'Sri Lankan',
  'Sudanese',
  'Surinamer',
  'Swazi',
  'Swedish',
  'Swiss',
  'Syrian',
  'Taiwanese',
  'Tajik',
  'Tanzanian',
  'Thai',
  'Togolese',
  'Tongan',
  'Trinidadian or Tobagonian',
  'Tunisian',
  'Turkish',
  'Tuvaluan',
  'Ugandan',
  'Ukrainian',
  'Uruguayan',
  'Uzbekistani',
  'Venezuelan',
  'Vietnamese',
  'Welsh',
  'Yemenite',
  'Zambian',
  'Zimbabwean',
];

const RESIDENCY_STATUSES = [
  'Citizen (Born)',
  'Citizen (Naturalized)',
  'Permanent Resident',
  'Work Visa',
  'Study Visa',
  'Spousal Visa',
  'Refugee Status',
  'Other',
];

// Reusable Styles
const INPUT_CLASS =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm px-4 py-2.5 bg-white text-gray-900 placeholder-gray-400 transition-colors duration-200 border';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1';

// --- COMPONENTS ---

const FormSelect: React.FC<{
  label?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string | number; label: string }[];
  name?: string;
  required?: boolean;
  className?: string;
}> = ({ label, value, onChange, options, name, required, className }) => (
  <div className="relative">
    {label && <label className={LABEL_CLASS}>{label}</label>}
    <select
      name={name}
      required={required}
      value={value}
      onChange={onChange}
      className={`${INPUT_CLASS} appearance-none pr-10 cursor-pointer ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 top-6">
      <IconChevronDown className="h-4 w-4" />
    </div>
  </div>
);

const ApplyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  jobTitle: string;
}> = ({ isOpen, onClose, onSubmit, jobTitle }) => {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Apply for {jobTitle}</h3>
            <p className="text-sm text-gray-500 mb-4">
              Introduce yourself to the client. Mention your experience and why you are a good fit.
            </p>
            <textarea
              className={INPUT_CLASS}
              rows={4}
              placeholder="Hi, I'd love to help with your cleaning. I have experience with..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
            />
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            <button
              onClick={() => {
                onSubmit(message);
                setMessage('');
              }}
              disabled={!message.trim()}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Application
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const JobDetailsModal: React.FC<{
  job: Job | null;
  onClose: () => void;
  onApply: (job: Job) => void;
}> = ({ job, onClose, onApply }) => {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <IconXCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Key Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="font-semibold text-teal-600">
                    R{job.price}{' '}
                    <span className="text-xs text-gray-400 font-normal">
                      {job.paymentType === 'HOURLY' ? '/hr' : 'Total'}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Size</p>
                  <p className="font-semibold">{job.areaSize} m²</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Rooms</p>
                  <p className="font-semibold">
                    {job.rooms} Bed, {job.bathrooms} Bath
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-semibold">{job.duration || 8} Hours</p>
                </div>
              </div>

              {/* Location & Time */}
              <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-600 border-b border-gray-100 pb-4">
                <div className="flex items-center">
                  <IconMapPin className="w-4 h-4 mr-2 text-gray-400" /> {job.location}
                </div>
                <div className="flex items-center">
                  <IconClock className="w-4 h-4 mr-2 text-gray-400" /> {job.startTime} -{' '}
                  {job.endTime}
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>

              {/* Dates */}
              {job.workDates && job.workDates.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Scheduled Dates ({job.workDates.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {job.workDates.sort().map((d) => (
                      <span
                        key={d}
                        className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded border border-teal-100"
                      >
                        {new Date(d).toLocaleDateString()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => onApply(job)}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Apply Now
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Navbar: React.FC<{
  currentUser: User | null;
  notifications: Notification[];
  onLogout: () => void;
  onMarkNotificationsRead: () => void;
}> = ({ currentUser, notifications, onLogout, onMarkNotificationsRead }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const myNotifications = currentUser
    ? notifications
        .filter((n) => n.userId === currentUser.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  const unreadCount = myNotifications.filter((n) => !n.read).length;

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
  };

  const handleToggleProfile = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotifications(false);
  };

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
      case 'success':
        return <IconCheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <IconAlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <IconAlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <IconInfo className="w-5 h-5 text-teal-500" />;
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={handleLogoClick}>
            <IconSparkles className="h-8 w-8 text-teal-600 mr-2" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              MaidServ<span className="text-teal-600">SA</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/help"
              className="text-gray-500 hover:text-teal-600 text-sm font-medium transition-colors"
            >
              Help & FAQ
            </Link>

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
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowNotifications(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500">
                              {myNotifications.length} Total
                            </span>
                            {unreadCount > 0 && (
                              <button
                                onClick={onMarkNotificationsRead}
                                className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                              >
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
                            myNotifications.map((notification) => (
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
                                      {new Date(notification.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}{' '}
                                      • {new Date(notification.timestamp).toLocaleDateString()}
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
                  <button
                    onClick={handleToggleProfile}
                    className="flex items-center space-x-3 focus:outline-none"
                  >
                    <span className="text-sm font-medium text-gray-700 hidden md:block">
                      {currentUser.name}
                    </span>
                    <img
                      src={currentUser.avatar}
                      alt="Profile"
                      className="h-8 w-8 rounded-full object-cover border border-gray-200"
                    />
                  </button>

                  {showProfileMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowProfileMenu(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 py-1">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          Your Profile
                        </Link>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            onLogout();
                          }}
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

const HelpPage: React.FC = () => {
  const [openSection, setOpenSection] = useState<string | null>('general');

  const faqs = {
    general: [
      {
        q: 'What is MaidServSA?',
        a: 'MaidServSA is a premium marketplace connecting homeowners with trusted, professional cleaning service providers in South Africa.',
      },
      {
        q: 'Is it free to join?',
        a: 'Yes, creating an account is completely free for both clients and maids. We believe in accessible opportunities for everyone.',
      },
      {
        q: 'How do I reset my password?',
        a: 'Currently, you can contact our support team at support@maidservsa.com for password assistance.',
      },
    ],
    clients: [
      {
        q: 'How do I book a maid?',
        a: 'Simply sign up as a client, post a job detailing your requirements, and wait for maids to apply. You can then review their profiles and accept the best fit.',
      },
      {
        q: 'How are payments handled?',
        a: 'Payments are agreed upon between the client and the maid. You can choose to pay hourly or a fixed rate. We recommend settling payment via EFT or Cash after the service is completed satisfactorily.',
      },
      {
        q: 'Are the maids vetted?',
        a: 'We encourage all maids to upload their CVs and provide detailed experience. Clients can view ratings and reviews from previous jobs to ensure trust.',
      },
    ],
    maids: [
      {
        q: 'How do I find work?',
        a: "After creating your profile, go to your dashboard and browse the 'Find Work' tab. You can search by location and apply to jobs that match your schedule.",
      },
      {
        q: 'How do I get paid?',
        a: 'Payment terms are set by the client in the job posting. You will be paid directly by the client according to the agreed method (e.g., Cash or EFT).',
      },
      {
        q: 'How can I improve my rating?',
        a: 'Provide excellent service, be punctual, and communicate clearly. Happy clients are more likely to leave 5-star reviews!',
      },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Help Center & FAQ</h1>
        <p className="mt-4 text-lg text-gray-500">
          Find answers to common questions about MaidServSA.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2">
          {['general', 'clients', 'maids'].map((section) => (
            <button
              key={section}
              onClick={() => setOpenSection(section)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                openSection === section
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-4">
          {openSection &&
            faqs[openSection as keyof typeof faqs].map((faq, idx) => (
              <div
                key={idx}
                className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden"
              >
                <div className="px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-gray-600">{faq.a}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-12 bg-teal-50 rounded-xl p-8 text-center border border-teal-100">
        <h3 className="text-xl font-bold text-teal-900 mb-2">Still have questions?</h3>
        <p className="text-teal-700 mb-6">Our support team is always here to help you.</p>
        <a
          href="mailto:support@maidservsa.com"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
};

const ProfilePage: React.FC<{ user: User; onUpdate: (u: User) => void }> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState<Partial<User>>({ ...user });
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [cvFile, setCvFile] = useState<File | null>(null);

  useEffect(() => {
    setFormData({ ...user });
    if (user.experienceAnswers) {
      const ans: { [key: string]: string } = {};
      user.experienceAnswers.forEach((a) => (ans[a.questionId] = a.answer));
      setAnswers(ans);
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
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
      const expAnswers: ExperienceAnswer[] = MAID_EXPERIENCE_QUESTIONS.map((q) => ({
        questionId: q.id,
        question: q.text,
        answer: answers[q.id] || '',
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
          {user.role === UserRole.MAID && (
            <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">
              Service Provider Account
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Personal Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={LABEL_CLASS}>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName || ''}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName || ''}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Surname</label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname || ''}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth || ''}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Place of Birth</label>
                <LocationAutocomplete
                  name="placeOfBirth"
                  value={formData.placeOfBirth || ''}
                  onChange={(val) => setFormData((prev) => ({ ...prev, placeOfBirth: val }))}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <FormSelect
                  label="Nationality"
                  name="nationality"
                  value={formData.nationality || ''}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Nationality' },
                    ...NATIONALITIES.map((nat) => ({ value: nat, label: nat })),
                  ]}
                />
              </div>
              <div className="md:col-span-2">
                <FormSelect
                  label="Residency / Visa Status"
                  name="residencyStatus"
                  value={formData.residencyStatus || ''}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Status' },
                    ...RESIDENCY_STATUSES.map((s) => ({ value: s, label: s })),
                  ]}
                />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>Residential Address</label>
                <LocationAutocomplete
                  name="address"
                  value={formData.address || ''}
                  onChange={(val) => setFormData((prev) => ({ ...prev, address: val }))}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>Bio</label>
                <textarea
                  rows={3}
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                  placeholder="Tell us a bit about yourself..."
                />
              </div>
            </div>
          </div>

          {/* Maid Specifics */}
          {user.role === UserRole.MAID && (
            <>
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Experience & Qualifications
                </h4>
                <div className="space-y-4">
                  {MAID_EXPERIENCE_QUESTIONS.map((q) => (
                    <div key={q.id}>
                      <label className={`${LABEL_CLASS} mb-1`}>{q.text}</label>
                      <input
                        type="text"
                        className={INPUT_CLASS}
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Documents
                </h4>
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
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      {cvFile ? 'Change File' : 'Upload CV'}
                    </button>
                  </div>
                </div>
                {cvFile && <p className="mt-2 text-xs text-green-600">Selected: {cvFile.name}</p>}
              </div>
            </>
          )}

          <div className="pt-5 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FullCalendarSelector: React.FC<{
  selectedDates: string[];
  onChange: (dates: string[]) => void;
}> = ({ selectedDates, onChange }) => {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const toISODate = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

  const today = useMemo(() => startOfDay(new Date()), []);
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(today));
  const lastClickedRef = useRef<Date | null>(null);

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
    return fmt.format(monthCursor);
  }, [monthCursor]);

  const isPastDate = (d: Date) => startOfDay(d).getTime() < today.getTime();

  const sortISO = (arr: string[]) => arr.slice().sort((a, b) => a.localeCompare(b));
  const commitSet = (set: Set<string>) => onChange(sortISO([...set]));

  const toggleOne = (date: Date) => {
    if (isPastDate(date)) return;
    const iso = toISODate(date);
    const next = new Set(selectedDates);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    commitSet(next);
  };

  const applyRange = (a: Date, b: Date, mode: 'add' | 'remove') => {
    const start = startOfDay(a);
    const end = startOfDay(b);

    const lo = start.getTime() <= end.getTime() ? start : end;
    const hi = start.getTime() <= end.getTime() ? end : start;

    const next = new Set(selectedDates);

    for (let d = new Date(lo); d.getTime() <= hi.getTime(); d.setDate(d.getDate() + 1)) {
      if (isPastDate(d)) continue;
      const iso = toISODate(d);
      if (mode === 'add') next.add(iso);
      else next.delete(iso);
    }

    commitSet(next);
  };

  const onDayClick = (date: Date, shiftKey: boolean) => {
    if (isPastDate(date)) return;

    const last = lastClickedRef.current;

    if (shiftKey && last) {
      const iso = toISODate(date);
      const mode: 'add' | 'remove' = selectedSet.has(iso) ? 'remove' : 'add';
      applyRange(last, date, mode);
    } else {
      toggleOne(date);
    }

    lastClickedRef.current = date;
  };

  const weeks = useMemo(() => {
    const firstOfMonth = startOfMonth(monthCursor);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay()); // back to Sunday

    const days: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push({ date: d, inMonth: d.getMonth() === monthCursor.getMonth() });
    }

    const chunked: Array<typeof days> = [];
    for (let i = 0; i < days.length; i += 7) chunked.push(days.slice(i, i + 7));
    return chunked;
  }, [monthCursor]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const goPrevMonth = () => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goThisMonth = () => setMonthCursor(startOfMonth(today));

  const clearAll = () => onChange([]);

  const selectWeekendsThisMonth = () => {
    const next = new Set(selectedDates);
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const last = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);

    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      if (isPastDate(d)) continue;
      const day = d.getDay();
      if (day === 0 || day === 6) next.add(toISODate(d));
    }

    commitSet(next);
  };

  const selectNext7Days = () => {
    const next = new Set(selectedDates);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      next.add(toISODate(d));
    }
    commitSet(next);
  };

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-50 to-white border-b border-gray-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Work Dates</p>
          <h4 className="text-base font-semibold text-gray-900">{monthLabel}</h4>
          <p className="text-xs text-gray-500 mt-0.5">Tip: Shift-click to select a range</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Previous month"
            title="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goThisMonth}
            className="h-9 px-3 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
            title="Go to current month"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Next month"
            title="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="grid grid-cols-7 gap-1 text-xs font-medium text-gray-500 mb-2">
          {weekdayLabels.map((w) => (
            <div key={w} className="text-center py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid gap-1">
          {weeks.map((week) => (
            <div key={toISODate(week[0].date)} className="grid grid-cols-7 gap-1">
              {week.map(({ date, inMonth }) => {
                const iso = toISODate(date);
                const selected = selectedSet.has(iso);
                const isToday = isSameDay(date, today);
                const disabled = isPastDate(date);

                const base =
                  'h-10 w-full rounded-lg text-sm flex items-center justify-center transition-colors select-none';
                const faded = inMonth ? 'text-gray-900' : 'text-gray-400';
                const ringToday = isToday ? 'ring-2 ring-teal-300 ring-offset-1' : '';
                const stateStyles = disabled
                  ? 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
                  : selected
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200';

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    onClick={(e) => onDayClick(date, e.shiftKey)}
                    className={`${base} ${faded} ${stateStyles} ${ringToday}`}
                    title={disabled ? `${iso} (past date)` : iso}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-gray-500">
            Selected: <span className="font-semibold text-gray-800">{selectedDates.length}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectNext7Days}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              Next 7 days
            </button>
            <button
              type="button"
              onClick={selectWeekendsThisMonth}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              Weekends (this month)
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              disabled={selectedDates.length === 0}
            >
              Clear
            </button>
          </div>
        </div>

        {selectedDates.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedDates.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-100"
              >
                {d}
                <button
                  type="button"
                  onClick={() => onChange(selectedDates.filter((x) => x !== d))}
                  className="text-teal-700 hover:text-teal-900"
                  aria-label={`Remove ${d}`}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const JobModal: React.FC<{
  job?: Job;
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Job) => void;
  clientId: string;
}> = ({ job, isOpen, onClose, onSave, clientId }) => {
  const [formData, setFormData] = useState<Partial<Job>>({
    title: '',
    description: '',
    location: '',
    areaSize: 0,
    price: 0,
    rooms: 1,
    bathrooms: 1,
    paymentType: PaymentType.FIXED,
    startTime: '08:00',
    endTime: '12:00',
    workDates: [],
    currency: 'R',
  });
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (job) {
      setFormData(job);
    } else {
      setFormData({
        title: '',
        description: '',
        location: '',
        areaSize: 0,
        price: 0,
        rooms: 1,
        bathrooms: 1,
        paymentType: PaymentType.FIXED,
        startTime: '08:00',
        endTime: '12:00',
        workDates: [],
        currency: 'R',
      });
    }
  }, [job, isOpen]);

  const handleGenerateDesc = async () => {
    if (!formData.location || !formData.areaSize) {
      alert('Please fill in location and size first.');
      return;
    }
    setLoadingAI(true);
    const desc = await generateJobDescription(
      formData.rooms || 0,
      formData.bathrooms || 0,
      formData.areaSize || 0,
      formData.location || '',
      formData.title || 'General Cleaning'
    );
    setFormData((prev) => ({ ...prev, description: desc }));
    setLoadingAI(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const duration =
      parseInt(formData.endTime!.split(':')[0]) - parseInt(formData.startTime!.split(':')[0]);
    const newJob: Job = {
      id: job?.id || `job_${Date.now()}`,
      clientId,
      title: formData.title!,
      description: formData.description!,
      location: formData.location!,
      areaSize: formData.areaSize!,
      price: formData.price!,
      currency: formData.currency!,
      date: formData.workDates?.[0] || new Date().toISOString().split('T')[0],
      status: job?.status || JobStatus.OPEN,
      rooms: formData.rooms!,
      bathrooms: formData.bathrooms!,
      images: job?.images || [],
      paymentType: formData.paymentType!,
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      duration: duration > 0 ? duration : 4,
      workDates: formData.workDates || [],
      history: job?.history || [],
    };
    onSave(newJob);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {job ? 'Edit Job' : 'Post New Job'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>Job Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="e.g., Weekly Home Cleaning"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Location</label>
                <LocationAutocomplete
                  value={formData.location || ''}
                  onChange={(val) => setFormData({ ...formData, location: val })}
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Payment Type</label>
                <select
                  value={formData.paymentType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentType: e.target.value as PaymentType,
                    })
                  }
                  className={INPUT_CLASS}
                >
                  <option value={PaymentType.FIXED}>Fixed Price</option>
                  <option value={PaymentType.HOURLY}>Hourly Rate</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Price (R)</label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Size (sqm)</label>
                <input
                  type="number"
                  required
                  value={formData.areaSize}
                  onChange={(e) => setFormData({ ...formData, areaSize: Number(e.target.value) })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Bedrooms</label>
                <input
                  type="number"
                  required
                  value={formData.rooms}
                  onChange={(e) => setFormData({ ...formData, rooms: Number(e.target.value) })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Bathrooms</label>
                <input
                  type="number"
                  required
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Start Time</label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>End Time</label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="md:col-span-2">
                <FullCalendarSelector
                  selectedDates={formData.workDates || []}
                  onChange={(dates) => setFormData({ ...formData, workDates: dates })}
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className={LABEL_CLASS}>Description</label>
                  <button
                    type="button"
                    onClick={handleGenerateDesc}
                    disabled={loadingAI}
                    className="text-xs text-teal-600 hover:text-teal-800 flex items-center"
                  >
                    <IconSparkles className="w-3 h-3 mr-1" />{' '}
                    {loadingAI ? 'Generating...' : 'Auto-Generate'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
              >
                Save Job
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const CalendarView: React.FC<{ jobs: Job[] }> = ({ jobs }) => {
  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {sortedJobs.map((job) => (
          <li key={job.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-teal-600 truncate">{job.title}</p>
              <div className="ml-2 flex-shrink-0 flex">
                <p
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    job.status === JobStatus.COMPLETED
                      ? 'bg-green-100 text-green-800'
                      : job.status === JobStatus.IN_PROGRESS
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {job.status}
                </p>
              </div>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-gray-500 mr-6">
                  <IconCalendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {job.date}
                </p>
                <p className="flex items-center text-sm text-gray-500">
                  <IconClock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {job.startTime} - {job.endTime}
                </p>
              </div>
            </div>
          </li>
        ))}
        {sortedJobs.length === 0 && (
          <li className="px-4 py-4 text-center text-gray-500">No scheduled jobs</li>
        )}
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
  const [activeTab, setActiveTab] = useState<'find' | 'my'>('find');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [filterLocation, setFilterLocation] = useState('');

  const myApplications = applications.filter((a) => a.maidId === user.id);
  const myJobIds = myApplications.map((a) => a.jobId);

  const availableJobs = jobs.filter(
    (j) =>
      j.status === JobStatus.OPEN &&
      !myJobIds.includes(j.id) &&
      (filterLocation === '' || j.location.toLowerCase().includes(filterLocation.toLowerCase()))
  );

  const myJobsList = jobs.filter((j) => myJobIds.includes(j.id) || j.assignedMaidId === user.id);

  const handleApplyClick = (job: Job) => {
    setSelectedJob(job);
    setShowApplyModal(true);
  };

  const submitApplication = (message: string) => {
    if (selectedJob) {
      onApply(selectedJob.id, message);
      setShowApplyModal(false);
      setSelectedJob(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName || user.name}
        </h1>
        <p className="text-gray-500">Find new opportunities or manage your schedule.</p>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('find')}
          className={`py-4 px-1 border-b-2 font-medium text-sm mr-8 ${activeTab === 'find' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Find Work
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'my' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          My Jobs & Applications
        </button>
      </div>

      {activeTab === 'find' && (
        <div className="space-y-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Filter by location..."
              className={INPUT_CLASS}
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{job.title}</h3>
                    <span className="text-sm font-semibold text-teal-600">R{job.price}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 flex items-center">
                    <IconMapPin className="w-4 h-4 mr-1" /> {job.location}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{job.description}</p>
                  <div className="mt-4">
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {availableJobs.length === 0 && (
              <p className="text-gray-500 col-span-3 text-center py-8">
                No jobs found matching your criteria.
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'my' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {myJobsList.map((job) => {
              const app = applications.find((a) => a.jobId === job.id && a.maidId === user.id);
              return (
                <li key={job.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-teal-600 truncate">{job.title}</p>
                      <p className="text-sm text-gray-500">{job.location}</p>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${
                                app?.status === ApplicationStatus.ACCEPTED
                                  ? 'bg-green-100 text-green-800'
                                  : app?.status === ApplicationStatus.REJECTED
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}
                      >
                        {app?.status || 'Assigned'}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            {myJobsList.length === 0 && (
              <li className="px-4 py-8 text-center text-gray-500">
                No applications or active jobs.
              </li>
            )}
          </ul>
        </div>
      )}

      <JobDetailsModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onApply={handleApplyClick}
      />
      <ApplyModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSubmit={submitApplication}
        jobTitle={selectedJob?.title || ''}
      />
    </div>
  );
};

const ClientDashboard: React.FC<{
  user: User;
  jobs: Job[];
  applications: Application[];
  users: User[];
  onPostJob: (job: Job) => void;
  onUpdateJob: (job: Job) => void;
  onDeleteJob: (jobId: string) => void;
  onUpdateApplicationStatus: (appId: string, status: ApplicationStatus) => void;
}> = ({
  user,
  jobs,
  applications,
  users,
  onPostJob,
  onUpdateJob,
  onDeleteJob,
  onUpdateApplicationStatus,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'jobs' | 'calendar'>('jobs');

  const myJobs = jobs.filter((j) => j.clientId === user.id);

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingJob(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Manage your property cleanings.</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
        >
          Post New Job
        </button>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`py-4 px-1 border-b-2 font-medium text-sm mr-8 ${activeTab === 'jobs' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          My Jobs
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'calendar' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Calendar
        </button>
      </div>

      {activeTab === 'calendar' ? (
        <CalendarView jobs={myJobs} />
      ) : (
        <div className="space-y-6">
          {myJobs.map((job) => {
            const jobApps = applications.filter((a) => a.jobId === job.id);
            return (
              <div key={job.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-start bg-gray-50">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{job.title}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      {job.location} • {new Date(job.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(job)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <IconEdit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeleteJob(job.id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      <IconTrash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-4 sm:px-6">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Applications ({jobApps.length})
                  </h4>
                  {jobApps.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No applications yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {jobApps.map((app) => {
                        const maid = users.find((u) => u.id === app.maidId);
                        return (
                          <li key={app.id} className="py-3 flex justify-between items-center">
                            <div className="flex items-center">
                              <img
                                src={maid?.avatar}
                                className="h-8 w-8 rounded-full mr-3"
                                alt=""
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{maid?.name}</p>
                                <p className="text-xs text-gray-500">{app.message}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {app.status === ApplicationStatus.PENDING && (
                                <>
                                  <button
                                    onClick={() =>
                                      onUpdateApplicationStatus(app.id, ApplicationStatus.ACCEPTED)
                                    }
                                    className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 px-2 py-1 rounded bg-green-50"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() =>
                                      onUpdateApplicationStatus(app.id, ApplicationStatus.REJECTED)
                                    }
                                    className="text-red-600 hover:text-red-800 text-xs font-medium border border-red-200 px-2 py-1 rounded bg-red-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {app.status !== ApplicationStatus.PENDING && (
                                <span
                                  className={`text-xs px-2 py-1 rounded ${app.status === ApplicationStatus.ACCEPTED ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                >
                                  {app.status}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
          {myJobs.length === 0 && (
            <div className="text-center py-10 text-gray-500">You haven't posted any jobs yet.</div>
          )}
        </div>
      )}

      <JobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(job) => {
          if (editingJob) onUpdateJob(job);
          else onPostJob(job);
        }}
        job={editingJob}
        clientId={user.id}
      />
    </div>
  );
};

const AuthPage: React.FC<{
  onLogin: (email: string) => void;
  onSignUp: (userData: Partial<User>) => void;
}> = ({ onLogin, onSignUp }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Added for completeness, though demo uses email
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(email);
    } else {
      onSignUp({
        email,
        name,
        role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      });
    }
  };

  const handleDemoLogin = (type: 'client' | 'maid' | 'admin') => {
    if (type === 'client') onLogin('sarah@example.com');
    else if (type === 'maid') onLogin('martha@example.com');
    else onLogin('admin@maidservsa.com');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 text-teal-600 flex justify-center">
            <IconSparkles className="w-12 h-12" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-teal-600 hover:text-teal-500 transition-colors"
            >
              {isLogin ? 'Sign up now' : 'Sign in'}
            </button>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {!isLogin && (
              <div>
                <label htmlFor="full-name" className="sr-only">
                  Full Name
                </label>
                <input
                  id="full-name"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className={isLogin ? '' : 'pt-px'}>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${isLogin ? 'rounded-t-md' : ''} focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="role" className="sr-only">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value={UserRole.CLIENT}>I want to hire help (Client)</option>
                <option value={UserRole.MAID}>I am looking for work (Maid)</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              {isLogin ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or use demo accounts</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <button
              onClick={() => handleDemoLogin('client')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Client
            </button>
            <button
              onClick={() => handleDemoLogin('maid')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Maid
            </button>
            <button
              onClick={() => handleDemoLogin('admin')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
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
                  Connect with vetted, reliable cleaners in your area. Secure payments, trusted
                  reviews, and peace of mind.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start gap-3">
                  <div className="rounded-md shadow">
                    <button
                      onClick={() => navigate('/auth')}
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 md:py-4 md:text-lg md:px-10"
                    >
                      Get Started
                    </button>
                  </div>
                  <div className="rounded-md shadow">
                    <button
                      onClick={() => navigate('/help')}
                      className="w-full flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-teal-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                    >
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 bg-gray-50">
          <img
            className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full opacity-90"
            src="https://images.pexels.com/photos/48889/cleaning-washing-cleanup-the-ilo-48889.jpeg"
            alt="Cleaning"
          />
        </div>
      </div>

      {/* About Us Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">About MaidServSA</h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Reinventing domestic services with trust and technology.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                We aim to empower domestic workers with dignified work opportunities and fair pay
                while providing homeowners with a convenient, safe, and transparent way to find
                trusted help. We believe in building a community based on mutual respect and
                reliability.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <IconCheckCircle className="w-8 h-8 text-teal-600 mb-2" />
                  <h4 className="font-semibold text-gray-900">Vetted Professionals</h4>
                  <p className="text-sm text-gray-500">Rigorous background checks.</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <IconLock className="w-8 h-8 text-teal-600 mb-2" />
                  <h4 className="font-semibold text-gray-900">Secure Platform</h4>
                  <p className="text-sm text-gray-500">Your data and safety come first.</p>
                </div>
              </div>
            </div>
            <div className="relative h-96 rounded-xl overflow-hidden shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                alt="Team"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-teal-900 bg-opacity-20"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setUsers(await db.getUsers());
      setJobs(await db.getJobs());
      setApplications(await db.getApplications());
      setNotifications(await db.getNotifications());
      setLoading(false);
    };
    loadData();
  }, []);

  // Login Handler
  const handleLogin = (email: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setCurrentUser(user);
    } else {
      alert('User not found. Try the demo accounts or sign up.');
    }
  };

  const handleSignUp = async (userData: Partial<User>) => {
    // Check if user already exists
    if (users.some((u) => u.email.toLowerCase() === userData.email?.toLowerCase())) {
      alert('An account with this email already exists.');
      return;
    }

    const newUser: User = {
      rating: 0,
      ratingCount: 0,
      id: `user_${Date.now()}`,
      email: userData.email!,
      name: userData.name!,
      role: userData.role!,
      avatar: userData.avatar!,
      // Initialize other fields with defaults
      firstName: userData.name?.split(' ')[0] || '',
      surname: userData.name?.split(' ').slice(1).join(' ') || '',
      experienceAnswers: [],
    };

    const saved = await db.saveUser(newUser);
    setUsers((prev) => [...prev, saved]);
    setCurrentUser(saved);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    const saved = await db.saveUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
    setCurrentUser(saved);
  };

  const handlePostJob = async (job: Job) => {
    const saved = await db.saveJob(job);
    setJobs((prev) => [...prev, saved]);
  };

  const handleUpdateJob = async (job: Job) => {
    const saved = await db.saveJob(job);
    setJobs((prev) => prev.map((j) => (j.id === saved.id ? saved : j)));
  };

  const handleDeleteJob = async (jobId: string) => {
    await db.deleteJob(jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const handleApply = async (jobId: string, message: string) => {
    if (!currentUser) return;
    const newApp: Application = {
      id: `app_${Date.now()}`,
      jobId,
      maidId: currentUser.id,
      status: ApplicationStatus.PENDING,
      message,
      appliedAt: new Date().toISOString(),
    };
    const saved = await db.saveApplication(newApp);
    setApplications((prev) => [...prev, saved]);

    // Notify Client
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      const note: Notification = {
        id: `not_${Date.now()}`,
        userId: job.clientId,
        message: `New application from ${currentUser.name} for ${job.title}`,
        type: 'info',
        read: false,
        timestamp: new Date().toISOString(),
      };
      const savedNote = await db.saveNotification(note);
      setNotifications((prev) => [...prev, savedNote]);
    }
  };

  const handleUpdateApplicationStatus = async (appId: string, status: ApplicationStatus) => {
    const app = applications.find((a) => a.id === appId);
    if (app) {
      const updated = { ...app, status };
      await db.saveApplication(updated);
      setApplications((prev) => prev.map((a) => (a.id === appId ? updated : a)));

      // Notify Maid
      const note: Notification = {
        id: `not_${Date.now()}`,
        userId: app.maidId,
        message: `Your application for job ID ${app.jobId} was ${status.toLowerCase()}`,
        type: status === ApplicationStatus.ACCEPTED ? 'success' : 'error',
        read: false,
        timestamp: new Date().toISOString(),
      };
      const savedNote = await db.saveNotification(note);
      setNotifications((prev) => [...prev, savedNote]);
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (currentUser) {
      await db.markNotificationsRead(currentUser.id);
      setNotifications((prev) =>
        prev.map((n) => (n.userId === currentUser.id ? { ...n, read: true } : n))
      );
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-teal-600">Loading...</div>
    );

  return (
    <HashRouter>
      <Navbar
        currentUser={currentUser}
        notifications={notifications}
        onLogout={handleLogout}
        onMarkNotificationsRead={handleMarkNotificationsRead}
      />
      <div className="bg-gray-50 min-h-screen">
        <Routes>
          <Route
            path="/"
            element={
              currentUser ? (
                currentUser.role === UserRole.CLIENT ? (
                  <Navigate to="/client/dashboard" />
                ) : currentUser.role === UserRole.MAID ? (
                  <Navigate to="/maid/dashboard" />
                ) : (
                  <Navigate to="/profile" />
                )
              ) : (
                <LandingPage />
              )
            }
          />

          <Route
            path="/auth"
            element={
              currentUser ? (
                <Navigate to="/" />
              ) : (
                <AuthPage onLogin={handleLogin} onSignUp={handleSignUp} />
              )
            }
          />

          <Route path="/help" element={<HelpPage />} />

          <Route
            path="/client/dashboard"
            element={
              currentUser && currentUser.role === UserRole.CLIENT ? (
                <ClientDashboard
                  user={currentUser}
                  jobs={jobs}
                  applications={applications}
                  users={users}
                  onPostJob={handlePostJob}
                  onUpdateJob={handleUpdateJob}
                  onDeleteJob={handleDeleteJob}
                  onUpdateApplicationStatus={handleUpdateApplicationStatus}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
            path="/maid/dashboard"
            element={
              currentUser && currentUser.role === UserRole.MAID ? (
                <MaidDashboard
                  user={currentUser}
                  jobs={jobs}
                  applications={applications}
                  onApply={handleApply}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
            path="/profile"
            element={
              currentUser ? (
                <ProfilePage user={currentUser} onUpdate={handleUpdateProfile} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
