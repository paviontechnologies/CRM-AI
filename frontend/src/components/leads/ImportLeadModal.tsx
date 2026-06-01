'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';

export function ImportLeadModal({ isOpen, onClose, onLeadAdded }: any) {
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [industry, setIndustry] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/leads', {
                companyName,
                email: email || undefined,
                industry: industry || undefined
            });
            onLeadAdded();
            onClose();
        } catch (error) {
            console.error('Error adding lead:', error);
            alert('Failed to add lead');
        } finally {
            setLoading(false);
            setCompanyName('');
            setEmail('');
            setIndustry('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b">
                    <h3 className="font-semibold text-lg text-gray-900">Import a Lead</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                        <input 
                            required 
                            type="text" 
                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 border" 
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Decision Maker Email</label>
                        <input 
                            type="email" 
                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 border" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                        <select 
                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 border"
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                        >
                            <option value="">Select industry...</option>
                            <option value="Healthcare">Healthcare</option>
                            <option value="Restaurant">Restaurant</option>
                            <option value="Tech SaaS">Tech SaaS</option>
                            <option value="Logistics">Logistics</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button disabled={loading} type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                            {loading ? 'Saving...' : 'Add Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
