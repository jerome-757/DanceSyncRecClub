// import React from 'react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Xiaowu from '../assets/xiaowu.jpg';
import Footer from '../components/Footer';
import MyBackground from '../assets/xfdanceclub.jpg';
import axios from 'axios';

// const API_BASE = 'http://localhost:3001';
const API_BASE = 'https://dancesyncrecclub-production.up.railway.app';

const WelcomeScreen = () => {
  const [newsList, setNewsList] = useState([]);

  useEffect(() => {
      // axios.get(`${API_BASE}/api/news?limit=5`)
      axios.get(`${API_BASE}/api/news?limit=5&status=已发布`)
          .then(res => {
              if (res.data.code === 0) {
                  setNewsList(res.data.data || []);
              }
          })
          .catch(err => console.error('获取新闻失败:', err));
  }, []);

  return (
    <div className=" bg-white w-screen flex flex-col text-center">
      <Navbar />

      <div className=' min-h-[800px] py-20 flex flex-row w-full bg-gray-600 items-center justify-around contain-content'>
        {/* <img className='absolute w-full h-full ' src="https://wallpapers.com/images/hd/dance-studio-background-ny1jrb561lvx59gx.jpg" alt='dancers' /> */}
        {/* <img className='absolute w-full h-full ' src={MyBackground} alt='dancers' /> */}
        {/* <img className='absolute w-full h-full object-cover' src={MyBackground} alt='dancers' /> */}
        <img className='absolute h-128 w-auto object-contain' src={MyBackground} alt='dancers' />
        <div className='absolute w-full h-full bg-blue-800 bg-opacity-30' />
        {/* <h1 className=' mt-6 text-white font-bold text-10xl rakkas p-8 bg-blue-900 w-fit z-10'>星 发</h1> */}
      </div>
      <div className=' bg-gray-400 py-20 flex justify-between flex-col'>
        <h1 className=' text-8xl text-blue-900 fancy'>Together Tonight, Let's GO!</h1>
        <div className='flex flex-row py-24 px-80 justify-evenly items-center'>
          <Link to="/login" className='login-button transition hover:bg-green-900'>
            <p>Member Login</p>
          </Link>
          <Link to="/coach-login" className='login-button transition hover:bg-red-900'>
            <p>Coach Login</p>
          </Link>
          <Link to="/admin-login" className='login-button transition hover:bg-red-900'>
            <p>Admin Login</p>
          </Link>
        </div>
        <Link to="/register">
          <p className=' text-blue-700 hover:text-blue-500 text-xl'>Create an account</p>
        </Link>
      </div>

      {/* ===== 新闻动态 ===== */}
      <div className="w-full py-16 px-20 bg-white">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-bold text-gray-800">📰 新闻动态</h2>
          <Link to="/news" className="text-blue-600 hover:text-blue-800 font-medium text-lg">
            查看更多 →
          </Link>
        </div>

        {newsList.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无新闻</div>
        ) : (
          <div className="grid grid-cols-5 gap-6">
            {newsList.map((item) => (
              <Link
                key={item.id}
                to={`/news/${item.id}`}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100"
              >
                {/* 封面图 */}
                <div className="h-40 bg-gradient-to-br from-blue-400 to-purple-500 relative overflow-hidden">
                  {item.cover_image ? (
                    <img
                      src={`${API_BASE}${item.cover_image}`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-4xl">
                      📰
                    </div>
                  )}
                  {item.is_top === 1 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      📌 置顶
                    </span>
                  )}
                  <span className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {item.category}
                  </span>
                </div>

                {/* 内容 */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 text-base mb-2 line-clamp-2 group-hover:text-blue-600 transition">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                    {item.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>📅 {item.publish_date}</span>
                    <span>👁 {item.views} · ❤️ {item.likes}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className=' w-screen py-36 text-wrap text-left bg-gray-200'>
        <h1 className=' text-center text-6xl text-blue-900 font-bold pb-20 reddit-mono'>Welcome to XING FA dance club!</h1>
        <div className='flex justify-evenly flex-ro px-36'>
          <p className=' flex text-wrap text-xl flex-2 text-gray-500'>
          At XING FA dance club, we're all about the joy of dance and the camaraderie of our tight-knit community. Whether you're a seasoned dancer or just starting out, our club offers a welcoming space for everyone to come together and enjoy the rhythm of life.
          <br></br>
          <br></br>
          With weekly practice sessions led by our passionate amateur coach, you'll have the opportunity to improve your skills, learn new moves, and dance the night away in a fun and supportive environment.
          <br></br>
          <br></br>
          Membership at XING FA dance club is flexible, allowing you to attend practices on your own schedule. Simply show up when it suits you, and pay as you go. For added convenience, members have the option to pay for practices in advance, with discounts available for those who choose to do so.
          <br></br>
          <br></br>
          Our dedicated treasurer ensures that our practice space is always ready for us, handling the monthly rent payments with precision and care. And our coach, while balancing a full-time job, is committed to providing top-notch instruction whenever she's able to join us on the dance floor.
          <br></br>
          <br></br>
          With our app, we keep track of club finances and member attendance, ensuring that everyone stays accountable and that our club can continue to thrive. Plus, we send out friendly reminders about upcoming practices, so you'll never miss a chance to dance!
          <br></br>
          <br></br>
          So come join us at XING FA dance club, where every step brings us closer together and every beat keeps us moving forward. Let's dance!
          </p>
          <img className=' w-[300px] h-auto' src={Xiaowu} alt="dancer" />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default WelcomeScreen;
