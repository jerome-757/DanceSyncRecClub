import { Link } from 'react-router-dom';
import Logo from '../assets/logo.png'
import '../styles/index.css'

export const Navbar = () => {
    return (
        <div className=' bg-gray-700 flex flex-row justify-between items-center w-full h-20 px-30'>
            <Link to="/">
                <img src={Logo} alt="logo" className=' h-16'/>
            </Link>
            <h1 className=' text-white fancy text-5xl'>Welcome to XING FA dance club!</h1>
        </div>
      );
};

export default Navbar