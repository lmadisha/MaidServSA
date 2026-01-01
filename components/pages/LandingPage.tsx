import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCheckCircle, IconLock } from '../Icons';

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

export default LandingPage;
