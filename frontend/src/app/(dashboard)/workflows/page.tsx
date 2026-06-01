'use client';

import { useState } from 'react';
import { Target, Save, Play, Bot, ArrowRight, Settings2 } from 'lucide-react';

const niches = ['Hospital/HMS', 'Restaurant/QR', 'SaaS CRM', 'Logistics/ERP', 'Custom'];

export default function WorkflowsPage() {
    const [selectedNiche, setSelectedNiche] = useState('Hospital/HMS');

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex justify-between items-center">
                <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">AI Qualification & Prompts</h1>
                <p className="text-sm text-gray-500 mt-1">Configure how the AI Engine reads and scores leads based on your ICP.</p>
                </div>
                
                <button className="flex items-center px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save Templates
                </button>
            </div>

            <div className="flex gap-6 h-[700px]">
                {/* Sidebar Niches */}
                <div className="w-64 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b bg-gray-50">
                        <h3 className="font-semibold text-sm text-gray-700">Industry Templates</h3>
                    </div>
                    <div className="p-2 space-y-1">
                        {niches.map(niche => (
                            <button 
                                key={niche}
                                onClick={() => setSelectedNiche(niche)}
                                className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between ${
                                    selectedNiche === niche ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {niche}
                                {selectedNiche === niche && <ArrowRight size={14} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Configuration Editor */}
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
                    <div className="p-6 border-b flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                           <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                               <Bot size={20} />
                           </div>
                           <div>
                               <h2 className="text-lg font-semibold text-gray-900">{selectedNiche} Intent Engine</h2>
                               <p className="text-xs text-gray-500">Model: GPT-4o-Mini • Temp: 0.7</p>
                           </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                            <Settings2 size={20}/>
                        </button>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">System Instruction (Prompt)</label>
                            <p className="text-xs text-gray-500 mb-3">Define instructions on how AI should search the lead's website data.</p>
                            <textarea 
                                className="w-full text-sm font-mono bg-gray-50 border border-gray-300 rounded-lg p-4 h-48 focus:ring-blue-500 focus:border-blue-500"
                                defaultValue={`You are a world-class SDR for an enterprise Hospital Management System.\nAnalyze the hospital's provided context and score their likelihood of buying.\n\nCriteria to check:\n1. If they mention "paperless" or "digital records" (Score +20)\n2. If their online patient portal looks outdated or uses third-party basic iframes (Score +40)\n\nVariables: {{companyName}}, {{industry}}, {{webContext}}`}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Extraction Hooks</label>
                                <div className="space-y-2">
                                    <div className="flex items-center text-sm px-3 py-2 border rounded-lg bg-gray-50">
                                        <span className="font-mono text-blue-600 mr-2 text-xs">key:</span> painPoint
                                    </div>
                                    <div className="flex items-center text-sm px-3 py-2 border rounded-lg bg-gray-50">
                                        <span className="font-mono text-blue-600 mr-2 text-xs">key:</span> estimatedBeds
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Test Lead Data</label>
                                <textarea 
                                    className="w-full text-sm font-mono bg-gray-900 text-green-400 border border-transparent rounded-lg p-3 h-28"
                                    defaultValue={`{\n  "companyName": "Apollo Healthcare",\n  "webContext": "Booking patients manually..."\n}`}
                                />
                                <button className="mt-3 flex items-center justify-center w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors">
                                    <Play size={16} className="mr-2" /> Test AI Completion
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
