import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Key, ShieldCheck, CheckCircle, Loader2, Play, AlertCircle, Cpu, ExternalLink, Download, Upload, Database, Trash2, User, CheckSquare, Square } from 'lucide-react';
import { saveApiKey, getStoredApiKey } from '../services/modelRegistry';
import { checkOllamaConnection, getAvailableOllamaModels, getLocalModelSetupInstructions } from '../services/localModelService';
import { dataExportService, ExportOptions } from '../services/dataExportService';
import { userProfileService, UserProfile } from '../services/userProfileService';

interface SettingsModalProps {
    onClose: () => void;
}

type Provider = 'google' | 'openai' | 'groq' | 'aws';

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    
    // User Profile State
    const [userProfile, setUserProfile] = useState<UserProfile>({
        name: '',
        role: '',
        greetingStyle: 'casual'
    });
    
    // Export/Import Options State
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [showImportOptions, setShowImportOptions] = useState(false);
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        settings: true,
        chats: true,
        mindMaps: true,
        snapshots: true,
        notes: true,
        todos: true,
        reminders: true,
        sources: true,
        userProfile: true,
        userFolders: true,
        processedFiles: true,
        activityLogs: true
    });
    const [importOptions, setImportOptions] = useState<ExportOptions>({
        settings: true,
        chats: true,
        mindMaps: true,
        snapshots: true,
        notes: true,
        todos: true,
        reminders: true,
        sources: true,
        userProfile: true,
        userFolders: true,
        processedFiles: true,
        activityLogs: false
    });
    const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
    
    // API Keys State
    const [keys, setKeys] = useState({
        google: '',
        openai: '',
        groq: '',
        aws: '',
        awsSecret: ''
    });
    
    // Testing States
    const [testingProvider, setTestingProvider] = useState<Provider | null>(null);
    const [testResults, setTestResults] = useState<Record<Provider, { success: boolean; message: string } | null>>({
        google: null,
        openai: null,
        groq: null,
        aws: null
    });

    const [showSuccess, setShowSuccess] = useState(false);
    const [lastTestTime, setLastTestTime] = useState<Record<Provider, number>>({
        google: 0,
        openai: 0,
        groq: 0,
        aws: 0
    });

    useEffect(() => {
        // Load user profile
        const profile = userProfileService.getProfile();
        if (profile) {
            setUserProfile(profile);
        }
        
        // Load API keys
        setKeys({
            google: getStoredApiKey('GEMINI_API_KEY'),
            openai: getStoredApiKey('OPENAI_API_KEY'),
            groq: getStoredApiKey('GROQ_API_KEY'),
            aws: getStoredApiKey('AWS_ACCESS_KEY_ID'),
            awsSecret: getStoredApiKey('AWS_SECRET_ACCESS_KEY')
        });
    }, []);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        
        // Delay attachment to avoid closing on the same click that opened it
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);
        
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const validateKey = async (provider: Provider, key: string) => {
        if (!key.trim()) {
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "Key is empty" } }));
            return;
        }

        // Rate limiting: prevent tests within 5 seconds
        const now = Date.now();
        const timeSinceLastTest = now - lastTestTime[provider];
        if (timeSinceLastTest < 5000) {
            const waitTime = Math.ceil((5000 - timeSinceLastTest) / 1000);
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: `Wait ${waitTime}s before testing again` } }));
            return;
        }
        setLastTestTime(prev => ({ ...prev, [provider]: now }));

        // Validate key format
        if (provider === 'google' && !key.startsWith('AIzaSy')) {
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "Invalid Google API key format (should start with AIzaSy)" } }));
            return;
        }
        if (provider === 'groq' && !key.startsWith('gsk_')) {
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "Invalid Groq API key format (should start with gsk_)" } }));
            return;
        }
        if (provider === 'openai' && !key.startsWith('sk-')) {
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "Invalid OpenAI API key format (should start with sk-)" } }));
            return;
        }

        setTestingProvider(provider);
        setTestResults(prev => ({ ...prev, [provider]: null }));

        try {
            // Create abort controller with 10 second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                if (provider === 'google') {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] }),
                        signal: controller.signal
                    });
                    if (!response.ok) {
                        if (response.status === 400) {
                            throw new Error(`Invalid API key`);
                        }
                        throw new Error(`API Error ${response.status}`);
                    }
                } 
                else if (provider === 'groq') {
                    // Groq API has CORS restrictions - skip browser validation
                    setTestResults(prev => ({ ...prev, [provider]: { success: true, message: "Format valid (CORS prevents test)" } }));
                    clearTimeout(timeoutId);
                    setTestingProvider(null);
                    return;
                }
                else if (provider === 'openai') {
                    if ((window as any).electron?.proxyOpenai) {
                        const result = await (window as any).electron.proxyOpenai(key, { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 });
                        if (!result.ok) throw new Error(`Error ${result.status || result.error}`);
                    } else {
                        const response = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
                            signal: controller.signal
                        });
                        if (!response.ok) throw new Error(`Error ${response.status}`);
                    }
                }

                clearTimeout(timeoutId);
                setTestResults(prev => ({ ...prev, [provider]: { success: true, message: "Valid Key" } }));
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timeout (10s)');
                }
                if (fetchError.message?.includes('Failed to fetch')) {
                    throw new Error('Network error - check connection');
                }
                throw fetchError;
            }
        } catch (error: any) {
            let errorMsg = error.message || "Connection failed";
            // Truncate long error messages
            if (errorMsg.length > 100) {
                errorMsg = errorMsg.substring(0, 100) + '...';
            }
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: errorMsg } }));
        } finally {
            setTestingProvider(null);
        }
    };

    const handleSave = () => {
        console.log('[Settings] Saving API keys:', { google: keys.google ? 'Present' : 'Empty' });
        
        // Save User Profile
        userProfileService.saveProfile({
            ...userProfile,
            hasCompletedOnboarding: true
        });
        
        // Save API Keys
        saveApiKey('GEMINI_API_KEY', keys.google);
        saveApiKey('OPENAI_API_KEY', keys.openai);
        saveApiKey('GROQ_API_KEY', keys.groq);
        saveApiKey('AWS_ACCESS_KEY_ID', keys.aws);
        saveApiKey('AWS_SECRET_ACCESS_KEY', keys.awsSecret);
        
        console.log('[Settings] After save, localStorage:', Object.keys(localStorage));
        console.log('[Settings] Gemini key saved as:', localStorage.getItem('constructlm_config_GEMINI_API_KEY'));
        
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            onClose();
        }, 800);
    };

    const handleExportData = async () => {
        if (showExportOptions) {
            await dataExportService.exportData(exportOptions);
            setShowExportOptions(false);
        } else {
            setShowExportOptions(true);
        }
    };

    const handleImportData = () => {
        if (showImportOptions) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    await dataExportService.importData(file, importOptions, importMode);
                }
            };
            input.click();
            setShowImportOptions(false);
        } else {
            setShowImportOptions(true);
        }
    };

    const toggleExportOption = (key: keyof ExportOptions) => {
        setExportOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleImportOption = (key: keyof ExportOptions) => {
        setImportOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const selectAllExport = () => {
        setExportOptions({
            settings: true,
            chats: true,
            mindMaps: true,
            snapshots: true,
            notes: true,
            todos: true,
            reminders: true,
            sources: true,
            userProfile: true,
            userFolders: true,
            processedFiles: true,
            activityLogs: true
        });
    };

    const selectAllImport = () => {
        setImportOptions({
            settings: true,
            chats: true,
            mindMaps: true,
            snapshots: true,
            notes: true,
            todos: true,
            reminders: true,
            sources: true,
            userProfile: true,
            userFolders: true,
            processedFiles: true,
            activityLogs: false
        });
    };

    const deselectAllExport = () => {
        setExportOptions({
            settings: false,
            chats: false,
            mindMaps: false,
            snapshots: false,
            notes: false,
            todos: false,
            reminders: false,
            sources: false,
            userProfile: false,
            userFolders: false,
            processedFiles: false,
            activityLogs: false
        });
    };

    const deselectAllImport = () => {
        setImportOptions({
            settings: false,
            chats: false,
            mindMaps: false,
            snapshots: false,
            notes: false,
            todos: false,
            reminders: false,
            sources: false,
            userProfile: false,
            userFolders: false,
            processedFiles: false,
            activityLogs: false
        });
    };

    const handleClearAppData = () => {
        const confirmed = confirm(
            'Clear All App Data?\n\n' +
            'This will permanently delete:\n' +
            '• All uploaded files and folders\n' +
            '• All chat conversations\n' +
            '• All mind maps and snapshots\n' +
            '• All notes, todos, and reminders\n' +
            '• API keys and settings\n\n' +
            'This action cannot be undone. Continue?'
        );
        
        if (confirmed) {
            const doubleConfirm = confirm(
                'Are you absolutely sure?\n\n' +
                'This will reset ConstructLM to a brand new state.\n' +
                'All your data will be lost forever.'
            );
            
            if (doubleConfirm) {
                // Clear all localStorage data
                localStorage.clear();
                
                // Clear ALL IndexedDB databases
                if ('indexedDB' in window) {
                    indexedDB.deleteDatabase('ConstructLM_PermanentStorage');
                    indexedDB.deleteDatabase('constructlm_mindmap_cache');
                    indexedDB.deleteDatabase('constructlm_snapshots');
                }
                
                // Show success message
                const toast = document.createElement('div');
                toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-[9999]';
                toast.textContent = 'App data cleared! Refreshing...';
                document.body.appendChild(toast);
                
                // Refresh page after short delay
                setTimeout(() => window.location.reload(), 1500);
            }
        }
    };

    const renderApiInput = (label: string, provider: Provider, placeholder: string, desc: string) => (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">{label}</label>
                {testResults[provider] && (
                    <span className={`text-[12px] flex items-center gap-1 ${testResults[provider]?.success ? 'text-[#4485d1]' : 'text-[#666666] dark:text-[#a0a0a0]'}`}>
                        {testResults[provider]?.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {testResults[provider]?.message}
                    </span>
                )}
            </div>
            <div className="flex gap-1.5">
                <input 
                    type="text" 
                    value={keys[provider]}
                    onChange={e => {
                        setKeys({...keys, [provider]: e.target.value});
                        setTestResults(prev => ({ ...prev, [provider]: null }));
                    }}
                    placeholder={placeholder}
                    className="flex-1 px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#1a1a1a] dark:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(68,133,209,0.2)] focus:border-[#4485d1] transition-all"
                />
                <button
                    onClick={() => validateKey(provider, keys[provider])}
                    disabled={testingProvider === provider || !keys[provider] || (Date.now() - lastTestTime[provider] < 5000)}
                    className="px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={Date.now() - lastTestTime[provider] < 5000 ? "Wait before testing again" : "Test API Connection"}
                >
                    {testingProvider === provider ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                </button>
            </div>
            <p className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">{desc}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
            <div ref={modalRef} className="bg-white dark:bg-[#222222] w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] pointer-events-auto">
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a]">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[rgba(68,133,209,0.1)] text-[#4485d1] rounded-lg">
                            <Key size={14} />
                        </div>
                        <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Configuration</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded-full text-[#a0a0a0] transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto space-y-4 flex-1">
                    {/* Note Style Selector */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">Note Style</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'border', label: 'Left Border', preview: '│ Note' },
                                { id: 'glow', label: 'Glow Effect', preview: '✨ Note' },
                                { id: 'badge', label: 'Corner Badge', preview: '🏷 Note' },
                                { id: 'highlight', label: 'Highlight BG', preview: '▓ Note' }
                            ].map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => {
                                        localStorage.setItem('noteStyle', style.id);
                                        window.dispatchEvent(new Event('noteStyleChange'));
                                    }}
                                    className="px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg text-xs font-medium transition-colors text-left"
                                >
                                    <div className="font-semibold">{style.label}</div>
                                    <div className="text-[10px] opacity-70">{style.preview}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Font Selector Section - COMMENTED OUT FOR DEVELOPMENT */}
                    {/* <div className="space-y-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[#666666] dark:text-[#a0a0a0]">Aa</span>
                            <h3 className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">Font Family</h3>
                        </div>
                        <div className="bg-[rgba(68,133,209,0.1)] border border-[rgba(68,133,209,0.2)] dark:border-[rgba(68,133,209,0.3)] rounded-lg p-2">
                            <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">
                                Test different fonts to find your preference. Changes apply immediately.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {['Inter', 'System UI', 'Segoe UI', 'Arial', 'Helvetica', 'Georgia'].map(font => (
                                <button
                                    key={font}
                                    onClick={() => {
                                        document.body.style.fontFamily = font === 'System UI' ? 'ui-sans-serif, system-ui' : font;
                                    }}
                                    className="px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg text-xs font-medium transition-colors"
                                    style={{ fontFamily: font === 'System UI' ? 'ui-sans-serif, system-ui' : font }}
                                >
                                    {font}
                                </button>
                            ))}
                        </div>
                    </div> */}

                    {/* User Profile Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-1.5">
                            <User size={12} className="text-[#666666] dark:text-[#a0a0a0]" />
                            <h3 className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">User Profile</h3>
                        </div>
                        <div className="bg-[rgba(68,133,209,0.1)] border border-[rgba(68,133,209,0.2)] dark:border-[rgba(68,133,209,0.3)] rounded-lg p-2 flex gap-2">
                            <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">
                                Personalize your AI assistant experience with smart, context-aware greetings.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <label className="text-xs font-medium text-[#666666] dark:text-[#a0a0a0]">Name (Optional)</label>
                                <input 
                                    type="text" 
                                    value={userProfile.name || ''}
                                    onChange={e => setUserProfile({...userProfile, name: e.target.value})}
                                    placeholder="Your name"
                                    className="w-full px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#1a1a1a] dark:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(68,133,209,0.2)] focus:border-[#4485d1] transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[#666666] dark:text-[#a0a0a0]">Role (Optional)</label>
                                <input 
                                    type="text" 
                                    value={userProfile.role || ''}
                                    onChange={e => setUserProfile({...userProfile, role: e.target.value})}
                                    placeholder="e.g., Developer, Designer, Student"
                                    className="w-full px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#1a1a1a] dark:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(68,133,209,0.2)] focus:border-[#4485d1] transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[#666666] dark:text-[#a0a0a0]">Greeting Style</label>
                                <select 
                                    value={userProfile.greetingStyle || 'casual'}
                                    onChange={e => setUserProfile({...userProfile, greetingStyle: e.target.value as 'professional' | 'casual' | 'minimal'})}
                                    className="w-full px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#1a1a1a] dark:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(68,133,209,0.2)] focus:border-[#4485d1] transition-all"
                                >
                                    <option value="professional">Professional</option>
                                    <option value="casual">Casual</option>
                                    <option value="minimal">Minimal</option>
                                </select>
                                <p className="text-[11px] text-[#666666] dark:text-[#a0a0a0] mt-1">
                                    {userProfile.greetingStyle === 'professional' && 'Formal greetings with time-based salutations'}
                                    {userProfile.greetingStyle === 'casual' && 'Friendly, varied greetings'}
                                    {userProfile.greetingStyle === 'minimal' && 'Brief, to-the-point greetings'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] pt-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Key size={12} className="text-[#666666] dark:text-[#a0a0a0]" />
                            <h3 className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">API Keys</h3>
                        </div>
                        <div className="bg-[rgba(68,133,209,0.1)] border border-[rgba(68,133,209,0.2)] dark:border-[rgba(68,133,209,0.3)] rounded-lg p-2 flex gap-2 mb-3">
                            <ShieldCheck size={14} className="text-[#4485d1] flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">
                                API Keys are stored locally on your device.
                            </p>
                        </div>
                        <div className="space-y-3">
                        {renderApiInput('Google Gemini', 'google', 'AIzaSy...', 'Required for Gemini models & TTS.')}
                        {renderApiInput('Groq', 'groq', 'gsk_...', 'Required for Llama 3 models.')}
                        {renderApiInput('OpenAI', 'openai', 'sk-...', 'Required for GPT-4o models.')}
                        
                        {/* AWS Credentials */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">AWS Bedrock</label>
                            <input 
                                type="text" 
                                value={keys.aws}
                                onChange={e => setKeys({...keys, aws: e.target.value})}
                                placeholder="AKIA..."
                                className="w-full px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#1a1a1a] dark:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(68,133,209,0.2)] focus:border-[#4485d1] transition-all"
                            />
                            <input 
                                type="password" 
                                value={keys.awsSecret}
                                onChange={e => setKeys({...keys, awsSecret: e.target.value})}
                                placeholder="Secret Access Key"
                                className="w-full px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#1a1a1a] dark:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(68,133,209,0.2)] focus:border-[#4485d1] transition-all"
                            />
                            <p className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">For Claude 3.5 Sonnet & other AWS models. Uses your $100 credits.</p>
                        </div>
                    </div>
                    </div>

                    {/* Data Management Section */}
                    <div className="border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] pt-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Database size={12} className="text-[#666666] dark:text-[#a0a0a0]" />
                            <h3 className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">Data Management</h3>
                        </div>
                        <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-2 flex gap-2 mb-3">
                            <div className="flex-1">
                                <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">
                                    <strong>Selective Backup & Restore:</strong> Choose exactly what data to export or import. Perfect for transferring specific content between devices.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex gap-1.5">
                                <button
                                    onClick={handleExportData}
                                    className="flex-1 px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Download size={10} />
                                    {showExportOptions ? 'Confirm Export' : 'Export Data'}
                                </button>
                                <button
                                    onClick={handleImportData}
                                    className="flex-1 px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Upload size={10} />
                                    {showImportOptions ? 'Select File' : 'Import Data'}
                                </button>
                            </div>
                            
                            {/* Export Options */}
                            {showExportOptions && (
                                <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-[#1a1a1a] dark:text-white">Select Data to Export</span>
                                        <div className="flex gap-1">
                                            <button onClick={selectAllExport} className="text-[10px] text-[#4485d1] hover:underline">All</button>
                                            <span className="text-[10px] text-[#666666] dark:text-[#a0a0a0]">|</span>
                                            <button onClick={deselectAllExport} className="text-[10px] text-[#4485d1] hover:underline">None</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { key: 'chats', label: 'Chats' },
                                            { key: 'notes', label: 'Notes' },
                                            { key: 'todos', label: 'Todos' },
                                            { key: 'reminders', label: 'Reminders' },
                                            { key: 'mindMaps', label: 'Mind Maps' },
                                            { key: 'snapshots', label: 'Snapshots' },
                                            { key: 'sources', label: 'Web Sources' },
                                            { key: 'processedFiles', label: 'Files & Embeddings' },
                                            { key: 'userProfile', label: 'User Profile' },
                                            { key: 'userFolders', label: 'Folders' },
                                            { key: 'settings', label: 'Settings' },
                                            { key: 'activityLogs', label: 'Activity Logs' }
                                        ].map(({ key, label }) => (
                                            <button
                                                key={key}
                                                onClick={() => toggleExportOption(key as keyof ExportOptions)}
                                                className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-[#222222] rounded text-left transition-colors"
                                            >
                                                {exportOptions[key as keyof ExportOptions] ? 
                                                    <CheckSquare size={14} className="text-[#4485d1] flex-shrink-0" /> : 
                                                    <Square size={14} className="text-[#cccccc] dark:text-[#666666] flex-shrink-0" />
                                                }
                                                <span className="text-xs text-[#1a1a1a] dark:text-white">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setShowExportOptions(false)}
                                        className="w-full px-2 py-1 text-[10px] text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                            
                            {/* Import Options */}
                            {showImportOptions && (
                                <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-[#1a1a1a] dark:text-white">Select Data to Import</span>
                                        <div className="flex gap-1">
                                            <button onClick={selectAllImport} className="text-[10px] text-[#4485d1] hover:underline">All</button>
                                            <span className="text-[10px] text-[#666666] dark:text-[#a0a0a0]">|</span>
                                            <button onClick={deselectAllImport} className="text-[10px] text-[#4485d1] hover:underline">None</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { key: 'chats', label: 'Chats' },
                                            { key: 'notes', label: 'Notes' },
                                            { key: 'todos', label: 'Todos' },
                                            { key: 'reminders', label: 'Reminders' },
                                            { key: 'mindMaps', label: 'Mind Maps' },
                                            { key: 'snapshots', label: 'Snapshots' },
                                            { key: 'sources', label: 'Web Sources' },
                                            { key: 'processedFiles', label: 'Files & Embeddings' },
                                            { key: 'userProfile', label: 'User Profile' },
                                            { key: 'userFolders', label: 'Folders' },
                                            { key: 'settings', label: 'Settings' }
                                        ].map(({ key, label }) => (
                                            <button
                                                key={key}
                                                onClick={() => toggleImportOption(key as keyof ExportOptions)}
                                                className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-[#222222] rounded text-left transition-colors"
                                            >
                                                {importOptions[key as keyof ExportOptions] ? 
                                                    <CheckSquare size={14} className="text-[#4485d1] flex-shrink-0" /> : 
                                                    <Square size={14} className="text-[#cccccc] dark:text-[#666666] flex-shrink-0" />
                                                }
                                                <span className="text-xs text-[#1a1a1a] dark:text-white">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]">
                                        <button
                                            onClick={() => setImportMode('merge')}
                                            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                                                importMode === 'merge' 
                                                    ? 'bg-[#4485d1] text-white' 
                                                    : 'bg-white dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-[#222222]'
                                            }`}
                                        >
                                            Merge
                                        </button>
                                        <button
                                            onClick={() => setImportMode('replace')}
                                            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                                                importMode === 'replace' 
                                                    ? 'bg-[#4485d1] text-white' 
                                                    : 'bg-white dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-[#222222]'
                                            }`}
                                        >
                                            Replace
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowImportOptions(false)}
                                        className="w-full px-2 py-1 text-[10px] text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={handleClearAppData}
                                className="w-full px-2.5 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Trash2 size={10} />
                                Clear All App Data
                            </button>
                        </div>
                    </div>

                    {/* Local Models Section */}
                    <div className="border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] pt-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Cpu size={12} className="text-[#666666] dark:text-[#a0a0a0]" />
                            <h3 className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">Local Models (Ollama)</h3>
                        </div>
                        <LocalModelsStatus />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex justify-end gap-2 flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-3 py-1.5 text-xs font-medium text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all bg-[#4485d1] hover:bg-[#3674c1]"
                    >
                        {showSuccess ? (
                            <>Saved!</>
                        ) : (
                            <><Save size={12} /> Save & Apply</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Local Models Status Component
const LocalModelsStatus: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [models, setModels] = useState<string[]>([]);
    const [isTesting, setIsTesting] = useState(false);
    const [showSetupGuide, setShowSetupGuide] = useState(false);

    const testConnection = async () => {
        setIsTesting(true);
        try {
            const connected = await checkOllamaConnection();
            setIsConnected(connected);
            
            if (connected) {
                const availableModels = await getAvailableOllamaModels();
                setModels(availableModels);
            } else {
                setModels([]);
            }
        } catch (error) {
            console.error('Failed to test Ollama connection:', error);
            setIsConnected(false);
            setModels([]);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-2 flex gap-2">
                <div className="flex-1">
                    <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">
                        <strong>Offline AI Models:</strong> Use Code Llama locally when you hit quota limits. No API keys needed.
                    </p>
                </div>
            </div>

            <div className="flex gap-1.5">
                <button
                    onClick={testConnection}
                    disabled={isTesting}
                    className="flex-1 px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                    {isTesting ? (
                        <>
                            <Loader2 size={10} className="animate-spin" />
                            Testing...
                        </>
                    ) : (
                        <>
                            <Cpu size={10} />
                            Test Connection
                        </>
                    )}
                </button>
                <button
                    onClick={() => setShowSetupGuide(!showSetupGuide)}
                    className="flex-1 px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                    <ExternalLink size={10} />
                    Setup Guide
                </button>
            </div>

            {isConnected ? (
                <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckCircle size={12} className="text-[#4485d1]" />
                        <span className="text-xs font-bold text-[#1a1a1a] dark:text-white">Ollama Connected</span>
                    </div>
                    {models.length > 0 ? (
                        <div className="text-xs text-[#666666] dark:text-[#a0a0a0] space-y-0.5">
                            <p className="font-medium">Available Models:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                {models.map(model => (
                                    <li key={model} className="text-[#1a1a1a] dark:text-white">{model}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-xs text-[#666666] dark:text-[#a0a0a0]">Ollama is running but no models found. Run: <code className="bg-[rgba(0,0,0,0.06)] dark:bg-[#2a2a2a] px-1 rounded text-[12px]">ollama create codellama -f codellama.Modelfile</code></p>
                    )}
                </div>
            ) : (
                <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <AlertCircle size={12} className="text-[#666666] dark:text-[#a0a0a0]" />
                        <span className="text-xs font-bold text-[#1a1a1a] dark:text-white">Ollama Not Connected</span>
                    </div>
                    <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-1.5">Make sure Ollama is installed and running on http://localhost:11434</p>
                    <a 
                        href="https://ollama.ai" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-[#4485d1] hover:text-[#3674c1] underline flex items-center gap-1"
                    >
                        Download Ollama <ExternalLink size={10} />
                    </a>
                </div>
            )}

            {showSetupGuide && (
                <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-2 text-xs text-[#666666] dark:text-[#a0a0a0] space-y-1.5 max-h-[150px] overflow-y-auto">
                    <p className="font-bold text-[#1a1a1a] dark:text-white">Quick Setup:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                        <li>Install Ollama from ollama.ai</li>
                        <li>Place model files in F:\Automations\Models\</li>
                        <li>Run: <code className="bg-[rgba(0,0,0,0.06)] dark:bg-[#2a2a2a] px-1 rounded text-[12px]">ollama create codellama -f codellama.Modelfile</code></li>
                        <li>Click "Test Connection" above</li>
                    </ol>
                    <p className="italic mt-1.5">See LOCAL_MODELS_SETUP.md for detailed instructions</p>
                </div>
            )}
        </div>
    );
};

export default SettingsModal;
