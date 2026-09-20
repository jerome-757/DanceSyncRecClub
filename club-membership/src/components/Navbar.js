// import { Link } from 'react-router-dom';
// import Logo from '../assets/logo.png'
// import '../styles/index.css'

// export const Navbar = () => {
//     return (
//         <div className=' bg-gray-700 flex flex-row justify-between items-center w-full h-20 px-30'>
//             <Link to="/">
//                 <img src={Logo} alt="logo" className=' h-16'/>
//             </Link>
//             <h1 className=' text-white fancy text-5xl'>Welcome to XING FA dance club!</h1>
//         </div>
//       );
// };

// export default Navbar


import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png';
import '../styles/index.css';

export const Navbar = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    // 读取登录状态
    useEffect(() => {
        const cached = localStorage.getItem('user');
        if (cached) {
            try {
                setUser(JSON.parse(cached));
            } catch (e) {
                setUser(null);
            }
        }
    }, []);

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('clubMember');
        setUser(null);
        setShowMenu(false);
        navigate('/');
    };

    const getHomePath = (role) => {
        if (role === 'member') return '/member';
        if (role === 'coach') return '/coach';
        if (role === 'admin') return '/admin';
        return '/';
    };

    return (
        <div className=' bg-gray-700 flex flex-row justify-between items-center w-full h-20 px-8'>
            <Link to="/">
                <img src={Logo} alt="logo" className=' h-16'/>
            </Link>
            <h1 className=' text-white fancy text-5xl'>Welcome to XING FA dance club!</h1>

            {/* 右上角用户菜单 */}
            <div className='relative' ref={menuRef}>
                {user && user.isAuthenticated ? (
                    <>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className='flex items-center gap-3 px-4 py-2 rounded-full bg-gray-600 hover:bg-gray-500 transition'
                        >
                            <div className='w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg'>
                                {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                            </div>
                            <span className='text-white font-medium'>{user.username}</span>
                            <span className='text-white text-xs'>▼</span>
                        </button>

                        {showMenu && (
                            <div className='absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl overflow-hidden z-50'>
                                <div className='px-4 py-3 bg-gray-50 border-b'>
                                    <div className='font-bold text-gray-800'>{user.username}</div>
                                    <div className='text-xs text-gray-500'>
                                        {user.role === 'admin' ? '管理员' : user.role === 'coach' ? '教练' : '会员'}
                                    </div>
                                </div>
                                <Link
                                    to={getHomePath(user.role)}
                                    className='block px-4 py-3 text-gray-700 hover:bg-gray-100 transition'
                                    onClick={() => setShowMenu(false)}
                                >
                                    🏠 我的主页
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className='w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition border-t'
                                >
                                    🚪 退出登录
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <Link
                        to="/login"
                        className='px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-medium transition'
                    >
                        登录
                    </Link>
                )}
            </div>
        </div>
      );
};

export default Navbar