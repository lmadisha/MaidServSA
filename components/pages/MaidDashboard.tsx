import React, { useState } from 'react';
import { Application, ApplicationStatus, Job, JobStatus, User } from '../../types';
import { IconMapPin } from '../Icons';
import ApplyModal from './ApplyModal';
import JobDetailsModal from './JobDetailsModal';
import { INPUT_CLASS } from './formStyles';
import MessageModal from './MessageModal';

const MaidDashboard: React.FC<{
  user: User;
  jobs: Job[];
  applications: Application[];
  users: User[];
  onApply: (jobId: string, message: string) => void;
}> = ({ user, jobs, applications, users, onApply }) => {
  const [activeTab, setActiveTab] = useState<'find' | 'my'>('find');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [filterLocation, setFilterLocation] = useState('');
  const [messageContext, setMessageContext] = useState<{
    job: Job;
    otherUser: User;
  } | null>(null);

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
          className={`py-4 px-1 border-b-2 font-medium text-sm mr-8 ${
            activeTab === 'find'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Find Work
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'my'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
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
              const client = users.find((u) => u.id === job.clientId);
              const canMessage =
                app?.status === ApplicationStatus.ACCEPTED || job.assignedMaidId === user.id;
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
                  {canMessage && client && (
                    <div className="mt-3">
                      <button
                        onClick={() => setMessageContext({ job, otherUser: client })}
                        className="text-teal-600 hover:text-teal-800 text-xs font-medium border border-teal-200 px-2 py-1 rounded bg-teal-50"
                      >
                        Message Client
                      </button>
                    </div>
                  )}
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

      <MessageModal
        isOpen={!!messageContext}
        onClose={() => setMessageContext(null)}
        job={messageContext?.job ?? null}
        currentUser={user}
        otherUser={messageContext?.otherUser ?? null}
      />
    </div>
  );
};

export default MaidDashboard;
