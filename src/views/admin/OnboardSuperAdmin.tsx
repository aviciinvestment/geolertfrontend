import React, { useState } from 'react';
import axios from 'axios';
import { Shield, User, Mail, Lock, CheckCircle2, Globe, MapPin } from 'lucide-react';
import { COUNTRIES } from '../../data/countries';

const API_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

interface CreatedAdmin {
  id: string;
  name: string;
  email: string;
  jurisdiction?: { country?: string; state?: string };
}

export const OnboardSuperAdmin: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: 'Nigeria',
    state: '',
    password: '',
    confirmPassword: ''
  });
  const [createdAdmin, setCreatedAdmin] = useState<CreatedAdmin | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedCountry = COUNTRIES.find((c) => c.name === formData.country);

  const handleCountryChange = (country: string) => {
    setFormData({ ...formData, country, state: '' });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      country: 'Nigeria',
      state: '',
      password: '',
      confirmPassword: ''
    });
    setCreatedAdmin(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('achiv_token');
      const response = await axios.post(
        `${API_URL}/onboard/superadmin`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          country: formData.country,
          state: formData.state,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setCreatedAdmin(response.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to onboard Super Admin. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Shield className="w-6 h-6 mr-2 text-blue-500" />
          Onboard Super Admin
        </h1>
        <p className="text-gray-400 text-sm mt-1">Create a new global overseer account with full system access.</p>
      </div>

      <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 md:p-8 shadow-sm">
        {createdAdmin ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Super Admin Onboarded</h2>
            <p className="text-gray-400 mb-1">
              <span className="text-gray-200 font-medium">{createdAdmin.name}</span> ({createdAdmin.email}) can now log in with the temporary password.
            </p>
            {createdAdmin.jurisdiction && (
              <p className="text-gray-500 text-sm mb-6">
                Jurisdiction: {createdAdmin.jurisdiction.state}, {createdAdmin.jurisdiction.country}
              </p>
            )}
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
            >
              Onboard Another Super Admin
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    required
                    className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    required
                    className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="admin@geoalert.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Country of Jurisdiction</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                    <select
                      required
                      className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none"
                      value={formData.country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">State / Region</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                    <select
                      required
                      className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none disabled:opacity-50"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    >
                      <option value="" disabled>
                        Select state...
                      </option>
                      {selectedCountry?.states.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    This Super Admin's authority covers {selectedCountry?.name}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Temporary Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-4 rounded-lg">
                {error}
              </div>
            )}

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-400 hover:text-white mr-3 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Create Account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
