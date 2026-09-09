import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios'

const RegistrationScreen = () => {
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    code: '',
    username: '',
    password: '',
    role: 'member', // Default to 'member'
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate(); // Step 2: Create an instance of navigate

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const sendVerificationCode = () => {
    if (!formState.phone || formState.phone.length < 11) {
      alert('请输入正确的手机号');
      return;
    }
    // 测试模式：固定验证码 1234
    alert('验证码已发送（测试固定码: 1234）');
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // 验证验证码
    if (formState.code !== '1234') {
      alert('验证码错误');
      return;
    }

    const { firstName, lastName, phone, username, password, role } = formState;

    // Send data to backend for registration
    axios.post('https://dancesyncrecclub-production.up.railway.app/register', {
      firstName,
      lastName,
      phone,
      username,
      password,
      role
    })
      .then(res => {
        // Redirect based on role
        if (role === 'member') {
          navigate('/member');
        } else if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'coach') {
          navigate('/coach');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        // Set error message based on backend response
        if (error.response && error.response.data && error.response.data.error) {
          setErrorMessage(error.response.data.error);
        } else {
          setErrorMessage('An error occurred while processing your request');
        }
      });
  };

  const handleBack = () => {
    navigate('/'); // Navigate back to the WelcomeScreen
  };

  return (
    <div className='h-screen overflow-hidden'>
      <Navbar />
      <div className='flex flex-col items-center bg-gray-700 h-full'>
        <form onSubmit={handleSubmit} className="flex flex-col bg-white p-10 rounded-2xl px-28 py-16 mt-20">
          <div className='flex-1 flex flex-row w-full mb-8'>
            <h1 className='font-semibold text-xl bg-amber-100 py-1 px-2 reddit-mono'>Create An Account.</h1>
          </div>
          <div className='flex-2 flex justify-center flex-col items-center'>
            {errorMessage && <div className="text-red-500 float-left text-left mb-4">{errorMessage}</div>}
            <div className='flex'>
              <label>
                <input
                  className=' w-44 h-12 rounded-2xl px-5 border-black focus:outline-none bg-blue-100 mr-8'
                  type="text"
                  name="firstName"
                  placeholder='First Name'
                  value={formState.firstName}
                  onChange={handleChange}
                  required />
              </label>
              <br />
              <label>
                <input
                  className=' w-44 h-12 rounded-2xl px-5 border-black focus:outline-none bg-blue-100'
                  type="text"
                  name="lastName"
                  placeholder='Last Name'
                  value={formState.lastName}
                  onChange={handleChange}
                  required />
              </label>
            </div>
            <br />
              {/* <input
                className=' w-96 h-12 rounded-2xl px-5 border-black focus:outline-none bg-blue-100'
                type="email"
                name="email"
                placeholder='Email'
                value={formState.email}
                onChange={handleChange}
                required /> */}
            <label>
              <input
                className=' w-96 h-12 rounded-2xl px-5 border-black focus:outline-none bg-blue-100'
                type="tel"
                name="phone"
                placeholder='Phone Number'
                value={formState.phone}
                onChange={handleChange}
                required />
            </label>
            <br />
            <div className='flex gap-3 w-96'>
              <input
                className='w-44 h-12 rounded-2xl px-5 border-black focus:outline-none bg-blue-100 mr-8'
                type="text"
                name="code"
                placeholder='Verification Code'
                value={formState.code}
                onChange={handleChange}
                required />
              <button
                type="button"
                className='w-44 h-12 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 transition whitespace-nowrap'
                onClick={sendVerificationCode}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `${countdown}s` : 'Request OTP'}
              </button>
            </div>

            <br />
            <label>
              <input
                className=' w-96 h-12 rounded-2xl px-5 border-black focus:outline-none bg-blue-100'
                type="text"
                name="username"
                placeholder='Username'
                value={formState.username}
                onChange={handleChange}
                required />
            </label>
            <br />
            <label>
              <input
                className=' w-96 h-12 rounded-2xl px-5 border-black focus:outline-none bg-blue-100'
                type="password"
                name="password"
                placeholder='Password'
                value={formState.password}
                onChange={handleChange}
                required />
            </label>
            <br />
            <label className='flex justify-between w-full max-w-xs'>
              <div>
                <input
                  className='radio'
                  type="radio"
                  id="member"
                  name="role"
                  value="member"
                  checked={formState.role === "member"}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="member">Member</label>
              </div>
              <div>
                <input
                  className='radio opacity-50 cursor-not-allowed'
                  type="radio"
                  id="coach"
                  name="role"
                  value="coach"
                  // checked={formState.role === "coach"}
                  // onChange={handleChange}
                  // required
                  disabled
                />
                <label htmlFor="coach" className='opacity-50'>Coach</label>
              </div>
              <div>
                <input
                  className='radio opacity-50 cursor-not-allowed'
                  type="radio"
                  id="admin"
                  name="role"
                  value="admin"
                  // checked={formState.role === "admin"}
                  // onChange={handleChange}
                  // required
                  disabled
                />
                <label htmlFor="admin" className='opacity-50'>Admin</label>
              </div>
            </label>
          </div>
          <br />
          <div className='flex justify-center'>
            <button type="button" className='px-4 py-4 rounded-xl bg-slate-400 border w-1/5 hover:bg-slate-500 transition' onClick={handleBack}>⬅</button>
            <button type="submit" className='px-6 py-4 rounded-xl bg-yellow-300 border w-1/3 ml-20 hover:bg-green-200 transition'>Register</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationScreen;