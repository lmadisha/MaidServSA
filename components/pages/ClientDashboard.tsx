import React, { useState } from 'react';
import { Application, ApplicationStatus, Job, JobStatus, User } from '../../types';
import { IconCalendar, IconClock, IconEdit, IconTrash } from '../Icons';
import JobModal from './JobModal';

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
          className={`py-4 px-1 border-b-2 font-medium text-sm mr-8 ${
            activeTab === 'jobs'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          My Jobs
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'calendar'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
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
                    {/* ONLY show the edit button if the job is still OPEN */}
                    {job.status === JobStatus.OPEN ? (
                      <button
                        onClick={() => handleEdit(job)}
                        className="text-gray-400 hover:text-teal-600 transition-colors"
                        title="Edit Job"
                      >
                        <IconEdit className="w-5 h-5" />
                      </button>
                    ) : (
                      <span
                        className="text-gray-300 cursor-not-allowed"
                        title="Jobs in progress cannot be edited"
                      >
                        <IconEdit className="w-5 h-5" />
                      </span>
                    )}

                    <button
                      onClick={() => onDeleteJob(job.id)}
                      className="text-red-400 hover:text-red-500 transition-colors"
                      title="Delete Job"
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
                                  className={`text-xs px-2 py-1 rounded ${
                                    app.status === ApplicationStatus.ACCEPTED
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
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

export default ClientDashboard;
