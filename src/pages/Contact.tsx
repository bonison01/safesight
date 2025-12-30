import { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import Layout from '../components/Layout';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert("Thank you for contacting EyeWell! We'll get back to you soon.");
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-800 via-blue-900 to-blue-950 text-white py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact EyeWell</h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            We’re here to help with appointments, eye health concerns, or general inquiries.
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a subject</option>
                  <option value="appointment">Book an Appointment</option>
                  <option value="vision">Vision Care Inquiry</option>
                  <option value="service">EyeWell Services</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  required
                  className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="How can we assist you?"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold shadow-md transition-all"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Get in Touch</h2>

            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <Mail className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-800">Email</h3>
                  <p className="text-slate-600">safesighteyeclinic@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Phone className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-800">Phone</h3>
                  <p className="text-slate-600">87878 30551</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <MapPin className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-800">Clinic Address</h3>
                  <p className="text-slate-600">
                    Safe Sight Eye Care<br />
                    Thoubal Babu Bazar <br />
                    Thoubal, Manipur 795138
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 shadow-sm">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Quick Responses</h3>
                <p className="text-slate-700 text-sm">
                  We typically respond within 24 hours on business days.  
                  For urgent or emergency care, please call us directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-blue-50 border-t border-blue-100">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                How do I book an appointment?
              </h3>
              <p className="text-slate-700">
                You can book an appointment online through our booking page or call our reception team directly for assistance.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Do you offer pediatric eye care?
              </h3>
              <p className="text-slate-700">
                Yes, we have specialists dedicated to children’s vision care, including vision screening and myopia management.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Are walk-in appointments available?
              </h3>
              <p className="text-slate-700">
                Walk-ins are accepted based on availability. We recommend booking ahead to secure your preferred time slot.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Do you provide eye surgery consultations?
              </h3>
              <p className="text-slate-700">
                Absolutely. Our ophthalmologists provide LASIK, cataract, and retinal surgery consultations with complete pre-surgery evaluation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
