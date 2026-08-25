// src/auth/ProtectedRoutes.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // ✅ Check token on mount
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        const userId = localStorage.getItem('userId');
        
        if (token && userId) {
            setAuthenticated(true);
        } else {
            setAuthenticated(false);
        }
        setLoading(false);
    }, []);

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            Loading...
        </div>;
    }

    if (!authenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;