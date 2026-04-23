import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { handleSSOCallback } from '../lib/auth';
import { Loader2 } from 'lucide-react';

const AuthCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            handleSSOCallback(code)
                .then(() => {
                    navigate('/dashboard');
                })
                .catch((err) => {
                    console.error('SSO Callback Error:', err);
                    setError('Authentication failed. Please try again.');
                    setTimeout(() => navigate('/login'), 3000);
                });
        } else {
            setError('No authorization code found.');
            setTimeout(() => navigate('/login'), 3000);
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-[#0F0F1A] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-10 flex flex-col items-center space-y-6 max-w-md w-full mx-4"
            >
                {!error ? (
                    <>
                        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                        <h2 className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-300">
                            Finalizing Secure Login
                        </h2>
                        <p className="text-gray-400 text-center">
                            Synchronizing your Keycloak profile with Vortex...
                        </p>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-red-500 text-2xl">!</span>
                        </div>
                        <h2 className="text-2xl font-bold text-red-500">
                            Authentication Error
                        </h2>
                        <p className="text-gray-400 text-center">
                            {error} Redirecting to login...
                        </p>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default AuthCallback;
