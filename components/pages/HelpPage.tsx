import React, { useState } from 'react';

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

export default HelpPage;
