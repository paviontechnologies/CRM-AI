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
            <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b">
                    <h3 className="font-semibold text-lg text-ink">Import a Lead</h3>
                    <button onClick={onClose} className="text-faint hover:text-muted">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Company Name *</label>
                        <input 
                            required 
                            type="text" 
                            className="w-full text-sm border-line rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2 border" 
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Decision Maker Email</label>
                        <input 
                            type="email" 
                            className="w-full text-sm border-line rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2 border" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Industry</label>
                        <select 
                            className="w-full text-sm border-line rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2 border"
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
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-ink bg-surface border border-line rounded-lg hover:bg-subtle">
                            Cancel
                        </button>
                        <button disabled={loading} type="submit" className="px-4 py-2 text-sm font-medium text-onaccent bg-brand-600 rounded-lg hover:bg-brand-700">
                            {loading ? 'Saving...' : 'Add Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
