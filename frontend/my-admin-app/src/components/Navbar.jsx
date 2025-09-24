import { useState, useEffect } from "react"
import { Calendar, Home, User, Pencil, Menu, X } from "lucide-react"
import { NavLink } from "react-router-dom"
import orulogo from "../assets/oru_goldeneag.webp"

const navItems = [
  { to: "/", icon: <Home className="h-5 w-5" />, label: "Home" },
  { to: "/profile", icon: <User className="h-5 w-5" />, label: "Profile" },
]

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    const getUserEmail = () => {
      const resourceOwner = localStorage.getItem("resource_owner")
      if (resourceOwner) {
        try {
          const user = JSON.parse(resourceOwner)
          setUserEmail(user.email || "")
        } catch (error) {
          console.error("Error parsing user data:", error)
          setUserEmail("")
        }
      } else {
        setUserEmail("")
      }
    }

    getUserEmail()
    window.addEventListener("storage", getUserEmail)
    return () => window.removeEventListener("storage", getUserEmail)
  }, [])

  const toggleMenu = () => setIsOpen((prev) => !prev)

  // Close the menu when a link is clicked
  const handleNavLinkClick = () => {
    setIsOpen(false)
  }

  const renderNavLinks = (additionalClasses = "", withClickHandler = false) =>
    navItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={`flex items-center space-x-2 text-white py-3 px-2 rounded hover:bg-blue-600 ${additionalClasses}`}
        onClick={withClickHandler ? handleNavLinkClick : undefined}
      >
        {item.icon}
        <span>{item.label}</span>
      </NavLink>
    ))

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-opacity-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleMenu}
      />

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-64 bg-sky-800 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b border-blue-500">
          <div className="flex items-center space-x-2">
            <img className="h-20 w-20" src={orulogo || "/placeholder.svg"} alt="ORU Logo" />
          </div>
          <button onClick={toggleMenu} className="text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-col p-4">
          {userEmail && (
            <div className="py-3 px-2 text-white border-b border-blue-500 mb-2">
              <p className="text-sm opacity-80">Signed in as:</p>
              <p className="font-medium truncate">{userEmail}</p>
            </div>
          )}
          {/* Pass true to enable click handler for mobile links */}
          {renderNavLinks("", true)}
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-sky-800 text-white h-16 px-4 flex items-center shadow-md">
        {/* Logo Section */}
        <NavLink to="/" className="flex items-center hover:animate-spin">
          <img className="h-15 w-20" src={orulogo || "/placeholder.svg"} alt="ORU Logo" />
        </NavLink>

        {/* Navigation Links (Desktop) - Now centered */}
        <div className="hidden md:flex items-center justify-center flex-1">
          <div className="flex items-center space-x-8">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className="flex items-center space-x-2 hover:text-gray-200">
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden ml-auto">
          <button onClick={toggleMenu} className="text-white focus:outline-none">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>
    </>
  )
}

export default Navbar
