import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { User, UserRole, Job, JobStatus, Application, ApplicationStatus, Message } from './types';
import { generateJobDescription, analyzeCandidateMatch } from './services/geminiService';
import { IconCalendar, IconCheckCircle, IconHome, IconMapPin, IconMessageSquare, IconSparkles, IconUser, IconXCircle, IconSend } from './components/Icons';

// --- MOCK DATA ---
const MOCK_USERS: User[] = [
  { id: 'client1', name: 'Sarah Connor', role: UserRole.CLIENT, avatar: 'https://picsum.photos/200/200?random=1', rating: 4.8, location: 'Cape Town' },
  { id: 'maid1', name: 'Martha Kent', role: UserRole.MAID, avatar: 'https://picsum.photos/200/200?random=2', rating: 4.9, bio: 'Experienced cleaner with 10 years in luxury homes. Specialized in deep cleaning.', location: 'Cape Town' },
  { id: 'maid2', name: 'Diana Prince', role: UserRole.MAID, avatar: 'https://picsum.photos/200/200?random=3', rating: 5.0, bio: 'Fast, efficient, and reliable. I bring my own eco-friendly supplies.', location: 'Johannesburg' },
];

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
    date: new Date(Date.now() + 86400000).toISOString(),
    status: JobStatus.OPEN,
    rooms: 3,
    bathrooms: 2,
    images: ['https://picsum.photos/800/600?random=10'],
  },
  {
    id: 'job2',
    clientId: 'client1',
    title: 'Weekly Maintenance Clean',
    description: 'Regular cleaning needed for a small studio. Dusting, mopping, and laundry.',
    location: 'City Bowl, Cape Town',
    areaSize: 45,
    price: 350,
    currency: 'R',
    date: new Date(Date.now() + 172800000).toISOString(),
    status: JobStatus.OPEN,
    rooms: 1,
    bathrooms: 1,
    images: ['https://picsum.photos/800/600?random=11'],
  },
];

// --- COMPONENTS ---

const Navbar: React.FC<{ currentUser: User; onSwitchUser: (role: UserRole) => void }> = ({ currentUser, onSwitchUser }) => {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <IconSparkles className="h-8 w-8 text-teal-600 mr-2" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">MaidServ<span className="text-teal-600">SA</span></span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => onSwitchUser(currentUser.role === UserRole.CLIENT ? UserRole.MAID : UserRole.CLIENT)}
              className="text-xs font-medium bg-gray-100 px-3 py-1 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Switch View (Demo): {currentUser.role === UserRole.CLIENT ? 'Client' : 'Maid'}
            </button>
            <div className="flex items-center space-x-2">
              <img src={currentUser.avatar} alt="Profile" className="h-8 w-8 rounded-full object-cover border border-gray-200" />
              <span className="text-sm font-medium text-gray-700 hidden md:block">{currentUser.name}</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

// --- PAGES ---

// 1. LANDING PAGE
const LandingPage: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-y-0 h-full w-full" aria-hidden="true">
          <div className="relative h-full">
            <div className="absolute top-0 right-0 -mr-96 -mt-40 opacity-10 blur-3xl sm:-mr-80 sm:-mt-32">
              <div className="h-[60rem] w-[80rem] bg-gradient-to-tr from-[#14b8a6] to-[#0f766e] rounded-full" />
            </div>
          </div>
        </div>

        <div className="relative pt-6 pb-16 sm:pb-24 lg:pb-32">
          <main className="mt-16 mx-auto max-w-7xl px-4 sm:mt-24 sm:px-6 lg:mt-32">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
                <h1>
                  <span className="block text-sm font-semibold uppercase tracking-wide text-teal-600 sm:text-base lg:text-sm xl:text-base">
                    Premium Cleaning Services
                  </span>
                  <span className="mt-1 block text-4xl tracking-tight font-extrabold sm:text-5xl xl:text-6xl">
                    <span className="block text-gray-900">Spotless homes,</span>
                    <span className="block text-teal-600">trusted professionals.</span>
                  </span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                  Connect with top-rated maids in South Africa. Whether you need a deep clean or weekly maintenance, MaidServSA handles the details so you can enjoy your home.
                </p>
                <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0">
                  <button
                    onClick={() => navigate(currentUser.role === UserRole.CLIENT ? '/client/dashboard' : '/maid/dashboard')}
                    className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 md:py-4 md:text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    {currentUser.role === UserRole.CLIENT ? 'Post a Job' : 'Find Work'}
                  </button>
                </div>
              </div>
              <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
                <div className="relative mx-auto w-full rounded-lg shadow-lg lg:max-w-md overflow-hidden">
                  <img
                    className="w-full h-full object-cover"
                    src="https://picsum.photos/600/800?random=100"
                    alt="Cleaning service"
                  />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

// 2. CLIENT DASHBOARD & JOB CREATION
const ClientDashboard: React.FC<{ 
  user: User; 
  jobs: Job[]; 
  applications: Application[];
  users: User[];
  onPostJob: (job: Job) => void;
  onAcceptApplication: (appId: string, jobId: string) => void;
}> = ({ user, jobs, applications, users, onPostJob, onAcceptApplication }) => {
  const [showPostForm, setShowPostForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [generatingDesc, setGeneratingDesc] = useState(false);
  
  // New Job Form State
  const [newJob, setNewJob] = useState<Partial<Job>>({
    title: '',
    location: '',
    areaSize: 50,
    rooms: 1,
    bathrooms: 1,
    price: 300,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleAIHelp = async () => {
    setGeneratingDesc(true);
    const desc = await generateJobDescription(
      newJob.rooms || 0,
      newJob.bathrooms || 0,
      newJob.areaSize || 0,
      newJob.location || '',
      newJob.title || ''
    );
    setNewJob(prev => ({ ...prev, description: desc }));
    setGeneratingDesc(false);
  };

  const handleSubmitJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.location || !newJob.price) return;
    
    const job: Job = {
      id: `job_${Date.now()}`,
      clientId: user.id,
      title: newJob.title!,
      description: newJob.description || 'No description provided.',
      location: newJob.location!,
      areaSize: newJob.areaSize || 0,
      price: newJob.price || 0,
      currency: 'R',
      date: newJob.date || new Date().toISOString(),
      status: JobStatus.OPEN,
      rooms: newJob.rooms || 1,
      bathrooms: newJob.bathrooms || 1,
      images: [`https://picsum.photos/800/600?random=${Math.floor(Math.random() * 1000)}`],
    };
    onPostJob(job);
    setShowPostForm(false);
    // Reset form
    setNewJob({ title: '', location: '', areaSize: 50, rooms: 1, bathrooms: 1, price: 300, description: '', date: new Date().toISOString().split('T')[0] });
  };

  const clientJobs = jobs.filter(j => j.clientId === user.id);
  const activeJobs = clientJobs.filter(j => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.CANCELLED);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">My Dashboard</h2>
        <button
          onClick={() => setShowPostForm(!showPostForm)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm"
        >
          {showPostForm ? 'Cancel' : '+ Post New Job'}
        </button>
      </div>

      {showPostForm && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8 animate-fade-in-down">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create a Job Listing</h3>
          <form onSubmit={handleSubmitJob} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2"
                  placeholder="e.g. Deep Clean 3 Bed House"
                  value={newJob.title}
                  onChange={e => setNewJob({...newJob, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2"
                  placeholder="e.g. Sandton, JHB"
                  value={newJob.location}
                  onChange={e => setNewJob({...newJob, location: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Area (m²)</label>
                <input type="number" className="mt-1 block w-full border-gray-300 rounded-md border p-2" value={newJob.areaSize} onChange={e => setNewJob({...newJob, areaSize: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rooms</label>
                <input type="number" className="mt-1 block w-full border-gray-300 rounded-md border p-2" value={newJob.rooms} onChange={e => setNewJob({...newJob, rooms: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bathrooms</label>
                <input type="number" className="mt-1 block w-full border-gray-300 rounded-md border p-2" value={newJob.bathrooms} onChange={e => setNewJob({...newJob, bathrooms: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Offering (R)</label>
                <input type="number" className="mt-1 block w-full border-gray-300 rounded-md border p-2" value={newJob.price} onChange={e => setNewJob({...newJob, price: Number(e.target.value)})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" className="mt-1 block w-full border-gray-300 rounded-md border p-2" value={newJob.date} onChange={e => setNewJob({...newJob, date: e.target.value})} />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <button
                  type="button"
                  onClick={handleAIHelp}
                  disabled={generatingDesc}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center"
                >
                  <IconSparkles className="w-3 h-3 mr-1" />
                  {generatingDesc ? 'Generating...' : 'AI Generate'}
                </button>
              </div>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2"
                rows={3}
                value={newJob.description}
                onChange={e => setNewJob({...newJob, description: e.target.value})}
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="bg-teal-600 text-white px-6 py-2 rounded-md font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Publish Job
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Jobs List */}
      <div className="space-y-6">
        {activeJobs.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No active jobs found.</p>
        ) : (
          activeJobs.map(job => {
            const jobApps = applications.filter(a => a.jobId === job.id);
            const acceptedApp = jobApps.find(a => a.status === ApplicationStatus.ACCEPTED);
            
            return (
              <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                        <span className="flex items-center"><IconMapPin className="w-4 h4 mr-1"/> {job.location}</span>
                        <span className="flex items-center"><IconCalendar className="w-4 h4 mr-1"/> {new Date(job.date).toLocaleDateString()}</span>
                        <span className="font-semibold text-teal-600">R {job.price}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${job.status === JobStatus.OPEN ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {job.status}
                    </span>
                  </div>
                  
                  {/* Applicants Section */}
                  <div className="mt-6 border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Applicants ({jobApps.length})
                    </h4>
                    {jobApps.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Waiting for maids to apply...</p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {jobApps.map(app => {
                          const applicant = users.find(u => u.id === app.maidId);
                          if (!applicant) return null;
                          const isAccepted = app.status === ApplicationStatus.ACCEPTED;
                          
                          return (
                            <div key={app.id} className={`flex flex-col p-4 rounded-lg border ${isAccepted ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-gray-50'}`}>
                              <div className="flex items-center mb-2">
                                <img src={applicant.avatar} className="w-10 h-10 rounded-full mr-3" alt={applicant.name} />
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{applicant.name}</p>
                                  <div className="flex text-yellow-500 text-xs">
                                    {'★'.repeat(Math.round(applicant.rating))}
                                    <span className="text-gray-400 ml-1">({applicant.rating})</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">"{app.message}"</p>
                              
                              <Link 
                                to={`/chat/${app.id}`} 
                                className="text-xs text-center block w-full bg-white border border-gray-300 text-gray-700 py-1 mb-2 rounded hover:bg-gray-50"
                              >
                                Message
                              </Link>

                              {!acceptedApp && job.status === JobStatus.OPEN && (
                                <button 
                                  onClick={() => onAcceptApplication(app.id, job.id)}
                                  className="text-xs w-full bg-teal-600 text-white py-1.5 rounded hover:bg-teal-700"
                                >
                                  Hire
                                </button>
                              )}
                              
                              {isAccepted && (
                                <div className="text-xs w-full bg-green-100 text-green-800 py-1.5 rounded text-center font-medium flex items-center justify-center">
                                  <IconCheckCircle className="w-3 h-3 mr-1" /> Hired
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// 3. MAID DASHBOARD & FIND JOBS
const MaidDashboard: React.FC<{
  user: User;
  jobs: Job[];
  applications: Application[];
  onApply: (jobId: string, message: string) => void;
}> = ({ user, jobs, applications, onApply }) => {
  const [filter, setFilter] = useState('');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState('');

  // Conflict Logic: Check if user has an accepted job on the same date
  const hasConflict = (jobDate: string) => {
    const myAcceptedApps = applications.filter(a => a.maidId === user.id && a.status === ApplicationStatus.ACCEPTED);
    const myJobIds = myAcceptedApps.map(a => a.jobId);
    const myJobs = jobs.filter(j => myJobIds.includes(j.id));
    
    return myJobs.some(j => j.date.split('T')[0] === jobDate.split('T')[0]);
  };

  const openJobs = jobs.filter(j => j.status === JobStatus.OPEN && !applications.some(a => a.jobId === j.id && a.maidId === user.id));
  const myApplications = applications.filter(a => a.maidId === user.id);

  const handleApplyClick = (jobId: string) => {
    setApplyingJobId(jobId);
    setApplyMessage("I'm interested in this job! I have experience with this property size.");
  };

  const confirmApply = () => {
    if (applyingJobId) {
      onApply(applyingJobId, applyMessage);
      setApplyingJobId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: My Schedule */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">My Schedule</h2>
            {myApplications.length === 0 ? (
              <p className="text-sm text-gray-500">You haven't applied to any jobs yet.</p>
            ) : (
              <div className="space-y-4">
                {myApplications.map(app => {
                  const job = jobs.find(j => j.id === app.jobId);
                  if (!job) return null;
                  
                  return (
                    <div key={app.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-gray-800 text-sm truncate">{job.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          app.status === ApplicationStatus.ACCEPTED ? 'bg-green-100 text-green-800' :
                          app.status === ApplicationStatus.REJECTED ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {app.status === ApplicationStatus.ACCEPTED ? 'Booked' : app.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{new Date(job.date).toLocaleDateString()} • {job.location}</p>
                      
                      {app.status === ApplicationStatus.ACCEPTED && (
                        <Link to={`/chat/${app.id}`} className="block text-center text-xs bg-teal-50 text-teal-700 py-1 rounded hover:bg-teal-100 transition-colors">
                          Message Client
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Job Feed */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Jobs</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by location..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
              <IconMapPin className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <div className="grid gap-6">
            {openJobs
              .filter(j => j.location.toLowerCase().includes(filter.toLowerCase()))
              .map(job => {
                const conflict = hasConflict(job.date);
                
                return (
                  <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="md:flex">
                      <div className="md:flex-shrink-0">
                        <img className="h-48 w-full md:w-48 object-cover" src={job.images[0]} alt={job.title} />
                      </div>
                      <div className="p-6 w-full flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                            <span className="text-lg font-bold text-teal-600">R {job.price}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500 flex items-center">
                            <IconMapPin className="w-4 h-4 mr-1" /> {job.location} • {job.areaSize}m²
                          </p>
                          <p className="mt-3 text-sm text-gray-600 line-clamp-2">{job.description}</p>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-sm text-gray-500 flex items-center">
                             <IconCalendar className="w-4 h-4 mr-1"/> {new Date(job.date).toDateString()}
                          </div>
                          {conflict ? (
                            <span className="text-red-500 text-sm font-medium flex items-center">
                              <IconXCircle className="w-4 h-4 mr-1"/> Conflict with schedule
                            </span>
                          ) : (
                            applyingJobId === job.id ? (
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => setApplyingJobId(null)} 
                                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleApplyClick(job.id)}
                                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                              >
                                Apply Now
                              </button>
                            )
                          )}
                        </div>
                        
                        {/* Application Message Input */}
                        {applyingJobId === job.id && (
                          <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in-down">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Message to Client</label>
                            <textarea
                              className="w-full text-sm border-gray-300 rounded-md border p-2 mb-2"
                              rows={2}
                              value={applyMessage}
                              onChange={e => setApplyMessage(e.target.value)}
                            />
                            <button
                              onClick={confirmApply}
                              className="w-full bg-teal-600 text-white py-1.5 rounded text-sm font-medium hover:bg-teal-700"
                            >
                              Send Application
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
              {openJobs.length === 0 && <div className="text-center py-10 text-gray-500">No jobs available matching your criteria.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. CHAT PAGE
const ChatPage: React.FC<{ 
  user: User; 
  applications: Application[]; 
  jobs: Job[];
  users: User[];
  messages: Message[];
  onSendMessage: (content: string, receiverId: string, jobId: string) => void; 
}> = ({ user, applications, jobs, users, messages, onSendMessage }) => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [newMessage, setNewMessage] = useState('');
  
  // Find context
  const application = applications.find(a => a.id === applicationId);
  const job = jobs.find(j => j.id === application?.jobId);
  
  // Identify other party
  const otherUserId = user.role === UserRole.CLIENT ? application?.maidId : job?.clientId;
  const otherUser = users.find(u => u.id === otherUserId);

  const relevantMessages = messages.filter(m => m.jobId === job?.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (!application || !job || !otherUser) return <div className="p-8 text-center">Chat not found</div>;

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage, otherUserId!, job.id);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center">
          <Link to={user.role === UserRole.CLIENT ? '/client/dashboard' : '/maid/dashboard'} className="mr-4 text-gray-500 hover:text-gray-700">
            &larr; Back
          </Link>
          <img src={otherUser.avatar} className="w-10 h-10 rounded-full mr-3" alt={otherUser.name} />
          <div>
            <h3 className="text-sm font-bold text-gray-900">{otherUser.name}</h3>
            <p className="text-xs text-gray-500">Ref: {job.title}</p>
          </div>
        </div>
        {job.status === JobStatus.COMPLETED && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Job Completed</span>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {relevantMessages.map(msg => {
          const isMe = msg.senderId === user.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'}`}>
                {msg.content}
                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-teal-200' : 'text-gray-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
        {relevantMessages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-10">Start the conversation...</div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            className="bg-teal-600 text-white rounded-full p-2 hover:bg-teal-700 transition-colors"
          >
            <IconSend className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- APP ROOT ---

const AppContent: React.FC = () => {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]); // Default to Client
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [applications, setApplications] = useState<Application[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users] = useState<User[]>(MOCK_USERS);

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect logic based on role if accessing root (simple protection)
  useEffect(() => {
    if (location.pathname === '/' && currentUser.role === UserRole.CLIENT) {
      // Allow staying on landing
    }
  }, [currentUser, location]);

  const handleSwitchUser = (role: UserRole) => {
    const newUser = role === UserRole.CLIENT ? MOCK_USERS[0] : MOCK_USERS[1];
    setCurrentUser(newUser);
    navigate(role === UserRole.CLIENT ? '/client/dashboard' : '/maid/dashboard');
  };

  const handlePostJob = (job: Job) => {
    setJobs(prev => [job, ...prev]);
  };

  const handleApply = (jobId: string, message: string) => {
    const newApp: Application = {
      id: `app_${Date.now()}`,
      jobId,
      maidId: currentUser.id,
      status: ApplicationStatus.PENDING,
      message,
      appliedAt: new Date().toISOString()
    };
    setApplications(prev => [...prev, newApp]);
    
    // Initial message
    const autoMsg: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      receiverId: jobs.find(j => j.id === jobId)?.clientId || '',
      jobId,
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, autoMsg]);
  };

  const handleAcceptApplication = (appId: string, jobId: string) => {
    // Update Application Status
    setApplications(prev => prev.map(a => 
      a.id === appId ? { ...a, status: ApplicationStatus.ACCEPTED } : 
      a.jobId === jobId ? { ...a, status: ApplicationStatus.REJECTED } : a // Reject others for same job
    ));
    // Update Job Status
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: JobStatus.IN_PROGRESS, assignedMaidId: applications.find(a=>a.id===appId)?.maidId } : j));
  };

  const handleSendMessage = (content: string, receiverId: string, jobId: string) => {
    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      senderId: currentUser.id,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      jobId
    };
    setMessages(prev => [...prev, newMsg]);
  };

  // Check permissions for routes (Simulated)
  const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole: UserRole }) => {
    if (currentUser.role !== requiredRole) {
      return <div className="p-10 text-center">Access Denied. Please switch user role.</div>;
    }
    return <>{children}</>;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar currentUser={currentUser} onSwitchUser={handleSwitchUser} />
      
      <Routes>
        <Route path="/" element={<LandingPage currentUser={currentUser} />} />
        
        <Route 
          path="/client/dashboard" 
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <ClientDashboard 
                user={currentUser} 
                jobs={jobs} 
                applications={applications} 
                users={users}
                onPostJob={handlePostJob}
                onAcceptApplication={handleAcceptApplication}
              />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/maid/dashboard" 
          element={
            <ProtectedRoute requiredRole={UserRole.MAID}>
              <MaidDashboard 
                user={currentUser} 
                jobs={jobs} 
                applications={applications} 
                onApply={handleApply}
              />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/chat/:applicationId" 
          element={
            <ChatPage 
              user={currentUser}
              applications={applications}
              jobs={jobs}
              users={users}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          } 
        />
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