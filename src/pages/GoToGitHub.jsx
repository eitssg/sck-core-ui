// QuickRedirect.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCookie } from '../utils/cookies';
import { useReduxData } from "@/hooks/useReduxData";
import { useTheme } from "@/components/ThemeProvider";

export default function GoToGitHub() {
    const navigate = useNavigate();
    const { selectedClient, portfolios } = useReduxData();
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        const githubUrl = getCookie('github_auth_url');
        
        if (githubUrl) {
            // Very short delay to show the message
            setTimeout(() => {
                window.location.href = githubUrl;
            }, 500);
        }
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="animate-pulse text-4xl mb-4">🚀</div>
                <h2 className="text-xl font-semibold text-gray-900">
                    Connecting to GitHub...
                </h2>
            </div>
        </div>
    );
};