import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    // 从 localStorage 读取用户信息
    let user = {};
    try {
        user = JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
        user = {};
    }

    // 未登录 → 跳转登录页
    if (!user.isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 角色不匹配 → 跳转登录页
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;