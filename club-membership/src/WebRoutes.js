import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WelcomeScreen from './pages/WelcomeScreen';
import RegistrationScreen from './pages/RegistrationScreen';
import { Login } from './pages/Login';
import { AdminLogin } from './pages/AdminLogin';
import ForgotPassword from './pages/ForgotPassword';
import MemberHomePage from './pages/MemberHomePage';
import AdminHomePage from './pages/AdminHomePage';
import SchedulePractice from './pages/SchedulePractice';
import PracticeCalendar from './pages/PracticeCalendar';
import PracticeDetails from './pages/PracticeDetails';
import CoachHomePage from './pages/CoachHomePage';
import { CoachLogin } from './pages/CoachLogin';
import CommunicationCenter from './pages/CommunicationCenter';
import Notifications from './pages/Notifications';
import CoachCommunication from './pages/CoachCommunication';
import { PracticeProvider } from './pages/PracticeContext';
import { UserProvider } from './pages/UserContext'; // Import the UserProvider
import MemberManagement from './pages/MemberManagement';
import MemberPayment from './pages/MemberPayment';
import AdminFinances from './pages/AdminFinances'
import CurrentMonthPayables from './pages/CurrentMonthPayables'
import Attendance from './pages/Attendance';
// ===== 新增导入 =====
import ScanEntry from './pages/ScanEntry';
import MemberCard from './pages/MemberCard';
import CardTypeManagement from './pages/CardTypeManagement';
import SignInRecords from './pages/SignInRecords';
import NewsList from './pages/NewsList';
import NewsDetail from './pages/NewsDetail';
import NewsManagement from './pages/NewsManagement';
import NewsEditor from './pages/NewsEditor';
import ProtectedRoute from './components/ProtectedRoute';

export const WebRoutes = () => {
    return (
        <UserProvider> {/* Wrap everything with UserProvider to handle user data globally */}
            <PracticeProvider> {/* Practice data management within UserProvider */}
                <Router>
                    <Routes>
                        <Route path='/' element={<WelcomeScreen />} />
                        <Route path='/login' element={<Login />} />
                        <Route path='/admin-login' element={<AdminLogin />} />
                        <Route path='/register' element={<RegistrationScreen />} />
                        <Route path='/forgot' element={<ForgotPassword />} />
                        <Route path='/schedulePractice' element={<SchedulePractice />} />
                        <Route path='/practiceCalendar' element={<PracticeCalendar />} />
                        <Route path='/practiceDetails' element={<PracticeDetails />} />
                        <Route path='/coach-login' element={<CoachLogin />} />
                        <Route path='/communication' element={<CommunicationCenter />} />
                        <Route path='/notifications' element={<Notifications />} />
                        <Route path='/coach-communication' element={<CoachCommunication />} />
                        <Route path='/member-payment' element={<MemberPayment />} />
                        <Route path='/current-month-payables' element={<CurrentMonthPayables />} />
                        <Route path='/attendance' element={<Attendance />} />
                        
                        {/* ===== 新增路由 ===== */}
                        <Route path="/scan" element={<ScanEntry />} />
                        <Route path="/member-card/:memberNo" element={<MemberCard />} />
                        <Route path="/news" element={<NewsList />} />
                        <Route path="/news/:id" element={<NewsDetail />} />

                        {/* <Route path='/member' element={<MemberHomePage />} />
                        <Route path='/admin' element={<AdminHomePage />} />
                        <Route path='/coach' element={<CoachHomePage />} />
                        <Route path='/member-management' element={<MemberManagement />} />
                        <Route path='/admin-finances' element={<AdminFinances />} />
                        <Route path="/card-types" element={<CardTypeManagement />} />
                        <Route path='/sign-in-records' element={<SignInRecords />} />
                        <Route path="/admin/news" element={<NewsManagement />} />
                        <Route path="/admin/news/new" element={<NewsEditor />} />
                        <Route path="/admin/news/:id/edit" element={<NewsEditor />} /> */}
                        {/* 会员页面 */}
                        <Route path='/member' element={
                            <ProtectedRoute allowedRoles={['member', 'admin']}>
                                <MemberHomePage />
                            </ProtectedRoute>
                        } />

                        {/* 教练页面 */}
                        <Route path='/coach' element={
                            <ProtectedRoute allowedRoles={['coach', 'admin']}>
                                <CoachHomePage />
                            </ProtectedRoute>
                        } />

                        {/* 管理员页面 */}
                        <Route path='/admin' element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminHomePage />
                            </ProtectedRoute>
                        } />

                        <Route path='/member-management' element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <MemberManagement />
                            </ProtectedRoute>
                        } />

                        <Route path='/admin-finances' element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminFinances />
                            </ProtectedRoute>
                        } />

                        <Route path='/card-types' element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <CardTypeManagement />
                            </ProtectedRoute>
                        } />

                        <Route path='/sign-in-records' element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <SignInRecords />
                            </ProtectedRoute>
                        } />

                        <Route path='/admin/news' element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <NewsManagement />
                            </ProtectedRoute>
                        } />

                        <Route path='/admin/news/new' element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <NewsEditor />
                            </ProtectedRoute>
                        } />

                        <Route path='/admin/news/:id/edit' element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <NewsEditor />
                            </ProtectedRoute>
                        } />

                        {/* 404页面 */}
                        <Route path='*' element={
                        <div className=' overflow-y-hidden h-screen bg-black text-3xl text-white reddit-mono'>
                            <h1>Page not found</h1>
                            <img className='w-full h-64' src='https://www.icegif.com/wp-content/uploads/2022/01/icegif-962.gif' alt='error'/>
                            <img className='w-full h-64' src='https://alphaomegaarmament.com/wp-content/uploads/2024/03/How-LeBron-James-became-a-TikTok-meme-%E2%80%98You-Are-My-Sunshine-5.webp' alt='error'/>
                            <img className='w-full h-64' src='https://neonmusic.online/wp-content/uploads/2024/04/444-10-7.jpg' alt='error'/>
                            <img className=' w-full h-64' src='https://i.kym-cdn.com/entries/icons/facebook/000/034/772/Untitled-1.jpg' alt='error'/>
                        </div>} /> {/* Catch all other paths */}
                    </Routes>
                </Router>
            </PracticeProvider>
        </UserProvider>
    );
};